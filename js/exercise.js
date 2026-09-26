// A `try` block: one drill. The reader answers, the app says whether that was right and why.
//
// Four kinds, and the difference between them matters more than it looks:
//
//   showdown  who wins this board?      ANSWER COMES FROM THE ENGINE
//   rank      which hand is stronger?   ANSWER COMES FROM THE ENGINE
//   action    fold, call or raise?      answer is authored — it is a judgement
//   choice    a plain question          answer is authored
//
// The first two cannot be authored wrong, because nobody authors them: evaluate() decides, and
// scripts/verify-drills.mjs re-checks every one of them offline. The last two are opinions, and the
// checker reports them as unverifiable rather than pretending it has confirmed anything.
//
// solveDrill() itself lives in spot.js, which has no DOM imports, so the Node checkers can run it.

import { mountTable, mountHands } from './table.js'
import { parseCards } from './engine/cards.js'
import { spotFromParams, solveDrill } from './spot.js'
import { progress } from './progress.js'
import { sound } from './sound.js'
import { avatarsForSeats } from './avatars.js'
import { mascot } from './mascot.js'


export function mountExercise(container, p, ctx = {}) {
  const kind = p.type || 'action'
  const id = p.id || `${ctx.lessonId || 'x'}#${ctx.index ?? 0}`
  const topic = p.topic || `${ctx.lessonId || 'lesson'}.${kind}`

  let solved
  try { solved = solveDrill(p) } catch (e) {
    container.className = 'exercise broken'
    container.innerHTML = `<p class="status bad">This drill is malformed: ${esc(e.message)}</p>`
    return { id, broken: true }
  }

  // A `choice` drill has no picture, so the two-column grid would leave 58% of the row empty and crush
  // the question into the rest. It gets a single column instead, and the question grows to match.
  const hasPicture = kind !== 'choice'
  container.className = hasPicture ? 'exercise' : 'exercise no-picture'
  container.innerHTML = `
    ${hasPicture ? '<div class="exercise-table"></div>' : ''}
    <div class="exercise-side">
      <p class="prompt">${esc(p.ask || 'What is the best play?')}</p>
      <div class="options" role="group"></div>
      <div class="status" aria-live="polite"></div>
      <div class="why" hidden></div>
      <div class="actions">
        ${p.hint ? '<button class="btn quiet" data-act="hint">Hint</button>' : ''}
        <button class="btn quiet" data-act="reset">Try again</button>
      </div>
    </div>`

  // A picture of the question — but WHICH picture depends on the kind. A showdown is a comparison of
  // cards; an action drill is a spot at a table. Using a table for both was wrong in two ways: it drew
  // blinds, a pot and a button that have nothing to do with "who wins", and it draws exactly two hole
  // cards per seat, so a five-card ranking hand silently lost three of them.
  if (hasPicture) {
    try {
      const wrap = container.querySelector('.exercise-table')
      if (kind === 'showdown' || kind === 'rank') {
        mountHands(wrap, {
          board: p.board ? parseCards(p.board) : [],
          hands: String(p.hands).split('|').map(h => h.trim()).filter(Boolean).map(parseCards),
        })
      } else {
        const { state, hero } = spotFromParams(p)
        mountTable(wrap, { state, hero, avatars: avatarsForSeats(state.seats.length, { hero: hero ?? 0 }) })
      }
    } catch (e) {
      container.querySelector('.exercise-table').innerHTML =
        `<p class="status bad">Could not build this spot: ${esc(e.message)}</p>`
    }
  }

  const optionsEl = container.querySelector('.options')
  const statusEl = container.querySelector('.status')
  const whyEl = container.querySelector('.why')
  let done = progress.isDrillDone(id), attempts = 0

  // Options are CONTENT, not chrome, and they are rendered that way: a list of rows, each with a letter
  // marker and its text in sentence case at reading size. They were boxed buttons in uppercase, which
  // worked for "Fold" and failed for the eighteen labels that run past forty characters — the longest is
  // eighty-two. A box that resizes itself around a sentence also gives a ragged stack of rectangles,
  // which is the opposite of composition.
  //
  // The letter marker is not decoration: mountHands already labels its rows A, B, C so the reader can
  // match a hand to an option, and a showdown drill's labels arrive with that letter in the text. Where
  // one is there, it is lifted out into the marker rather than printed twice.
  solved.options.forEach((label, i) => {
    const b = document.createElement('button')
    b.className = 'opt'
    const m = /^([A-Z]) — (.*)$/.exec(label)
    const mark = m ? m[1] : String.fromCharCode(65 + i)
    const text = m ? m[2] : label
    b.innerHTML = `<span class="mark" aria-hidden="true">${esc(mark)}</span><span class="t"></span>`
    b.querySelector('.t').textContent = text
    b.addEventListener('click', () => choose(i, b))
    optionsEl.append(b)
  })

  function choose(i, btn) {
    if (container.classList.contains('solved')) return
    const right = i === solved.correct
    attempts++
    progress.recordDrill(id, { firstAttempt: attempts === 1, topic, correct: right })

    if (right) {
      btn.classList.add('right')
      container.classList.add('solved')
      sound.play('success')
      statusEl.textContent = p.success || 'Correct.'
      statusEl.className = 'status good'
      showWhy()
      optionsEl.querySelectorAll('button').forEach(b => { b.disabled = true })
      mascot.hide(container)
      if (ctx.onSolved) ctx.onSolved(id)
    } else {
      btn.classList.add('wrong')
      btn.disabled = true
      statusEl.textContent = attempts === 1 ? 'Not that one. Try again.' : 'Still not it.'
      statusEl.className = 'status bad'
      // The cat offers the hint on the FIRST miss — the moment it helps. Inline, it used to wait for a
      // second wrong answer, by which time half the options were already crossed out.
      showHint()
    }
  }

  function showWhy() {
    const parts = [p.why, solved.explain].filter(Boolean)
    if (!parts.length) return
    whyEl.innerHTML = parts.map(t => `<p>${esc(t)}</p>`).join('')
    whyEl.hidden = false
  }
  function showHint() {
    if (!p.hint) return
    // the cat says it; if the cat is switched off, the hint goes inline as it always did
    if (mascot.say({ kind: 'hint', text: p.hint, owner: container })) return
    whyEl.innerHTML = `<p>${esc(p.hint)}</p>`
    whyEl.hidden = false
  }
  function reset() {
    mascot.hide(container)
    attempts = 0
    container.classList.remove('solved')
    statusEl.textContent = ''; statusEl.className = 'status'
    whyEl.hidden = true; whyEl.innerHTML = ''
    optionsEl.querySelectorAll('button').forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong') })
  }

  container.querySelector('.actions').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return
    sound.unlock()
    if (b.dataset.act === 'hint') showHint()
    if (b.dataset.act === 'reset') reset()
  })

  if (done) {
    container.classList.add('solved')
    statusEl.textContent = 'Answered earlier. Try again to play it through.'
    statusEl.className = 'status good'
    optionsEl.querySelectorAll('button').forEach(b => { b.disabled = true })
  }
  return { id, topic, reset }
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
