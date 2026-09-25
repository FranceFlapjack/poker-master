// ICM lab. Put in a final table and a payout structure; see what the chips are actually worth, and what
// a call would have to be worth to be right.
//
// Everything here comes from js/engine/icm.js, which is exact Malmuth–Harville rather than an
// approximation. What is a model, and says so on the page, is Malmuth–Harville itself: it knows nothing
// about skill, position, or the blinds going up.

import { icmEquity, icmRequiredEquity, bubbleFactor } from '../engine/icm.js'
import { requiredEquity } from '../engine/ev.js'

const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const nums = s => String(s).split(/[,\s]+/).map(Number).filter(v => Number.isFinite(v) && v >= 0)
const money = v => (Math.round(v * 100) / 100).toLocaleString()

export function mountIcm(main) {
  document.title = 'ICM lab · Poker Master'
  main.innerHTML = `
    <div class="page tool icm">
      <header class="hero">
        <span class="eyebrow">Tournament · tool</span>
        <h1>ICM lab</h1>
        <p>What your chips are worth in money, and what a call has to be worth to be right. Exact Malmuth–Harville, not an approximation of it.</p>
      </header>

      <section class="panel">
        <h2>The table</h2>
        <div class="fields">
          <label>Stacks <small>comma separated, biggest first or not</small><input id="stacks" type="text" value="48000, 31000, 25000, 16000, 9000" spellcheck="false"></label>
          <label>Payouts <small>1st, 2nd, 3rd…</small><input id="payouts" type="text" value="5000, 3000, 2000, 1200, 800" spellcheck="false"></label>
        </div>
        <div id="table"></div>
      </section>

      <section class="panel">
        <h2>Calling off</h2>
        <div class="fields">
          <label>Seat <select id="hero"></select></label>
          <label>Chips at risk<input id="risk" type="number" min="1" step="100" value="16000"></label>
          <label>Dead money in the pot<input id="pot" type="number" min="0" step="100" value="4000"></label>
        </div>
        <div id="spot"></div>
      </section>

      <section class="panel">
        <h2>What this is</h2>
        <p class="note"><b>Exact, not sampled.</b> Every number above is computed by enumerating finishing orders as deep as there are prizes — no Monte Carlo, no approximation. Run it twice and you get the same answer.</p>
        <p class="note"><b>But ICM is a model.</b> Malmuth–Harville assumes your chance of finishing first is exactly your share of the chips. It knows nothing about who plays well, who is in which seat, or that the blinds are about to double. Treat the number as a floor on how tight you should be, not as the answer.</p>
        <p class="note">It also assumes the hand ends now. A call that leaves you with chips is not the same as one that busts you, and the model handles that correctly — but it cannot know what you would do with the chips afterwards.</p>
      </section>
    </div>`

  const $ = s => main.querySelector(s)
  let stacks = [], payouts = []

  function readInputs() {
    stacks = nums($('#stacks').value)
    payouts = nums($('#payouts').value)
    return stacks.length >= 2 && payouts.length >= 1 && stacks.some(s => s > 0)
  }

  function paintTable() {
    if (!readInputs()) {
      $('#table').innerHTML = '<p class="verdict bad">Give at least two stacks and one payout.</p>'
      $('#spot').innerHTML = ''
      return false
    }
    const eq = icmEquity(stacks, payouts)
    const totalChips = stacks.reduce((a, b) => a + b, 0)
    const pool = eq.reduce((a, b) => a + b, 0)

    $('#table').innerHTML = `
      <table class="icm-table">
        <thead><tr><th>Seat</th><th>Stack</th><th>Chips</th><th>Money</th><th>Worth</th><th></th></tr></thead>
        <tbody>${stacks.map((s, i) => {
          const chip = s / totalChips, m = eq[i] / pool
          const gap = m - chip
          return `<tr${s === Math.max(...stacks) ? ' class="leader"' : ''}>
            <td>${i + 1}</td>
            <td class="n">${s.toLocaleString()}</td>
            <td class="n">${pct(chip)}</td>
            <td class="n">${pct(m)}</td>
            <td class="n">${money(eq[i])}</td>
            <td class="gap ${gap < -0.001 ? 'down' : gap > 0.001 ? 'up' : ''}">${gap > 0.001 ? '▲' : gap < -0.001 ? '▼' : '–'} ${pct(Math.abs(gap))}</td>
          </tr>`
        }).join('')}</tbody>
      </table>
      <p class="note">The last column is the gap between a seat's share of the chips and its share of the money. A chip leader is always worth <b>less</b> than their chips suggest and a short stack <b>more</b> — that gap is ICM, and it is the reason a big stack cannot just bully with impunity.</p>`

    const sel = $('#hero')
    const keep = sel.value
    sel.innerHTML = stacks.map((s, i) => `<option value="${i}">Seat ${i + 1} — ${s.toLocaleString()}</option>`).join('')
    if (keep && +keep < stacks.length) sel.value = keep
    return true
  }

  function paintSpot() {
    if (!stacks.length) return
    const hero = Math.min(+$('#hero').value || 0, stacks.length - 1)
    const risk = Math.max(1, +$('#risk').value || 1)
    const pot = Math.max(0, +$('#pot').value || 0)

    const need = icmRequiredEquity({ stacks, payouts, hero, risk, pot })
    const factor = bubbleFactor({ stacks, payouts, hero, risk, pot })
    const chipsOnly = requiredEquity(risk, risk + pot)
    const allIn = risk >= stacks[hero]

    $('#spot').innerHTML = `
      <div class="stats">
        ${stat('Counting chips', pct(chipsOnly), 'what pot odds alone would ask')}
        ${stat('Counting money', pct(need), 'what ICM actually asks')}
        ${stat('Bubble factor', factor.toFixed(2), factor > 1.02 ? 'the premium you are paying' : 'chips and money agree here')}
      </div>
      <p class="verdict ${factor > 1.25 ? 'bad' : ''}">${
        factor <= 1.02
          ? `No premium here — with this payout structure the money tracks the chips, so play it as a chip-EV spot.`
          : `You need <b>${pct(need)}</b> to call, not the ${pct(chipsOnly)} the pot is offering. That is ${((factor - 1) * 100).toFixed(0)}% tighter than chip counting would tell you.`}</p>
      ${allIn ? `<p class="note">This risks seat ${hero + 1}'s whole stack. That is where the premium is largest — busting is the one outcome you cannot recover from.</p>`
        : `<p class="note">Seat ${hero + 1} would still have ${(stacks[hero] - risk).toLocaleString()} behind after losing. Surviving is worth a great deal, which is why this asks less than a call that busts you.</p>`}`
  }

  const stat = (k, v, n = '') =>
    `<div class="stat"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${n ? `<span class="n">${esc(n)}</span>` : ''}</div>`

  const redraw = () => { if (paintTable()) paintSpot() }
  for (const id of ['#stacks', '#payouts']) $(id).addEventListener('input', redraw)
  for (const id of ['#hero', '#risk', '#pot']) $(id).addEventListener('input', paintSpot)

  redraw()
  return { destroy() {} }
}
