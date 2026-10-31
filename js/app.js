// App shell: curriculum sidebar, hash router, home and lesson pages, mute + activity footer.
import { renderLesson } from './lesson.js'
import { progress } from './progress.js'
import { mountActivity } from './activity-grid.js'
import { sound } from './sound.js'
import { mountFamily } from './family.js'
import { visibleParts, groupsOf, toolsOf, flatten, lessonId, lessonPath } from './curriculum.js'
import { weakSpotReport } from './weak-spots.js'
import { mascot, catHeadHTML } from './mascot.js'
import { mountWelcome } from './welcome.js'
import { mountCardSpin } from './card-spin.js'
import { mountStory } from './story.js'

const $ = s => document.querySelector(s)
let curriculum = null
let current = null // {dir, slug}
let unsubLesson = null
// Whatever the last page mounted. A tool can hold timers and an async loop — the play page drives bots
// with awaits — so leaving a page has to stop it, not merely overwrite its HTML.
let unmountPage = null

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
  // The logo replays the whole welcome: the curtain, then the story from its top (#/welcome does both); the series
  // bubble still opens on hover. Caught on the way down, at .brand, so family.js's own click on the logo (which
  // toggles the bubble) never runs — family.js stays as shared. As in Chess Master, 2026-10-27.
  document.querySelectorAll('.brand').forEach(brand => {
    const logo = brand.querySelector('.logo-btn')
    logo.setAttribute('aria-label', 'Poker Master: replay the welcome'); logo.removeAttribute('aria-haspopup')
    brand.addEventListener('click', e => { if (logo.contains(e.target)) { e.stopPropagation(); location.hash = '#/welcome' } }, true)
    // the name goes to the course cards (#/course); clicked while already there, it scrolls back to them
    brand.querySelector('.brand-text').addEventListener('click', e => {
      if (location.hash !== '#/course') return
      e.preventDefault(); toggleSidebar(false); $('#course')?.scrollIntoView({ behavior: 'smooth' })
    })
  })
  // the cat's own switch, beside the sound: hints and tips go inline when it is off
  const cat = $('#cat')
  cat.innerHTML = catHeadHTML(20)
  const paintCat = () => { cat.setAttribute('aria-pressed', String(mascot.enabled)); cat.title = mascot.enabled ? 'Tips from the cat: on' : 'Tips from the cat: off' }
  paintCat(); cat.addEventListener('click', () => { mascot.enabled = !mascot.enabled })
  mascot.mount()   // the cat lives in its corner from the start, quiet until it has something to say
  document.addEventListener('mascot-toggle', paintCat)
  // A course or tool card grows into the title of the page it opens, as the page fades in (owner 2026-10-31: "more
  // interesting but not too much"). The browser's View Transitions; a plain jump where there are none, or where
  // motion is reduced, or for a click meant for a new tab.
  $('#main').addEventListener('click', e => {
    const a = e.target.closest('a.flip-card')
    if (!a || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    a.style.viewTransitionName = 'opening'
    const t = document.startViewTransition(async () => {
      history.pushState(null, '', a.getAttribute('href'))   // pushState fires no hashchange, so the page is drawn once, here
      await route()
      const head = $('#main .lesson-head, #main .hero')
      if (head) head.style.viewTransitionName = 'opening'
    })
    // a tab drawing no frames (hidden, or a stalled browser) never starts the transition; skipping it still runs
    // the update above, so the click always opens the page
    const guard = setTimeout(() => t.skipTransition(), 1000)
    t.updateCallbackDone.finally(() => clearTimeout(guard))
    t.ready.catch(() => {})   // a skipped transition rejects `ready`; the page has still opened
    t.finished.finally(() => { const head = $('#main .lesson-head, #main .hero'); if (head) head.style.viewTransitionName = '' })   // one name per page, or the next transition is skipped
  })
  $('#menu').addEventListener('click', () => toggleSidebar())
  $('#scrim').addEventListener('click', () => toggleSidebar(false))
  document.addEventListener('pointerdown', () => sound.unlock(), { once: true })
  progress.onChange(() => renderSidebar())
  window.addEventListener('hashchange', route)
  // the series welcome, the first time this browser opens the app — a curtain over the app, not a route
  if (location.hash !== '#/welcome') welcome()
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

/** The series welcome, with Poker's own background: the turning card. */
function welcome(force = false) {
  const w = mountWelcome({ app: 'poker', word: 'Poker', force })
  if (w) mountCardSpin(w.root)
}

function route() {
  if (location.hash === '#/welcome') {
    history.replaceState(null, '', '#/')
    welcome(true)
  }
  const hash = location.hash || '#/'
  const main = $('#main')
  toggleSidebar(false)
  document.documentElement.classList.remove('immersive')
  if (unmountPage) { try { unmountPage() } catch (_) {} ; unmountPage = null }
  mascot.hide()   // a hint belongs to the page it was given on
  const m = hash.match(/^#\/lesson\/([\w-]+)\/([\w-]+)/)
  if (m) return showLesson(main, m[1], m[2])
  const t = hash.match(/^#\/tools\/([\w-]+)/)
  if (t) return showTool(main, t[1])
  current = null
  renderSidebar()
  showHome(main)
  if (hash === '#/course') $('#course').scrollIntoView()   // the name in the top bar lands on the cards, past the story
  else window.scrollTo({ top: 0 })                         // the home (and the welcome) start at the top of the story
}

// A card that turns over (css .flip-card): a playing card's face on the front — rank and suit, the label and the
// title — and its navy back carrying the description. Text arrives escaped.
const flipCard = ({ href, label, card, title, blurb, meta = '', go }) => {
  const red = /[♥♦]/.test(card), [rank, suit] = [card.slice(0, -1), card.slice(-1)]
  return `<a class="flip-card" href="${href}"><div class="flip">
  <div class="face front${red ? ' red' : ''}"><span class="eyebrow">${label}</span><span class="flip-pip" aria-hidden="true"><b>${rank}</b>${suit}</span><h3>${title}</h3></div>
  <div class="face back"><b aria-hidden="true">${title}</b><p>${blurb}</p>${meta ? `<span class="meta">${meta}</span>` : ''}<span class="go">${go} →</span></div>
</div></a>`
}
// the course runs down from the ace, the tools carry on from the ten — red and black alternating, as a dealt run would
const SECTION_CARD = { basics: 'A♠', ranges: 'K♥', stacks: 'Q♣', maths: 'J♦' }
const TOOL_CARD = { play: '10♠', game: '9♥', ranges: '8♣', pushfold: '7♦', odds: '6♠', icm: '5♥' }

function showHome(main) {
  document.title = 'Poker Master'
  document.documentElement.classList.add('immersive')   // the story gets the whole screen; the sidebar waits behind the menu
  const lessons = courseLessons()
  const last = progress.state.lastLesson && lessons.find(l => lessonId(l.dir, l.slug) === progress.state.lastLesson)
  const next = lessons.find(l => l.ready && !progress.isLessonDone(lessonId(l.dir, l.slug)))
  const cont = last && !progress.isLessonDone(progress.state.lastLesson) ? last : next
  const grinder = !progress.beginner
  // a returning reader continues; a new one picks a door by what they already know (Beginner) or goes straight in (Grinder)
  const test = { href: '#/tools/game', label: 'Test yourself' }
  const tour = lessons.find(l => l.ready && l.dir !== 'basics')
  const cta = last && cont === last
    ? { href: `#/lesson/${cont.dir}/${cont.slug}`, label: `Continue: ${esc(cont.title)}`, today: 'Pick up where you left off', secondary: test }
    : grinder || !cont
      ? { href: tour ? `#/lesson/${tour.dir}/${tour.slug}` : '#/tools/game', label: 'Start the tournament course', today: 'Start the tournament course', secondary: test }
      : { href: `#/lesson/${cont.dir}/${cont.slug}`, label: 'New to poker? Start here', today: 'Your first lesson takes five minutes', secondary: tour && { href: `#/lesson/${tour.dir}/${tour.slug}`, label: 'I know the rules' } }

  const sections = parts().flatMap(part => groupsOf(part).map(g => ({ ...g, part })))
  const tools = parts().flatMap(toolsOf)
  main.innerHTML = `
    <div id="story"></div>
    <div class="page home-course" id="course">
      <h2>The course</h2>
      ${cont ? `<div class="card continue"><div><span class="eyebrow">${last && cont === last ? 'Continue' : 'Start here'}</span><h3>${esc(cont.title)}</h3><div class="small">${esc(cont.part)}</div></div><a class="btn primary" href="#/lesson/${cont.dir}/${cont.slug}">Open lesson</a></div>` : ''}
      <div class="track-grid">
        ${sections.map(g => {
          const ready = g.lessons.filter(l => l.ready).length
          const done = g.lessons.filter(l => progress.isLessonDone(lessonId(g.id, l.slug))).length
          const first = g.lessons.find(l => l.ready)
          return flipCard({ href: first ? `#/lesson/${g.id}/${first.slug}` : '#/course', label: esc(g.part.beginner ? 'Start here' : g.part.title), card: SECTION_CARD[g.id] || 'A♠',
            title: esc(g.title), blurb: esc(g.blurb || ''), meta: `${g.lessons.length} lessons · ${ready} ready${done ? ` · ${done} done` : ''}`,
            go: done && done === ready ? 'Review' : done ? 'Continue' : 'Start' })
        }).join('')}
      </div>
      <div class="switch-row">
        <button class="switch" id="beginner" role="switch" aria-checked="${progress.beginner}" aria-label="Beginner mode"></button>
        <span>New to poker? <em>Beginner</em> shows the Basics and keeps the jargon down. Turn it off once you are past it: only the tournament material remains, and the numbers come in full.</span>
      </div>
      ${weakSpotReport(curriculum)}
      <h2>Tools</h2>
      <div class="tool-row">
        ${tools.map(t => flipCard({ href: `#/tools/${t.slug}`, label: 'Tool', card: TOOL_CARD[t.slug] || '2♣', title: esc(t.title), blurb: esc(t.blurb || ''), go: 'Open' })).join('')}
      </div>
    </div>`
  const stopStory = mountStory(main.querySelector('#story'), { cta, grinder })
  unmountPage = stopStory   // the story's loops stop when the page changes
  $('#beginner').addEventListener('click', () => { progress.beginner = !progress.beginner; applyMode(); stopStory(); showHome(main); renderSidebar(); main.querySelector('#course').scrollIntoView() })
}

/** Tools are loaded on demand: the equity sandbox pulls in the whole engine and most readers never open it. */
async function showTool(main, slug) {
  current = null
  renderSidebar()
  main.innerHTML = '<div class="page"><p class="small">Loading…</p></div>'
  try {
    let view = null
    if (slug === 'odds') {
      const { mountOdds } = await import('./tools/odds.js')
      main.innerHTML = ''
      view = mountOdds(main)
    } else if (slug === 'play') {
      const { mountPlay } = await import('./tools/play.js')
      main.innerHTML = ''
      view = mountPlay(main)
    } else if (slug === 'icm') {
      const { mountIcm } = await import('./tools/icm.js')
      main.innerHTML = ''
      view = mountIcm(main)
    } else if (slug === 'ranges') {
      const { mountRanges } = await import('./tools/ranges.js')
      main.innerHTML = ''
      view = await mountRanges(main)
    } else if (slug === 'game') {
      const { mountGame } = await import('./tools/game.js')
      main.innerHTML = ''
      view = await mountGame(main)
    } else if (slug === 'pushfold') {
      const { mountPushfold } = await import('./tools/pushfold.js')
      main.innerHTML = ''
      view = await mountPushfold(main)
    } else { location.hash = '#/'; return }
    if (view && view.destroy) unmountPage = () => view.destroy()
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
  const { meta, drillIds, mounted } = await renderLesson(page, md, { lessonId: id, onSolved: () => checkAuto() })
  // Leaving a lesson tears down what it mounted: tables hold resize observers, tips hold intersection
  // observers, and neither should outlive the page.
  unmountPage = () => { for (const x of mounted) if (x && typeof x.destroy === 'function') x.destroy() }
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
