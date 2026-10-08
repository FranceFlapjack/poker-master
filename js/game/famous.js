// Famous hands: real hands, replayed through this app's own rules engine, one decision at a time.
//
// Owner's request (2026-10-08): famous hands in the game, with an explanation at every step — why the
// player did it, what to do — and room to choose differently, because a mistake is something to learn
// from. So a replay is NOT scored: the players only knew their own cards, and a "right answer" to most
// of these spots would be an opinion. What it shows instead is what really happened, why, a line on
// each option, and the maths — the price where the pot is known, and the equity with hindsight (both
// hands face up), labelled as hindsight.
//
// Every hand is a data file in content/famous/, with its sources and a note on every conflict between
// them. The rule for those files: NOTHING ON SCREEN MAY SHOW A NUMBER THE SOURCES DO NOT GIVE. Where a
// hand's stacks or blinds are not recorded, `unknown` hides them (the table shows "—"); where the
// betting is disputed, the replay stops at that decision and says so (`gap`). scripts/famous-test.mjs
// replays every file through the engine and checks it.
//
// Pure: no DOM.

import { parseCards } from '../engine/cards.js'
import { createHand, applyAction, legalActions, potTotal } from '../engine/rules.js'
import { equityExact, equityMC } from '../engine/equity.js'

/** The engine action for one recorded action — "allin" is a bet or raise to everything the player has. */
export function toEngine(s, a) {
  if (a.type !== 'allin') return a.amount != null ? { type: a.type, amount: a.amount } : { type: a.type }
  const p = s.seats[a.seat]
  return { type: s.currentBet > 0 ? 'raise' : 'bet', amount: p.committed + p.stack }
}

/**
 * Build a hand and replay it. Returns the state BEFORE each recorded action (frames[k]) and after the
 * last one. Throws, naming the action, if any action is out of turn or not legal.
 */
export function replay(hand) {
  let s = createHand({
    seats: hand.seats.map(x => ({ name: x.name, stack: x.stack })),
    button: hand.button,
    blinds: hand.blinds,
    anteType: hand.anteType || 'none',
    hole: Object.fromEntries(hand.seats.map((x, i) => [i, parseCards(x.hole)])),
    board: parseCards(hand.board || ''),
    seed: 1,
  })
  const frames = []
  hand.actions.forEach((a, k) => {
    frames.push(s)
    if (s.toAct !== a.seat) throw new Error(`action ${k} (${a.seat} ${a.type}): it is seat ${s.toAct}'s turn`)
    const act = toEngine(s, a)
    const legal = legalActions(s).find(x => x.type === act.type)
    if (!legal) throw new Error(`action ${k} (${a.type}) is not legal here: ${legalActions(s).map(x => x.type).join(', ')}`)
    if ((act.type === 'bet' || act.type === 'raise') && (act.amount < legal.min || act.amount > legal.max)) {
      throw new Error(`action ${k}: ${act.type} to ${act.amount} is outside ${legal.min}–${legal.max}`)
    }
    s = applyAction(s, act)
  })
  return { frames, end: s }
}

/** The decisions a reader makes when playing `seat`, in order, each with the state they decide in. */
export function decisions(hand, seat) {
  const plan = hand.play && hand.play[seat]
  if (!plan) return []
  const { frames } = replay(hand)
  // a step at index == actions.length is the decision a disputed hand stops at (see `gap`)
  const atEnd = hand.actions.length
  return Object.keys(plan.steps).map(Number).sort((a, b) => a - b).map(k => {
    const state = k < atEnd ? frames[k] : replay(hand).end
    return { k, state, step: plan.steps[k], real: k < atEnd ? hand.actions[k] : null }
  })
}

/**
 * The maths at one decision. Equity is WITH HINDSIGHT — both hands face up — exact once the flop is
 * out, sampled before it (and then labelled "about"). The price is only given where the pot is known.
 */
export function mathsAt(hand, seat, state) {
  const hero = parseCards(hand.seats[seat].hole), villain = parseCards(hand.seats[1 - seat].hole)
  const board = state.board.slice()
  let equity, exact
  if (board.length >= 3) { equity = equityExact([hero, villain], board).equity[0]; exact = true }
  else { equity = equityMC([hero, villain], board, [], { trials: 20000, seed: 7 }).equity[0]; exact = false }
  const p = state.seats[seat]
  const toCall = Math.max(0, Math.min(state.currentBet - p.committed, p.stack))
  // The pot you can WIN by calling: nobody can win more from a player than they put in themselves, so
  // each player's chips count only up to what you will have in after the call. Facing an all-in bigger
  // than your stack, the rest goes back to them uncalled — counting it would make the call look cheap.
  const mine = p.total + toCall
  const winnable = state.seats.reduce((a, x, i) => a + (i === seat ? 0 : Math.min(x.total, mine)), 0) + p.total
  const price = !hand.unknown && toCall > 0 ? { toCall, pot: winnable, need: toCall / (winnable + toCall) } : null
  return { equity, exact, price, street: state.street }
}

/** Words for one recorded action, for the "what happened" lines between decisions. */
export function describeAction(hand, a, before) {
  const who = hand.seats[a.seat].name
  const known = amt => !hand.unknown || (hand.unknown.shown || []).includes(amt)
  const n = amt => known(amt) ? amt.toLocaleString('en') : null
  switch (a.type) {
    case 'fold': return `${who} folds.`
    case 'check': return `${who} checks.`
    case 'call': {
      const p = before.seats[a.seat], amt = Math.min(before.currentBet - p.committed, p.stack)
      return `${who} calls${n(amt) ? ` ${n(amt)}` : ''}.`
    }
    case 'bet': return `${who} bets${n(a.amount) ? ` ${n(a.amount)}` : ''}.`
    case 'raise': return `${who} raises${n(a.amount) ? ` to ${n(a.amount)}` : ''}.`
    case 'allin': return `${who} moves all in.`
    default: return `${who}: ${a.type}.`
  }
}

/** The streets dealt between two states, as words: "The flop: 9♠ 2♦ 6♠." */
export function boardNews(prev, next) {
  const names = { 3: 'The flop', 4: 'The turn', 5: 'The river' }
  const out = []
  for (let n = prev.board.length + 1; n <= next.board.length; n++) if (names[n]) out.push(n)
  return out.map(n => ({ label: names[n], cards: n === 3 ? next.board.slice(0, 3) : [next.board[n - 1]] }))
}
