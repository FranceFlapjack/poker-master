// App shell: curriculum sidebar, hash router, home and lesson pages, mute + activity footer.
import { renderLesson } from './lesson.js'
import { progress } from './progress.js'
import { mountActivity } from './activity-grid.js'
import { sound } from './sound.js'
import { mountFamily } from './family.js'

const $ = s => document.querySelector(s)
let curriculum = null
let current = null // {track, slug}
let unsubLesson = null

const ICON_SOUND_ON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8v4h3l4 3V5L6 8zM13 7a4 4 0 010 6M15.5 4.5a7.5 7.5 0 010 11"/></svg>'
const ICON_SOUND_OFF = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8v4h3l4 3V5L6 8zM13 8l4 4M17 8l-4 4"/></svg>'

async function boot() {
  curriculum = await (await fetch('content/curriculum.json')).json()
  applyMode()
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

/**
 * The two-audience switch. Beginner mode shows the First steps track and tells components to keep the
 * jargon down; Grinder mode hides it and lets the numbers through. It is a data attribute on <body> so
 * CSS and any component can read it without being passed a flag.
 */
function applyMode() {
  document.body.dataset.mode = progress.beginner ? 'beginner' : 'grinder'
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
  const hash = location.hash || '#/'
  const main = $('#main')
  toggleSidebar(false)
  const m = hash.match(/^#\/lesson\/([\w-]+)\/([\w-]+)/)
  if (m) return showLesson(main, m[1], m[2])
  current = null
  renderSidebar()
  showHome(main)
}

function showHome(main) {
  document.title = 'Poker Master'
  const tracks = visibleTracks()
  const lessons = allLessons()
  const last = progress.state.lastLesson && lessons.find(l => lessonId(l.track, l.slug) === progress.state.lastLesson)
  const next = lessons.find(l => l.ready && !progress.isLessonDone(lessonId(l.track, l.slug)))
  const cont = last && !progress.isLessonDone(progress.state.lastLesson) ? last : next
  main.innerHTML = `
    <div class="page">
      <section class="hero">
        <span class="eyebrow">A course, not a feed</span>
        <h1>Learn the hand before you learn the odds.</h1>
        <p>No-limit hold'em, from the first deal through to the maths a tournament actually asks of you. Every lesson puts a table in the text so you act on the spot rather than read about it, and every drill is checked against the app's own engine before it ships.</p>
      </section>
      ${cont ? `<div class="card continue"><div><span class="eyebrow">${last && cont === last ? 'Continue' : 'Start here'}</span><h3>${esc(cont.title)}</h3><div class="small">${esc(cont.trackTitle)}</div></div><a class="btn primary" href="#/lesson/${cont.track}/${cont.slug}">Open lesson</a></div>` : ''}
      <div class="track-grid">
        ${tracks.map((t, i) => {
          const ready = t.lessons.filter(l => l.ready).length
          const done = t.lessons.filter(l => progress.isLessonDone(lessonId(t.id, l.slug))).length
          const first = t.lessons.find(l => l.ready)
          return `<a class="card track-card" href="${first ? `#/lesson/${t.id}/${first.slug}` : '#/'}"><span class="eyebrow">Track ${t.beginner ? 0 : i + (progress.beginner ? 0 : 1)}</span><h3>${esc(t.title)}</h3><p>${esc(t.blurb || '')}</p><span class="meta">${t.lessons.length} lessons · ${ready} ready${done ? ` · ${done} done` : ''}</span></a>`
        }).join('')}
      </div>
      <div class="switch-row">
        <button class="switch" id="beginner" role="switch" aria-checked="${progress.beginner}" aria-label="Beginner mode"></button>
        <span>New to poker? <em>Beginner</em> shows the First steps track and keeps the jargon down. Turn it off for the tournament material.</span>
      </div>
    </div>`
  $('#beginner').addEventListener('click', () => { progress.beginner = !progress.beginner; applyMode(); showHome(main); renderSidebar() })
}

async function showLesson(main, track, slug) {
  const t = curriculum.tracks.find(x => x.id === track)
  const l = t && t.lessons.find(x => x.slug === slug)
  if (!l || !l.ready) { location.hash = '#/'; return }
  if (t.beginner && !progress.beginner) { progress.beginner = true; applyMode() }
  current = { track, slug }
  renderSidebar()
  const id = lessonId(track, slug)
  main.innerHTML = '<div class="page"><p class="small">Loading…</p></div>'
  let md
  try { md = await (await fetch(`content/lessons/${track}/${slug}.md`)).text() } catch (e) {
    main.innerHTML = '<div class="page"><p>Could not load this lesson.</p></div>'; return
  }
  const page = document.createElement('div'); page.className = 'page'
  main.innerHTML = ''; main.append(page)
  if (unsubLesson) { unsubLesson(); unsubLesson = null }
  const { meta, drillIds } = await renderLesson(page, md, { lessonId: id, onSolved: () => checkAuto() })
  document.title = `${meta.title || slug} · Poker Master`
  progress.setLastLesson(id)

  // A lesson with drills completes itself once they are all answered; "mark as read" is the fallback
  // for one that has none.
  const lessons = allLessons()
  const idx = lessons.findIndex(x => x.track === track && x.slug === slug)
  const prev = lessons.slice(0, idx).reverse().find(x => x.ready), next = lessons.slice(idx + 1).find(x => x.ready)
  const row = document.createElement('div'); row.className = 'complete-row'
  const solvedCount = () => drillIds.filter(d => progress.isDrillDone(d)).length
  const paintRow = () => {
    const done = progress.isLessonDone(id); row.classList.toggle('done', done)
    if (done) row.innerHTML = `<span class="msg">Lesson complete.</span>${drillIds.length ? `<span class="count">${solvedCount()}/${drillIds.length} drills</span>` : ''}`
    else if (drillIds.length) row.innerHTML = `<span class="msg">Answer the drills to complete this lesson.</span><span class="count">${solvedCount()}/${drillIds.length}</span><button class="btn quiet" id="complete">Mark as read instead</button>`
    else row.innerHTML = `<button class="btn primary" id="complete">Mark as read</button><span class="msg">Ticks the lesson in the sidebar.</span>`
    const b = row.querySelector('#complete')
    if (b) b.addEventListener('click', () => { progress.completeLesson(id); sound.play('success'); paintRow() })
  }
  function checkAuto() {
    if (!progress.isLessonDone(id) && drillIds.length && solvedCount() === drillIds.length) {
      progress.completeLesson(id); sound.play('success')
    }
    paintRow()
  }
  paintRow(); page.append(row)
  unsubLesson = progress.onChange(paintRow)

  const nav = document.createElement('nav'); nav.className = 'lesson-nav'
  nav.innerHTML = `<div>${prev ? `<a href="#/lesson/${prev.track}/${prev.slug}"><span class="eyebrow">Previous</span>${esc(prev.title)}</a>` : ''}</div><div class="next">${next ? `<a href="#/lesson/${next.track}/${next.slug}"><span class="eyebrow">Next</span>${esc(next.title)}</a>` : '<a href="#/"><span class="eyebrow">Next</span>Back to the course</a>'}</div>`
  page.append(nav)
  window.scrollTo({ top: 0 })
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

boot()
