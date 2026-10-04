#!/usr/bin/env node
// Game checks: builds hundreds of game spots and holds each one to what scores it. Exit 1 on failure.
//
//   node scripts/game-test.mjs [spots per kind]
//
// The game's whole claim is that a 100% score means every scored decision was right, so the things
// checked here are the things that would make that claim false: the hero not being the player to act,
// an option the rules do not allow, a "best" option that is not the best, points outside 0–100, a
// push/fold answer that disagrees with the solved chart, and river equity that a brute-force count
// would not reproduce.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeSpot, makeGame, grade, TYPES, GAME_LENGTH } from '../js/game/spots.js'
import { legalActions, applyAction } from '../js/engine/rules.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const charts = {
  rfi: JSON.parse(readFileSync(join(ROOT, 'content/charts/rfi-9max.json'), 'utf8')),
  pushfold: JSON.parse(readFileSync(join(ROOT, 'content/charts/pushfold-hu.json'), 'utf8')),
}
const N = Number(process.argv[2]) || 60
let fails = 0, checked = 0
const bad = (where, msg) => { fails++; if (fails <= 30) console.log(`FAIL  ${where}\n      ${msg}`) }
const t0 = Date.now()
const answers = {}

for (const type of TYPES) {
  answers[type] = {}
  for (let k = 0; k < N; k++) {
    const seed = 1000 + k * 7
    const where = `${type} seed ${seed}`
    let s
    try { s = makeSpot(type, seed, charts) } catch (e) { bad(where, e.message); continue }
    checked++
    // the table is the one the grader assumes: the hero is to act, and every option is legal there
    if (s.state.toAct !== s.hero) bad(where, `seat ${s.state.toAct} is to act, not the hero (${s.hero})`)
    const legal = legalActions(s.state).map(a => a.type)
    for (const o of s.options) {
      if (!legal.includes(o.action.type)) bad(where, `${o.id} (${o.action.type}) is not legal: ${legal.join(', ')}`)
      try { applyAction(s.state, o.action) } catch (e) { bad(where, `${o.id} throws: ${e.message}`) }
    }
    if (!s.best.length || !s.best.every(b => s.options.some(o => o.id === b))) bad(where, `best ${s.best} is not among the options`)
    if (!s.facts.length || !s.answer || !s.scoredBy || !s.lesson) bad(where, 'missing facts, answer, scoredBy or lesson')
    // EV: fold is the zero, every EV is finite, and the best options are the top ones
    if (s.ev) {
      if (s.ev.fold !== 0) bad(where, `fold is ${s.ev.fold}, not the zero every EV is measured against`)
      if (!Object.values(s.ev).every(Number.isFinite)) bad(where, `an EV is not a number: ${JSON.stringify(s.ev)}`)
      const top = Math.max(...Object.values(s.ev))
      const firstBest = Object.keys(s.ev).find(id => s.ev[id] === top)
      if (!s.best.includes(firstBest)) bad(where, `the highest EV (${firstBest}) is not counted best`)
      if (!(s.stake > 0)) bad(where, `stake ${s.stake}`)
    }
    // points: the best scores 100, everything stays in 0–100
    for (const o of s.options) {
      const g = grade(s, o.id)
      if (g.points != null && (g.points < 0 || g.points > 100 || !Number.isInteger(g.points))) bad(where, `${o.id} scores ${g.points}`)
      if (s.best.includes(o.id) && g.points !== 100) bad(where, `best option ${o.id} scores ${g.points}`)
    }
    // the solved chart: wherever it gives a pure answer, that answer must be among the best
    if (s.source === 'pushfold' && !s.best.includes(s.chartSays)) {
      const top = Math.max(...Object.values(s.ev))
      bad(where, `the chart says ${s.chartSays} but EV prefers ${s.best} by ${(top - s.ev[s.chartSays]).toFixed(3)}bb`)
    }
    // the river: re-derive the equity from the stated counts in the facts
    if (type === 'river') {
      const v = Number(/(\d+) combinations \(/.exec(s.facts[0])[1]), b = Number(/— (\d+) combinations/.exec(s.facts[1])[1])
      const eq = b / (v + b)
      const call = s.ev.call, bet = s.stake
      const pot = (call + bet) / eq - 2 * bet
      if (Math.abs(pot - 5) > 1e-6) bad(where, `the stated range does not reproduce the call EV (pot comes out ${pot})`)
    }
    for (const id of s.best) answers[type][id] = (answers[type][id] || 0) + 1
  }
}

// a whole game: ten spots, every kind present, the same seed gives the same game
const g1 = makeGame(42, charts), g2 = makeGame(42, charts)
if (g1.length !== GAME_LENGTH) bad('game', `${g1.length} spots, not ${GAME_LENGTH}`)
if (!TYPES.every(t => g1.some(s => s.type === t))) bad('game', `a kind is missing: ${g1.map(s => s.type)}`)
if (JSON.stringify(g1.map(s => [s.type, s.prompt])) !== JSON.stringify(g2.map(s => [s.type, s.prompt]))) bad('game', 'the same seed built a different game')

const spread = Object.entries(answers).map(([t, a]) => `${t} ${Object.entries(a).map(([k, n]) => `${k}:${n}`).join('/')}`).join('; ')
console.log(`best answers by kind — ${spread}`)
console.log(`${fails ? `${fails} FAILED, ` : ''}${checked} spots checked (${N} of each kind) in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
process.exit(fails ? 1 : 0)
