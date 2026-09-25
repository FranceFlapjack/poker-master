// Heads-up push/fold Nash, by iterated best response.
//
// This is the one chart in this app that is COMPUTED rather than authored. When both players are short
// enough that the only sensible actions are shove or fold, the game is small enough to solve properly:
// 169 hands for the shover, 169 for the caller, and no streets afterwards. Iterating each side's best
// response against the other converges on the equilibrium.
//
// That makes it a genuinely different object from content/charts/rfi-9max.json, which is a teaching
// baseline somebody wrote down. This one is an answer.
//
// The honest limits, which every page using it has to repeat:
//   - HEADS-UP only. Multiway push/fold is a different game, and approximating it by pretending the
//     players behind act one at a time is wrong in ways that matter. This module does not pretend to.
//   - CHIP EV only. At a final table the money is not the chips (see icm.js), and a chip-EV shoving
//     range is too wide wherever ICM pressure is real.
//   - The equity it consumes is sampled, so the boundary is fuzzy. Hands sitting exactly on the
//     threshold can fall either way on a re-run.
//
// Everything is measured in BIG BLINDS, as a net change from the start of the hand.

import { GRID, idx, cellCombos, newRange } from './ranges.js'

/** Combination weight of each grid cell — 6 for a pair, 4 suited, 12 offsuit, 1,326 in total. */
function cellWeights() {
  const w = new Float64Array(169)
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) w[idx(i, j)] = cellCombos(i, j).length
  return w
}
const WEIGHTS = cellWeights()
const TOTAL_COMBOS = WEIGHTS.reduce((a, b) => a + b, 0)

/** A range's width as a share of all 1,326 hands. */
export function widthOf(range) {
  let w = 0
  for (let c = 0; c < 169; c++) w += range[c] * WEIGHTS[c]
  return w / TOTAL_COMBOS
}

/**
 * Equity of one cell against a weighted range of cells.
 *
 * Card removal WITHIN a matchup is handled by the equity function; what this does not do is reweight
 * the range as the hero's cards are removed from it. The error is small and close to uniform across
 * hands, so it does not move the threshold by more than a hand or two.
 */
export function equityVsRange(cell, range, equity) {
  let num = 0, den = 0
  for (let c = 0; c < 169; c++) {
    const w = range[c] * WEIGHTS[c]
    if (!w) continue
    num += w * equity(cell, c)
    den += w
  }
  return den ? num / den : 0.5
}

/**
 * Solve the heads-up shove-or-fold game.
 *
 * @param {object} o
 * @param {number} o.effStack   effective stack in big blinds
 * @param {number} [o.sb]       small blind, in big blinds
 * @param {number} [o.ante]     ante per player, in big blinds
 * @param {(a:number,b:number)=>number} o.equity  equity of cell `a` against cell `b`
 * @returns {{push:Float64Array, call:Float64Array, pushPct:number, callPct:number, iterations:number, converged:boolean}}
 */
/**
 * `tolerance` is in BIG BLINDS of exploitability, and 0.005 is not a shrug — it is chosen to sit well
 * under the error already present in the sampled equity this consumes. Solving to 1e-5 against inputs
 * carrying ±0.8% equity noise would be inventing precision that the data cannot support.
 */
export function nashPushFold({ effStack, sb = 0.5, ante = 0, equity, maxIterations = 1500, tolerance = 5e-3 }) {
  if (!(effStack > 0)) throw new Error('effStack must be positive')
  if (typeof equity !== 'function') throw new Error('nashPushFold needs an equity(a, b) function')

  const bb = 1
  const S = effStack
  const pot = 2 * S + 2 * ante       // both all-in, antes included
  const risk = S + ante              // what either player has at stake once all-in
  const foldSB = -(sb + ante)        // the small blind giving up
  const foldBB = -(bb + ante)        // the big blind giving up to a shove

  /** The shover's best response to a given calling range. */
  const bestPush = call => {
    const callFreq = widthOf(call)
    const out = newRange()
    for (let h = 0; h < 169; h++) {
      const eq = callFreq > 0 ? equityVsRange(h, call, equity) : 0.5
      const ev = (1 - callFreq) * (bb + ante) + callFreq * (eq * pot - risk)
      out[h] = ev > foldSB ? 1 : 0
    }
    return out
  }

  /** EV of shoving hand `h` given how often, and with what, the big blind calls. */
  const evPush = (h, call, callFreq) => {
    const eq = callFreq > 0 ? equityVsRange(h, call, equity) : 0.5
    return (1 - callFreq) * (bb + ante) + callFreq * (eq * pot - risk)
  }
  /** EV of calling a shove with hand `h`. */
  const evCallWith = (h, push) => equityVsRange(h, push, equity) * pot - risk

  /**
   * How many big blinds either side would gain by abandoning its current strategy for its best
   * response. Zero means neither can do better, which is what equilibrium means.
   */
  const exploitability = (push, call, brPush, brCall) => {
    const callFreq = widthOf(call)
    let shoverGain = 0, callerGain = 0
    for (let h = 0; h < 169; h++) {
      const w = WEIGHTS[h]
      const pEV = evPush(h, call, callFreq)
      shoverGain += w * ((brPush[h] ? pEV : foldSB) - (push[h] * pEV + (1 - push[h]) * foldSB))
      const cEV = evCallWith(h, push)
      callerGain += w * ((brCall[h] ? cEV : foldBB) - (call[h] * cEV + (1 - call[h]) * foldBB))
    }
    return (shoverGain + callerGain) / TOTAL_COMBOS
  }

  /** The caller's best response to a given shoving range. */
  const bestCall = push => {
    const out = newRange()
    if (widthOf(push) === 0) return out       // never shoved at, so nothing to answer
    for (let h = 0; h < 169; h++) {
      const eq = equityVsRange(h, push, equity)
      out[h] = (eq * pot - risk) > foldBB ? 1 : 0
    }
    return out
  }

  // FICTITIOUS PLAY, not raw best response.
  //
  // Jumping straight to each side's best response does not converge here, and not because of a bug:
  // both responses are hard 0/1 thresholds, so the two sides flip past each other and oscillate
  // forever. Measured at several stack depths, it simply never settled.
  //
  // So each side instead answers the other's RUNNING AVERAGE and moves only part of the way, with the
  // step shrinking as 1/t. That is standard fictitious play, it converges for a zero-sum game like this
  // one, and the average it converges to is the equilibrium — including where that equilibrium is
  // genuinely mixed, which a 0/1 iteration can never represent.
  //
  // Convergence is judged by EXPLOITABILITY, not by how far the strategy moved. A decaying 1/t step
  // cannot move less than about 1/t however settled the answer is, so a movement test reports failure
  // forever no matter how good the solution — which is exactly what it did before this was changed.
  // Exploitability asks the question that actually matters: how much does either side gain by deviating?
  let call = newRange().fill(0.15)
  let push = newRange().fill(0.15)
  let iterations = 0, converged = false, gap = Infinity

  for (; iterations < maxIterations; iterations++) {
    const brPush = bestPush(call)
    const brCall = bestCall(push)
    gap = exploitability(push, call, brPush, brCall)
    if (gap < tolerance) { iterations++; converged = true; break }
    const step = 1 / (iterations + 2)
    push = blend(push, brPush, step)
    call = blend(call, brCall, step)
  }

  // The averages are frequencies. A chart needs a decision, so hands played more often than not are in
  // — but the frequencies are returned too, because a hand at 0.5 is genuinely a coin flip and saying
  // otherwise would be inventing precision.
  const pushPure = newRange(), callPure = newRange()
  for (let c = 0; c < 169; c++) { pushPure[c] = push[c] >= 0.5 ? 1 : 0; callPure[c] = call[c] >= 0.5 ? 1 : 0 }

  return {
    push: pushPure, call: callPure,
    pushFreq: push, callFreq: call,
    pushPct: widthOf(pushPure), callPct: widthOf(callPure),
    iterations, converged, exploitability: gap, effStack, sb, ante,
  }
}

/** Move `from` a fraction `t` of the way towards `to`. */
function blend(from, to, t) {
  const out = newRange()
  for (let c = 0; c < 169; c++) out[c] = from[c] + (to[c] - from[c]) * t
  return out
}

/** How far two ranges are apart, weighted by how many actual hands each cell represents. */
function drift(a, b) {
  let d = 0
  for (let c = 0; c < 169; c++) d += Math.abs(a[c] - b[c]) * WEIGHTS[c]
  return d / TOTAL_COMBOS
}
