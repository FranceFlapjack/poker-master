// Lesson renderer: Markdown (+ frontmatter) → HTML, with `table` and `try` fences mounted as components.
//
// Two fences:
//   ```table   a spot to look at    — the parameters of js/spot.js, plus `caption`
//   ```try     a spot to answer     — see js/exercise.js for the four kinds
//
// `+++ Title` opens a collapsible section and a bare `+++` closes it, which is how a lesson keeps its
// long explanations out of the way of its drills.

import { marked } from '../vendor/marked/marked.esm.js'
import { mountTable } from './table.js'
import { mountExercise } from './exercise.js'
import { spotFromParams } from './spot.js'
import { avatarsForSeats } from './avatars.js'
import { parseFrontmatter, parseParams } from './frontmatter.js'
export { parseFrontmatter, parseParams }

const BLOCKS = new Set(['table', 'try'])
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
          avatars: avatarsForSeats(state.seats.length),
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

function linkify(s) { return s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
