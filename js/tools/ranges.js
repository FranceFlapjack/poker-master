// Preflop range trainer. A position and a hand; open or fold.
//
// On how hands are drawn: HALF from inside the position's range and half outside, which is not how a
// real table deals. At a real table under the gun you would fold nine hands in ten and learn almost
// nothing per spot. Drawing from both sides puts you on the boundary — the only part of a range anyone
// actually has to remember — and the page says so, because a trainer that quietly misrepresents
// frequencies is teaching something it has not told you.
//
// The chart is a teaching baseline, not equilibrium. content/charts/rfi-9max.json says exactly what it
// is and scripts/check-charts.mjs recomputes every percentage in it.

import { RANKS, SUIT_GLYPH, makeCard, isRed, cardGlyph, mulberry32 } from '../engine/cards.js'
import { parseRange, cellCombos, cellName, handToCell, idx, GRID, gridToRank, isPair, isSuited } from '../engine/ranges.js'
import { progress } from '../progress.js'
import { sound } from '../sound.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const cardHtml = c => `<span class="pc ${isRed(c) ? 'red' : 'black'}">${RANKS[c >> 2]}${SUIT_GLYPH[c & 3]}</span>`

export async function mountRanges(main) {
  document.title = 'Preflop ranges · Poker Master'
  const chart = await (await fetch('content/charts/rfi-9max.json')).json()
  const ranges = Object.fromEntries(chart.positions.map(p => [p.id, parseRange(p.range)]))

  main.innerHTML = `
    <div class="page tool trainer">
      <header class="hero">
        <span class="eyebrow">Tournament · trainer</span>
        <h1>${esc(chart.title)}</h1>
        <p>${esc(chart.subtitle)} · ${esc(chart.stackDepth)}. Open or fold — then see where the hand sits.</p>
      </header>

      <section class="panel spot">
        <div class="spot-head">
          <div><span class="k">Position</span><span class="pos" id="pos"></span><span class="n" id="posname"></span></div>
          <div><span class="k">Your hand</span><span class="hand" id="hand"></span></div>
        </div>
        <div class="actions" id="answer">
          <button class="btn primary" data-a="open">Open</button>
          <button class="btn" data-a="fold">Fold</button>
        </div>
        <div class="readout" id="result" hidden></div>
      </section>

      <section class="panel">
        <h2>The range</h2>
        <div id="grid"></div>
        <p class="note" id="legend"></p>
      </section>

      <section class="panel">
        <h2>Provenance</h2>
        <p class="note"><b>Not a solver output and not GTO.</b> ${esc(chart.provenance.basis)}</p>
        <p class="note">${esc(chart.provenance.note)}</p>
        <p class="note">${esc(chart.provenance.copied)}</p>
        <p class="note">Hands are drawn half from inside the range and half outside, so you meet the boundary far more often than at a real table. Your accuracy here is not your accuracy there.</p>
      </section>
    </div>`

  const $ = s => main.querySelector(s)
  const rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0)
  let spot = null, answered = false

  function draw() {
    const pos = chart.positions[(rng() * chart.positions.length) | 0]
    const weights = ranges[pos.id]
    const inside = rng() < 0.5
    // collect cells on the chosen side, then pick a real two-card combo from one of them
    const cells = []
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      if ((weights[idx(i, j)] > 0) === inside) cells.push([i, j])
    }
    const [i, j] = cells[(rng() * cells.length) | 0]
    const combos = cellCombos(i, j)
    const cards = combos[(rng() * combos.length) | 0]
    spot = { pos, cards, cell: { i, j }, shouldOpen: weights[idx(i, j)] > 0 }
    answered = false

    $('#pos').textContent = pos.id
    $('#posname').textContent = pos.name
    $('#hand').innerHTML = cards.map(cardHtml).join('')
    $('#result').hidden = true
    $('#answer').innerHTML = `<button class="btn primary" data-a="open">Open</button><button class="btn" data-a="fold">Fold</button>`
    paintGrid(pos, null)
    $('#legend').textContent = `${pos.name} · ${pos.pct}% of hands · ${pos.range}`
  }

  function answer(said) {
    if (answered) return
    answered = true
    const right = (said === 'open') === spot.shouldOpen
    const topic = `preflop.rfi.${spot.pos.id}`
    progress.recordDrill(`rfi#${spot.pos.id}#${cellName(spot.cell.i, spot.cell.j)}`, { firstAttempt: true, topic, correct: right })
    if (right) sound.play('success')

    const acc = progress.accuracy(topic)
    $('#answer').innerHTML = `<button class="btn primary" data-a="next">Next hand</button>`
    $('#result').hidden = false
    $('#result').innerHTML = `
      <p class="verdict ${right ? 'good' : 'bad'}">${right ? 'Correct.' : 'No.'} ${esc(cellName(spot.cell.i, spot.cell.j))} ${spot.shouldOpen ? 'is an open' : 'is a fold'} from ${esc(spot.pos.id)}.</p>
      <p class="note">${esc(spot.pos.note)}</p>
      ${acc != null ? `<p class="note">You are ${(acc * 100).toFixed(0)}% on ${esc(spot.pos.id)} so far.</p>` : ''}`
    paintGrid(spot.pos, spot.cell)
  }

  function paintGrid(pos, mark) {
    const weights = ranges[pos.id]
    let html = '<div class="grid169">'
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const on = weights[idx(i, j)] > 0
        const kind = isPair(i, j) ? 'pair' : isSuited(i, j) ? 'suited' : 'offsuit'
        const here = mark && mark.i === i && mark.j === j
        html += `<i class="c ${on ? 'on' : 'off'} ${kind}${here ? ' here' : ''}">${cellName(i, j)}</i>`
      }
    }
    $('#grid').innerHTML = html + '</div>'
  }

  main.addEventListener('click', e => {
    const b = e.target.closest('[data-a]')
    if (!b) return
    sound.unlock()
    if (b.dataset.a === 'next') draw()
    else answer(b.dataset.a)
  })
  document.addEventListener('keydown', onKey)
  function onKey(e) {
    if (!main.isConnected) return document.removeEventListener('keydown', onKey)
    if (answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); draw() }
    else if (!answered && (e.key === 'o' || e.key === 'O')) answer('open')
    else if (!answered && (e.key === 'f' || e.key === 'F')) answer('fold')
  }

  draw()
  return { destroy() { document.removeEventListener('keydown', onKey) } }
}
