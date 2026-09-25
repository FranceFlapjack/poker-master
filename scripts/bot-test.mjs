#!/usr/bin/env node
// Bot checks: play a lot of hands and assert the engine and the bots agree about what is possible.
// Exit code 1 on any failure.
//
// The useful assertion is not "the bot played well" — these bots do not play well and are not meant to.
// It is that a bot NEVER proposes something illegal, every hand it plays reaches a conclusion, and no
// chips appear or vanish along the way. Those are the failures that would corrupt a lesson or a play
// session, and a few thousand hands finds them where a handful would not.
//
// It also prints behaviour so the bots can be eyeballed as poker players: a "solid" bot that plays 90%
// of hands is mis-tuned even though every assertion passes.

import { createHand, applyAction, legalActions } from '../js/engine/rules.js'
import { mulberry32 } from '../js/engine/cards.js'
import { decide, LEVELS } from '../js/bot/index.js'

const HANDS = Number(process.argv.find(a => /^\d+$/.test(a)) || 400)
let fails = 0, passes = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg) } else passes++ }

const stats = {}
for (const lvl of Object.keys(LEVELS)) stats[lvl] = { spots: 0, vpip: 0, dealt: 0, aggro: 0, acts: 0 }

let illegal = 0, unfinished = 0, leaked = 0, played = 0
const t0 = Date.now()

for (let h = 0; h < HANDS; h++) {
  const rng = mulberry32(0xC0FFEE + h)
  const n = 2 + ((rng() * 8) | 0)
  const levels = Object.keys(LEVELS)
  const seatLevel = Array.from({ length: n }, () => levels[(rng() * levels.length) | 0])
  let s = createHand({
    seats: Array.from({ length: n }, () => ({ stack: 500 + ((rng() * 9500) | 0) })),
    button: (rng() * n) | 0,
    blinds: { sb: 50, bb: 100, ante: rng() < 0.4 ? 10 : 0 },
    anteType: rng() < 0.5 ? 'each' : 'none',
    seed: h + 1,
  })
  const before = s.seats.reduce((t, p) => t + p.startStack, 0)

  // everyone is dealt in, so count VPIP opportunities once per hand per seat
  for (let k = 0; k < n; k++) stats[seatLevel[k]].dealt++

  let guard = 0
  while (s.street !== 'complete' && guard++ < 500) {
    const seat = s.toAct
    const lvl = seatLevel[seat]
    const legal = legalActions(s)
    let action
    try { action = decide(s, { level: lvl, rng }) } catch (e) { illegal++; console.log(`  hand ${h}: decide threw — ${e.message}`); break }

    const match = legal.find(a => a.type === action.type)
    if (!match) { illegal++; console.log(`  hand ${h}: bot wanted ${action.type}, legal were ${legal.map(a => a.type).join(',')}`); break }
    if (match.min != null && (action.amount < match.min || action.amount > match.max)) {
      illegal++; console.log(`  hand ${h}: ${action.type} to ${action.amount} outside ${match.min}..${match.max}`); break
    }

    stats[lvl].spots++
    stats[lvl].acts++
    if (action.type === 'bet' || action.type === 'raise') stats[lvl].aggro++
    if (s.street === 'preflop' && (action.type === 'call' || action.type === 'raise')) stats[lvl].vpip++

    try { s = applyAction(s, action) } catch (e) { illegal++; console.log(`  hand ${h}: engine rejected ${action.type} — ${e.message}`); break }
  }

  if (s.street !== 'complete') { unfinished++; continue }
  played++
  const after = s.seats.reduce((t, p) => t + p.stack, 0)
  if (after !== before) { leaked++; console.log(`  hand ${h}: chips ${after} != ${before}`) }
}

ok(illegal === 0, `no bot ever proposed an illegal action (${illegal} did)`)
ok(unfinished === 0, `every hand reached a conclusion (${unfinished} did not)`)
ok(leaked === 0, `chips conserved in every hand (${leaked} leaked)`)
ok(played === HANDS, `all ${HANDS} hands played out (${played} did)`)

console.log(`\nbehaviour over ${played} hands, 2–9 handed:`)
for (const [lvl, s] of Object.entries(stats)) {
  const vpip = s.dealt ? (100 * s.vpip / s.dealt).toFixed(0) : '–'
  const af = s.acts ? (100 * s.aggro / s.acts).toFixed(0) : '–'
  console.log(`  ${lvl.padEnd(6)} plays ${String(vpip).padStart(3)}% of hands, ${String(af).padStart(3)}% of its actions are a bet or raise`)
}
ok(stats.loose.vpip / stats.loose.dealt > stats.sharp.vpip / stats.sharp.dealt * 0.5,
  'the loose bot is not somehow tighter than the sharp one')
ok(stats.sharp.aggro / stats.sharp.acts > stats.loose.aggro / stats.loose.acts,
  'the sharp bot is more aggressive than the loose one, as its name promises')

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${passes} checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
process.exit(fails ? 1 : 0)
