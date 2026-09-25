// Push/fold trainer — the one chart in this app that was SOLVED rather than authored.
//
// Everything on this page comes out of content/charts/pushfold-hu.json, which js/engine/pushfold.js
// computed by iterated best response over this app's own equity code. That makes it a different object
// from the opening charts: those are a teaching baseline somebody wrote down, this is an answer. It is
// also the only page here allowed to use the word equilibrium.
//
// Three limits, repeated on the page because the file insists on them:
//   - HEADS-UP only. Multiway push/fold is a different game and is not solved here.
//   - CHIP EV only. At a final table the money is not the chips — that is the ICM lab.
//   - Past about 15bb shoving stops being the right model, so the trainer does not deal those spots
//     even though the chart carries the rows.
//
// And one thing the solver knows that a chart cannot show: some hands are MIXED. A cell the equilibrium
// plays half the time is not a fold, so the trainer refuses to score it rather than inventing a
// certainty the solve does not have.

import { RANKS, SUIT_GLYPH, isRed, mulberry32 } from '../engine/cards.js'
import { parseRange, cellCombos, cellName, idx, GRID, isPair, isSuited } from '../engine/ranges.js'
import { requiredEquity } from '../engine/ev.js'
import { progress } from '../progress.js'
import { sound } from '../sound.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const cardHtml = c => `<span class="pc ${isRed(c) ? 'red' : 'black'}">${RANKS[c >> 2]}${SUIT_GLYPH[c & 3]}</span>`

// Past this depth the model itself is wrong, not merely approximate — a 20bb stack has folds, calls,
// limps and raises available and shoving every hand in a 40% range is a caricature of the game.
const DRILL_MAX = 15
// And not below 2bb either: at 1bb effective the big blind has already posted their whole stack, so
// there is nothing to call and no fold to get wrong. The chart keeps the row; the trainer does not ask it.
const DRILL_MIN = 2
const band = bb => bb <= 5 ? '2-5bb' : bb <= 10 ? '6-10bb' : '11-15bb'

export async function mountPushfold(main) {
  document.title = 'Push or fold · Poker Master'
  const chart = await (await fetch('content/charts/pushfold-hu.json')).json()

  // one parse per depth, up front: the grids repaint on every answer
  const byDepth = new Map()
  for (const d of chart.depths) {
    byDepth.set(d.bb, {
      ...d,
      pushR: parseRange(d.push),
      callR: parseRange(d.call),
      pushM: parseRange(d.pushMixed || ''),
      callM: parseRange(d.callMixed || ''),
    })
  }
  const DEPTHS = chart.depths.map(d => d.bb)

  main.innerHTML = `
    <div class="page tool trainer pushfold">
      <header class="hero">
        <span class="eyebrow">Tournament · trainer</span>
        <h1>${esc(chart.title)}</h1>
        <p>${esc(chart.subtitle)}. Solved, not authored — this is the one chart here computed by the app itself.</p>
      </header>

      <section class="panel spot">
        <div class="spot-head">
          <div><span class="k">You are</span><span class="pos" id="seat"></span><span class="n" id="seatname"></span></div>
          <div><span class="k">Effective stack</span><span class="pos" id="depth"></span><span class="n" id="price"></span></div>
          <div><span class="k">Your hand</span><span class="hand" id="hand"></span></div>
        </div>
        <p class="note" id="ask"></p>
        <div class="actions" id="answer"></div>
        <div class="readout" id="result" hidden></div>
      </section>

      <section class="panel">
        <h2>The equilibrium</h2>
        <div class="fields">
          <label>Stack depth <small>the trainer deals ${DRILL_MIN}–${DRILL_MAX}bb; the rest is chart only</small>
            <select id="pick">${DEPTHS.map(bb => `<option value="${bb}">${bb} big blinds</option>`).join('')}</select></label>
        </div>
        <div class="two-grids">
          <div><h3 id="pushhead"></h3><div id="pushgrid"></div></div>
          <div><h3 id="callhead"></h3><div id="callgrid"></div></div>
        </div>
        <p class="note" id="mixnote"></p>
        <p class="note">The calling range answers the shoving range above it, not a human. Against someone shoving 20% you should call far tighter than this, and against someone shoving every hand far wider.</p>
      </section>

      <section class="panel">
        <h2>Where this came from</h2>
        <p class="note"><b>Computed by this app.</b> ${esc(chart.provenance.basis)}</p>
        <p class="note">${esc(chart.provenance.copied)}</p>
        <p class="note"><b>The limits.</b> ${esc(chart.provenance.note)}</p>
        <p class="note">${esc(chart.provenance.accuracy)}</p>
        <p class="note">${esc(chart.provenance.mixed || '')}</p>
        <p class="note">Hands are dealt half from inside the equilibrium range and half outside, so you meet the boundary far more often than at a table. Your accuracy here is not your accuracy there.</p>
        <p class="note"><span class="small">Source: ${esc(chart.provenance.source)}</span></p>
      </section>
    </div>`

  const $ = s => main.querySelector(s)
  const rng = mulberry32((Date.now() ^ 0x5bf03635) >>> 0)
  let spot = null, answered = false

  function draw() {
    const bb = DRILL_MIN + ((rng() * (DRILL_MAX - DRILL_MIN + 1)) | 0)
    const d = byDepth.get(bb)
    const seat = rng() < 0.5 ? 'sb' : 'bb'
    const weights = seat === 'sb' ? d.pushR : d.callR
    const mixed = seat === 'sb' ? d.pushM : d.callM

    // half inside the range and half outside, for the same reason the range trainer does it: the
    // boundary is the only part of a range anyone has to remember
    const inside = rng() < 0.5
    const cells = []
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      if ((weights[idx(i, j)] > 0) === inside) cells.push([i, j])
    }
    if (!cells.length) return draw()          // at 2bb the big blind calls everything: there is no outside
    const [i, j] = cells[(rng() * cells.length) | 0]
    const combos = cellCombos(i, j)
    spot = {
      bb, d, seat, cell: { i, j },
      cards: combos[(rng() * combos.length) | 0],
      yes: weights[idx(i, j)] > 0,
      mixed: mixed[idx(i, j)] > 0,
    }
    answered = false

    $('#seat').textContent = seat.toUpperCase()
    $('#seatname').textContent = seat === 'sb' ? 'small blind, first to act' : 'big blind, facing a shove'
    $('#depth').textContent = `${bb} bb`
    $('#price').textContent = seat === 'sb'
      ? `shove ${bb} to win 1.5`
      : `${(bb - 1).toFixed(1)} more to call, ${(100 * requiredEquity(bb - 1, bb + 1)).toFixed(1)}% needed`
    $('#hand').innerHTML = spot.cards.map(cardHtml).join('')
    $('#ask').textContent = seat === 'sb'
      ? 'Folding gives up your half blind. Shoving wins 1bb whenever the big blind folds.'
      : 'The small blind is all in. You have already posted one big blind.'
    $('#result').hidden = true
    $('#answer').innerHTML = seat === 'sb'
      ? '<button class="btn primary" data-a="yes">Shove</button><button class="btn" data-a="no">Fold</button>'
      : '<button class="btn primary" data-a="yes">Call</button><button class="btn" data-a="no">Fold</button>'
    $('#pick').value = String(bb)
    paint(bb, null)
  }

  function answer(said) {
    if (answered || !spot) return
    answered = true
    const { bb, d, seat, cell } = spot
    const name = cellName(cell.i, cell.j)
    const right = (said === 'yes') === spot.yes
    const verb = seat === 'sb' ? 'shove' : 'call'
    const folds = 100 - d.callPct
    let acc = null

    // A mixed hand is NOT scored. The solver plays it both ways, so there is no answer to be wrong about,
    // and recording one would make the accuracy figure a lie about the chart.
    if (!spot.mixed) {
      const topic = `pushfold.hu.${seat}.${band(bb)}`
      progress.recordDrill(`pushfold#${seat}#${bb}bb#${name}`, { firstAttempt: true, topic, correct: right })
      if (right) sound.play('success')
      acc = progress.accuracy(topic)
    }

    $('#answer').innerHTML = '<button class="btn primary" data-a="next">Next spot</button>'
    $('#result').hidden = false
    $('#result').innerHTML = spot.mixed
      ? `<p class="verdict">Not scored — the solver mixes here.</p>
         <p class="note">At ${bb}bb the equilibrium plays ${esc(name)} both ways from the ${seat.toUpperCase()}, near enough to half the time that calling either answer wrong would be inventing a certainty the solve does not have.</p>`
      : `<p class="verdict ${right ? 'good' : 'bad'}">${right ? 'Correct.' : 'No.'} ${esc(name)} is a ${spot.yes ? verb : 'fold'} from the ${seat.toUpperCase()} at ${bb}bb.</p>
         <p class="note">${seat === 'sb'
            ? `The equilibrium shoves ${d.pushPct}% of hands at this depth and the big blind folds ${folds.toFixed(1)}% of the time, so a shove picks up 1bb outright more often than not. That is most of why it beats folding — not the times you are called and win.`
            : `The equilibrium calls ${d.callPct}% at this depth. You need ${(100 * requiredEquity(bb - 1, bb + 1)).toFixed(1)}% against a range of ${d.pushPct}%, which is why the calling range is so much tighter than the shoving one.`}</p>
         ${acc != null ? `<p class="note">You are ${(acc * 100).toFixed(0)}% on the ${seat.toUpperCase()} at ${esc(band(bb))} so far.</p>` : ''}`
    paint(bb, cell)
  }

  function paint(bb, mark) {
    const d = byDepth.get(bb)
    const hero = mark && spot && spot.bb === bb ? mark : null
    $('#pushhead').textContent = `SB shoves — ${d.pushPct}%`
    $('#callhead').textContent = `BB calls — ${d.callPct}%`
    $('#pushgrid').innerHTML = grid(d.pushR, d.pushM, spot && spot.seat === 'sb' ? hero : null)
    $('#callgrid').innerHTML = grid(d.callR, d.callM, spot && spot.seat === 'bb' ? hero : null)
    const mixCount = countOn(d.pushM) + countOn(d.callM)
    $('#mixnote').textContent = mixCount
      ? `${mixCount} hand${mixCount === 1 ? '' : 's'} at this depth sit${mixCount === 1 ? 's' : ''} on the boundary — the solver plays them some of the time and folds them the rest. They are outlined rather than coloured in, and the trainer does not score them.`
      : 'Nothing is mixed at this depth: every hand is in or out.'
  }

  const countOn = r => { let n = 0; for (let c = 0; c < 169; c++) if (r[c] > 0) n++; return n }

  function grid(weights, mixed, mark) {
    let html = '<div class="grid169">'
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const on = weights[idx(i, j)] > 0
        const kind = isPair(i, j) ? 'pair' : isSuited(i, j) ? 'suited' : 'offsuit'
        const mix = mixed[idx(i, j)] > 0 ? ' mix' : ''
        const here = mark && mark.i === i && mark.j === j ? ' here' : ''
        html += `<i class="c ${on ? 'on' : 'off'} ${kind}${mix}${here}">${cellName(i, j)}</i>`
      }
    }
    return html + '</div>'
  }

  main.addEventListener('click', e => {
    const b = e.target.closest('[data-a]')
    if (!b) return
    sound.unlock()
    if (b.dataset.a === 'next') draw()
    else answer(b.dataset.a)
  })
  $('#pick').addEventListener('change', e => paint(+e.target.value, spot && answered ? spot.cell : null))

  document.addEventListener('keydown', onKey)
  function onKey(e) {
    if (!main.isConnected) return document.removeEventListener('keydown', onKey)
    if (e.target.tagName === 'SELECT') return
    const k = e.key.toLowerCase()
    if (answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); draw() }
    else if (!answered && (k === 's' || k === 'c')) answer('yes')
    else if (!answered && k === 'f') answer('no')
  }

  draw()
  return { destroy() { document.removeEventListener('keydown', onKey) } }
}
