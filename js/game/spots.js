// The game's spots: built, and scored, from what the app can actually compute.
//
// Owner's request (2026-10-04): a game of ten spots drawn from what the lessons teach, scored as a
// percentage — the right play at the right price is 100%. The rule this module exists to keep: a spot
// is SCORED only where the app knows the answer, and every spot is BUILT to match exactly what scores
// it. A table that differs from its grader makes the "right" answer wrong.
//
// Six kinds, four sources:
//
//   rfi        open or fold, folded to you, nine-handed   → content/charts/rfi-9max.json (authored,
//              not solver output — scored right or wrong, no EV exists for it)
//   shove      heads-up small blind, shove or fold        → content/charts/pushfold-hu.json (solved by
//   callshove  heads-up big blind facing a shove           this app) + EV against its other side
//   river      a river bet into a bluff-catcher            → pot odds against a STATED range, exact:
//   allin      a draw facing an all-in on the turn          nothing can be bet after either decision
//   bubble     a big-blind call on the bubble              → ICM with stated stacks and payouts
//
// Not scored, and said so on the page: BET SIZE. No lesson teaches a sizing rule and the app has no
// solver, so an open is offered at one fixed size (2.5bb, the size the lessons' drills use) and the size
// is never graded.
//
// EVERY EV IS MEASURED AGAINST FOLDING. Folding is 0; every other option is what it wins or loses on
// average compared with folding, in big blinds (or, on the bubble, in % of the prize pool). One
// reference point for every spot, so a reader can compare them.
//
// Pure: no DOM. scripts/game-test.mjs builds hundreds of these and checks them.

import { RANKS, SUIT_GLYPH, makeDeck, shuffle, mulberry32, cardGlyph, rankOf, suitOf } from '../engine/cards.js'
import { evaluate, describe, compare, PAIR, HIGH_CARD, TWO_PAIR } from '../engine/evaluator.js'
import { parseRange, cellName, cellCombos, handToCell, idx, GRID } from '../engine/ranges.js'
import { equityMC } from '../engine/equity.js'
import { icmEquity } from '../engine/icm.js'
import { createHand, applyAction, legalActions } from '../engine/rules.js'

export const GAME_LENGTH = 10
export const TYPES = ['rfi', 'shove', 'callshove', 'river', 'allin', 'bubble']
// how the ten are made up: every kind at least once, the commonest skills twice
const MIX = ['rfi', 'rfi', 'shove', 'shove', 'callshove', 'river', 'river', 'allin', 'allin', 'bubble']

const NAMES = ['Ana', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal']
const BB = 200, SB = 100                       // every table plays 100/200, so 1 big blind = 200 chips
const r1 = n => Math.round(n * 10) / 10
const pick = (rng, arr) => arr[(rng() * arr.length) | 0]
const glyphs = cards => cards.map(cardGlyph).join(' ')
const SIGMA = 2                                 // two standard errors: inside this, two options are a tie

/**
 * Points for one decision. The best option — or anything within the simulation's error of it — is
 * 100. Below that, points fall with the EV given up, relative to what the decision put at stake:
 *
 *     points = 100 × max(0, 1 − 2 × EV lost / stake)
 *
 * so giving up a quarter of the stake on average scores 50, and half of it or more scores 0. Chart
 * spots have no EV: right is 100, wrong is 0. Unscored spots return null and do not count.
 */
export function grade(spot, choice) {
  if (choice == null) return { points: null, best: false, loss: null }          // outside what the spot scores
  if (!spot.scored) return { points: null, best: spot.best.includes(choice), loss: null }
  if (spot.best.includes(choice)) return { points: 100, best: true, loss: 0 }
  if (spot.source === 'chart') return { points: 0, best: false, loss: null }
  const top = Math.max(...Object.values(spot.ev))
  const loss = top - spot.ev[choice]
  return { points: Math.round(100 * Math.max(0, 1 - 2 * loss / spot.stake)), best: false, loss }
}

/**
 * OPEN SIZES, scored against the rule the Bet sizing lesson teaches (content/lessons/maths/bet-sizing.md):
 * a tournament open of about 2 to 3 big blinds — PokerNews (2.2–2.5x usual), Jonathan Little (2–3x
 * standard), Miikka Anttonen (up to 3–3.5x from the small blind). A rule from those sources, not a
 * solved answer, and the page says so. Inside the band is full marks; each big blind outside it costs
 * OPEN_STEP points, down to 0 — so an all-in open of 50 big blinds scores nothing.
 */
export const OPEN_BAND = { min: 2, max: 3, sbMax: 3.5 }
export const OPEN_STEP = 25
export function openSizePoints(seat, bb) {
  const hi = seat === 'SB' ? OPEN_BAND.sbMax : OPEN_BAND.max
  const off = bb < OPEN_BAND.min ? OPEN_BAND.min - bb : bb > hi ? bb - hi : 0
  return { points: Math.max(0, Math.round(100 - OPEN_STEP * off)), off, lo: OPEN_BAND.min, hi }
}

/**
 * Grade what the reader actually did. As grade(), plus one thing: when the chart says raise and you do,
 * the SIZE of the open counts too — the decision is right, and the size is held to the lesson's band.
 */
export function gradeChoice(spot, choice) {
  const g = grade(spot, choice.id)
  if (spot.type !== 'rfi' || choice.id !== 'raise' || !g.best || !(choice.amount > 0)) return g
  const bb = choice.amount / spot.state.blinds.bb
  const sz = openSizePoints(spot.seat, bb)
  return { ...g, points: sz.points, best: sz.off === 0, sizeOff: sz.off, band: [sz.lo, sz.hi] }
}

/** The kinds and seeds of one game's spots, in order — cheap; the page builds each spot as it is reached. */
export function gamePlan(seed, n = GAME_LENGTH) {
  const rng = mulberry32(seed >>> 0)
  return shuffle(MIX.slice(0, n), rng).map((type, k) => ({ type, seed: (seed * 31 + k * 7919 + 17) >>> 0 }))
}

/** The ten spots of one game, fully determined by `seed`. `charts` = { rfi, pushfold } as loaded JSON. */
export function makeGame(seed, charts, n = GAME_LENGTH) {
  return gamePlan(seed, n).map(p => makeSpot(p.type, p.seed, charts))
}

export function makeSpot(type, seed, charts) {
  const build = { rfi, shove, callshove, river, allin, bubble }[type]
  if (!build) throw new Error(`no spot type "${type}"`)
  // a builder may reject an unlucky deal (a river with nothing to catch); the next seed tries again
  for (let t = 0; t < 200; t++) {
    const s = build(mulberry32((seed + t * 104729) >>> 0), charts, seed + t)
    if (s) return { type, seed, ...s }
  }
  throw new Error(`could not build a ${type} spot from seed ${seed}`)
}

// --- helpers ---------------------------------------------------------------------------------------

/** A random two-card hand from a cell, avoiding `dead`. */
function comboOf(rng, cell, dead = []) {
  const ok = cellCombos(cell.i, cell.j).filter(c => !c.some(x => dead.includes(x)))
  return ok.length ? pick(rng, ok) : null
}
const allCells = () => { const out = []; for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) out.push({ i, j }); return out }
const inRange = (w, cell) => w[idx(cell.i, cell.j)] > 0

/** Combos of a weighted range that survive `dead`, with their weight. */
function liveCombos(w, dead) {
  const out = []
  for (const cell of allCells()) {
    const wt = w[idx(cell.i, cell.j)]
    if (!wt) continue
    for (const c of cellCombos(cell.i, cell.j)) if (!c.some(x => dead.includes(x))) out.push({ c, wt, cell })
  }
  return out
}

/** Play folds until `hero` is to act. */
function foldTo(s, hero) {
  let g = 0
  while (s.toAct != null && s.toAct !== hero && g++ < 20) s = applyAction(s, { type: 'fold' })
  return s
}
/** Check or call until the street changes (used to walk a heads-up hand to a later street). */
function passStreet(s) {
  const st = s.street
  let g = 0
  while (s.street === st && s.toAct != null && g++ < 10) {
    const a = legalActions(s)
    s = applyAction(s, a.some(x => x.type === 'check') ? { type: 'check' } : { type: 'call' })
  }
  return s
}
const assertLegal = (s, options) => {
  const legal = legalActions(s).map(a => a.type)
  for (const o of options) if (!legal.includes(o.action.type)) throw new Error(`option ${o.id} is not legal here`)
}

// --- 1. open or fold, against the chart -------------------------------------------------------------

const RFI_OFFSET = { BTN: 0, SB: 1, UTG: 3, UTG1: 4, MP: 5, LJ: 6, HJ: 7, CO: 8 }   // seats left of the button
const RFI_WHERE = { UTG: 'under the gun', UTG1: 'under the gun + 1', MP: 'in middle position', LJ: 'in the lojack', HJ: 'in the hijack', CO: 'in the cutoff', BTN: 'on the button', SB: 'in the small blind' }

function rfi(rng, charts) {
  const chart = charts.rfi
  const pos = pick(rng, chart.positions)
  const w = parseRange(pos.range)
  // half from inside the range and half from outside, as the trainer does: the boundary is the part
  // worth testing, and a real deal would hand you a fold nine times in ten
  const inside = rng() < 0.5
  const cells = allCells().filter(c => inRange(w, c) === inside)
  const cell = pick(rng, cells)
  const hand = comboOf(rng, cell)
  const button = (9 - RFI_OFFSET[pos.id]) % 9                    // the hero sits at seat 0
  const seats = Array.from({ length: 9 }, (_, i) => ({ name: i === 0 ? 'You' : NAMES[i - 1], stack: 50 * BB }))
  let s = createHand({ seats, button, blinds: { sb: SB, bb: BB }, hole: { 0: hand }, seed: (rng() * 1e9) | 0 })
  s = foldTo(s, 0)
  const options = [
    { id: 'fold', label: 'Fold', action: { type: 'fold' } },
    { id: 'raise', label: 'Raise', note: 'the size counts: 2–3 big blinds (3.5 from the small blind)', action: { type: 'raise', amount: 500 } },
  ]
  assertLegal(s, options)
  const open = inRange(w, cell)
  return {
    state: s, hero: 0, seat: pos.id, topic: `preflop.rfi.${pos.id}`, source: 'chart',
    title: 'Open or fold',
    prompt: `Everyone has folded to you ${RFI_WHERE[pos.id] || pos.name.toLowerCase()}. ${glyphs(hand)} — raise or fold?`,
    facts: [`Nine-handed, 50 big blinds each, blinds 100/200.`],
    options, ev: null, stake: null, unit: null, scored: true,
    best: [open ? 'raise' : 'fold'],
    answer: `${cellName(cell.i, cell.j)} is ${open ? 'inside' : 'outside'} the ${pos.name.toLowerCase()} opening range, ${pos.pct}% of hands: ${pos.range}.`,
    scoredBy: "this app's opening chart — written from general positional principles, not solver output, and not GTO",
    lesson: { href: '#/lesson/ranges/opening-charts', title: 'Opening charts — what to raise from each seat' },
  }
}

// --- 2 and 3. heads-up push/fold, against the solved chart ------------------------------------------

// The chart was solved with a small blind of half a big blind and no ante (scripts/build-pushfold.mjs
// calls nashPushFold with its defaults), so these tables are built exactly that way. 2–15bb, as the
// trainer: below 2 there is nothing to decide, above 15 shove-or-fold stops being the right model.
const PF_MIN = 2, PF_MAX = 15
const band = bb => bb <= 5 ? '2-5bb' : bb <= 10 ? '6-10bb' : '11-15bb'

function pfSpot(rng, charts, seat) {
  const depth = PF_MIN + ((rng() * (PF_MAX - PF_MIN + 1)) | 0)
  const d = charts.pushfold.depths.find(x => x.bb === depth)
  const mine = parseRange(seat === 'sb' ? d.push : d.call)
  const mixed = parseRange(seat === 'sb' ? (d.pushMixed || '') : (d.callMixed || ''))
  // The other side plays the chart AS SOLVED: its pure hands always, and the hands the solution mixes
  // (played 35–65% of the time, listed apart from the main range) at half weight — not all or nothing.
  const theirs = withMixed(parseRange(seat === 'sb' ? d.call : d.push), parseRange(seat === 'sb' ? (d.callMixed || '') : (d.pushMixed || '')))
  const inside = rng() < 0.5
  // mixed hands are never dealt: the solution plays them both ways, so there is nothing to score
  const cells = allCells().filter(c => inRange(mine, c) === inside && !inRange(mixed, c))
  if (!cells.length) return null
  const cell = pick(rng, cells)
  const hand = comboOf(rng, cell)
  const villain = pick(rng, NAMES)
  // heads-up the button is the small blind; the hero is seat 0
  const seats = [{ name: 'You', stack: depth * BB }, { name: villain, stack: depth * BB }]
  const button = seat === 'sb' ? 0 : 1
  // the opponent's hidden cards come from the range the chart says they play, so the picture is honest
  const theirCombos = liveCombos(theirs, hand)
  if (!theirCombos.length) return null
  const vHand = pickWeighted(rng, theirCombos).c
  let s = createHand({ seats, button, blinds: { sb: SB, bb: BB }, hole: { 0: hand, 1: vHand }, seed: (rng() * 1e9) | 0 })
  if (seat === 'bb') s = applyAction(s, { type: 'raise', amount: depth * BB })   // they shove
  // their range, without the cards in the hero's hand — card removal changes how often they continue
  // how often they continue, out of the 1,225 hands left once yours are out — card removal included
  const cont = theirCombos.reduce((a, o) => a + o.wt, 0) / 1225
  const mc = equityMC([hand, theirs], [], [], { trials: 30000, seed: (rng() * 1e9) | 0 })
  const eq = mc.equity[0], se = mc.stderr[0]
  const chartSays = inRange(mine, cell)
  if (seat === 'sb') {
    // compared with folding the small blind (−0.5): they fold → +1 net; they call → eq × 2S − S net
    const shoveNet = (1 - cont) * 1 + cont * (eq * 2 * depth - depth)
    const ev = { fold: 0, shove: shoveNet + 0.5 }
    const noise = SIGMA * cont * 2 * depth * se
    const options = [
      { id: 'fold', label: 'Fold', action: { type: 'fold' } },
      { id: 'shove', label: `All in for ${depth} big blinds`, action: { type: 'raise', amount: depth * BB } },
    ]
    assertLegal(s, options)
    return {
      state: s, hero: 0, topic: `pushfold.hu.sb.${band(depth)}`, source: 'pushfold',
      title: 'Shove or fold',
      prompt: `Heads-up, ${depth} big blinds each. You are the small blind with ${glyphs(hand)}. All in, or fold?`,
      facts: [`Heads-up, blinds 100/200, no ante — the game the push/fold chart solves.`, `${villain} plays the chart as solved: they call ${pct(cont)} of the hands they can hold (${d.call}${d.callMixed ? `; ${d.callMixed} about half the time` : ''}).`],
      options, ev, stake: depth, unit: 'bb', scored: true,
      best: bestOf(ev, noise, chartSays ? 'shove' : 'fold'),
      chartSays: chartSays ? 'shove' : 'fold',
      answer: `Shoving wins the blind ${pct(1 - cont)} of the time; called, ${cellName(cell.i, cell.j)} has ${pct(eq)} equity against their calling range. Against folding that is ${sign(ev.shove)} big blinds.`,
      scoredBy: 'the heads-up push/fold equilibrium this app solved — exact for heads-up and chips only',
      lesson: { href: '#/tools/pushfold', title: 'Push or fold (trainer)' },
    }
  }
  // big blind facing a shove: fold loses the posted blind (−1 net); call is eq × 2S − S net
  const callNet = eq * 2 * depth - depth
  const ev = { fold: 0, call: callNet + 1 }
  const noise = SIGMA * 2 * depth * se
  const options = [
    { id: 'fold', label: 'Fold', action: { type: 'fold' } },
    { id: 'call', label: `Call ${depth - 1} big blinds more`, action: { type: 'call' } },
  ]
  assertLegal(s, options)
  return {
    state: s, hero: 0, topic: `pushfold.hu.bb.${band(depth)}`, source: 'pushfold',
    title: 'Calling a shove',
    prompt: `Heads-up, ${depth} big blinds each. ${villain} shoves from the small blind. You have ${glyphs(hand)} in the big blind. Call or fold?`,
    facts: [`Heads-up, blinds 100/200, no ante — the game the push/fold chart solves.`, `${villain} plays the chart as solved: they shove ${pct(cont)} of the hands they can hold (${d.push}${d.pushMixed ? `; ${d.pushMixed} about half the time` : ''}).`],
    options, ev, stake: depth - 1, unit: 'bb', scored: true,
    best: bestOf(ev, noise, chartSays ? 'call' : 'fold'),
    chartSays: chartSays ? 'call' : 'fold',
    answer: `${cellName(cell.i, cell.j)} has ${pct(eq)} equity against their shoving range, and calling ${depth - 1} more to win a pot of ${2 * depth} needs ${pct((depth - 1) / (2 * depth))}. Against folding that is ${sign(ev.call)} big blinds.`,
    scoredBy: 'the heads-up push/fold equilibrium this app solved — exact for heads-up and chips only',
    lesson: { href: '#/tools/pushfold', title: 'Push or fold (trainer)' },
  }
}
const shove = (rng, charts) => pfSpot(rng, charts, 'sb')
const callshove = (rng, charts) => pfSpot(rng, charts, 'bb')

/** A range with its mixed cells set to half weight. */
function withMixed(pure, mixed) {
  const w = pure.slice()
  for (let c = 0; c < w.length; c++) if (mixed[c] > 0) w[c] = 0.5
  return w
}
/** One combo, drawn in proportion to its weight. */
function pickWeighted(rng, combos) {
  let x = rng() * combos.reduce((a, o) => a + o.wt, 0)
  for (const o of combos) { x -= o.wt; if (x <= 0) return o }
  return combos[combos.length - 1]
}

/** Every option within `noise` of the top EV counts as best. */
function bestOf(ev, noise, prefer) {
  const top = Math.max(...Object.values(ev))
  const best = Object.keys(ev).filter(k => ev[k] >= top - noise)
  return best.length ? best : [prefer]
}
const pct = x => `${(x * 100).toFixed(1)}%`
const sign = x => `${x >= 0 ? '+' : '−'}${Math.abs(r1(x)).toFixed(1)}`

// --- 4. a river bet into a bluff-catcher: pot odds against a stated range, exact ---------------------

function river(rng, charts) {
  const btn = charts.rfi.positions.find(p => p.id === 'BTN')
  const deck = shuffle(makeDeck(), rng)
  const board = deck.slice(0, 5)
  // the hero holds exactly one pair: good enough to catch a bluff, not to call everything
  const hand = deck.slice(5, 7)
  const ev0 = evaluate([...hand, ...board])
  if (ev0.cat !== PAIR) return null
  const opener = liveCombos(parseRange(btn.range), [...hand, ...board])
  const value = [], misses = []
  for (const o of opener) {
    const v = evaluate([...o.c, ...board])
    const cmp = compare(v, ev0)
    if (cmp > 0) value.push({ ...o, v })
    else if (cmp < 0 && v.cat === HIGH_CARD) misses.push(o)        // a bluff is a hand that missed
  }
  if (value.length < 3 || misses.length < 6) return null
  // size and bluff count chosen so the answer is sometimes call and sometimes fold
  const potBB = 5                                                  // heads-up: a 2.5bb open from the button (the small blind), called
  const betBB = pick(rng, [2.5, 3.5, 4, 5.5])                      // roughly half pot to pot
  const need = betBB / (potBB + 2 * betBB)
  const target = need * (0.45 + rng() * 1.1)
  // bluffs come in whole cells, so the stated range is readable: "QJs, JTs, T9s"
  const bluffCells = shuffle([...new Set(misses.map(m => cellName(m.cell.i, m.cell.j)))], rng)
  const wantBluffs = Math.round(target / (1 - target) * value.length)
  const chosen = [], bluffs = []
  for (const name of bluffCells) {
    if (bluffs.length >= wantBluffs) break
    chosen.push(name)
    bluffs.push(...misses.filter(m => cellName(m.cell.i, m.cell.j) === name))
  }
  if (!bluffs.length) return null
  const eq = bluffs.length / (bluffs.length + value.length)        // exact: nothing left to come
  const villain = pick(rng, NAMES)
  const vHand = pick(rng, [...value, ...bluffs]).c
  const stack = 50 * BB
  let s = createHand({ seats: [{ name: 'You', stack }, { name: villain, stack }], button: 1, blinds: { sb: SB, bb: BB }, hole: { 0: hand, 1: vHand }, board, seed: (rng() * 1e9) | 0 })
  s = applyAction(s, { type: 'raise', amount: 500 })               // they open the button to 2.5bb
  s = applyAction(s, { type: 'call' })                              // you defend the big blind
  s = passStreet(s); s = passStreet(s)                              // flop and turn checked through
  if (s.street !== 'river') return null
  s = applyAction(s, { type: 'check' })
  s = applyAction(s, { type: 'bet', amount: betBB * BB })
  const ev = { fold: 0, call: eq * (potBB + 2 * betBB) - betBB }
  const options = [
    { id: 'fold', label: 'Fold', action: { type: 'fold' } },
    { id: 'call', label: `Call ${betBB * BB}`, action: { type: 'call' } },
  ]
  assertLegal(s, options)
  const valueBy = {}
  for (const v of value) { const k = describe(v.v).split(',')[0]; valueBy[k] = (valueBy[k] || 0) + 1 }
  return {
    state: s, hero: 0, topic: 'maths.call.river', source: 'potodds',
    title: 'Catching a bluff',
    prompt: `Heads-up, ${villain} raised to 500 on the button and you called in the big blind; flop and turn went check, check. You check with ${glyphs(hand)} — ${describe(ev0).toLowerCase()} — and they bet ${betBB * BB} into ${potBB * BB}. Call or fold?`,
    facts: [
      `Assume they bet every hand from their button range that beats you: ${value.length} combinations (${Object.entries(valueBy).map(([k, n]) => `${k.toLowerCase()} ${n}`).join(', ')}).`,
      `And these bluffs, hands that missed: ${chosen.length > 10 ? `${chosen.slice(0, 10).join(', ')} and ${chosen.length - 10} more hand types` : chosen.join(', ')} — ${bluffs.length} combinations.`,
    ],
    options, ev, stake: betBB, unit: 'bb', scored: true,
    best: bestOf(ev, 1e-9, ev.call >= 0 ? 'call' : 'fold'),
    answer: `You win when they are bluffing: ${bluffs.length} of ${bluffs.length + value.length} combinations, ${pct(eq)}. Calling ${betBB} to win ${potBB + betBB} needs ${pct(need)}. Against folding, calling is ${sign(ev.call)} big blinds.`,
    scoredBy: 'pot odds against the stated range — exact, because nothing can be bet after the river',
    lesson: { href: '#/lesson/maths/bluffing-and-mdf', title: 'Bluffing, and how often to fold' },
  }
}

// --- 5. a draw facing an all-in on the turn: pot odds against a stated hand, exact ------------------

function allin(rng) {
  const deck = shuffle(makeDeck(), rng)
  const board = deck.slice(0, 4)
  const vHand = deck.slice(4, 6), hand = deck.slice(6, 8)
  const vNow = evaluate([...vHand, ...board]), hNow = evaluate([...hand, ...board])
  // they are ahead with at least a pair; you are behind but drawing
  if (vNow.cat < PAIR || compare(hNow, vNow) >= 0 || vNow.cat > TWO_PAIR) return null
  let wins = 0, ties = 0, n = 0
  for (const c of deck.slice(8)) {
    const h = evaluate([...hand, ...board, c]), v = evaluate([...vHand, ...board, c])
    const k = compare(h, v); n++
    if (k > 0) wins++; else if (k === 0) ties++
  }
  const eq = (wins + ties / 2) / n
  if (eq < 0.08 || eq > 0.45) return null                          // a real draw, not a lock or a brick
  const outs = wins + ties / 2
  // the pot before the turn shove, and a shove sized so the answer goes both ways
  const flopBet = pick(rng, [300, 400, 600])
  const potTurn = 2 * (500 + flopBet)
  const need0 = eq * (0.55 + rng() * 0.9)
  const shoveChips = Math.max(200, Math.round(need0 * potTurn / (1 - 2 * need0) / 100) * 100)
  // a shove so small it needs under 10% is a call nobody gets wrong — deal again
  if (!(shoveChips > 0) || need0 >= 0.5 || need0 < 0.1) return null
  const stack = 500 + flopBet + shoveChips
  const villain = pick(rng, NAMES)
  let s = createHand({ seats: [{ name: 'You', stack }, { name: villain, stack }], button: 1, blinds: { sb: SB, bb: BB }, hole: { 0: hand, 1: vHand }, board: [...board, deck[8]], seed: (rng() * 1e9) | 0 })
  s = applyAction(s, { type: 'raise', amount: 500 })
  s = applyAction(s, { type: 'call' })
  s = applyAction(s, { type: 'check' })
  s = applyAction(s, { type: 'bet', amount: flopBet })
  s = applyAction(s, { type: 'call' })
  if (s.street !== 'turn') return null
  s = applyAction(s, { type: 'check' })
  s = applyAction(s, { type: 'bet', amount: shoveChips })          // all in
  if (!s.seats[1].allIn) return null
  const P = potTurn / BB, S = shoveChips / BB
  const ev = { fold: 0, call: eq * (P + 2 * S) - S }
  const options = [
    { id: 'fold', label: 'Fold', action: { type: 'fold' } },
    { id: 'call', label: `Call ${shoveChips}`, action: { type: 'call' } },
  ]
  assertLegal(s, options)
  const need = S / (P + 2 * S)
  return {
    state: s, hero: 0, topic: 'maths.call.allin', source: 'potodds',
    title: 'Calling with a draw',
    prompt: `On the turn ${villain} moves all in for ${shoveChips} into ${potTurn}. You hold ${glyphs(hand)}. Call or fold?`,
    facts: [`Say they hold ${glyphs(vHand)} — ${describe(vNow).toLowerCase()}.`, `They are all in, so nothing more can be won or lost after this call: the price is all there is.`],
    options, ev, stake: S, unit: 'bb', scored: true,
    best: bestOf(ev, 1e-9, ev.call >= 0 ? 'call' : 'fold'),
    answer: `${r1(outs)} of the ${n} river cards win for you (ties count half): ${pct(eq)}. Calling ${S} to win ${P + S} needs ${pct(need)}. Against folding, calling is ${sign(ev.call)} big blinds.`,
    scoredBy: 'pot odds against the stated hand — exact: every river card counted',
    lesson: { href: '#/lesson/maths/pot-odds', title: 'Pot odds' },
  }
}

// --- 6. the bubble: a big-blind call, in money ------------------------------------------------------

const PAYOUTS = [50, 30, 20]

function bubble(rng, charts) {
  const BBB = 1000, BSB = 500                                       // a later level: 500/1,000
  const raw = [0, 0, 0, 0].map(() => 6 + rng() * 34)              // 6–40 big blinds each
  const stacks = raw.map(x => Math.round(x) * BBB)
  // seats: 0 You (big blind), 1 the shover (small blind), 2 and 3 fold
  const depth = Math.min(15, Math.max(PF_MIN, Math.round(Math.min(stacks[0], stacks[1]) / BBB)))
  const d = charts.pushfold.depths.find(x => x.bb === depth)
  const theirs = parseRange(d.push)
  // Mostly hands that would CALL counting chips (the chart's calling range at this depth): whether they
  // still call when the chips are money is the whole lesson. A random hand is nearly always a plain fold.
  const chipCalls = parseRange(d.call)
  const dealFrom = rng() < 0.6 ? allCells().filter(c => inRange(chipCalls, c)) : allCells()
  const cell = pick(rng, dealFrom.length ? dealFrom : allCells())
  const hand = comboOf(rng, cell)
  const vCombos = liveCombos(theirs, hand)
  if (!vCombos.length) return null
  const vHand = pick(rng, vCombos).c
  const villain = pick(rng, NAMES)
  // clockwise from the button: button, small blind, big blind, then the first to act. The hero (seat 0)
  // is the big blind, so the button is seat 2, the small blind — the shover — seat 3, and seat 1 acts
  // first and folds, as does the button. stacks[0] is the hero's, stacks[1] the shover's.
  const button = 2, heroSeat = 0, vSeat = 3
  const others = NAMES.filter(x => x !== villain)
  const cfg = [
    { name: 'You', stack: stacks[0] },
    { name: others[0], stack: stacks[2] },
    { name: others[1], stack: stacks[3] },
    { name: villain, stack: stacks[1] },
  ]
  let s = createHand({ seats: cfg, button, blinds: { sb: BSB, bb: BBB }, hole: { [heroSeat]: hand, [vSeat]: vHand }, seed: (rng() * 1e9) | 0 })
  s = foldTo(s, vSeat)
  if (s.toAct !== vSeat) return null
  s = applyAction(s, { type: 'raise', amount: stacks[1] })           // all in
  if (s.toAct !== heroSeat || !s.seats[vSeat].allIn) return null
  const heroStack = stacks[0], vS = stacks[1]
  const E = Math.min(heroStack, vS)
  const mc = equityMC([hand, theirs], [], [], { trials: 30000, seed: (rng() * 1e9) | 0 })
  const eq = mc.equity[0], se = mc.stderr[0]
  // stacks in the order [hero, shover, other, other] for the ICM model
  const base = [stacks[0], stacks[1], stacks[2], stacks[3]]
  const fold = base.slice(); fold[0] -= BBB; fold[1] += BBB
  const win = base.slice(); win[0] += E; win[1] -= E
  const lose = base.slice(); lose[0] -= E; lose[1] += E
  const pool = PAYOUTS.map(p => p / 100)
  const money = st => icmEquity(st.map(x => Math.max(0, x)), pool)[0] * 100   // % of the prize pool
  const mFold = money(fold), mWin = money(win), mLose = money(lose)
  const ev = { fold: 0, call: eq * mWin + (1 - eq) * mLose - mFold }
  const chipCall = (eq * 2 * E - E + BBB) / BBB                     // the same call, counted in chips
  const options = [
    { id: 'fold', label: 'Fold', action: { type: 'fold' } },
    { id: 'call', label: `Call ${E - BBB}`, action: { type: 'call' } },
  ]
  assertLegal(s, options)
  const needMoney = (mFold - mLose) / (mWin - mLose)
  return {
    state: s, hero: heroSeat, topic: 'icm.bubble.call', source: 'icm',
    title: 'The bubble',
    prompt: `Four left, three paid. ${villain} shoves from the small blind and you are in the big blind with ${glyphs(hand)}. Call or fold?`,
    facts: [
      `Prize pool: 1st ${PAYOUTS[0]}%, 2nd ${PAYOUTS[1]}%, 3rd ${PAYOUTS[2]}%, 4th nothing. Blinds 500/1,000.`,
      `Assume ${villain} shoves ${d.pushPct}% of hands (${d.push}) — the heads-up chart at ${depth} big blinds, a stated assumption, not a solve of this table.`,
    ],
    options, ev, stake: Math.abs(mWin - mLose), unit: '% of the prize pool', scored: true,
    best: bestOf(ev, SIGMA * se * Math.abs(mWin - mLose), ev.call >= 0 ? 'call' : 'fold'),
    answer: `You have ${pct(eq)} against their range. In chips the call needs ${pct((E - BBB) / (2 * E))}; in money it needs ${pct(needMoney)}, because losing costs your place in the money and winning cannot buy as much. Against folding, calling is ${sign(ev.call)} points of the prize pool (in chips it would be ${sign(chipCall)} big blinds).`,
    scoredBy: 'ICM (Malmuth–Harville) on the stated stacks and payouts — exact for those, with the shove range an assumption',
    lesson: { href: '#/lesson/stacks/the-bubble', title: 'The bubble' },
  }
}

// --- what you did at the table, as the decision that is scored -------------------------------------

/**
 * The table hands back a real action — fold, check, call, or a bet or raise of any size. This turns it
 * into the option the spot scores, and a sentence about the size. The SIZE IS NEVER GRADED: no lesson
 * teaches a sizing rule and there is no solver. Where an action falls outside what the spot's maths
 * covers — a limp or a small raise when the model is shove-or-fold, a raise with a bluff-catcher — it
 * is not scored, and `why` says so.
 *
 * @returns {{id: string|null, said: string, size: string|null, why: string|null}}
 */
export function optionFor(spot, action) {
  const s = spot.state, p = s.seats[spot.hero]
  const legal = legalActions(s)
  const big = legal.find(a => a.type === 'raise' || a.type === 'bet')
  const bbOf = n => `${r1(n / s.blinds.bb)} big blinds`
  const others = s.seats.filter((x, i) => i !== spot.hero && !x.folded)
  const allInFacing = others.length && others.every(x => x.allIn)
  const out = (id, said, size = null, why = null) => ({ id, said, size, why })

  if (action.type === 'fold') return out('fold', 'Fold')
  if (action.type === 'check') return out(spot.options.some(o => o.id === 'check') ? 'check' : null, 'Check')
  if (action.type === 'call') {
    if (spot.options.some(o => o.id === 'call')) return out('call', 'Call')
    if (spot.type === 'rfi') return out('limp', 'Just call (limp)', null, 'The opening chart raises or folds — it never just calls — so a limp is scored as neither of its answers.')
    if (spot.type === 'shove') return out(null, 'Just call (limp)', null, 'This spot is scored by the push/fold solution, where the only plays are all in or fold. A limp is outside that model, so it is not scored.')
    return out(null, 'Call', null, 'Not one of the plays this spot scores.')
  }
  // a bet or a raise, of whatever size
  const all = big && action.amount >= big.max
  const said = all ? 'All in' : `${action.type === 'bet' ? 'Bet' : 'Raise to'} ${action.amount.toLocaleString('en')}`
  if (spot.type === 'rfi') {
    const bb = action.amount / s.blinds.bb, sz = openSizePoints(spot.seat, bb)
    const band = `${sz.lo}–${sz.hi} big blinds`
    const c = out('raise', said, sz.off === 0
      ? `You opened to ${action.amount.toLocaleString('en')}, ${bbOf(action.amount)} — inside the ${band} the Bet sizing lesson teaches.`
      : `You opened to ${action.amount.toLocaleString('en')}, ${bbOf(action.amount)} — ${r1(sz.off)} big blind${sz.off === 1 ? '' : 's'} outside the ${band} the Bet sizing lesson teaches, so the size costs ${100 - sz.points} points when raising is right. (A rule from the lesson's sources, not a solved answer.)`)
    c.amount = action.amount
    return c
  }
  if (spot.type === 'shove') {
    if (all) return out('shove', 'All in')
    return out(null, said, null, `At ${bbOf(p.stack + p.committed)} the push/fold solution has only two plays, all in or fold. A smaller raise is outside that model, so it is not scored — and at these depths it usually commits you anyway.`)
  }
  if (allInFacing && spot.options.some(o => o.id === 'call')) {
    return out('call', said, 'Raising over an all-in is the same as calling: nobody can put in more, so the extra comes straight back.')
  }
  if (spot.type === 'river') {
    return out(null, said, null, 'A raise is not scored here. With a hand that beats only bluffs, a raise gets called by the hands that beat you and folds out the bluffs you were hoping to catch — the spot is built as call or fold.')
  }
  return out(null, said, null, 'Not one of the plays this spot scores.')
}
