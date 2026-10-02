// Lesson renderer: Markdown (+ frontmatter) → HTML, with `table` and `try` fences mounted as components.
//
// Five fences:
//   ```table     a spot to look at    — the parameters of js/spot.js, plus `caption`
//   ```try       a spot to answer     — see js/exercise.js for the four kinds
//   ```tip       a tip the cat in the corner can say — see mountTip
//   ```rankings  hands drawn as cards, strongest first — see mountRankings
//   ```grid      the 169-hand grid, tap a square for its hands — see js/grid-block.js
//
// `+++ Title` opens a collapsible section and a bare `+++` closes it, which is how a lesson keeps its
// long explanations out of the way of its drills.

import { marked } from '../vendor/marked/marked.esm.js'
import { mountTable, cardRowSVG } from './table.js'
import { parseCards, cardGlyph, rankOf } from './engine/cards.js'
import { evaluate, describe, HIGH_CARD, PAIR, TWO_PAIR, TRIPS, QUADS } from './engine/evaluator.js'
import { mountExercise } from './exercise.js'
import { mountGridBlock } from './grid-block.js'
import { spotFromParams } from './spot.js'
import { avatarsForSeats } from './avatars.js'
import { parseFrontmatter, parseParams } from './frontmatter.js'
import { mascot, catHeadHTML } from './mascot.js'
export { parseFrontmatter, parseParams }

const BLOCKS = new Set(['table', 'try', 'tip', 'rankings', 'grid'])
marked.use({
  renderer: {
    code({ text, lang }) {
      if (BLOCKS.has(lang)) return `<div class="blk" data-kind="${lang}" data-src="${encodeURIComponent(text)}"></div>`
      return false
    },
  },
})

function expandSections(md) {
  return md.replace(/^\+\+\+[ \t]+(.+)$/gm, (_, t) => `<details class="more"><summary>${esc(t.trim())}</summary><div class="more-body">\n\n`)
           .replace(/^\+\+\+[ \t]*$/gm, '\n\n</div></details>')
}

export async function renderLesson(container, md, { lessonId, onSolved = null } = {}) {
  const { meta, body } = parseFrontmatter(md)
  const html = marked.parse(expandSections(body))
  const sources = Array.isArray(meta.sources) ? meta.sources : []
  container.innerHTML = `
    <article class="lesson">
      <header class="lesson-head">
        <span class="eyebrow">${esc(meta.track || '')}${meta.level ? ' · ' + esc(meta.level) : ''}</span>
        <h1>${esc(meta.title || lessonId)}</h1>
        ${meta.lede ? `<p class="lede">${esc(meta.lede)}</p>` : ''}
      </header>
      <div class="prose lesson-body">${html}</div>
      ${sources.length ? `<section class="sources"><span class="eyebrow">Sources</span><ul>${sources.map(s => `<li>${linkify(esc(s))}</li>`).join('')}</ul></section>` : ''}
    </article>`

  // Numbers in prose tables are aligned and set in the mono face BY CONTENT, not by position. The rule
  // used to be `td:last-child`, which was right by luck most of the time and wrong twice: the rule of
  // 4 and 2 table has six numeric columns and only the last was monospaced, and the MDF table put the
  // mono face on the words "80.0% of your range". A column counts as numeric only when every cell in
  // its body reads as a number, so a column of prose is never dragged into it.
  for (const table of container.querySelectorAll('.lesson-body table')) {
    const rows = [...table.querySelectorAll('tbody tr')]
    if (!rows.length) continue
    const cols = Math.max(...rows.map(r => r.children.length))
    for (let c = 0; c < cols; c++) {
      const cells = rows.map(r => r.children[c]).filter(Boolean)
      if (!cells.length) continue
      if (!cells.every(td => isNumeric(td.textContent))) continue
      for (const td of cells) td.classList.add('num')
      const head = table.querySelector('thead tr')
      if (head && head.children[c]) head.children[c].classList.add('num')
    }
  }

  const mounted = []
  const drillIds = []
  let index = 0

  for (const blk of container.querySelectorAll('.blk')) {
    const kind = blk.dataset.kind
    if (kind === 'tip') { mounted.push(mountTip(blk, decodeURIComponent(blk.dataset.src))); continue }
    if (kind === 'rankings') { mounted.push(mountRankings(blk, decodeURIComponent(blk.dataset.src))); continue }
    if (kind === 'grid') { mounted.push(mountGridBlock(blk, parseParams(decodeURIComponent(blk.dataset.src)))); continue }
    const p = parseParams(decodeURIComponent(blk.dataset.src))
    const fig = document.createElement('figure')
    blk.replaceWith(fig)

    if (kind === 'table') {
      fig.className = 'table-figure'
      try {
        const { state, hero } = spotFromParams(p)
        const wrap = document.createElement('div')
        fig.append(wrap)
        mounted.push(mountTable(wrap, {
          state, hero,
          reveal: p.reveal === 'true',
          showBB: p.showBB !== 'false',
          avatars: avatarsForSeats(state.seats.length, { hero: hero ?? 0 }),
        }))
      } catch (e) {
        fig.innerHTML = `<p class="status bad">Could not build this table: ${esc(e.message)}</p>`
      }
      if (p.caption) {
        const cap = document.createElement('figcaption')
        cap.textContent = p.caption
        fig.append(cap)
      }
    } else {
      const ex = mountExercise(fig, p, { lessonId, index: index++, onSolved })
      if (!ex.broken) drillIds.push(ex.id)
      mounted.push(ex)
    }
  }
  return { meta, mounted, drillIds }
}

/**
 * Does this cell read as a number? Currency, percentages, multipliers, big-blind counts, an odds ratio
 * and a leading sign all count; anything with a word in it does not. An em dash counts as a blank so a
 * single "no value" row does not disqualify an otherwise numeric column.
 */
function isNumeric(text) {
  const t = String(text).trim()
  if (!t || t === '\u2014' || t === '\u2013' || t === '-') return true
  return /^[+\u2212\-\u00b1\u00d7x]?\s*[$\u00a3\u20ac]?\s*\d[\d,.\s]*\s*(%|bb|x|\u00d7|k|M|to 1)?$/i.test(t)
}

/**
 * A tip tucked into a lesson: ```tip fences. In the text it is only a small cat and a label. The first
 * time the tip scrolls fully into view the cat in the corner meows that it has one; clicking the cat, or
 * the label, opens it. With the cat switched off, the label opens the tip inline instead.
 *
 * The body is plain text, **bold** allowed. An optional first line `title: …` replaces "Tip".
 */
function mountTip(blk, raw) {
  const lines = raw.trim().split('\n')
  let title = null
  if (/^title:/i.test(lines[0])) title = lines.shift().replace(/^title:\s*/i, '').trim()
  const text = lines.join(' ').replace(/\s+/g, ' ').trim()

  const el = document.createElement('div')
  el.className = 'tip'
  el.innerHTML = `<button class="tip-cue" type="button">${catHeadHTML(26)}<span>${esc(title || 'Meow tip')}</span></button><p class="tip-text" hidden></p>`
  el.querySelector('.tip-text').innerHTML = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  blk.replaceWith(el)

  const msg = { kind: 'tip', text, title: title || 'Meow tip', owner: el }
  // clicking the label in the text is asking, so the bubble opens; with the cat off, it opens inline
  el.querySelector('.tip-cue').addEventListener('click', () => {
    seen = true                     // read now: it should not meow about itself afterwards
    if (io) { io.disconnect(); io = null }
    if (!mascot.say(msg)) { const t = el.querySelector('.tip-text'); t.hidden = !t.hidden }
  })

  // Pop once, the first time the whole cue is on screen and clear of the bottom fifth (where the cat
  // is). Armed only after the page has settled: a new lesson is built while the previous page's scroll
  // position still stands, and an observer that looks during that moment can spend a tip on a cue the
  // reader never scrolled to.
  let io = null, dead = false, seen = false
  const arm = setTimeout(() => {
    if (dead || seen || typeof IntersectionObserver !== 'function') return
    io = new IntersectionObserver(entries => {
      // reaching it only makes the cat meow — nothing opens over what you are reading
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); io = null; mascot.notify(msg) }
    }, { threshold: 1, rootMargin: '0px 0px -20% 0px' })
    io.observe(el.querySelector('.tip-cue'))
  }, 700)
  return { destroy() { dead = true; clearTimeout(arm); if (io) io.disconnect(); mascot.hide(el) } }
}

/**
 * The hand rankings with every hand drawn as cards: ```rankings fences, one row per line,
 *
 *     Name | a short note | five cards
 *
 * strongest first. A beginner reads "full house" and learns nothing; five cards with the three and the
 * two visible teach it at a glance. The cards that MAKE the hand are drawn full and the kickers pale —
 * and which is which is the engine's call (it evaluates each example), so the chart cannot mark the
 * wrong card. scripts/verify-drills.mjs checks that every example is the hand its row names and beats
 * the row below.
 */
function mountRankings(blk, raw) {
  const root = document.createElement('div')
  root.className = 'rankings'
  const list = document.createElement('ol')
  let anyKicker = false, bad = null
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [name, note, spec] = line.split('|').map(s => (s || '').trim())
    let cards, ev
    try { cards = parseCards(spec); ev = evaluate(cards) } catch (e) { bad = `${name}: ${e.message}`; break }
    const made = madeRanks(ev)
    const faded = made ? cards.map((c, i) => made.includes(rankOf(c)) ? -1 : i).filter(i => i >= 0) : []
    if (faded.length) anyKicker = true
    const li = document.createElement('li')
    li.innerHTML = `<div class="rk-name"><b>${esc(name)}</b>${note ? `<span>${esc(note)}</span>` : ''}</div>`
    li.append(cardRowSVG(cards, { faded, label: `${describe(ev)}: ${cards.map(cardGlyph).join(' ')}` }))
    list.append(li)
  }
  if (bad) root.innerHTML = `<p class="status bad">Could not draw this chart: ${esc(bad)}</p>`
  else {
    root.append(list)
    if (anyKicker) {
      const legend = document.createElement('p')
      legend.className = 'rk-legend'
      legend.innerHTML = 'Pale cards are <b>kickers</b>: still part of the five, but they only count when two hands tie on the rest.'
      root.append(legend)
    }
  }
  blk.replaceWith(root)
  return { destroy() { root.remove() } }
}

/** The ranks that make the hand, or null when all five do (straight, flush, full house, straight flush). */
function madeRanks(ev) {
  switch (ev.cat) {
    case HIGH_CARD: case PAIR: case TRIPS: case QUADS: return [ev.tb[0]]
    case TWO_PAIR: return [ev.tb[0], ev.tb[1]]
    default: return null
  }
}

function linkify(s) { return s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
