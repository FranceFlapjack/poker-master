// App shell: curriculum sidebar, hash router, home page, mute + activity footer.
// Phase 0 is the shell only — no lesson, trainer or play route yet (see ROADMAP.md). Every lesson in
// content/curriculum.json is `ready: false`, so the sidebar renders the whole course greyed out, which is
// the point: the shape of the app is visible before any of it is written.
import { progress } from './progress.js'
import { mountActivity } from './activity-grid.js'
import { sound } from './sound.js'
import { mountFamily } from './family.js'

const $ = s => document.querySelector(s)
let curriculum = null
let current = null // {track, slug}

const ICON_SOUND_ON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8v4h3l4 3V5L6 8zM13 7a4 4 0 010 6M15.5 4.5a7.5 7.5 0 010 11"/></svg>'
const ICON_SOUND_OFF = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8v4h3l4 3V5L6 8zM13 8l4 4M17 8l-4 4"/></svg>'

async function boot() {
  curriculum = await (await fetch('content/curriculum.json')).json()
  renderSidebar()
  mountActivity($('#activity'))
  const mute = $('#mute')
  const paintMute = () => { mute.innerHTML = sound.muted ? ICON_SOUND_OFF : ICON_SOUND_ON; mute.setAttribute('aria-pressed', String(sound.muted)); mute.title = sound.muted ? 'Sound off' : 'Sound on' }
  paintMute(); mute.addEventListener('click', () => { sound.toggle(); paintMute() })
  mountFamily('poker')
  $('#menu').addEventListener('click', () => toggleSidebar())
  $('#scrim').addEventListener('click', () => toggleSidebar(false))
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true })
  progress.onChange(() => renderSidebar())
  window.addEventListener('hashchange', route)
  window.addEventListener('resize', () => { if (innerWidth > 760) toggleSidebar(false) }) // an `open` left over from the narrow layout is invisible on desktop and must not survive back into it
  route()
}

function visibleTracks() { return curriculum.tracks.filter(t => !t.beginner || progress.beginner) }
function allLessons() { return visibleTracks().flatMap(t => t.lessons.map(l => ({ ...l, track: t.id, trackTitle: t.title }))) }
function lessonId(track, slug) { return `${track}/${slug}` }

function renderSidebar() {
  const nav = $('#curriculum')
  const open = new Set([...nav.querySelectorAll('.track.open')].map(t => t.dataset.track))
  if (current) open.add(current.track)
  nav.innerHTML = visibleTracks().map((t, i) => {
    const ready = t.lessons.filter(l => l.ready)
    const done = ready.filter(l => progress.isLessonDone(lessonId(t.id, l.slug))).length
    const pct = ready.length ? Math.round(100 * done / ready.length) : 0
    return `<div class="track${open.has(t.id) ? ' open' : ''}" data-track="${t.id}">
      <button class="track-head" aria-expanded="${open.has(t.id)}">
        <span class="num">${t.beginner ? '0' : i + (progress.beginner ? 0 : 1)}</span><span class="name">${esc(t.title)}</span>
        <span class="bar" title="${done}/${ready.length} done"><i style="width:${pct}%"></i></span><span class="chev">▶</span>
      </button>
      <ul class="lessons">${t.lessons.map(l => {
        const id = lessonId(t.id, l.slug)
        const isDone = progress.isLessonDone(id)
        const cls = ['lesson-link', l.ready ? '' : 'planned', isDone ? 'done' : (progress.drillsFor(id) ? 'started' : ''), current && current.track === t.id && current.slug === l.slug ? 'current' : ''].filter(Boolean).join(' ')
        return `<li><a class="${cls}" href="#/lesson/${t.id}/${l.slug}"${l.ready ? '' : ' aria-disabled="true"'}><span class="tick"></span><span>${esc(l.title)}</span>${l.ready ? '' : '<span class="soon">soon</span>'}</a></li>`
      }).join('')}</ul>
    </div>`
  }).join('')
  nav.querySelectorAll('.track-head').forEach(b => b.addEventListener('click', () => { const t = b.parentElement; t.classList.toggle('open'); b.setAttribute('aria-expanded', t.classList.contains('open')) }))
}

function toggleSidebar(force) {
  const s = $('#sidebar'), open = force ?? !s.classList.contains('open')
  s.classList.toggle('open', open); $('#scrim').classList.toggle('open', open)
}

function route() {
  const main = $('#main')
  toggleSidebar(false)
  current = null
  renderSidebar()
  showHome(main)
}

function showHome(main) {
  document.title = 'Poker Master'
  const tracks = visibleTracks()
  const readyCount = allLessons().filter(l => l.ready).length
  main.innerHTML = `
    <div class="page">
      <section class="hero">
        <span class="eyebrow">A course, not a feed</span>
        <h1>Learn the hand before you learn the odds.</h1>
        <p>No-limit hold'em, from the first deal through to the maths a tournament actually asks of you. Every lesson puts a table in the text so you act on the spot rather than read about it, and every drill is checked against the app's own engine before it ships.</p>
      </section>
      ${readyCount === 0 ? `<div class="card continue"><div><span class="eyebrow">Phase 0</span><h3>The shell is up; the course is not written yet</h3><div class="small">The whole curriculum is laid out in the sidebar so the shape is visible. Lessons unlock as they are written — the engine comes first, because every drill answer is verified against it.</div></div></div>` : ''}
      <div class="track-grid">
        ${tracks.map((t, i) => {
          const ready = t.lessons.filter(l => l.ready).length
          const done = t.lessons.filter(l => progress.isLessonDone(lessonId(t.id, l.slug))).length
          const first = t.lessons.find(l => l.ready)
          return `<a class="card track-card" href="${first ? `#/lesson/${t.id}/${first.slug}` : '#/'}"><span class="eyebrow">Track ${t.beginner ? 0 : i + (progress.beginner ? 0 : 1)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb || '')}</p><span class="meta">${t.lessons.length} lessons · ${ready} ready${done ? ` · ${done} done` : ''}</span></a>`
        }).join('')}
      </div>
      <div class="switch-row">
        <button class="switch" id="beginner" role="switch" aria-checked="${progress.beginner}" aria-label="Show the first steps track"></button>
        <span>New to poker? Show the <em>First steps</em> track (the deck, what beats what, position, blinds).</span>
      </div>
    </div>`
  $('#beginner').addEventListener('click', () => { progress.beginner = !progress.beginner; showHome(main); renderSidebar() })
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

boot()
