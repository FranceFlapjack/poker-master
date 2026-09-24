// App shell: curriculum sidebar, hash router, home and lesson pages, mute + activity footer.
import { renderLesson } from './lesson.js'
import { progress } from './progress.js'
import { mountActivity } from './activity-grid.js'
import { sound } from './sound.js'
import { mountFamily } from './family.js'
import { visibleParts, groupsOf, toolsOf, flatten, lessonId, lessonPath } from './curriculum.js'

const $ = s => document.querySelector(s)
let curriculum = null
let current = null // {dir, slug}
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
 * The two-audience switch. Beginner mode shows the Basics part and tells components to keep the jargon
 * down; turning it off hides Basics entirely and leaves only the tournament material.
 */
function applyMode() { document.body.dataset.mode = progress.beginner ? 'beginner' : 'grinder' }

const parts = () => visibleParts(curriculum, { beginner: progress.beginner })
const courseLessons = () => flatten(curriculum, { beginner: progress.beginner })

function renderSidebar() {
  const nav = $('#curriculum')
  const open = new Set([...nav.querySelectorAll('.track.open')].map(t => t.dataset.track))
  if (current) open.add(current.dir)

  nav.innerHTML = parts().map(part => {
    const groups = groupsOf(part)
    const body = groups.map(g => {
      const items = g.lessons.map(l => lessonLink(g.id, l)).join('')
      if (g.flat) return `<ul class="lessons flat">${items}</ul>`
      const ready = g.lessons.filter(l => l.ready)
      const done = ready.filter(l => progress.isLessonDone(lessonId(g.id, l.slug))).length
      const pct = ready.length ? Math.round(100 * done / ready.length) : 0
      return `<div class="track${open.has(g.id) ? ' open' : ''}" data-track="${g.id}">
        <button class="track-head" aria-expanded="${open.has(g.id)}">
          <span class="name">${esc(g.title)}</span>
          <span class="bar" title="${done}/${ready.length} done"><i style="width:${pct}%"></i></span><span class="chev">▶</span>
        </button>
        <ul class="lessons">${items}</ul>
      </div>`
    }).join('')
    const tools = toolsOf(part)
    const toolList = tools.length
      ? `<ul class="lessons tools">${tools.map(t => `<li><a class="lesson-link tool-link${location.hash.startsWith(`#/tools/${t.slug}`) ? ' current' : ''}" href="#/tools/${t.slug}"><span class="tick"></span><span>${esc(t.title)}</span></a></li>`).join('')}</ul>`
      : ''
    return `<div class="part"><div class="part-head">${esc(part.title)}</div>${body}${toolList}</div>`
  }).join('')

  nav.querySelectorAll('.track-head').forEach(b => b.addEventListener('click', () => {
    const t = b.parentElement
    t.classList.toggle('open')
    b.setAttribute('aria-expanded', t.classList.contains('open'))
  }))
}

function lessonLink(dir, l) {
  const id = lessonId(dir, l.slug)
  const isDone = progress.isLessonDone(id)
  const cls = ['lesson-link', l.ready ? '' : 'planned',
    isDone ? 'done' : (progress.drillsFor(id) ? 'started' : ''),
    current && current.dir === dir && current.slug === l.slug ? 'current' : ''].filter(Boolean).join(' ')
  return `<li><a class="${cls}" href="#/lesson/${dir}/${l.slug}"${l.ready ? '' : ' aria-disabled="true"'}><span class="tick"></span><span>${esc(l.title)}</span>${l.ready ? '' : '<span class="soon">soon</span>'}</a></li>`
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
  const t = hash.match(/^#\/tools\/([\w-]+)/)
  if (t) return showTool(main, t[1])
  current = null
  renderSidebar()
  showHome(main)
}

function showHome(main) {
  document.title = 'Poker Master'
  const lessons = courseLessons()
  const last = progress.state.lastLesson && lessons.find(l => lessonId(l.dir, l.slug) === progress.state.lastLesson)
  const next = lessons.find(l => l.ready && !progress.isLessonDone(lessonId(l.dir, l.slug)))
  const cont = last && !progress.isLessonDone(progress.state.lastLesson) ? last : next

  main.innerHTML = `
    <div class="page">
      <section class="hero">
        <span class="eyebrow">A course, not a feed</span>
        <h1>Learn the hand before you learn the odds.</h1>
        <p>No-limit hold'em, from the first deal through to the maths a tournament actually asks of you. Every lesson puts a table in the text so you act on the spot rather than read about it, and every drill is checked against the app's own engine before it ships.</p>
      </section>
      ${cont ? `<div class="card continue"><div><span class="eyebrow">${last && cont === last ? 'Continue' : 'Start here'}</span><h3>${esc(cont.title)}</h3><div class="small">${esc(cont.part)}</div></div><a class="btn primary" href="#/lesson/${cont.dir}/${cont.slug}">Open lesson</a></div>` : ''}
      ${parts().map(part => partCard(part)).join('')}
      <div class="switch-row">
        <button class="switch" id="beginner" role="switch" aria-checked="${progress.beginner}" aria-label="Beginner mode"></button>
        <span>New to poker? <em>Beginner</em> shows the Basics part. Turn it off once you are past it and only the tournament material remains.</span>
      </div>
    </div>`
  $('#beginner').addEventListener('click', () => { progress.beginner = !progress.beginner; applyMode(); showHome(main); renderSidebar() })
}

function partCard(part) {
  const groups = groupsOf(part)
  const all = groups.flatMap(g => g.lessons.map(l => ({ ...l, dir: g.id })))
  const ready = all.filter(l => l.ready)
  const done = all.filter(l => progress.isLessonDone(lessonId(l.dir, l.slug))).length
  const first = all.find(l => l.ready)
  const meta = `${all.length} lessons · ${ready.length} ready${done ? ` · ${done} done` : ''}`

  const inner = groups.length > 1
    ? `<ul class="part-sections">${groups.map(g => {
        const r = g.lessons.filter(l => l.ready).length
        return `<li><b>${esc(g.title)}</b> <span>${esc(g.blurb || '')}</span> <em>${g.lessons.length} lessons${r ? `, ${r} ready` : ''}</em></li>`
      }).join('')}</ul>`
    : ''

  return `<section class="card part-card">
    <span class="eyebrow">${esc(part.title)}</span>
    <p>${esc(part.blurb || '')}</p>
    ${inner}
    <div class="part-foot"><span class="meta">${meta}</span>${first ? `<a class="btn" href="#/lesson/${first.dir}/${first.slug}">Open</a>` : '<span class="meta">Not written yet</span>'}</div>
  </section>`
}

/** Tools are loaded on demand: the equity sandbox pulls in the whole engine and most readers never open it. */
async function showTool(main, slug) {
  current = null
  renderSidebar()
  main.innerHTML = '<div class="page"><p class="small">Loading…</p></div>'
  try {
    if (slug === 'odds') {
      const { mountOdds } = await import('./tools/odds.js')
      main.innerHTML = ''
      mountOdds(main)
    } else if (slug === 'ranges') {
      const { mountRanges } = await import('./tools/ranges.js')
      main.innerHTML = ''
      await mountRanges(main)
    } else { location.hash = '#/'; return }
  } catch (e) {
    main.innerHTML = `<div class="page"><p>Could not load this tool.</p><p class="small">${esc(e.message)}</p></div>`
  }
  window.scrollTo({ top: 0 })
}

async function showLesson(main, dir, slug) {
  const all = flatten(curriculum, { beginner: true })
  const l = all.find(x => x.dir === dir && x.slug === slug)
  if (!l || !l.ready) { location.hash = '#/'; return }
  // a lesson inside a beginner part implies beginner mode, or the sidebar would not show where you are
  const part = curriculum.parts.find(p => p.title === l.part)
  if (part && part.beginner && !progress.beginner) { progress.beginner = true; applyMode() }

  current = { dir, slug }
  renderSidebar()
  const id = lessonId(dir, slug)
  main.innerHTML = '<div class="page"><p class="small">Loading…</p></div>'
  let md
  try { md = await (await fetch(lessonPath(dir, slug))).text() } catch (e) {
    main.innerHTML = '<div class="page"><p>Could not load this lesson.</p></div>'; return
  }
  const page = document.createElement('div'); page.className = 'page'
  main.innerHTML = ''; main.append(page)
  if (unsubLesson) { unsubLesson(); unsubLesson = null }
  const { meta, drillIds } = await renderLesson(page, md, { lessonId: id, onSolved: () => checkAuto() })
  document.title = `${meta.title || slug} · Poker Master`
  progress.setLastLesson(id)

  const lessons = courseLessons()
  const idx = lessons.findIndex(x => x.dir === dir && x.slug === slug)
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
  nav.innerHTML = `<div>${prev ? `<a href="#/lesson/${prev.dir}/${prev.slug}"><span class="eyebrow">Previous</span>${esc(prev.title)}</a>` : ''}</div><div class="next">${next ? `<a href="#/lesson/${next.dir}/${next.slug}"><span class="eyebrow">Next</span>${esc(next.title)}</a>` : '<a href="#/"><span class="eyebrow">Next</span>Back to the course</a>'}</div>`
  page.append(nav)
  window.scrollTo({ top: 0 })
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }

boot()
