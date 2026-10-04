// The 169-hand grid as a lesson block: ```grid fences in a lesson.
//
// The trainers have shown the grid since Phase 3, but a lesson ABOUT the grid never drew it — it said
// "that is the grid everyone draws" to a reader who had never seen one (owner's comment, 2026-10-02).
// So the lesson gets its own, built to be read rather than drilled:
//
//   show: shapes   the grid as everyone draws it — pairs on the diagonal, suited above, offsuit below,
//                  every cell labelled, and a key with the counts
//   show: dealt    the same grid with a switch: "as drawn" (every square equal) and "as dealt" (every
//                  square shaded by how many real hands it holds, 6 / 4 / 12), with a bar of the shares
//   show: chart    the app's opening chart (content/charts/rfi-9max.json) on the grid, one seat at a time
//                  with a seat switcher — coloured squares are the raises; `position: UTG` picks the first
//
// Tap any square and the hands inside it are drawn as cards — the four AKs, the twelve AKo — which is
// what turns "169 shapes, 1,326 hands" from a sentence into something seen. Every number shown is
// counted here from the deck (js/engine/ranges.js), never typed in; engine-test holds the totals.

import { GRID, cellName, cellCombos, isPair, isSuited, gridToRank, shapeCounts, parseRange, idx } from './engine/ranges.js'
import { cardRowSVG } from './table.js'

const WORD = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace']
const PLURAL = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces']
const KINDS = [
  { id: 'pair', label: 'Pairs' },
  { id: 'suited', label: 'Suited' },
  { id: 'offsuit', label: 'Offsuit' },
]
const kindOf = (i, j) => isPair(i, j) ? 'pair' : isSuited(i, j) ? 'suited' : 'offsuit'
const pct = (n, d) => `${(n / d * 100).toFixed(1)}%`
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** "a pair of aces", "ace-king suited", "seven-two offsuit" */
function spoken(i, j) {
  const hi = gridToRank(Math.min(i, j)), lo = gridToRank(Math.max(i, j))
  if (i === j) return `a pair of ${PLURAL[hi]}`
  return `${WORD[hi]}-${WORD[lo]} ${i < j ? 'suited' : 'offsuit'}`
}

/** Why a cell holds the number of hands it does, in one line a beginner can check by counting. */
function why(i, j, n) {
  const r = gridToRank(Math.min(i, j))
  if (i === j) return `Any two of the four ${PLURAL[r]}: ${n} ways to pick them.`
  if (isSuited(i, j)) return `Both cards in the same suit: one way for each of the four suits, ${n} in all.`
  return `The two cards in different suits: 4 suits for the first, 3 left for the second, ${n} ways.`
}

/**
 * Mount a ```grid fence in place of `blk`.
 * @param {Element} blk  the placeholder the Markdown renderer left
 * @param {{show?: string, caption?: string}} p
 */
export function mountGridBlock(blk, p = {}) {
  if (p.show === 'chart') return mountChartBlock(blk, p)
  const dealtBlock = p.show === 'dealt'
  const counts = shapeCounts()
  const totalCells = GRID * GRID
  const totalHands = KINDS.reduce((a, k) => a + counts[k.id].combos, 0)

  const fig = document.createElement('figure')
  fig.className = 'gridblock'
  let mode = 'drawn', picked = null

  const cells = []
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const n = cellCombos(i, j).length
    cells.push({ i, j, n, name: cellName(i, j), kind: kindOf(i, j) })
  }

  fig.innerHTML = `
    ${dealtBlock ? `<div class="gb-switch" role="group" aria-label="How the grid is drawn">
      <button type="button" data-mode="drawn" aria-pressed="true">As drawn</button>
      <button type="button" data-mode="dealt" aria-pressed="false">As dealt</button>
    </div>` : ''}
    <div class="grid169 lesson-grid">${cells.map((c, k) =>
      `<button type="button" class="c ${c.kind}" data-k="${k}" style="--share:${c.n / 12}" aria-label="${esc(c.name)}, ${esc(spoken(c.i, c.j))}, ${c.n} hands"><span class="nm">${c.name}</span><span class="ct">${c.n}</span></button>`).join('')}</div>
    <div class="gb-key"></div>
    ${dealtBlock ? '<div class="gb-bar" aria-hidden="true"></div>' : ''}
    <div class="gb-detail" aria-live="polite"></div>
    ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}`
  blk.replaceWith(fig)

  const grid = fig.querySelector('.lesson-grid')
  const detail = fig.querySelector('.gb-detail')

  function paintKey() {
    fig.querySelector('.gb-key').innerHTML = KINDS.map(k => {
      const c = counts[k.id]
      const each = cells.find(x => x.kind === k.id).n
      return `<span class="gb-k ${k.id}" style="--share:${each / 12}"><i></i><b>${k.label}</b> ${c.cells} squares · ${each} hands each · ${c.combos} in all</span>`
    }).join('')
    const bar = fig.querySelector('.gb-bar')
    if (!bar) return
    const of = k => mode === 'drawn' ? counts[k].cells / totalCells : counts[k].combos / totalHands
    // the segments' widths animate between the two modes; the shares are written underneath, since a
    // 5.9% sliver is too narrow to hold its own label
    const each = k => cells.find(x => x.kind === k).n / 12
    if (!bar.firstChild) bar.innerHTML = `<div class="gb-track">${KINDS.map(k => `<span class="${k.id}" style="--share:${each(k.id)}"></span>`).join('')}</div><p></p>`
    KINDS.forEach((k, n) => { bar.querySelector('.gb-track').children[n].style.flexGrow = of(k.id) })
    bar.querySelector('p').innerHTML = `${mode === 'drawn' ? `Share of the ${totalCells} squares` : `Share of the ${totalHands.toLocaleString('en')} hands you can be dealt`}: `
      + KINDS.map(k => `<b class="${k.id}">${k.label} ${pct(of(k.id), 1)}</b>`).join(' · ')
  }

  function paintDetail() {
    grid.querySelectorAll('.c.picked').forEach(b => b.classList.remove('picked'))
    if (picked == null) {
      detail.innerHTML = `<p class="gb-prompt">Tap any square to see the hands inside it.</p>`
      return
    }
    const c = cells[picked]
    grid.querySelector(`[data-k="${picked}"]`).classList.add('picked')
    detail.innerHTML = `<p><b>${esc(c.name)}</b> — ${esc(spoken(c.i, c.j))}: <b>${c.n} hands</b>, ${pct(c.n, totalHands)} of all ${totalHands.toLocaleString('en')}. ${esc(why(c.i, c.j, c.n))}</p><div class="gb-combos"></div>`
    const box = detail.querySelector('.gb-combos')
    for (const combo of cellCombos(c.i, c.j)) box.append(cardRowSVG(combo, { height: 40, gap: 3 }))
  }

  function setMode(m) {
    mode = m
    fig.classList.toggle('dealt', m === 'dealt')
    fig.querySelectorAll('.gb-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)))
    paintKey()
  }

  fig.addEventListener('click', e => {
    const sw = e.target.closest('.gb-switch button')
    if (sw) return setMode(sw.dataset.mode)
    const cell = e.target.closest('.lesson-grid .c')
    if (!cell) return
    const k = Number(cell.dataset.k)
    picked = picked === k ? null : k
    paintDetail()
  })

  setMode('drawn')
  paintDetail()
  return { destroy() { fig.remove() } }
}


// --- show: chart ------------------------------------------------------------------------------------

const SEAT_WORDS = { UTG: 'under the gun', UTG1: 'under the gun + 1', MP: 'in middle position', LJ: 'in the lojack', HJ: 'in the hijack', CO: 'in the cutoff', BTN: 'on the button', SB: 'in the small blind' }
const BEHIND = { UTG: 8, UTG1: 7, MP: 6, LJ: 5, HJ: 4, CO: 3, BTN: 2, SB: 1 }

/**
 * The opening chart on the grid, one seat at a time. The chart is the same file the range trainer and
 * the game score against, fetched here rather than copied into the lesson, so the lesson cannot show a
 * different chart from the one that marks you. Its percentages are recomputed by scripts/check-charts.mjs.
 */
function mountChartBlock(blk, p) {
  const fig = document.createElement('figure')
  fig.className = 'gridblock chartblock'
  fig.innerHTML = '<p class="gb-prompt">Loading the chart…</p>'
  blk.replaceWith(fig)
  let dead = false, seat = null, picked = null, chart = null

  fetch('content/charts/rfi-9max.json').then(r => r.json()).then(c => {
    if (dead) return
    chart = c
    seat = c.positions.find(x => x.id === p.position) || c.positions[0]
    fig.innerHTML = `
      <div class="gb-seats" role="group" aria-label="Your seat">${c.positions.map(x =>
        `<button type="button" data-seat="${x.id}"><b>${x.id}</b><span>${x.pct}%</span></button>`).join('')}</div>
      <p class="gb-seatline"></p>
      <div class="grid169 lesson-grid chart-grid">${cells().map((cl, k) =>
        `<button type="button" class="c" data-k="${k}"><span class="nm">${cl.name}</span></button>`).join('')}</div>
      <div class="gb-key"><span class="gb-k raise"><i></i><b>Raise</b></span><span class="gb-k fold"><i></i><b>Fold</b></span></div>
      <div class="gb-detail" aria-live="polite"></div>
      ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}`
    paint()
  }).catch(e => { if (!dead) fig.innerHTML = `<p class="status bad">Could not load the chart: ${esc(e.message)}</p>` })

  let CELLS = null
  function cells() {
    if (!CELLS) { CELLS = []; for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) CELLS.push({ i, j, name: cellName(i, j) }) }
    return CELLS
  }

  function paint() {
    const w = parseRange(seat.range)
    fig.querySelectorAll('.gb-seats button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seat === seat.id)))
    fig.querySelectorAll('.chart-grid .c').forEach(b => {
      const cl = cells()[Number(b.dataset.k)]
      const on = w[idx(cl.i, cl.j)] > 0
      b.classList.toggle('raise', on)
      b.setAttribute('aria-label', `${cl.name}: ${on ? 'raise' : 'fold'} ${SEAT_WORDS[seat.id] || seat.name}`)
    })
    fig.querySelector('.gb-seatline').innerHTML = `<b>${esc(seat.name)}</b> — ${BEHIND[seat.id]} player${BEHIND[seat.id] === 1 ? '' : 's'} still to act behind you. Raise <b>${seat.pct}%</b> of hands: ${esc(seat.range)}.`
    paintDetail()
  }

  function paintDetail() {
    const d = fig.querySelector('.gb-detail')
    fig.querySelectorAll('.chart-grid .c.picked').forEach(b => b.classList.remove('picked'))
    if (picked == null) {
      d.innerHTML = `<p class="gb-prompt">${esc(seat.note || '')} Tap any square to check a hand.</p>`
      return
    }
    const cl = cells()[picked]
    fig.querySelector(`.chart-grid [data-k="${picked}"]`).classList.add('picked')
    const on = parseRange(seat.range)[idx(cl.i, cl.j)] > 0
    d.innerHTML = `<p><b>${esc(cl.name)}</b> — ${esc(spoken(cl.i, cl.j))} — <b>${on ? 'raise' : 'fold'}</b> ${esc(SEAT_WORDS[seat.id] || '')}. ${esc(seat.note || '')}</p><div class="gb-combos"></div>`
    const box = d.querySelector('.gb-combos')
    // one example of the hand as cards is enough here; the 169 lesson shows them all
    box.append(cardRowSVG(cellCombos(cl.i, cl.j)[0], { height: 40, gap: 3 }))
  }

  fig.addEventListener('click', e => {
    const sb = e.target.closest('.gb-seats button')
    if (sb && chart) { seat = chart.positions.find(x => x.id === sb.dataset.seat); return paint() }
    const c = e.target.closest('.chart-grid .c')
    if (!c) return
    const k = Number(c.dataset.k)
    picked = picked === k ? null : k
    paintDetail()
  })
  return { destroy() { dead = true; fig.remove() } }
}
