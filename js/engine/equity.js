// Equity: how often each player wins, ties, and loses, given what is known.
//
// Two modes, and the distinction matters for honesty:
//   exact — enumerates every remaining board. The answer IS the answer, no error bar.
//   mc    — samples. Always reported with a standard error, because a sampled number quoted to two
//           decimal places is a lie about its own precision.

import { deckWithout, mulberry32 } from './cards.js'
import { evaluate } from './evaluator.js'
import { rangeCombos } from './ranges.js'

/** Board completions needed for `n` known board cards. Preflop is the big one: C(48,5) = 1,712,304. */
export const runoutCount = (knownBoard, nDead) => {
  const need = 5 - knownBoard
  const avail = 52 - nDead
  let c = 1
  for (let k = 0; k < need; k++) c = c * (avail - k) / (k + 1)
  return Math.round(c)
}

/**
 * Exact equity for known hole cards. Enumerates every runout — no sampling, no seed, no error.
 *
 * Preflop with two hands is 1.7M runouts and takes a few seconds; `maxRunouts` guards against a UI
 * thread accidentally asking for that. Pass Infinity to mean it.
 *
 * @param {number[][]} holes  one [c,c] per player
 * @param {number[]} board    0..5 known board cards
 * @param {number[]} dead     cards removed but not in play (burn cards, folded hands)
 */
export function equityExact(holes, board = [], dead = [], { maxRunouts = 300000 } = {}) {
  const known = [...holes.flat(), ...board, ...dead]
  assertNoDuplicates(known)
  const deck = deckWithout(known)
  const need = 5 - board.length
  const total = runoutCount(board.length, known.length)
  if (total > maxRunouts) {
    throw new Error(`equityExact would enumerate ${total.toLocaleString()} runouts (limit ${maxRunouts.toLocaleString()}). ` +
      `Raise maxRunouts to mean it, or use equityMC.`)
  }

  const n = holes.length
  const wins = new Float64Array(n), ties = new Float64Array(n)
  let count = 0
  const full = board.slice()

  const combine = (start, depth) => {
    if (depth === need) {
      count++
      scoreOneBoard(holes, full, wins, ties)
      return
    }
    for (let k = start; k <= deck.length - (need - depth); k++) {
      full.push(deck[k])
      combine(k + 1, depth + 1)
      full.pop()
    }
  }
  combine(0, 0)

  return finish(wins, ties, count, n, null)
}

function scoreOneBoard(holes, board, wins, ties) {
  let best = -1, bestCount = 0
  const scores = []
  for (let p = 0; p < holes.length; p++) {
    const s = evaluate([holes[p][0], holes[p][1], ...board]).score
    scores.push(s)
    if (s > best) { best = s; bestCount = 1 } else if (s === best) bestCount++
  }
  for (let p = 0; p < holes.length; p++) {
    if (scores[p] !== best) continue
    if (bestCount === 1) wins[p]++
    else ties[p] += 1 / bestCount
  }
}

/**
 * Monte Carlo equity for ranges (or fixed hands — a single combo is just a one-cell range).
 *
 * Each trial samples one combo per player, rejecting conflicts, then deals the rest of the board.
 * Rejection sampling is the right call here: it keeps the sampled distribution exactly proportional to
 * the weights, which the cheaper "pick from a pre-filtered list" approach quietly does not.
 *
 * @param {(Float32Array|number[][])[]} players range weights, or a literal [[c,c]] for a fixed hand
 * @returns {{equity:number[], win:number[], tie:number[], trials:number, stderr:number[]}}
 */
export function equityMC(players, board = [], dead = [], { trials = 20000, seed = 1 } = {}) {
  const rng = mulberry32(seed)
  const n = players.length
  const fixedDead = [...board, ...dead]
  assertNoDuplicates(fixedDead)

  // Pre-expand each range once. Cards on the board are already impossible, so remove them up front.
  const pools = players.map((p, i) => {
    if (Array.isArray(p)) {
      if (p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number') {
        throw new Error(`Player ${i}: a fixed hand must be [card, card]; a range must be Float32Array weights`)
      }
      // Catch this here rather than letting rejection sampling spin to exhaustion on an impossible draw.
      if (fixedDead.includes(p[0]) || fixedDead.includes(p[1])) {
        throw new Error(`Player ${i} holds a card that is already on the board or dead`)
      }
      return [{ cards: p, weight: 1 }]
    }
    const combos = rangeCombos(p, fixedDead)
    if (!combos.length) throw new Error(`Player ${i}: range has no combos left after card removal`)
    return combos
  })
  const cumWeights = pools.map(pool => {
    const c = new Float64Array(pool.length)
    let run = 0
    for (let i = 0; i < pool.length; i++) { run += pool[i].weight; c[i] = run }
    return c
  })

  const wins = new Float64Array(n), ties = new Float64Array(n)
  const used = new Uint8Array(52)
  const chosen = new Array(n)
  const full = new Array(5)
  let done = 0, attempts = 0
  const maxAttempts = trials * 50

  while (done < trials && attempts < maxAttempts) {
    attempts++
    used.fill(0)
    for (const c of fixedDead) used[c] = 1
    let ok = true
    for (let p = 0; p < n && ok; p++) {
      const combo = sample(pools[p], cumWeights[p], rng)
      const [a, b] = combo.cards
      if (used[a] || used[b]) { ok = false; break }
      used[a] = 1; used[b] = 1
      chosen[p] = combo.cards
    }
    if (!ok) continue

    // deal the rest of the board from what is left
    for (let i = 0; i < board.length; i++) full[i] = board[i]
    for (let i = board.length; i < 5; i++) {
      let c
      do { c = (rng() * 52) | 0 } while (used[c])
      used[c] = 1
      full[i] = c
    }
    scoreOneBoard(chosen, full, wins, ties)
    done++
  }
  if (done < trials) throw new Error(`Could not draw ${trials} valid trials (ranges may be mutually impossible)`)

  return finish(wins, ties, done, n, computeStderr(wins, ties, done, n))
}

function sample(pool, cum, rng) {
  const target = rng() * cum[cum.length - 1]
  let lo = 0, hi = cum.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid }
  return pool[lo]
}

// Standard error of a proportion: sqrt(e(1-e)/n). Quoting an MC equity without this invites reading
// 33.4% as meaningfully different from 33.9% at 5,000 trials, where it is not.
function computeStderr(wins, ties, count, n) {
  const se = new Array(n)
  for (let p = 0; p < n; p++) {
    const e = (wins[p] + ties[p]) / count
    se[p] = Math.sqrt(Math.max(e * (1 - e), 0) / count)
  }
  return se
}

function finish(wins, ties, count, n, stderr) {
  const out = { equity: [], win: [], tie: [], trials: count, stderr }
  for (let p = 0; p < n; p++) {
    out.win.push(wins[p] / count)
    out.tie.push(ties[p] / count)
    out.equity.push((wins[p] + ties[p]) / count)
  }
  return out
}

function assertNoDuplicates(cards) {
  const seen = new Uint8Array(52)
  for (const c of cards) {
    if (c == null || c < 0 || c > 51) throw new Error(`Not a card: ${c}`)
    if (seen[c]) throw new Error('The same card appears twice')
    seen[c] = 1
  }
}
