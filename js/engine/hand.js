// The Hand record: one played hand, written down.
//
// This exists in Phase 1 although nothing reads it until Phase 8, and that is deliberate. Every future
// review feature — the manual hand builder, the replayer, the per-decision report — reads this one
// shape. Defining it now costs a file; discovering it later costs a rewrite of whatever was built on
// something else.
//
// It is deliberately a RECORD, not a state machine. `rules.js` runs hands; this describes one that
// already happened, in enough detail to replay it exactly.

export const HAND_VERSION = 1

/**
 * @typedef {object} Hand
 * @property {number} v              record version
 * @property {string} id
 * @property {number} date           epoch ms
 * @property {'nlhe'} game
 * @property {{sb:number, bb:number, ante:number}} blinds
 * @property {'none'|'each'|'bb'} anteType
 * @property {{name:string, stack:number}[]} seats   stacks as they were at the start of the hand
 * @property {number} button
 * @property {number|null} hero      whose decisions are under review
 * @property {Record<number, number[]>} hole  seat → [card, card]; only what was actually seen
 * @property {number[]} board
 * @property {{street:string, seat:number, type:string, amount:number|null}[]} actions
 * @property {{payouts:number[], showdown:boolean}|null} result
 * @property {string} [note]
 * @property {'live'|'online'|'drill'} [source]
 */

let counter = 0
const newId = () => `h${Date.now().toString(36)}${(counter++).toString(36)}`

/** Build an empty record — the starting point for the Phase 8 manual hand builder. */
export function newHand({ seats = [], button = 0, blinds = { sb: 50, bb: 100, ante: 0 }, anteType = 'none', source = 'live' } = {}) {
  return {
    v: HAND_VERSION,
    id: newId(),
    date: Date.now(),
    game: 'nlhe',
    blinds: { ante: 0, ...blinds },
    anteType,
    seats: seats.map(s => ({ name: s.name || '', stack: s.stack })),
    button,
    hero: null,
    hole: {},
    board: [],
    actions: [],
    result: null,
    source,
  }
}

/**
 * Snapshot a finished (or in-progress) `rules.js` state as a Hand record.
 * Stacks are recorded as they were at the START of the hand, so replaying from the record reproduces it.
 */
export function recordFromState(state, { hero = null, source = 'drill', note } = {}) {
  const h = newHand({
    seats: state.seats.map(p => ({ name: p.name, stack: p.startStack })),
    button: state.button,
    blinds: state.blinds,
    anteType: state.anteType,
    source,
  })
  h.hero = hero
  h.board = state.board.slice()
  h.actions = state.actions.map(a => ({ ...a }))
  for (let i = 0; i < state.seats.length; i++) {
    if (state.seats[i].hole) h.hole[i] = state.seats[i].hole.slice()
  }
  if (state.result) h.result = { payouts: state.result.payouts.slice(), showdown: state.result.showdown }
  if (note) h.note = note
  return h
}

/** Structural check. Returns a list of problems; empty means the record is well formed. */
export function validateHand(h) {
  const errs = []
  if (!h || typeof h !== 'object') return ['Not a hand record']
  if (h.v !== HAND_VERSION) errs.push(`Unknown record version: ${h.v}`)
  if (!Array.isArray(h.seats) || h.seats.length < 2 || h.seats.length > 9) errs.push('A hand needs 2 to 9 seats')
  if (!(h.button >= 0 && h.button < (h.seats || []).length)) errs.push('Button is not a seat')
  if (!h.blinds || !(h.blinds.bb > 0)) errs.push('Big blind must be positive')
  if (!Array.isArray(h.board) || h.board.length > 5) errs.push('Board must be 0 to 5 cards')

  const seen = new Set()
  for (const [seat, cards] of Object.entries(h.hole || {})) {
    if (!Array.isArray(cards) || cards.length !== 2) { errs.push(`Seat ${seat}: hole cards must be a pair`); continue }
    for (const c of cards) {
      if (seen.has(c)) errs.push(`Card used twice: seat ${seat}`)
      seen.add(c)
    }
  }
  for (const c of h.board || []) {
    if (seen.has(c)) errs.push('A board card is also in someone\'s hand')
    seen.add(c)
  }
  for (const a of h.actions || []) {
    if (!(a.seat >= 0 && a.seat < (h.seats || []).length)) errs.push(`Action from a seat that does not exist: ${a.seat}`)
  }
  return errs
}
