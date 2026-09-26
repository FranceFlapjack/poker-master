// The Master series welcome — the screen someone sees the first time they open an app of the series.
//
// THIS FILE IS IDENTICAL IN EVERY APP OF THE SERIES, like js/family.js. It knows nothing about any one
// game: the app passes in its id, its word ("Poker"), and a function that draws its own scene. The
// colour is the app's --accent. Its styles are css/welcome.css, which is shared the same way.
//
// Copy it to chess-master and go-master only once Poker Master is published — the same gate the owner
// set for family.js — and give each sibling its own js/welcome-scene.js.
//
// Rules it keeps:
//   - Shown ONCE PER APP. The flag is `<app>-master.welcomed`. On GitHub Pages the three apps share one
//     origin, so a single series-wide key would spend the welcome on whichever game someone opened
//     first; each game gets its own moment instead.
//   - It never traps anyone: Skip is there from the first frame, Esc leaves at any time, and once the
//     title has landed a click anywhere begins. If storage is unavailable (a private window), it shows
//     and dismisses normally and simply shows again next time.
//   - Reduced motion gets a still — see welcome.css.
//   - The app renders underneath as normal. The welcome is a curtain, not a route.

const flag = app => `${app}-master.welcomed`

/** Whether this app's welcome has already been seen in this browser. */
export function welcomeSeen(app) {
  try { return !!localStorage.getItem(flag(app)) } catch { return false }
}

/**
 * Show the welcome, unless it has been seen (pass `force` to show it anyway — the #/welcome route).
 *
 * @param {object} o
 * @param {string} o.app       the series id: 'chess' | 'go' | 'poker'
 * @param {string} o.word      the game, as it should read: 'Poker'
 * @param {(back:Element, front:Element)=>void} [o.scene]  draws the app's own background: `back` sits
 *        under the vignette, `front` above it and below the title
 * @param {boolean} [o.force]
 * @param {()=>void} [o.onDone]
 * @returns {{close:()=>void}|null}
 */
let active = null   // the welcome on screen, if any — a second one replaces it cleanly

export function mountWelcome({ app, word, scene, force = false, onDone } = {}) {
  if (!force && welcomeSeen(app)) return null
  if (active) active.dispose()

  const letters = [...String(word).toUpperCase()].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')
  const root = document.createElement('div')
  root.className = 'wl'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', `${word} Master`)
  root.innerHTML = `
    <div class="wl-scene" aria-hidden="true"></div>
    <div class="wl-front" aria-hidden="true"></div>
    <div class="wl-center">
      <h1 class="wl-title">
        <span class="wl-word" aria-hidden="true">${letters}</span>
        <span class="wl-master" aria-hidden="true">MASTER</span>
        <span class="wl-rule" aria-hidden="true"></span>
        <span class="wl-sr">${word} Master</span>
      </h1>
      <button class="wl-begin" type="button">Begin</button>
    </div>
    <button class="wl-skip" type="button">Skip</button>`

  // scene(back, front): `back` is under the vignette, `front` is above it and below the title
  try { if (typeof scene === 'function') scene(root.querySelector('.wl-scene'), root.querySelector('.wl-front')) } catch (e) {
    // a scene that fails must not take the welcome, or the app, down with it
    console.warn('welcome scene:', e)
  }

  const before = document.activeElement
  document.documentElement.classList.add('wl-open')
  document.body.append(root)
  // Start the sequence now. Every step is a CSS animation with a delay and `both` fill, so each element
  // sits at its first keyframe until its moment — no need to wait for a frame, and no dependence on one:
  // a tab that opens in the background delivers no frames, and a welcome that waited for one would sit
  // there empty.
  void root.offsetWidth
  root.classList.add('wl-playing')

  // the moment the title has landed and the Begin button is up: from here a click anywhere begins
  const beginAt = readMs(root, '--wl-begin-at', 2450)
  let ready = false
  const readyTimer = setTimeout(() => {
    ready = true
    try { root.querySelector('.wl-begin').focus({ preventScroll: true }) } catch {}
  }, beginAt + 200)

  let closed = false
  function close() {
    if (closed) return
    closed = true
    clearTimeout(readyTimer)
    try { localStorage.setItem(flag(app), new Date().toISOString()) } catch {}
    root.classList.add('wl-leaving')
    document.removeEventListener('keydown', onKey)
    // timed rather than tied to transitionend, which does not arrive in a background tab
    setTimeout(() => {
      root.remove()
      if (active && active.root === root) active = null
      if (!active) document.documentElement.classList.remove('wl-open')
      if (before && typeof before.focus === 'function') { try { before.focus({ preventScroll: true }) } catch {} }
      if (typeof onDone === 'function') onDone()
    }, readMs(root, '--wl-leave', 650))
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (ready && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); close() }
  }

  root.querySelector('.wl-begin').addEventListener('click', close)
  root.querySelector('.wl-skip').addEventListener('click', close)
  root.addEventListener('click', e => { if (ready && !e.target.closest('button')) close() })
  document.addEventListener('keydown', onKey)

  // taken off screen without counting as seen — only for being replaced by another welcome
  function dispose() {
    closed = true
    clearTimeout(readyTimer)
    document.removeEventListener('keydown', onKey)
    root.remove()
    if (active && active.root === root) active = null
  }
  active = { root, close, dispose }
  return active
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
