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

// "Even aces lose": the best starting hand against the second best, all in before the flop.
export const ACES = parseCards('As Ah'), KINGS = parseCards('Ks Kh')

/** One such hand dealt out from a fresh shuffle of the other 48 cards: the five board cards, and who won
 *  (1 aces, -1 kings, 0 a split pot). */
export function acesVsKingsOnce(rng = Math.random) {
  const board = shuffle(deckWithout([...ACES, ...KINGS]), rng).slice(0, 5)
  return { board, result: Math.sign(compare(evaluate([...ACES, ...board]), evaluate([...KINGS, ...board]))) }
}

/** How often the aces win outright in the long run. Sampled (the page says "about"); worked out when asked for. */
export const acesLongRun = () => equityMC([ACES, KINGS], [], [], { trials: 40000, seed: 7 }).win[0]
