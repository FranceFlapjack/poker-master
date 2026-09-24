// The hand state machine: whose turn it is, what they may legally do, how the pot is built, and who
// gets paid. Everything interactive in this app goes through here — lesson spots, play-vs-bots, and
// (Phase 8) the replayer. 2 to 9 handed, because a live MTT runs nine-handed down to heads-up.
//
// Two rules are the usual place a hand engine breaks, so they are spelled out:
//
//   The big blind's option. A round does not close because everyone has matched the bet; it closes
//   because everyone has ACTED and matched. Posting a blind is not acting. Without that distinction a
//   limped pot ends before the big blind is ever asked, which is wrong and easy not to notice.
//
//   An all-in for less than a full raise does not reopen betting. Players who already acted must still
//   answer the larger bet, but may only call or fold. A later FULL raise reopens raising for everyone
//   again, including them — so the restriction is cleared by the next full raise, never latched.

import { evaluate } from './evaluator.js'
import { shuffle, mulberry32, deckWithout } from './cards.js'

export const STREETS = ['preflop', 'flop', 'turn', 'river']
const BOARD_CARDS = { flop: 3, turn: 1, river: 1 }

/**
 * @param {object} cfg
 * @param {{name?:string, stack:number}[]} cfg.seats  seat 0..n-1, clockwise
 * @param {number} cfg.button                        seat index of the dealer button
 * @param {{sb:number, bb:number, ante?:number}} cfg.blinds
 * @param {'none'|'each'|'bb'} [cfg.anteType]        'each' = everyone antes; 'bb' = one big-blind ante for the table
 * @param {Record<number, number[]>} [cfg.hole]      preset hole cards, for a fixed lesson spot
 * @param {number[]} [cfg.board]                     preset board, dealt as streets arrive
 * @param {number} [cfg.seed]                        seeded shuffle, so a drill is reproducible
 */
export function createHand(cfg) {
  const { seats: seatCfg, button, blinds, anteType = 'none', hole = {}, board = [], seed = 1 } = cfg
  if (seatCfg.length < 2 || seatCfg.length > 9) throw new Error('A hand needs 2 to 9 seats')
  if (button < 0 || button >= seatCfg.length) throw new Error('Button is not a seat')

  const seats = seatCfg.map((s, i) => ({
    name: s.name || `Seat ${i + 1}`,
    stack: s.stack,
    startStack: s.stack,
    committed: 0,     // this street
    total: 0,         // whole hand — what side pots are built from
    folded: false,
    allIn: false,
    hasActed: false,
    mayRaise: true,
    hole: hole[i] ? hole[i].slice() : null,
  }))

  const rng = mulberry32(seed)
  const preset = [...Object.values(hole).flat(), ...board]
  const deck = shuffle(deckWithout(preset), rng)

  const s = {
    seats, button, blinds: { ante: 0, ...blinds }, anteType,
    street: 'preflop',
    board: [],
    presetBoard: board.slice(),
    pot: 0,
    currentBet: 0,
    lastRaiseSize: 0,
    toAct: null,
    deck,
    actions: [],
    result: null,
  }

  postAntes(s)
  postBlinds(s)
  dealHoleCards(s)
  s.toAct = firstToActPreflop(s)

  // Short stacks can be all-in from the antes and blinds alone, with nobody left to act. The hand is
  // already decided and just needs its board.
  if (s.toAct == null || roundClosed(s)) return closeStreet(s)
  return s
}

// --- setup -----------------------------------------------------------------

function postAntes(s) {
  const { ante } = s.blinds
  if (!ante || s.anteType === 'none') return
  if (s.anteType === 'each') {
    for (const p of s.seats) put(p, Math.min(ante, p.stack))
  } else if (s.anteType === 'bb') {
    // Big-blind ante: one player posts for the whole table. Modern MTT standard — it speeds the game up.
    // TODO: a big blind whose ante obligation exceeds their stack is not handled specially here; they
    // simply post what they have and are all-in before cards. Real rooms differ on the exact remedy,
    // so this needs a decision rather than a guess.
    const bb = s.seats[bbSeat(s)]
    put(bb, Math.min(ante * liveSeats(s).length, bb.stack))
  }
  // antes are dead money: they belong to the pot, not to this street's betting
  for (const p of s.seats) { s.pot += p.committed; p.committed = 0 }
}

function postBlinds(s) {
  const sb = s.seats[sbSeat(s)], bb = s.seats[bbSeat(s)]
  put(sb, Math.min(s.blinds.sb, sb.stack))
  put(bb, Math.min(s.blinds.bb, bb.stack))
  s.currentBet = s.blinds.bb
  s.lastRaiseSize = s.blinds.bb   // the first raise must be at least one more big blind
  // Posting a blind is not acting: hasActed stays false, which is what gives the big blind its option.
}

function dealHoleCards(s) {
  for (const p of s.seats) if (!p.hole) p.hole = [s.deck.pop(), s.deck.pop()]
}

function put(p, amount) {
  const n = Math.min(amount, p.stack)
  p.stack -= n; p.committed += n; p.total += n
  if (p.stack === 0) p.allIn = true
  return n
}

// --- seating ---------------------------------------------------------------

const liveSeats = s => s.seats.filter(p => p.startStack > 0)
const isHeadsUp = s => s.seats.filter(p => p.startStack > 0).length === 2

export function nextSeat(s, from, pred = p => !p.folded && !p.allIn) {
  for (let k = 1; k <= s.seats.length; k++) {
    const i = (from + k) % s.seats.length
    if (pred(s.seats[i], i)) return i
  }
  return null
}

/** Heads-up, the button posts the small blind and acts first before the flop. */
export function sbSeat(s) {
  return isHeadsUp(s) ? s.button : nextSeat(s, s.button, p => p.startStack > 0)
}
export function bbSeat(s) {
  return nextSeat(s, sbSeat(s), p => p.startStack > 0)
}

function firstToActPreflop(s) {
  // after the big blind — heads-up that wraps back to the button/small blind
  return nextSeat(s, bbSeat(s))
}
function firstToActPostflop(s) {
  // first live player left of the button; heads-up that is the big blind
  return nextSeat(s, s.button)
}

// --- legal actions ---------------------------------------------------------

/**
 * What the player to act may do. Bet and raise amounts are "to" totals — the number a live player
 * announces ("raise to 900"), not the increment, which is where sizing bugs come from.
 */
export function legalActions(s) {
  if (s.toAct == null || s.street === 'complete') return []
  const p = s.seats[s.toAct]
  const toCall = s.currentBet - p.committed
  const maxTo = p.committed + p.stack
  const acts = []

  acts.push({ type: 'fold' })
  if (toCall <= 0) acts.push({ type: 'check' })
  else acts.push({ type: 'call', amount: Math.min(toCall, p.stack), allIn: p.stack <= toCall })

  if (p.stack > toCall) {
    if (s.currentBet === 0) {
      const minTo = Math.min(s.blinds.bb, maxTo)
      acts.push({ type: 'bet', min: minTo, max: maxTo })
    } else if (p.mayRaise) {
      // capped at the stack, so a short player can still shove for less than a legal raise
      const minTo = Math.min(s.currentBet + s.lastRaiseSize, maxTo)
      acts.push({ type: 'raise', min: minTo, max: maxTo })
    }
  }
  return acts
}

// --- applying an action ----------------------------------------------------

/** Returns a NEW state; the input is never mutated, so a replayer or an undo can keep prior states. */
export function applyAction(state, action) {
  const s = cloneState(state)
  if (s.toAct == null) throw new Error('No one is to act')
  const i = s.toAct
  const p = s.seats[i]
  const legal = legalActions(s)
  const match = legal.find(a => a.type === action.type)
  if (!match) throw new Error(`Illegal action ${action.type}; legal: ${legal.map(a => a.type).join(', ')}`)

  const toCall = s.currentBet - p.committed

  if (action.type === 'fold') {
    p.folded = true
  } else if (action.type === 'check') {
    // nothing to put in
  } else if (action.type === 'call') {
    put(p, toCall)
  } else if (action.type === 'bet' || action.type === 'raise') {
    const to = Number(action.amount)
    if (!Number.isFinite(to)) throw new Error(`${action.type} needs an amount`)
    if (to < match.min || to > match.max) throw new Error(`${action.type} to ${to} is outside ${match.min}..${match.max}`)
    put(p, to - p.committed)
    applyAggression(s, i, to)
  }

  p.hasActed = true
  s.actions.push({ street: s.street, seat: i, type: action.type, amount: action.amount ?? null })

  if (onlyOneLeft(s)) return finishUncontested(s)
  if (roundClosed(s)) return closeStreet(s)
  s.toAct = nextSeat(s, i)
  return s
}

function applyAggression(s, seatIdx, to) {
  const raiseSize = to - s.currentBet
  // A bet on a fresh street is always "full" — lastRaiseSize is 0 there and the minimum is the big blind.
  const isFullRaise = raiseSize >= s.lastRaiseSize
  for (let k = 0; k < s.seats.length; k++) {
    const q = s.seats[k]
    if (k === seatIdx || q.folded || q.allIn) continue
    if (isFullRaise) {
      q.hasActed = false        // everyone owes an answer again
      q.mayRaise = true         // and a full raise clears any earlier restriction
    } else {
      // an incomplete all-in: they must answer the larger bet, but may no longer raise if they already acted
      if (q.hasActed) q.mayRaise = false
      q.hasActed = false
    }
  }
  if (isFullRaise) s.lastRaiseSize = raiseSize
  s.currentBet = to
}

const activeSeats = s => s.seats.filter(p => !p.folded)
const onlyOneLeft = s => activeSeats(s).length <= 1

function roundClosed(s) {
  const canAct = s.seats.filter(p => !p.folded && !p.allIn)
  if (canAct.length === 0) return true
  return canAct.every(p => p.hasActed && p.committed === s.currentBet)
}

// --- street transitions ----------------------------------------------------

/**
 * Give back the part of a bet nobody could call. Without this, a player who shoves 5,000 into a
 * 300-chip stack loses the 4,700 nobody matched.
 */
function returnUncalled(s) {
  const live = s.seats.filter(p => !p.folded)
  if (!live.length) return
  const sorted = [...s.seats].sort((a, b) => b.committed - a.committed)
  const top = sorted[0], second = sorted[1]
  if (!second || top.committed <= second.committed) return
  const excess = top.committed - second.committed
  top.committed -= excess
  top.total -= excess
  top.stack += excess
  if (top.stack > 0) top.allIn = false
}

function closeStreet(s) {
  returnUncalled(s)
  for (const p of s.seats) { s.pot += p.committed; p.committed = 0; p.hasActed = false; p.mayRaise = true }
  s.currentBet = 0
  s.lastRaiseSize = 0

  const idx = STREETS.indexOf(s.street)
  if (idx === STREETS.length - 1) return finishShowdown(s)

  // if nobody can bet any more, run the rest of the board out and show down
  const canStillAct = s.seats.filter(p => !p.folded && !p.allIn)
  const next = STREETS[idx + 1]
  s.street = next
  dealBoard(s, next)
  if (canStillAct.length <= 1) {
    for (let k = STREETS.indexOf(next) + 1; k < STREETS.length; k++) {
      s.street = STREETS[k]
      dealBoard(s, STREETS[k])
    }
    return finishShowdown(s)
  }
  s.toAct = firstToActPostflop(s)
  return s
}

function dealBoard(s, street) {
  const n = BOARD_CARDS[street]
  for (let k = 0; k < n; k++) {
    const i = s.board.length
    s.board.push(s.presetBoard[i] != null ? s.presetBoard[i] : s.deck.pop())
  }
}

function finishUncontested(s) {
  returnUncalled(s)
  for (const p of s.seats) { s.pot += p.committed; p.committed = 0 }
  const winner = s.seats.findIndex(p => !p.folded)
  const payouts = new Array(s.seats.length).fill(0)
  const total = s.pot
  payouts[winner] = total
  s.seats[winner].stack += total
  s.street = 'complete'
  s.toAct = null
  s.result = { pots: [{ amount: total, eligible: [winner] }], payouts, total, showdown: false, winners: [winner] }
  // the pot has been distributed; potTotal() must mean "chips currently in the middle", never a stale
  // figure that a UI would happily render next to the stacks that already contain it
  s.pot = 0
  return s
}

function finishShowdown(s) {
  const { pots, payouts, perPot } = showdown(s)
  const total = s.pot
  for (let i = 0; i < s.seats.length; i++) s.seats[i].stack += payouts[i]
  s.street = 'complete'
  s.toAct = null
  s.result = { pots, payouts, perPot, total, showdown: true, winners: payouts.map((n, i) => n > 0 ? i : -1).filter(i => i >= 0) }
  s.pot = 0   // distributed — see finishUncontested
  return s
}

// --- pots ------------------------------------------------------------------

/**
 * Split what everyone put in into a main pot and side pots.
 *
 * Each distinct all-in amount is a layer. Every player contributes what they could reach of that layer,
 * and only players who covered the whole layer — and did not fold — can win it. Folded players' chips
 * stay in; they just cannot win them back.
 */
export function buildPots(seats) {
  const levels = [...new Set(seats.filter(p => p.total > 0).map(p => p.total))].sort((a, b) => a - b)
  const pots = []
  let prev = 0
  for (const lv of levels) {
    let amount = 0
    const eligible = []
    for (let i = 0; i < seats.length; i++) {
      const p = seats[i]
      amount += Math.min(p.total, lv) - Math.min(p.total, prev)
      if (p.total >= lv && !p.folded) eligible.push(i)
    }
    if (amount > 0) pots.push({ amount, eligible })
    prev = lv
  }
  // layers with the same contenders are one pot as far as the players are concerned
  const merged = []
  for (const pot of pots) {
    const last = merged[merged.length - 1]
    if (last && last.eligible.length === pot.eligible.length && last.eligible.every((v, k) => v === pot.eligible[k])) {
      last.amount += pot.amount
    } else merged.push({ amount: pot.amount, eligible: pot.eligible.slice() })
  }
  return merged
}

/** Award every pot. Odd chips go to the first winner left of the button, as at a real table. */
export function showdown(s) {
  const pots = buildPots(s.seats)
  const payouts = new Array(s.seats.length).fill(0)
  const perPot = []

  for (const pot of pots) {
    if (!pot.eligible.length) continue
    let best = -Infinity, winners = []
    for (const i of pot.eligible) {
      const ev = evaluate([...s.seats[i].hole, ...s.board])
      if (ev.score > best) { best = ev.score; winners = [i] }
      else if (ev.score === best) winners.push(i)
    }
    const share = Math.floor(pot.amount / winners.length)
    let odd = pot.amount - share * winners.length
    for (const i of winners) payouts[i] += share
    for (let k = 1; k <= s.seats.length && odd > 0; k++) {
      const i = (s.button + k) % s.seats.length
      if (winners.includes(i)) { payouts[i]++; odd-- }
    }
    perPot.push({ amount: pot.amount, eligible: pot.eligible.slice(), winners: winners.slice() })
  }
  return { pots, payouts, perPot }
}

// --- helpers ---------------------------------------------------------------

/** Deep enough that no prior state can be mutated through a shared array. */
function cloneState(s) {
  return {
    ...s,
    seats: s.seats.map(p => ({ ...p, hole: p.hole ? p.hole.slice() : null })),
    board: s.board.slice(),
    presetBoard: s.presetBoard.slice(),
    deck: s.deck.slice(),
    actions: s.actions.map(a => ({ ...a })),
    blinds: { ...s.blinds },
    result: s.result ? { ...s.result } : null,
  }
}

/**
 * Chips currently in the middle: collected from earlier streets plus everything bet on this one.
 * Once the hand completes this is 0 — the money is in the stacks. The size it reached is `result.total`.
 */
export const potTotal = s => s.pot + s.seats.reduce((n, p) => n + p.committed, 0)

/** Effective stack between the players still in — the number that actually governs a decision. */
export function effectiveStack(s) {
  const live = s.seats.filter(p => !p.folded).map(p => p.stack + p.committed)
  if (live.length < 2) return 0
  return live.sort((a, b) => b - a)[1]
}
