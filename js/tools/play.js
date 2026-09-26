// Play a hand. Six-handed against the rule-based bots, stacks and button carrying over between hands.
//
// The point is not to win — the opponents are thresholds, not players, and beating them teaches
// nothing. The point is to sit through the shape of a hand often enough that the streets, the sizing
// and the showdown stop needing to be thought about.

import { createHand, applyAction, potTotal } from '../engine/rules.js'
import { cardsGlyph, mulberry32 } from '../engine/cards.js'
import { mountTable } from '../table.js'
import { avatarsForSeats } from '../avatars.js'
import { decide, LEVELS, seatLevels } from '../bot/index.js'
import { progress } from '../progress.js'
import { sound } from '../sound.js'

const SEATS = 6
const HERO = 0
const START = 20000
const BLINDS = { sb: 100, bb: 200 }
const NAMES = ['You', 'Ana', 'Bo', 'Cy', 'Dee', 'Eli']
const wait = ms => new Promise(r => setTimeout(r, ms))
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function mountPlay(main) {
  document.title = 'Play a hand · Poker Master'
  main.innerHTML = `
    <div class="page tool play-page">
      <header class="hero">
        <span class="eyebrow">Tournament · play</span>
        <h1>Play a hand</h1>
        <p>Six-handed against rule-based opponents. They are thresholds, not players — beating them proves nothing, but sitting through hands is how the shape of the game stops needing thought.</p>
      </header>
      <div id="table"></div>
      <div class="readout" id="say"></div>
      <div class="actions" id="between"></div>
      <section class="panel">
        <h2>Who you are playing</h2>
        <ul class="part-sections" id="who"></ul>
        <p class="note">Hands played are counted in the activity grid. Nothing here is a strategy trainer — for that, the range trainer and the odds sandbox are the ones with real numbers behind them.</p>
      </section>
    </div>`

  const $ = s => main.querySelector(s)
  const rng = mulberry32((Date.now() ^ 0x5bf03635) >>> 0)
  const levels = seatLevels(SEATS, { hero: HERO, rng })
  let stacks = Array.from({ length: SEATS }, () => START)
  let button = (rng() * SEATS) | 0
  let state = null, view = null, busy = false, handNo = 0, alive = true

  $('#who').innerHTML = Object.entries(levels).map(([seat, lvl]) =>
    `<li><b>${esc(NAMES[seat])}</b> <span>${esc(LEVELS[lvl].blurb)}</span></li>`).join('')

  function render() {
    if (gone()) return
    const done = state.street === 'complete'
    const heroTurn = !done && state.toAct === HERO
    const opts = {
      state, hero: HERO,
      interactive: heroTurn,
      reveal: done && state.result && state.result.showdown,
      avatars: avatarsForSeats(SEATS),
      onAction: a => act(a),
    }
    if (view) view.update(opts)
    else view = mountTable($('#table'), opts)
  }

  // The bot loop awaits between actions, so the reader can leave mid-hand. Everything that touches the
  // DOM after an await has to cope with the page already being gone.
  const gone = () => !alive || !main.isConnected
  function say(html) { const el = $('#say'); if (el) el.innerHTML = html }

  function act(a) {
    if (busy) return
    state = applyAction(state, a)
    render()
    run()
  }

  async function run() {
    if (busy) return
    busy = true
    while (state.street !== 'complete' && state.toAct !== HERO) {
      if (gone()) { busy = false; return }
      render()
      say(`<p class="note">${esc(state.seats[state.toAct].name)} is thinking…</p>`)
      await wait(420)
      if (gone()) { busy = false; return }
      const a = decide(state, { level: levels[state.toAct], rng })
      state = applyAction(state, a)
      const amt = a.amount != null ? ` ${a.amount}` : ''
      say(`<p class="note">${esc(state.actions.at(-1) ? state.seats[state.actions.at(-1).seat].name : '')} ${esc(a.type)}${amt}.</p>`)
    }
    busy = false
    if (gone()) return
    render()
    if (state.street === 'complete') finish()
    else say(`<p class="note">Your turn. Pot ${potTotal(state)}.</p>`)
  }

  function finish() {
    progress.recordHand()
    const r = state.result
    const won = r.payouts[HERO] || 0
    const net = state.seats[HERO].stack - stacks[HERO]
    stacks = state.seats.map(p => p.stack)
    const winners = r.winners.map(i => state.seats[i].name).join(' and ')
    say(`
      <p class="verdict ${net > 0 ? 'good' : net < 0 ? 'bad' : ''}">${won
        ? `You win ${won}${r.showdown ? ` with ${esc(cardsGlyph(state.seats[HERO].hole))}` : ' — everyone folded'}.`
        : `${esc(winners)} wins ${r.total}.`} ${net === 0 ? 'You are level on the hand.' : net > 0 ? `You are up ${net}.` : `You are down ${-net}.`}</p>`)
    if (won) sound.play('success')

    const broke = stacks.filter(s => s > 0).length < 2
    const between = $('#between')
    if (!between) return
    between.innerHTML = broke
      ? `<button class="btn primary" data-go="reset">Everyone back to ${START.toLocaleString()}</button>`
      : `<button class="btn primary" data-go="next">Next hand</button>`
  }

  function deal() {
    if (stacks[HERO] <= 0) return reset()
    handNo++
    // skip seats that have busted; the button still moves round the table
    do { button = (button + 1) % SEATS } while (stacks[button] <= 0)
    const live = stacks.map((s, i) => ({ stack: s, name: NAMES[i], i })).filter(p => p.stack > 0)
    if (live.length < 2) return reset()

    state = createHand({
      seats: stacks.map((s, i) => ({ stack: s, name: NAMES[i] })),
      button, blinds: BLINDS, seed: (rng() * 1e9) | 0,
    })
    const between = $('#between'); if (between) between.innerHTML = ''
    say(`<p class="note">Hand ${handNo}. Blinds ${BLINDS.sb}/${BLINDS.bb}.</p>`)
    render()
    run()
  }

  function reset() {
    stacks = Array.from({ length: SEATS }, () => START)
    deal()
  }

  main.addEventListener('click', e => {
    const b = e.target.closest('[data-go]')
    if (!b) return
    sound.unlock()
    if (b.dataset.go === 'next') deal()
    if (b.dataset.go === 'reset') reset()
  })

  deal()
  return { destroy() { alive = false; view && view.destroy() } }
}
