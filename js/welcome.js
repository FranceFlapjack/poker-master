// The Master series welcome — the screen someone sees the first time they open an app of the series.
//
// THIS FILE IS IDENTICAL IN EVERY APP OF THE SERIES, like js/family.js. It knows nothing about any one
// game: the app passes in its id and its word ("Poker"); the colour is the app's --accent. Its styles
// are css/welcome.css, shared the same way. Copy both to chess-master and go-master only once Poker
// Master is published — the same gate the owner set for family.js.
//
// The design (owner's Draft 2): plain type. The game's word, heavy, fitted edge to edge to the screen;
// MASTER small beneath; scroll down to enter — the whole curtain lifts away and the app is underneath.
//
// Rules it keeps:
//   - Shown ONCE PER APP. The flag is `<app>-master.welcomed`. On GitHub Pages the three apps share one
//     origin, so a single series-wide key would spend the welcome on whichever game someone opened
//     first; each game gets its own moment instead. #/welcome shows it again.
//   - The curtain FOLLOWS the gesture — wheel, trackpad or finger — so it feels like scrolling, not like
//     pressing a button. Lifted past a quarter of the screen, or flicked, it goes; let go short of that
//     and it settles back.
//   - It never traps anyone: the cue at the bottom is a button, and ArrowDown, PageDown, Space, Enter
//     and Esc all enter. If storage is unavailable (a private window) it still dismisses normally.
//   - Reduced motion gets a still — see welcome.css.
//   - The app renders underneath as normal. The welcome is a curtain, not a route.

const flag = app => `${app}-master.welcomed`

/** Whether this app's welcome has already been seen in this browser. */
export function welcomeSeen(app) {
  try { return !!localStorage.getItem(flag(app)) } catch { return false }
}

let active = null   // the welcome on screen, if any — a second one replaces it cleanly

/**
 * Show the welcome, unless it has been seen (pass `force` to show it anyway — the #/welcome route).
 * @param {{app:string, word:string, force?:boolean, onDone?:()=>void}} o
 */
export function mountWelcome({ app, word, force = false, onDone } = {}) {
  if (!force && welcomeSeen(app)) return null
  if (active) active.dispose()

  const root = document.createElement('div')
  root.className = 'wl'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', `${word} Master`)
  root.innerHTML = `
    <h1 class="wl-title">
      <span class="wl-word" aria-hidden="true">${escapeHtml(String(word).toUpperCase())}</span>
      <span class="wl-master" aria-hidden="true">MASTER</span>
      <span class="wl-sr">${escapeHtml(word)} Master</span>
    </h1>
    <button class="wl-cue" type="button" aria-label="Enter ${escapeHtml(word)} Master"><span>Scroll</span><i></i></button>`

  const before = document.activeElement
  document.documentElement.classList.add('wl-open')
  document.body.append(root)
  fitWord(root)
  // Start the sequence now: each step is a CSS animation with a delay and `both` fill, so nothing needs
  // to wait for a frame — a tab opened in the background delivers none.
  void root.offsetWidth
  root.classList.add('wl-playing')
  try { root.querySelector('.wl-cue').focus({ preventScroll: true }) } catch {}

  // --- the curtain -----------------------------------------------------------------------------------
  let lift = 0, closed = false, settleTimer = null
  const H = () => innerHeight || document.documentElement.clientHeight || 800
  const leaveMs = readMs(root, '--wl-leave', 520)
  const place = (v, animate) => {
    lift = Math.max(0, Math.min(H(), v))
    root.style.transition = animate ? `transform ${leaveMs}ms cubic-bezier(.2, .8, .2, 1)` : 'none'
    root.style.transform = lift ? `translateY(${-lift}px)` : ''
  }
  const settle = () => { if (!closed) (lift > H() * 0.25 ? enter() : place(0, true)) }

  function enter() {
    if (closed) return
    closed = true
    clearTimeout(settleTimer)
    try { localStorage.setItem(flag(app), new Date().toISOString()) } catch {}
    place(H(), true)
    detach()
    // timed rather than tied to transitionend, which does not arrive in a background tab
    setTimeout(() => {
      root.remove()
      if (active && active.root === root) active = null
      if (!active) document.documentElement.classList.remove('wl-open')
      if (before && typeof before.focus === 'function') { try { before.focus({ preventScroll: true }) } catch {} }
      if (typeof onDone === 'function') onDone()
    }, leaveMs)
  }

  // wheel and trackpad: the curtain moves with the scroll, and settles when the scrolling stops
  const onWheel = e => {
    e.preventDefault()
    if (closed) return
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * H() : e.deltaY
    place(lift + dy, false)
    if (lift > H() * 0.45) return enter()
    clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, 140)
  }
  // touch: follows the finger; a quick flick up enters even if it has not gone far
  let touchY = null, touchLift = 0, touchT = 0
  const onTouchStart = e => { if (closed) return; touchY = e.touches[0].clientY; touchLift = lift; touchT = performance.now() }
  const onTouchMove = e => {
    if (touchY == null || closed) return
    e.preventDefault()
    place(touchLift + (touchY - e.touches[0].clientY), false)
  }
  const onTouchEnd = e => {
    if (touchY == null || closed) return
    const endY = e.changedTouches[0] ? e.changedTouches[0].clientY : touchY
    const speed = (touchY - endY) / Math.max(1, performance.now() - touchT)   // px per ms, upward positive
    touchY = null
    if (speed > 0.6) enter(); else settle()
  }
  const onKey = e => {
    if (['ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); enter() }
  }
  const onResize = () => fitWord(root)

  root.addEventListener('wheel', onWheel, { passive: false })
  root.addEventListener('touchstart', onTouchStart, { passive: true })
  root.addEventListener('touchmove', onTouchMove, { passive: false })
  root.addEventListener('touchend', onTouchEnd)
  root.querySelector('.wl-cue').addEventListener('click', enter)
  document.addEventListener('keydown', onKey)
  addEventListener('resize', onResize)
  const sizeWatch = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null
  if (sizeWatch) sizeWatch.observe(root)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!closed) fitWord(root) })

  function detach() {
    document.removeEventListener('keydown', onKey)
    removeEventListener('resize', onResize)
    if (sizeWatch) sizeWatch.disconnect()
  }
  // taken off screen without counting as seen — only for being replaced by another welcome
  function dispose() {
    closed = true
    clearTimeout(settleTimer)
    detach()
    root.remove()
    if (active && active.root === root) active = null
    if (!active) document.documentElement.classList.remove('wl-open')
  }
  active = { root, enter, dispose }
  return active
}

/**
 * Size the word so it fills the width exactly, edge margin to edge margin — measured, because the
 * right size depends on the word ("GO" and "POKER" need very different sizes to fill the same width)
 * and on the face the system actually has. On a short screen — a phone turned sideways — the word is
 * held by height instead: by the --wl-word-max-h token, and by the room the title actually has once
 * the cue has taken its place, so the word never crowds MASTER into the cue.
 */
function fitWord(root) {
  const word = root.querySelector('.wl-word')
  if (!word) return
  const cs = getComputedStyle(root)
  const W = root.clientWidth || innerWidth
  // no size yet (a window still being laid out): leave the stylesheet's own size and fit when one arrives
  if (!(W > 0)) { word.style.fontSize = ''; return }
  const margin = parseFloat(cs.getPropertyValue('--wl-margin')) || lengthOf(root, cs.getPropertyValue('--wl-margin'), 16)
  let maxH = lengthOf(root, cs.getPropertyValue('--wl-word-max-h'), innerHeight * 0.58)
  // the title's box is whatever height the cue leaves (it is a flex item that grows and may shrink to 0)
  const title = root.querySelector('.wl-title'), master = root.querySelector('.wl-master')
  if (title && title.clientHeight > 0 && master) {
    const room = title.clientHeight - master.offsetHeight - (parseFloat(getComputedStyle(master).marginTop) || 0)
    maxH = Math.min(maxH, Math.max(0, room))
  }
  const probe = 200
  word.style.fontSize = `${probe}px`
  word.style.translate = ''
  // Fit the INK, not the text box: the P's side bearing and the tight tracking leave the letters inset
  // from their box unevenly (at phone width 21px from the left edge against 14px from the right), and
  // the gap grows with the size. Measured from the glyphs themselves, then centred by the difference.
  const ink = inkOf(word, probe)
  const inkW = ink ? ink.end - ink.start : word.scrollWidth
  if (!inkW) return
  const byWidth = probe * (W - 2 * margin) / inkW
  const byHeight = maxH / 0.86                         // the word's line box is 0.86em tall
  const size = Math.floor(Math.min(byWidth, byHeight) * 10) / 10
  word.style.fontSize = `${size}px`
  // `translate`, not `transform`: the arrival animates transform, and the two compose
  if (ink) word.style.translate = `${(size / probe) * (ink.advance - ink.start - ink.end) / 2}px 0`
}

/**
 * Where the word's ink starts and ends, measured from the glyphs at `px`, relative to the start of its
 * text box, with the box's own advance width. Canvas draws the same face as the page; where it cannot
 * apply letter-spacing itself, the spacing is added by hand. Null when there is no canvas to ask.
 */
let inkCtx = null
function inkOf(word, px) {
  try {
    const cs = getComputedStyle(word)
    inkCtx = inkCtx || document.createElement('canvas').getContext('2d')
    if (!inkCtx) return null
    inkCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`
    const text = word.textContent, ls = parseFloat(cs.letterSpacing) || 0
    const native = 'letterSpacing' in inkCtx
    if (native) inkCtx.letterSpacing = `${ls}px`
    const m = inkCtx.measureText(text)
    const gaps = native ? 0 : ls * ([...text].length - 1)   // the spacing between the letters
    return {
      start: -m.actualBoundingBoxLeft,
      end: m.actualBoundingBoxRight + gaps,
      advance: native ? m.width : word.scrollWidth,
    }
  } catch { return null }
}

/** Resolve a CSS length token (e.g. "max(14px, 3.2vw)") to pixels by letting the browser compute it. */
function lengthOf(root, value, fallback) {
  const v = String(value || '').trim()
  if (!v) return fallback
  try {
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;width:${v}`
    root.append(probe)
    const px = probe.getBoundingClientRect().width
    probe.remove()
    return px || fallback
  } catch { return fallback }
}

/** A duration token from the stylesheet, in ms, with a fallback when there is no layout to ask. */
function readMs(el, name, fallback) {
  try {
    const v = getComputedStyle(el).getPropertyValue(name).trim()
    const n = parseFloat(v)
    if (!Number.isFinite(n)) return fallback
    return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n
  } catch { return fallback }
}

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
