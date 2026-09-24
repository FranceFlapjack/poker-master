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

function linkify(s) { return s.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
