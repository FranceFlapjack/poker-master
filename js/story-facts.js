// The fixed numbers the story home states, worked out here rather than typed into its copy. Pure: no DOM, so
// scripts/engine-test.mjs checks every one. (The rest of the story — the dealt hand's rank and chances — is
// computed live in js/story.js for whatever hand is dealt.)

import { cellName, GRID } from './engine/ranges.js'
import { preflopStrength } from './engine/preflop-strength.js'
import { outsEquity } from './engine/ev.js'
import { parseCards, deckWithout, shuffle } from './engine/cards.js'
import { evaluate, compare } from './engine/evaluator.js'
import { equityMC } from './engine/equity.js'

const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r) }

export const COUNTS = {
  starting: choose(52, 2),        // two-card starting hands
  flops: choose(50, 3),           // flops for any one starting hand
}

export const ODDS = {
  flushDraw: outsEquity(9, 2),    // four to a flush on the flop: nine outs, turn and river to come
}

/** Every cell of the 13×13 grid against `opponents` random hands: {i, j, name, equity, rank} (rank 1 = best). */
export function gridAgainst(opponents) {
  const cells = []
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) cells.push({ i, j, name: cellName(i, j), equity: preflopStrength(i, j, opponents) })
  ;[...cells].sort((a, b) => b.equity - a.equity).forEach((c, k) => { c.rank = k + 1 })
  return cells
}

// "Even aces lose": two hands, all in before the flop, dealt out again and again. `a` is the favourite in each.
// `what` is said on the page, so each claim in it is checked by scripts/engine-test.mjs: AA, KK and 32o are ranks
// 1, 2 and 169 of the app's own table of the 169 hands against one random hand.
const matchup = (id, tab, names, a, b, what) => ({ id, tab, names, a: parseCards(a), b: parseCards(b), what })
export const MATCHUPS = [
  matchup('aa-kk', 'Aces v kings', ['Aces', 'Kings'], 'As Ah', 'Ks Kh', 'The best starting hand against the second best.'),
  matchup('qq-ak', 'Pair v ace-king', ['Queens', 'Ace-king'], 'Qs Qh', 'Ac Kd', 'A pair against two higher cards. Players call it a coin flip, though the pair is a little ahead.'),
  matchup('ak-aq', 'Ace-king v ace-queen', ['Ace-king', 'Ace-queen'], 'Ac Kd', 'Ah Qs', 'Both hold an ace, and one has the better card beside it. Players call that being dominated.'),
  matchup('aa-32', 'Best v worst', ['Aces', '3-2 offsuit'], 'As Ah', '3c 2d', 'The best starting hand against the worst.'),
]

/** One hand of a match-up dealt out from a fresh shuffle of the other 48 cards: the five board cards, and who won
 *  (1 the favourite `a`, -1 the underdog `b`, 0 a split pot). */
export function dealOnce(m, rng = Math.random) {
  const board = shuffle(deckWithout([...m.a, ...m.b]), rng).slice(0, 5)
  return { board, result: Math.sign(compare(evaluate([...m.a, ...board]), evaluate([...m.b, ...board]))) }
}

/** How often the favourite wins outright in the long run. Sampled (the page says "about"); worked out when asked for. */
export const longRun = m => equityMC([m.a, m.b], [], [], { trials: 40000, seed: 7 }).win[0]
