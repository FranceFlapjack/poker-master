// Rule-based opponents. Three of them, and they are exactly what they look like: thresholds on a
// strength number, with some randomness so they are not a lookup table you can memorise.
//
// WHAT THESE ARE NOT. Not a solver, not an equilibrium, not an opponent worth copying. A bot that folds
// too much is beaten by betting every hand, and this one can be. They exist so a reader can play out a
// hand and feel the shape of the game — the streets, the sizing, the showdown — not so anyone can learn
// strategy from beating them.
//
// The strength signal is EQUITY AGAINST THE LIVE OPPONENTS, all assumed to hold random hands: a table
// lookup preflop, a short Monte Carlo after the flop. Counting the opponents matters more than it
// sounds — against one random hand a median holding is about half, which clears the price of a big
// blind, so a bot reading the heads-up number calls with everything at a nine-handed table. That is
// exactly what the first version did.
//
// Two scales come out of that, and they are not interchangeable:
//   `equity` — raw share of the pot, the right scale to compare against pot odds
//   `edge`   — that share divided by an even split, so 1.0 is an average hand however many are in
// Calls use equity. Bets and raises use edge, because "is this better than average" does not mean the
// same number heads-up as it does eight-handed.
//
// It still ignores position and what anybody's betting says. The thresholds paper over that; they are
// tuned to play recognisably, not correctly.

import { legalActions, potTotal } from '../engine/rules.js'
import { handToCell, newRange } from '../engine/ranges.js'
import { preflopStrength } from '../engine/preflop-strength.js'
import { equityMC } from '../engine/equity.js'
import { requiredEquity } from '../engine/ev.js'

const ANY = newRange().fill(1)

export const LEVELS = {
  loose: {
    name: 'Loose',
    blurb: 'Calls far too much and rarely raises. Beatable by betting your good hands relentlessly.',
    callMargin: -0.06, betAt: 1.45, raiseAt: 2.30, aggression: 0.22, size: 0.5, bluff: 0.02,
  },
  solid: {
    name: 'Solid',
    blurb: 'Plays a sensible range, bets when it has something, folds when it does not.',
    callMargin: 0.06, betAt: 1.55, raiseAt: 2.40, aggression: 0.55, size: 0.66, bluff: 0.06,
  },
  sharp: {
    name: 'Sharp',
    blurb: 'Aggressive, sizes bigger, and bluffs sometimes. Still only a set of thresholds.',
    callMargin: 0.03, betAt: 1.40, raiseAt: 2.15, aggression: 0.78, size: 0.78, bluff: 0.14,
  },
}

/** Opponents still live in the hand — the number the strength signal has to be measured against. */
export const liveOpponents = (state, seat) =>
  Math.max(1, state.seats.filter((p, k) => k !== seat && !p.folded).length)

/**
 * How strong this seat's hand is, as equity against that many random hands.
 * Returns both scales: `equity` for pot-odds comparisons, `edge` where 1.0 is an average hand.
 */
export function strength(state, seat, rng = Math.random) {
  const p = state.seats[seat]
  const opp = liveOpponents(state, seat)
  if (!p.hole) return { equity: 0, edge: 0, opponents: opp }

  let equity
  if (!state.board.length) {
    const { i, j } = handToCell(p.hole[0], p.hole[1])
    equity = preflopStrength(i, j, opp)
  } else {
    // Few trials on purpose: this runs on every bot decision, and a tighter number would rarely land on
    // the other side of a threshold.
    const villains = Array.from({ length: Math.min(opp, 5) }, () => ANY)
    equity = equityMC([p.hole, ...villains], state.board, [], { trials: 300, seed: (rng() * 1e9) | 0 }).equity[0]
  }
  return { equity, edge: equity * (opp + 1), opponents: opp }
}

/**
 * What this bot does now. Always returns something `applyAction` will accept, because every branch is
 * built from `legalActions` rather than hoped for.
 */
export function decide(state, { level = 'solid', rng = Math.random } = {}) {
  const legal = legalActions(state)
  if (!legal.length) throw new Error('bot asked to act when nobody is to act')
  const cfg = LEVELS[level] || LEVELS.solid
  const seat = state.toAct
  const p = state.seats[seat]
  const can = t => legal.find(a => a.type === t)

  const { equity, edge } = strength(state, seat, rng)
  const pot = potTotal(state)
  const toCall = state.currentBet - p.committed
  const clamp = (v, a) => Math.max(a.min, Math.min(a.max, Math.round(v)))

  if (toCall <= 0) {
    const bet = can('bet')
    const wants = edge >= cfg.betAt || rng() < cfg.bluff
    if (bet && wants && rng() < cfg.aggression) return { type: 'bet', amount: clamp(pot * cfg.size, bet) }
    return can('check') ? { type: 'check' } : { type: 'fold' }
  }

  const raise = can('raise')
  if (raise && edge >= cfg.raiseAt && rng() < cfg.aggression) {
    return { type: 'raise', amount: clamp(state.currentBet + pot * cfg.size, raise) }
  }
  if (equity >= requiredEquity(toCall, pot) + cfg.callMargin && can('call')) return { type: 'call' }
  // folding when checking is free would be silly, and legalActions offers both
  return can('check') ? { type: 'check' } : { type: 'fold' }
}

/** A seat → level map for a table, so the reader meets a mix rather than nine clones. */
export function seatLevels(n, { hero = 0, level = null, rng = Math.random } = {}) {
  const pool = Object.keys(LEVELS)
  const out = {}
  for (let k = 0; k < n; k++) {
    if (k === hero) continue
    out[k] = level || pool[(rng() * pool.length) | 0]
  }
  return out
}
