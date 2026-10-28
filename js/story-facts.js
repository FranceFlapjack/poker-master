// The numbers the story home states, worked out here rather than typed into its copy. Pure: no DOM, so
// scripts/engine-test.mjs checks every claim the captions make against these.

import { shapeCounts, cellName, GRID } from './engine/ranges.js'
import { preflopStrength } from './engine/preflop-strength.js'
import { outsEquity } from './engine/ev.js'

const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r) }

export const COUNTS = {
  cards: 52,
  starting: choose(52, 2),        // two-card starting hands
  flops: choose(50, 3),           // flops for any one starting hand
  fiveCard: choose(52, 5),        // five-card poker hands
}
export const SHAPES = shapeCounts()   // 13 pairs, 78 suited, 78 offsuit — 169 kinds

export const ODDS = {
  aces: COUNTS.starting / 6,                        // 6 ways to hold two aces: 1 in 221
  pair: COUNTS.starting / SHAPES.pair.combos,       // 78 ways to hold a pair: 1 in 17
  flushDraw: outsEquity(9, 2),                      // nine outs, turn and river to come
  // As Ah against Ks Kh, every one of the 1,712,304 boards enumerated by equityExact — engine-test.mjs
  // recomputes it; a constant here because the full enumeration takes a second the home page should not spend
  acesVsKings: 0.8264,
}

/** Every cell of the 13×13 grid against `opponents` random hands: {i, j, name, equity, rank} (rank 1 = best). */
export function gridAgainst(opponents) {
  const cells = []
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) cells.push({ i, j, name: cellName(i, j), equity: preflopStrength(i, j, opponents) })
  ;[...cells].sort((a, b) => b.equity - a.equity).forEach((c, k) => { c.rank = k + 1 })
  return cells
}
