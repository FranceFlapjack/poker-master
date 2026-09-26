// Poker Master's welcome scene — the background behind the series title drawn by js/welcome.js.
//
// This file is Poker's own; each app of the series has its own welcome-scene.js.
//
// The scene is the table you will sit at in every lesson, seen from above: the same nine players, in the
// same seats — you at the bottom, the rest running clockwise — a pair of cards dealt to each of them,
// and the cat in its box in the bottom-right corner, where it lives in the app. When the welcome lifts,
// the cat is already where it will be; nothing jumps.
//
// The players and the cat are shigureni's illustrations, drawn exactly as the table draws them: the
// files themselves, cropped to their measured ink. The table, the cards and the "meow" are ours.

import { HERO_AVATAR, OPPONENT_AVATARS } from './avatars.js'

const CAT = { src: 'content/images/mascot/shigureni-illust-82.webp', size: [1000, 1000], ink: [148, 248, 707, 535] }

/** The figure, cropped to its ink and fitted bottom-aligned into its slot — as js/table.js does. */
function figure(art, cls) {
  const [ix, iy, iw, ih] = art.ink || [0, 0, 1000, 1000]
  const [w, h] = art.size || [1000, 1000]
  return `<svg class="${cls}" viewBox="${ix} ${iy} ${iw} ${ih}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><image href="${art.src}" width="${w}" height="${h}"/></svg>`
}

export function pokerScene(el, front) {
  const cast = [HERO_AVATAR, ...OPPONENT_AVATARS]            // you, then the eight
  const seats = cast.map((art, i) => {
    // hero at the bottom and the rest clockwise, exactly as every table in the app seats them
    const a = (90 - i * (360 / cast.length)) * Math.PI / 180
    const cx = Math.cos(a).toFixed(4), cy = Math.sin(a).toFixed(4)
    return `
      <div class="ws-seat${i === 0 ? ' you' : ''}" style="--cx:${cx};--cy:${cy};--i:${i}">${figure(art, 'ws-fig')}</div>
      <div class="ws-cards" style="--cx:${cx};--cy:${cy};--i:${i}"><i></i><i></i></div>`
  }).join('')

  el.innerHTML = `
    <div class="ws-table"></div>
    ${seats}`
  // the cat goes in front of the vignette: under it, it came out darker than the app's own cat, and the
  // point of putting it here is that the two are indistinguishable when the welcome lifts
  // appended, not assigned: with no front layer it falls back to the scene, and must not replace it
  ;(front || el).insertAdjacentHTML('beforeend', `
    <div class="ws-cat">
      <span class="ws-meow"><svg viewBox="0 0 16 16"><path d="M13 2.5 9.8 6.2M14.6 7.4 10.4 8.3M12.4 12.6 9.4 10.2"/></svg><span>meow</span></span>
      ${figure(CAT, 'ws-cat-fig')}
    </div>`)

  // The scene is drawn before the welcome is on the page, so fitting waits until it is there — a task
  // later — and runs again whenever the window changes size. Not only a ResizeObserver: those arrive
  // with rendering frames, and a tab opened in the background renders none.
  const fit = () => { if (el.isConnected) fitCards(el); else removeEventListener('resize', fit) }
  setTimeout(fit, 0)
  addEventListener('resize', fit)
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(el)
}

/**
 * Keep every pair of dealt cards clear of the title, of every player, and of each other.
 *
 * Where the cards land is set in CSS, as a share of the way from the middle out to each seat. Measured
 * across phone, tablet and desktop sizes, no one share cleared everything: the two upper side seats sit
 * level with the ends of the word, and at a 360px phone or a portrait tablet their cards met it. Tuning a
 * constant per screen is the wrong fix, so this measures instead. A pair that would touch anything tries
 * the smallest moves that clear it — up, down, or outward — and takes the first that touches nothing.
 *
 * Everything is measured in LAYOUT coordinates (offsetLeft/Top), never getBoundingClientRect: this runs
 * while the scene is still pushing in from 107%, and a transformed measurement put every card in the
 * wrong place.
 */
function fitCards(el) {
  const root = el.closest('.wl')
  if (!root || !el.offsetWidth) return
  const W = el.offsetWidth, H = el.offsetHeight
  const rect = (node, pad = 0) => {
    let x = 0, y = 0, n = node
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
    return { l: x - pad, t: y - pad, r: x + node.offsetWidth + pad, b: y + node.offsetHeight + pad }
  }
  const meets = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
  const title = [...root.querySelectorAll('.wl-word, .wl-master, .wl-begin')].map(n => rect(n, 8))
  // a figure's drawn box: the seat is translated -50%, so its offsets are its centre
  const figs = [...el.querySelectorAll('.ws-seat')].map(n => {
    const hw = n.offsetWidth / 2, hh = n.offsetHeight / 2
    return { l: n.offsetLeft - hw - 3, r: n.offsetLeft + hw + 3, t: n.offsetTop - hh - 3, b: n.offsetTop + hh + 3 }
  })
  const placed = []
  for (const c of el.querySelectorAll('.ws-cards')) {
    c.style.removeProperty('--ws-card-x'); c.style.removeProperty('--ws-card-y')
    const x = c.offsetLeft, y = c.offsetTop, hw = c.offsetWidth / 2, hh = c.offsetHeight / 2
    const at = (cx, cy) => ({ l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh })
    const clear = b => b.l >= 4 && b.t >= 4 && b.r <= W - 4 && b.b <= H - 4
      && !title.some(t => meets(b, t)) && !figs.some(f => meets(b, f)) && !placed.some(p => meets(b, p))
    let best = null
    if (clear(at(x, y))) best = [x, y]
    else {
      // candidate moves in 4px steps, smallest first: straight up, straight down, and outward from the
      // middle (the side the seat is on) — the three ways off a title that sits in the centre
      const out = x < W / 2 ? -1 : 1
      search:
      for (let d = 4; d <= 160; d += 4) {
        for (const [dx, dy] of [[0, -d], [0, d], [out * d, 0], [out * d, -d], [out * d, d]]) {
          if (clear(at(x + dx, y + dy))) { best = [x + dx, y + dy]; break search }
        }
      }
    }
    const [bx, by] = best || [x, y]
    placed.push(at(bx, by))
    if (bx !== x || by !== y) {
      c.style.setProperty('--ws-card-x', `${bx - W / 2}px`)
      c.style.setProperty('--ws-card-y', `${by - H / 2}px`)
    }
  }
}
