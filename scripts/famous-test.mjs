#!/usr/bin/env node
// Famous-hand checks: every file in content/famous/ is a real hand, so every one is held to its sources
// and to the rules. Exit 1 on any failure.
//
// The rule these files keep is that nothing on screen shows a number the sources do not give, and that
// the hand on screen is the hand that was played. So this checks:
//   - no card appears twice — the duplicate check is exactly how two sources' wrong suits were caught;
//   - every action replays through the rules engine, in turn and legal;
//   - every pot a source states is the pot the engine reaches;
//   - sources and a note on each conflict are present;
//   - every decision a reader is asked has the real action among its options, a note for every option,
//     a why and a lesson; a decision with no recorded action is the disputed one, and the file says so.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseCards } from '../js/engine/cards.js'
import { potTotal, legalActions } from '../js/engine/rules.js'
import { replay, decisions, mathsAt } from '../js/game/famous.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const index = JSON.parse(readFileSync(join(ROOT, 'content/famous/index.json'), 'utf8'))
let fails = 0, steps = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }
// what an option id must be for each recorded action type
const OPTION_FOR = { fold: 'fold', check: 'check', call: 'call', bet: 'bet', raise: 'raise', allin: 'allin' }

for (const id of index.hands) {
  const where = id
  let hand
  try { hand = JSON.parse(readFileSync(join(ROOT, `content/famous/${id}.json`), 'utf8')) } catch (e) { bad(where, `cannot read: ${e.message}`); continue }
  if (hand.id !== id) bad(where, `the file's id is "${hand.id}"`)
  if (!Array.isArray(hand.sources) || !hand.sources.length || !hand.sources.every(s => s.url && s.what && s.by)) bad(where, 'every hand needs sources, each with what it gives, a url, and who published it')
  if (!Array.isArray(hand.conflicts)) bad(where, 'a `conflicts` list is required — say what the sources disagreed on, or that they did not')
  if (!hand.ending || !hand.facts || !hand.facts.length) bad(where, 'missing `ending` or `facts`')

  // no card twice
  const cards = [...hand.seats.flatMap(s => parseCards(s.hole)), ...parseCards(hand.board || '')]
  if (new Set(cards).size !== cards.length) bad(where, `a card appears twice: ${hand.seats.map(s => s.hole).join(' | ')} | ${hand.board}`)

  // the actions, through the engine
  let rp
  try { rp = replay(hand) } catch (e) { bad(where, e.message); continue }
  for (const p of hand.pots || []) {
    const got = potTotal(rp.frames[p.before])
    if (got !== p.pot) bad(where, `before action ${p.before} the source says the pot is ${p.pot}; the engine has ${got} — the blinds, antes or seats are wrong`)
  }
  if (hand.gap && !Object.values(hand.play || {}).some(pl => pl.steps[hand.actions.length])) bad(where, 'a `gap` but no decision at the point the hand stops')

  // the decisions a reader is asked
  for (const [seat, plan] of Object.entries(hand.play || {})) {
    if (!plan.intro) bad(where, `seat ${seat}: no intro`)
    // NO SPOILERS: the reader decides with what the player could see. The opponent's cards — as glyphs
    // ("K♠"), codes ("Ks") or ranks ("K-7", "K7") — must not appear in the list, the intro, the facts, or
    // anything shown before the reader's last decision. (The last one is followed straight by the reveal.)
    const opp = parseCards(hand.seats[1 - Number(seat)].hole)
    const R = '23456789TJQKA', G = ['♣', '♦', '♥', '♠'], S = 'cdhs'
    const r = c => R[c >> 2], tells = [
      ...opp.map(c => r(c) + G[c & 3]), ...opp.map(c => r(c) + S[c & 3]),
      `${r(opp[0])}-${r(opp[1])}`, `${r(opp[1])}-${r(opp[0])}`, `${r(opp[0])}${r(opp[1])}`, `${r(opp[1])}${r(opp[0])}`,
    ].map(x => x.replace('T', '10').includes('10') ? [x, x.replace('T', '10')] : [x]).flat()
    const keys = Object.keys(plan.steps).map(Number).sort((a, b) => a - b)
    const early = [hand.blurb, hand.title, plan.intro, ...hand.facts,
      ...keys.slice(0, -1).flatMap(k => { const st = plan.steps[k]; return [st.ask, st.why, st.lesson, ...Object.values(st.notes || {})] })]
    for (const text of early) for (const tell of tells) {
      if (new RegExp(`(^|[^A-Za-z0-9])${tell.replace(/[-]/g, '\\-')}([^A-Za-z0-9]|$)`).test(text || '')) bad(`${where} seat ${seat}`, `gives away ${hand.seats[1 - Number(seat)].name}'s cards ("${tell}") before the end: "${String(text).slice(0, 90)}…"`)
    }
    for (const d of decisions(hand, Number(seat))) {
      const at = `${where} seat ${seat} step ${d.k}`
      steps++
      const ids = d.step.options.map(o => o.id)
      if (d.real) {
        if (d.real.seat !== Number(seat)) bad(at, `the action at ${d.k} is seat ${d.real.seat}'s, not the reader's`)
        if (d.step.real !== OPTION_FOR[d.real.type]) bad(at, `the real action is ${d.real.type} but the step says "${d.step.real}"`)
        if (d.state.toAct !== Number(seat)) bad(at, `seat ${d.state.toAct} is to act`)
      } else if (d.step.real !== null || !hand.gap) bad(at, 'a decision with no recorded action must have `real: null` and the hand a `gap`')
      if (d.step.real && !ids.includes(d.step.real)) bad(at, `the real action "${d.step.real}" is not among the options`)
      for (const o of ids) if (!d.step.notes || !d.step.notes[o]) bad(at, `no note for option "${o}"`)
      // the reader acts at the table, so whatever is legal there needs an explanation
      const legalKinds = new Set(legalActions(d.state).map(a => a.type))
      for (const kind of legalKinds) {
        // folding when a check is free is never sensible; the page has one standard line for it
        if (kind === 'fold' && legalKinds.has('check')) continue
        if (!d.step.notes[kind] && !(kind === 'raise' || kind === 'bet') ) bad(at, `\`${kind}\` is legal here but has no note`)
        if ((kind === 'raise' || kind === 'bet') && !d.step.notes[kind] && !d.step.notes.allin) bad(at, `a ${kind} is legal here but neither \`${kind}\` nor \`allin\` has a note`)
        if ((kind === 'raise' || kind === 'bet') && !d.step.notes[kind]) {
          // only all-in is explained: a smaller bet or raise would fall back to the all-in note — flag it
          const big = legalActions(d.state).find(a => a.type === kind)
          if (big.min < big.max) bad(at, `a ${kind} smaller than all in is legal here but has no \`${kind}\` note`)
        }
      }
      if (!d.step.ask || !d.step.why || !d.step.lesson) bad(at, 'every step needs ask, why and lesson')
      const m = mathsAt(hand, Number(seat), d.state)
      if (!(m.equity >= 0 && m.equity <= 1)) bad(at, `hindsight equity ${m.equity}`)
      if (hand.unknown && m.price) bad(at, 'a price is shown although the chip counts are unknown')
      // the price must count only what can be won: never more than the pot, and never the uncalled part
      if (m.price && m.price.pot > potTotal(d.state)) bad(at, `the pot to win (${m.price.pot}) is bigger than the whole pot`)
    }
  }
  console.log(`ok    ${where} — ${hand.actions.length} actions replayed, ${(hand.pots || []).length} stated pot(s) matched`)
}
console.log(`${fails ? `${fails} FAILED, ` : ''}${index.hands.length} famous hands, ${steps} decisions checked`)
process.exit(fails ? 1 : 0)
