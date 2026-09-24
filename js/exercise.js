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

import { mountTable } from './table.js'
import { spotFromParams, solveDrill } from './spot.js'
import { progress } from './progress.js'
import { sound } from './sound.js'
import { avatarsForSeats } from './avatars.js'


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

  container.className = 'exercise'
  container.innerHTML = `
    <div class="exercise-table"></div>
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

  // the table, when the drill is about a spot rather than a bare question
  if (kind !== 'choice') {
    try {
      const wrap = container.querySelector('.exercise-table')
      if (kind === 'showdown' || kind === 'rank') {
        const hands = String(p.hands).split('|').map(h => h.trim()).filter(Boolean)
        const { state } = spotFromParams({ ...p, seats: String(hands.length), hero: 'none', hands: p.hands })
        mountTable(wrap, { state, hero: null, reveal: true, showBB: false, avatars: avatarsForSeats(hands.length) })
      } else {
        const { state, hero } = spotFromParams(p)
        mountTable(wrap, { state, hero, avatars: avatarsForSeats(state.seats.length) })
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

  solved.options.forEach((label, i) => {
    const b = document.createElement('button')
    b.className = 'btn opt'
    b.textContent = label
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
      if (ctx.onSolved) ctx.onSolved(id)
    } else {
      btn.classList.add('wrong')
      btn.disabled = true
      statusEl.textContent = attempts === 1 ? 'Not that one. Try again.' : 'Still not it.'
      statusEl.className = 'status bad'
      if (attempts >= 2) showHint()
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
    whyEl.innerHTML = `<p>${esc(p.hint)}</p>`
    whyEl.hidden = false
  }
  function reset() {
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
