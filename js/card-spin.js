// Poker Master's welcome background: one playing card drawn in hairlines, standing on a corner behind
// the word and turning slowly about the upright axis through that corner. Each time its back is towards
// you, the face changes to the next card of a deck shuffled by the engine — a real deal, 52 cards and
// then a fresh shuffle. The card's red is the one warm accent, as the red dot is on Chess Master's tour.
//
// Poker only, and mounted from js/app.js into the welcome's root, so js/welcome.js and css/welcome.css
// stay identical across the Master series.

import { makeDeck, shuffle, rankOf, suitOf, isRed, RANKS, SUIT_GLYPH } from './engine/cards.js'

const TURN = 12000                                   // ms for one full turn
const W = 72, H = 100                                // the app's card proportion (table.js: width = 0.72 × height)
const TILT = Math.atan(W / H) * 180 / Math.PI        // stands the card on a corner: its diagonal upright

/** Spin a card in `root` (the welcome curtain) behind its type; it stops by itself once root leaves the page. */
export function mountCardSpin(root) {
  let deck = []
  const next = () => { if (!deck.length) deck = shuffle(makeDeck()); return deck.pop() }
  const svg = (cls, inner) => `<svg class="wl-card-side ${cls}" viewBox="-1 -1 ${W + 2} ${H + 2}" aria-hidden="true">
    <rect class="wl-card-edge" width="${W}" height="${H}" rx="5"/>${inner}</svg>`
  const scene = document.createElement('div')
  scene.className = 'wl-card'
  scene.setAttribute('aria-hidden', 'true')
  scene.innerHTML = `<div class="wl-card-spin"><div class="wl-card-tilt" style="transform:rotate(${TILT}deg)">
    ${svg('face', '<g class="wl-card-ink"></g>')}
    ${svg('back', `<defs><pattern id="wl-card-lattice" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M0 0V6M0 0H6"/></pattern></defs><rect class="wl-card-lattice" x="5" y="5" width="${W - 10}" height="${H - 10}" rx="2"/>`)}
  </div></div>`
  root.prepend(scene)

  const ink = scene.querySelector('.wl-card-ink'), spin = scene.querySelector('.wl-card-spin')
  // rank and pip where table.js puts them, at the same proportions, so it reads as the app's own card
  const deal = () => {
    const c = next()
    ink.setAttribute('class', `wl-card-ink${isRed(c) ? ' red' : ''}`)
    ink.innerHTML = `<text x="${W / 2}" y="${H * 0.42}" font-size="${H * 0.34}">${RANKS[rankOf(c)]}</text>
      <text x="${W / 2}" y="${H * 0.81}" font-size="${H * 0.31}">${SUIT_GLYPH[suitOf(c)]}</text>`
  }
  deal()
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { spin.style.transform = 'rotateY(-24deg)'; return }   // one card, still
  const start = performance.now()
  let dealt = 0
  const frame = now => {
    if (!scene.isConnected) return
    const turns = (now - start) / TURN
    spin.style.transform = `rotateY(${turns * 360}deg)`
    const n = Math.floor(turns + 0.5)                 // half a turn in, the back faces you: change the face then
    if (n !== dealt) { dealt = n; deal() }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
