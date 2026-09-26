// Pot odds & equity — the sandbox. Four questions a player actually asks at the table, in the order they
// actually ask them:
//
//   how deep am I?                stack and blinds in, big blinds and orbits out
//   what price am I getting?      pot and bet in, required equity out
//   will I get there?             outs in, exact chance out — and what the shortcut would have told you
//   how does my hand do?          cards in, equity out, against a hand or a whole range
//
// Every number here comes from js/engine/, so the sandbox and the lessons cannot disagree.
//
// The stack panel is FIRST and it is deliberately not its own page. Counting in big blinds is one
// division; what makes it worth a panel is sitting next to the price, because depth is what decides
// whether a price is even the right question — under ten big blinds there is no call to price, only a
// shove or a fold.

import { parseCards, cardsGlyph } from '../engine/cards.js'
import { parseRange, countCombos } from '../engine/ranges.js'
import { equityExact, equityMC, runoutCount } from '../engine/equity.js'
import { potOdds, requiredEquity, outsEquity, ruleOf4And2, outsError, mdf, alpha, evCall, inBB } from '../engine/ev.js'

const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function mountOdds(main) {
  document.title = 'Pot odds & equity · Poker Master'
  main.innerHTML = `
    <div class="page tool">
      <header class="hero">
        <span class="eyebrow">Tournament · tool</span>
        <h1>Pot odds &amp; equity</h1>
        <p>Four questions, answered by the same engine the lessons and drills use. Nothing here is a rule of thumb unless it says so.</p>
      </header>

      <section class="panel">
        <h2>At the table</h2>
        <div class="fields">
          <label>Your stack<input id="stack" type="number" min="0" step="100" value="25000"></label>
          <label>Small blind<input id="sb" type="number" min="0" step="50" value="500"></label>
          <label>Big blind<input id="bb" type="number" min="1" step="100" value="1000"></label>
          <label>Ante<input id="ante" type="number" min="0" step="25" value="100"></label>
          <label>Ante style
            <select id="antetype">
              <option value="each">Every player antes</option>
              <option value="bb">One big-blind ante for the table</option>
              <option value="none">No ante</option>
            </select>
          </label>
          <label>Players<input id="seats" type="number" min="2" max="9" step="1" value="9"></label>
          <label>Their stack <small>for the effective stack</small><input id="opp" type="number" min="0" step="100" value="41000"></label>
        </div>
        <div class="readout" id="table"></div>
      </section>

      <section class="panel">
        <h2>The price</h2>
        <div class="fields">
          <label>Pot <small>including their bet</small><input id="pot" type="number" min="0" step="1" value="300"></label>
          <label>To call<input id="call" type="number" min="1" step="1" value="100"></label>
        </div>
        <div class="readout" id="price"></div>
      </section>

      <section class="panel">
        <h2>Your outs</h2>
        <div class="fields">
          <label>Outs<input id="outs" type="number" min="0" max="21" step="1" value="9"></label>
          <label>Cards to come
            <select id="ctc"><option value="2">Two — flop, and you will see both</option><option value="1">One — turn, or you may face another bet</option></select>
          </label>
        </div>
        <div class="readout" id="draw"></div>
      </section>

      <section class="panel">
        <h2>Equity</h2>
        <div class="fields">
          <label>Your hand<input id="hero" type="text" value="As Kh" spellcheck="false"></label>
          <label>Against <small>a hand, or a range like 77+, AJs+</small><input id="villain" type="text" value="QQ" spellcheck="false"></label>
          <label>Board <small>optional</small><input id="board" type="text" value="" spellcheck="false"></label>
        </div>
        <div class="readout" id="equity"><p class="small">Working…</p></div>
      </section>
    </div>`

  const $ = s => main.querySelector(s)

  // The bands are not rules and the page says so — they are roughly where the game changes shape, and
  // the point of naming one is to send you to the tool that covers it.
  const band = d =>
    d < 10 ? ['Shove or fold', 'Under ten big blinds there is no postflop to play for. This is the part of the game that is actually solved — <a href="#/tools/pushfold">the push/fold trainer</a> deals these spots.']
    : d < 20 ? ['Committed on entry', 'Ten to twenty. One raise is a third of you, so most pots you enter, you enter for everything.']
    : d < 40 ? ['Raise or fold', 'Twenty to forty. You can still raise and fold, but a raise commits a real share of your stack and calling to see a flop gets expensive.']
    : ['Everything available', 'Over forty big blinds the whole game is open — raise, call, and make a river bet that is not all your chips.']

  const atTable = () => {
    const stack = Math.max(0, +$('#stack').value || 0)
    const sb = Math.max(0, +$('#sb').value || 0)
    const bb = Math.max(1, +$('#bb').value || 1)
    const ante = Math.max(0, +$('#ante').value || 0)
    const type = $('#antetype').value
    const seats = Math.max(2, Math.min(9, +$('#seats').value || 9))
    const opp = Math.max(0, +$('#opp').value || 0)

    const depth = inBB(stack, bb)
    // One lap of the button: both blinds once each, and the ante as often as it is actually collected
    // from you — every hand when everybody antes, once a lap when one player posts for the table.
    const orbit = sb + bb + (type === 'each' ? ante * seats : type === 'bb' ? ante : 0)
    const orbits = orbit > 0 ? stack / orbit : Infinity
    const eff = Math.min(stack, opp)
    const [name, why] = band(depth)

    $('#table').innerHTML = `
      <div class="stats">
        ${stat('You are', `${depth.toFixed(1)} bb`, `${stack.toLocaleString()} at ${sb.toLocaleString()}/${bb.toLocaleString()}`)}
        ${stat('An orbit costs', orbit.toLocaleString(), type === 'each' ? `both blinds and ${seats} antes` : type === 'bb' ? 'both blinds and one table ante' : 'both blinds')}
        ${stat('Laps left', Number.isFinite(orbits) ? orbits.toFixed(1) : '∞', 'folding every hand')}
        ${stat('Effective', `${inBB(eff, bb).toFixed(1)} bb`, `${eff.toLocaleString()} — the smaller of the two`)}
      </div>
      <p class="verdict">${esc(name)} — ${why}</p>
      <p class="note">Only the <b>effective</b> stack can be won or lost, so it is the one that sets the depth of a pot. Against a bigger stack that is yours; against a shorter one it is theirs, and the chips you have behind their all-in are not in play.</p>`
  }

  const price = () => {
    const pot = Math.max(0, +$('#pot').value || 0), toCall = Math.max(1, +$('#call').value || 1)
    const o = potOdds(toCall, pot)
    // MDF and alpha are properties of the BET, so they need the pot as it was before that bet. Taking
    // the bet to be what you have to call is right when you have put nothing in this street — which is
    // the usual case, and is said out loud below rather than assumed quietly.
    const potBefore = pot - toCall > 0 ? pot - toCall : pot
    $('#price').innerHTML = `
      <div class="stats">
        ${stat('Pot odds', `${o.ratio.toFixed(2)} to 1`)}
        ${stat('You need', pct(o.required), 'break-even equity for the call')}
        ${stat('They must be bluffing', pct(alpha(toCall, potBefore)), 'for a bluff this size to break even')}
        ${stat('Defend at least', pct(mdf(toCall, potBefore)), 'so betting any two cards does not print')}
      </div>
      <p class="note">Calling ${toCall} into ${pot} needs to be right ${pct(o.required)} of the time to break even. Below that the call loses chips however much you like your hand.</p>
      <p class="note">The last two read their bet as ${toCall} into ${potBefore}. That holds if you have put nothing in this street; if you have, the bet was larger than your call and both numbers shift.</p>`
    draw()
  }

  const draw = () => {
    const outs = Math.max(0, Math.min(21, +$('#outs').value || 0))
    const ctc = +$('#ctc').value
    const exact = outsEquity(outs, ctc)
    const quick = ruleOf4And2(outs, ctc)
    const err = outsError(outs, ctc)
    const pot = Math.max(0, +$('#pot').value || 0), toCall = Math.max(1, +$('#call').value || 1)
    const need = requiredEquity(toCall, pot)
    const ev = evCall({ equity: exact, pot, toCall })
    const good = exact >= need
    $('#draw').innerHTML = `
      <div class="stats">
        ${stat('Exact', pct(exact), `${outs} out${outs === 1 ? '' : 's'}, ${ctc === 1 ? 'one card' : 'two cards'} to come`)}
        ${stat('Rule of 4 and 2', pct(quick), `${err >= 0 ? '+' : ''}${err.toFixed(1)} points ${err >= 0 ? 'optimistic' : 'pessimistic'}`)}
      </div>
      <p class="verdict ${good ? 'good' : 'bad'}">${good
        ? `Call. You have ${pct(exact)} and need ${pct(need)} — worth about ${Math.round(ev)} chips.`
        : `Fold on pot odds alone. You have ${pct(exact)} and need ${pct(need)}, losing about ${Math.round(-ev)} chips a time.`}</p>
      ${ctc === 2 ? `<p class="note">Two cards to come only counts if you are all in. If there is another bet on the turn, use one card — ${pct(outsEquity(outs, 1))}, not ${pct(exact)}.</p>` : ''}`
  }

  let token = 0
  const equity = async () => {
    const mine = ++token
    const out = $('#equity')
    let hero, board, villainRange = null, villainHand = null
    try {
      hero = parseCards($('#hero').value.trim())
      if (hero.length !== 2) throw new Error('Your hand must be exactly two cards, like As Kh')
      board = $('#board').value.trim() ? parseCards($('#board').value.trim()) : []
      if (board.length === 1 || board.length === 2 || board.length > 5) throw new Error('A board is 0, 3, 4 or 5 cards')
      const v = $('#villain').value.trim()
      if (!v) throw new Error('Give a hand or a range to play against')
      const asCards = /^[2-9TJQKA][cdhs](\s*[2-9TJQKA][cdhs])?$/i.test(v) ? parseCards(v) : null
      if (asCards && asCards.length === 2) villainHand = asCards
      else villainRange = parseRange(v)
    } catch (e) {
      out.innerHTML = `<p class="verdict bad">${esc(e.message)}</p>`
      return
    }

    out.innerHTML = '<p class="small">Working…</p>'
    await new Promise(r => setTimeout(r, 0))     // let the "working" paint before a long enumeration
    if (mine !== token) return

    let res, how
    try {
      if (villainHand) {
        const runouts = runoutCount(board.length, 4 + board.length)
        if (runouts <= 200000) { res = equityExact([hero, villainHand], board); how = `exact — every one of ${res.trials.toLocaleString()} runouts` }
        else { res = equityMC([hero, villainHand], board, [], { trials: 40000, seed: 7 }); how = `sampled, ${res.trials.toLocaleString()} trials` }
      } else {
        const combos = countCombos(villainRange, [...hero, ...board])
        if (!combos) throw new Error('That range has no hands left once your cards and the board are removed')
        res = equityMC([hero, villainRange], board, [], { trials: 40000, seed: 7 })
        how = `sampled, ${res.trials.toLocaleString()} trials against ${combos.toFixed(0)} combos`
      }
    } catch (e) {
      out.innerHTML = `<p class="verdict bad">${esc(e.message)}</p>`
      return
    }
    if (mine !== token) return

    const err = res.stderr ? res.stderr[0] : null
    const pot = Math.max(0, +$('#pot').value || 0), toCall = Math.max(1, +$('#call').value || 1)
    const need = requiredEquity(toCall, pot)
    const ev = evCall({ equity: res.equity[0], pot, toCall })
    out.innerHTML = `
      <div class="stats">
        ${stat('You', pct(res.equity[0]) + (err ? ` ±${(err * 200).toFixed(1)}` : ''), cardsGlyph(hero))}
        ${stat('Them', pct(res.equity[1]), villainHand ? cardsGlyph(villainHand) : esc($('#villain').value.trim()))}
        ${stat('Ties', pct(res.tie[0], 2))}
      </div>
      <p class="note">${esc(how)}${err ? '. The ± is two standard errors — a sampled number quoted tighter than that is pretending.' : '.'}</p>
      <p class="verdict ${res.equity[0] >= need ? 'good' : 'bad'}">Against the price above you need ${pct(need)} and have ${pct(res.equity[0])} — calling is worth about ${Math.round(ev)} chips.</p>`
  }

  const stat = (label, value, note = '') =>
    `<div class="stat"><span class="k">${esc(label)}</span><span class="v">${esc(value)}</span>${note ? `<span class="n">${esc(note)}</span>` : ''}</div>`

  let timer
  const later = fn => { clearTimeout(timer); timer = setTimeout(fn, 250) }
  for (const id of ['#stack', '#sb', '#bb', '#ante', '#antetype', '#seats', '#opp']) $(id).addEventListener('input', atTable)
  for (const id of ['#pot', '#call']) $(id).addEventListener('input', () => { price(); later(equity) })
  for (const id of ['#outs', '#ctc']) $(id).addEventListener('input', draw)
  for (const id of ['#hero', '#villain', '#board']) $(id).addEventListener('input', () => later(equity))

  atTable()
  price()
  equity()
  return { destroy() {} }
}
