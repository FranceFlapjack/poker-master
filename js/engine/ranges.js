// The 169 starting hands, as a grid and as the notation everyone writes them in ("77+, AJs+, KQo").
//
// Grid indexing follows the chart everyone has seen: row/col 0 = ace, 12 = deuce.
//   i  <  j   suited      (0,1) = AKs, above the diagonal
//   i === j   pair        (0,0) = AA
//   i  >  j   offsuit     (1,0) = AKo, below the diagonal
// A range is a Float32Array(169) of weights in 0..1, so mixed strategies ("raise AJo 40%") cost nothing.

import { makeCard, rankOf, suitOf, RANKS } from './cards.js'

export const GRID = 13
// Grid index 0 is the ace, but rank 12 is the ace — the chart reads high-to-low and the cards count up.
export const gridToRank = i => 12 - i
export const rankToGrid = r => 12 - r
export const idx = (i, j) => i * GRID + j

export const isPair = (i, j) => i === j
export const isSuited = (i, j) => i < j
export const newRange = () => new Float32Array(169)

/** Grid cell → "AA" / "AKs" / "AKo". */
export function cellName(i, j) {
  const hi = RANKS[gridToRank(Math.min(i, j))], lo = RANKS[gridToRank(Math.max(i, j))]
  if (i === j) return hi + hi
  return hi + lo + (i < j ? 's' : 'o')
}

/** "AKs" → {i, j}. Accepts either card order ("KAs" is the same hand). */
export function nameToCell(name) {
  const s = String(name).trim()
  const m = /^([2-9TJQKA])([2-9TJQKA])([so])?$/i.exec(s)
  if (!m) throw new Error(`Bad hand: ${name}`)
  let a = RANKS.indexOf(m[1].toUpperCase()), b = RANKS.indexOf(m[2].toUpperCase())
  const suited = m[3] && m[3].toLowerCase() === 's'
  if (a === b) {
    if (m[3]) throw new Error(`A pair cannot be suited or offsuit: ${name}`)
    const g = rankToGrid(a); return { i: g, j: g }
  }
  if (!m[3]) throw new Error(`Need s or o: ${name}`)
  const hi = rankToGrid(Math.max(a, b)), lo = rankToGrid(Math.min(a, b))   // hi has the SMALLER grid index
  return suited ? { i: hi, j: lo } : { i: lo, j: hi }
}

/**
 * Parse range notation into weights.
 * Supports: lists ("AA, KK"), pairs and hands ("AA", "AKs", "AKo"), "+" runs ("77+", "AJs+"),
 * explicit runs ("22-55", "A5s-A2s"), and per-item weights ("AJo:0.4").
 * "AK" without s/o means both.
 */
export function parseRange(text) {
  const w = newRange()
  if (!text) return w
  for (let part of String(text).split(',')) {
    part = part.trim()
    if (!part) continue
    let weight = 1
    const colon = part.lastIndexOf(':')
    if (colon > 0) {
      const v = Number(part.slice(colon + 1))
      if (!Number.isFinite(v) || v < 0 || v > 1) throw new Error(`Bad weight in ${part}`)
      weight = v; part = part.slice(0, colon).trim()
    }
    for (const { i, j } of expand(part)) w[idx(i, j)] = weight
  }
  return w
}

function expand(part) {
  // "AK" with no suffix means both AKs and AKo
  if (/^([2-9TJQKA])([2-9TJQKA])$/i.test(part) && part[0].toUpperCase() !== part[1].toUpperCase()) {
    return [...expand(part + 's'), ...expand(part + 'o')]
  }
  if (part.endsWith('+')) return expandPlus(part.slice(0, -1))
  if (part.includes('-')) {
    const [a, b] = part.split('-').map(s => s.trim())
    return expandRun(nameToCell(a), nameToCell(b))
  }
  return [nameToCell(part)]
}

// "77+" is every pair from sevens up. "AJs+" is AJs, AQs, AKs — the kicker climbs, the ace stays.
function expandPlus(name) {
  const { i, j } = nameToCell(name)
  const out = []
  if (i === j) { for (let g = i; g >= 0; g--) out.push({ i: g, j: g }) ; return out }
  const suited = isSuited(i, j)
  const top = Math.min(i, j), kicker = Math.max(i, j)
  for (let k = kicker; k > top; k--) out.push(suited ? { i: top, j: k } : { i: k, j: top })
  return out
}

// "A5s-A2s" or "55-22", in either order. Both ends must share a shape (and, if not pairs, a top card).
function expandRun(a, b) {
  const out = []
  if (isPair(a.i, a.j) && isPair(b.i, b.j)) {
    const lo = Math.min(a.i, b.i), hi = Math.max(a.i, b.i)
    for (let g = lo; g <= hi; g++) out.push({ i: g, j: g })
    return out
  }
  if (isPair(a.i, a.j) !== isPair(b.i, b.j) || isSuited(a.i, a.j) !== isSuited(b.i, b.j)) {
    throw new Error('Both ends of a range must be the same shape')
  }
  const suited = isSuited(a.i, a.j)
  const topA = Math.min(a.i, a.j), topB = Math.min(b.i, b.j)
  if (topA !== topB) throw new Error('Both ends of a range must share their top card')
  const kA = Math.max(a.i, a.j), kB = Math.max(b.i, b.j)
  for (let k = Math.min(kA, kB); k <= Math.max(kA, kB); k++) {
    out.push(suited ? { i: topA, j: k } : { i: k, j: topA })
  }
  return out
}

/**
 * Weights → canonical notation. Runs collapse to "77+" where they reach the top of their shape and
 * "A5s-A2s" otherwise. Parsing this back must give the same weights — that is the round-trip test.
 */
export function serializeRange(w) {
  const parts = []
  const at = (i, j) => w[idx(i, j)]

  // pairs, high to low
  emitRuns(Array.from({ length: GRID }, (_, g) => ({ i: g, j: g })), at, parts)

  // suited then offsuit, grouped by the top card, kicker descending
  for (const suited of [true, false]) {
    for (let top = 0; top < GRID - 1; top++) {
      const cells = []
      for (let k = top + 1; k < GRID; k++) cells.push(suited ? { i: top, j: k } : { i: k, j: top })
      emitRuns(cells, at, parts)
    }
  }
  return parts.join(', ')
}

// `cells` is ordered strongest-first. A run starting at the strongest cell is written with "+", which
// names its WEAKEST member ("77+" = sevens through aces) — so the "+" form takes cells[end], not cells[k].
function emitRuns(cells, at, parts) {
  let k = 0
  while (k < cells.length) {
    const weight = at(cells[k].i, cells[k].j)
    if (!weight) { k++; continue }
    let end = k
    while (end + 1 < cells.length && at(cells[end + 1].i, cells[end + 1].j) === weight) end++
    const body = k === 0 ? `${cellName(cells[end].i, cells[end].j)}+`
      : k === end ? cellName(cells[k].i, cells[k].j)
      : `${cellName(cells[k].i, cells[k].j)}-${cellName(cells[end].i, cells[end].j)}`
    parts.push(weight === 1 ? body : `${body}:${round2(weight)}`)
    k = end + 1
  }
}

const round2 = n => String(Math.round(n * 100) / 100)

/** Every actual two-card combination of a grid cell: 6 for a pair, 4 suited, 12 offsuit. */
export function cellCombos(i, j) {
  const out = []
  const rHi = gridToRank(Math.min(i, j)), rLo = gridToRank(Math.max(i, j))
  if (i === j) {
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) out.push([makeCard(rHi, a), makeCard(rHi, b)])
  } else if (isSuited(i, j)) {
    for (let s = 0; s < 4; s++) out.push([makeCard(rHi, s), makeCard(rLo, s)])
  } else {
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) out.push([makeCard(rHi, a), makeCard(rLo, b)])
  }
  return out
}

/**
 * The grid's three shapes, counted from the deck: how many cells each takes and how many actual hands
 * those cells hold. The lesson grid shows these, and the checkers hold them to 13/78/78 and 78/312/936.
 */
export function shapeCounts() {
  const out = { pair: { cells: 0, combos: 0 }, suited: { cells: 0, combos: 0 }, offsuit: { cells: 0, combos: 0 } }
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const k = isPair(i, j) ? 'pair' : isSuited(i, j) ? 'suited' : 'offsuit'
    out[k].cells++
    out[k].combos += cellCombos(i, j).length
  }
  return out
}

/**
 * Every weighted combination in a range, minus any that use a dead card.
 * Card removal is the whole reason a range's combo count is not just 6/4/12 per cell: if the board
 * has an ace, AA drops from 6 combos to 3.
 */
export function rangeCombos(w, dead = []) {
  const blocked = new Uint8Array(52)
  for (const c of dead) blocked[c] = 1
  const out = []
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const weight = w[idx(i, j)]
      if (!weight) continue
      for (const [a, b] of cellCombos(i, j)) {
        if (!blocked[a] && !blocked[b]) out.push({ cards: [a, b], weight })
      }
    }
  }
  return out
}

/** Total weighted combos — the number quoted as "how wide is this range". */
export function countCombos(w, dead = []) {
  return rangeCombos(w, dead).reduce((s, c) => s + c.weight, 0)
}

/** Which grid cell a real two-card hand belongs to. */
export function handToCell(c1, c2) {
  const r1 = rankOf(c1), r2 = rankOf(c2)
  const suited = suitOf(c1) === suitOf(c2)
  if (r1 === r2) { const g = rankToGrid(r1); return { i: g, j: g } }
  const hi = rankToGrid(Math.max(r1, r2)), lo = rankToGrid(Math.min(r1, r2))
  return suited ? { i: hi, j: lo } : { i: lo, j: hi }
}
