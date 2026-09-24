// Build a hand state from the `key: value` parameters of a lesson fence.
//
// One parser, three consumers: the `table` fence that shows a spot, the `try` fence that asks about one,
// and scripts/verify-drills.mjs which checks the answers. If any of those built spots differently, a
// drill could pass the checker and still show the reader something else.
//
// Pure — no DOM — so the Node checkers can import it.

import { parseCards, cardsStr } from './engine/cards.js'
import { evaluate, describe } from './engine/evaluator.js'
import { createHand, applyAction, legalActions, STREETS } from './engine/rules.js'

const num = (v, fallback) => (v == null || v === '' ? fallback : Number(v))

/**
 * @param {Record<string,string>} p fence parameters
 * @returns {{state:object, hero:number|null}}
 *
 * Recognised keys:
 *   seats      how many, 2..9                          (default 6, or the length of `stacks`)
 *   stacks     one number for all, or a list per seat   (default 100 big blinds)
 *   names      comma list, per seat
 *   blinds     "50/100" or "50/100/25" for sb/bb/ante
 *   ante       none | each | bb                         (default each when an ante is given)
 *   button     seat index                               (default 0)
 *   hero       seat index, or "none" to show every hand
 *   hand       the hero's two cards
 *   hands      cards per seat, "As Ks | Qh Qd", from seat 0
 *   board      up to five cards, dealt as the streets arrive
 *   actions    what happened before this point: "fold, fold, raise 300, call"
 *   seed       fixes the shuffle for anything not stated
 */
export function spotFromParams(p) {
  const blindParts = String(p.blinds || '50/100').split('/').map(Number)
  const [sb, bb, ante = 0] = blindParts
  if (!(bb > 0)) throw new Error(`Bad blinds: ${p.blinds}`)

  const stackList = p.stacks && String(p.stacks).includes(',')
    ? String(p.stacks).split(',').map(s => Number(s.trim()))
    : null
  const n = num(p.seats, stackList ? stackList.length : 6)
  if (!(n >= 2 && n <= 9)) throw new Error(`A spot needs 2 to 9 seats, got ${n}`)

  const flat = num(p.stacks, bb * 100)
  const names = p.names ? String(p.names).split(',').map(s => s.trim()) : []
  const seats = Array.from({ length: n }, (_, i) => ({
    stack: stackList ? stackList[i] : flat,
    name: names[i] || `Seat ${i + 1}`,
  }))

  const hole = {}
  if (p.hands) {
    String(p.hands).split('|').forEach((h, i) => { if (h.trim()) hole[i] = parseCards(h.trim()) })
  }
  const hero = p.hero === 'none' ? null : num(p.hero, 0)
  if (p.hand) {
    if (hero == null) throw new Error('`hand` needs a `hero` seat; use `hands` to give cards to every seat')
    hole[hero] = parseCards(p.hand)
  }

  let state = createHand({
    seats,
    button: num(p.button, 0),
    blinds: { sb, bb, ante },
    anteType: p.ante || (ante > 0 ? 'each' : 'none'),
    hole,
    board: p.board ? parseCards(p.board) : [],
    seed: num(p.seed, 1),
  })

  for (const step of parseActions(p.actions)) {
    state = applyAction(state, step)
  }

  // `street: river` checks the hand down to that street. Without it, showing a flop in a lesson means
  // authoring a string of checks, which is noise in the text and easy to get wrong by one.
  if (p.street) {
    const target = String(p.street).toLowerCase()
    if (!STREETS.includes(target)) throw new Error(`Unknown street: ${p.street}`)
    let guard = 0
    while (state.street !== target && state.street !== 'complete' && state.toAct != null && guard++ < 60) {
      const legal = legalActions(state).map(a => a.type)
      state = applyAction(state, { type: legal.includes('check') ? 'check' : 'call' })
    }
    if (state.street !== target) throw new Error(`Could not check down to ${target}; the hand ended at ${state.street}`)
  }
  return { state, hero }
}

/** "fold, fold, raise 300, call" → a list of actions for applyAction. */
export function parseActions(text) {
  if (!text) return []
  return String(text).split(',').map(raw => {
    const s = raw.trim()
    if (!s) return null
    const m = /^(fold|check|call|bet|raise)(?:\s+(?:to\s+)?(\d+))?$/i.exec(s)
    if (!m) throw new Error(`Bad action: "${s}"`)
    const type = m[1].toLowerCase()
    if ((type === 'bet' || type === 'raise') && !m[2]) throw new Error(`"${s}" needs an amount`)
    return m[2] ? { type, amount: Number(m[2]) } : { type }
  }).filter(Boolean)
}

/** "Fold | Call 100 | Raise to 250" → ["Fold", "Call 100", "Raise to 250"] */
export const parseOptions = text =>
  String(text || '').split('|').map(s => s.trim()).filter(Boolean)

/**
 * Work out the right answer to a `try` block. Returns {options, correct, explain} — `correct` is an index.
 *
 * `showdown`, `rank` and `legal` are decided by the engine and cannot be authored wrong.
 * `action` and `choice` carry an authored answer, because they are judgements.
 */
export function solveDrill(p) {
  const kind = p.type || 'action'

  if (kind === 'legal') {
    // Which of these may you actually do? legalActions() decides, so a rules drill cannot drift out of
    // step with the rules the app itself enforces.
    const { state } = spotFromParams(p)
    const legal = legalActions(state)
    const options = parseOptions(p.options)
    if (options.length < 2) throw new Error('A legal drill needs at least two `options`')
    const allowed = options.map(o => {
      let want
      try { [want] = parseActions(o) } catch { throw new Error(`Option "${o}" is not an action the engine understands`) }
      const match = legal.find(l => l.type === want.type)
      if (!match) return false
      if (want.amount == null) return true
      // a bet or raise offers a RANGE; a call has one exact amount
      if (match.min != null) return want.amount >= match.min && want.amount <= match.max
      if (match.amount != null) return want.amount === match.amount
      return true
    })
    const find = (p.find || 'illegal').toLowerCase()
    const hits = allowed.map((ok, i) => ((find === 'legal' ? ok : !ok) ? i : -1)).filter(i => i >= 0)
    if (hits.length !== 1) {
      throw new Error(`a legal drill needs exactly one ${find} option, but ${hits.length} are ${find}: ` +
        options.map((o, i) => `${o}=${allowed[i] ? 'legal' : 'illegal'}`).join(', '))
    }
    const seat = state.seats[state.toAct]
    const explain = `${seat.name} may: ${legal.map(a => a.type + (a.min != null ? ` ${a.min}–${a.max}` : a.amount != null ? ` ${a.amount}` : '')).join(', ')}.`
    return { options, correct: hits[0], explain }
  }

  if (kind === 'showdown' || kind === 'rank') {
    const hands = String(p.hands || '').split('|').map(h => h.trim()).filter(Boolean).map(parseCards)
    if (hands.length < 2) throw new Error(`${kind} needs at least two hands in \`hands\``)
    const board = p.board ? parseCards(p.board) : []
    if (kind === 'showdown' && board.length !== 5) throw new Error('A showdown drill needs a full five-card board')
    assertDistinct([...hands.flat(), ...board])

    const evs = hands.map(h => evaluate([...h, ...board]))
    const best = Math.max(...evs.map(e => e.score))
    const winners = evs.map((e, i) => (e.score === best ? i : -1)).filter(i => i >= 0)

    const labels = hands.map((h, i) => `${String.fromCharCode(65 + i)} — ${cardsStr(h)}`)
    const options = [...labels, 'They split']
    const correct = winners.length > 1 ? options.length - 1 : winners[0]
    const explain = winners.length > 1
      ? `Both play the same hand: ${describe(evs[winners[0]])}.`
      : evs.map((e, i) => `${String.fromCharCode(65 + i)}: ${describe(e)}`).join('. ') + '.'
    return { options, correct, explain, evs }
  }

  const options = parseOptions(p.options)
  if (options.length < 2) throw new Error('An action or choice drill needs at least two `options`')
  if (!p.answer) throw new Error('An action or choice drill needs an `answer`')
  const correct = options.findIndex(o => o.toLowerCase() === String(p.answer).trim().toLowerCase())
  if (correct < 0) throw new Error(`\`answer\` "${p.answer}" is not one of the options: ${options.join(' | ')}`)
  return { options, correct, explain: '' }
}

/**
 * No card may appear twice across the hands and the board. One deck — two players cannot both hold the
 * same queen, and a drill that says they do teaches a position that cannot happen.
 */
function assertDistinct(cards) {
  const seen = new Set()
  for (const c of cards) {
    if (seen.has(c)) throw new Error(`the same card appears twice: ${cardsStr([c])}`)
    seen.add(c)
  }
}
