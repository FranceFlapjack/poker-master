// The cat in the box — hints when you answer wrong, and tips tucked into some lessons.
//
// It lives in the bottom-right corner, small, all the time. It never interrupts: when it has something
// to say it MEOWS — a little drawn "meow" beside its head and a hop — and waits to be clicked. Only then
// does the bubble open. Click it when it has nothing to say and it answers with hearts.
//
//     quiet   ──(a hint or tip arrives)──▶  meowing  ──(click)──▶  bubble open  ──(click, ×, Esc)──▶  quiet
//     quiet   ──(click)──▶  hearts, still quiet
//
// Asking to be clicked rather than opening by itself is the owner's call, and the right one: a bubble
// that appears on its own covers whatever you were reading at the moment you were reading it.
//
// THE ARTWORK is shigureni's, not ours: "すぐ箱に吸い込まれてしまう猫のイラスト" (a cat that gets
// sucked straight into any box), https://shigureni.com/illust/82, recorded in
// content/images/mascot/manifest.json. Their terms permit adding text, simple compositing and animation,
// which is all this does; they forbid making another illustration from theirs by any means, including
// hand-drawing and tracing. So the cat is only ever the file itself — cropped, scaled, moved — and the
// small cat on an inline tip is a CROP of the same file, never a redrawn head.
//
// EVERYTHING ELSE here is ours and generic: the bubble, the "meow" and its sound lines, the hearts. They
// are drawn to sit beside the artwork — black line, rounded ends — without copying anything in it.
//
// Priorities: a HINT (you just got something wrong) always replaces a TIP; a tip never displaces a hint.
// The owner can switch the cat off from the sidebar; hints and tips then show inline in the page.

const SRC = 'content/images/mascot/shigureni-illust-82.webp'
// the drawn pixels of the file, measured by alpha across every pixel (2026-09-26): [x, y, w, h] of 1000²
const INK = [148, 248, 707, 535]
// where the cat's head is, as a share of the ink box — the bubble's tail, the meow and the hearts start here
const HEAD = { x: 0.40, y: 0.12 }
// a crop of the same file for the inline tip cue: just the cat above the rim of the box
export const HEAD_CROP = [345, 240, 215, 170]

const KEY = 'poker-master.mascot'

let root = null, bubble = null, textEl = null, labelEl = null, outline = null, catBtn = null, live = null
let message = null      // { kind, text, title, owner } — what the cat has to say, if anything
let lastShownAt = 0

export const mascot = {
  get enabled() {
    try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
  },
  set enabled(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch {}
    if (on) this.mount()
    else { message = null; if (root) { setState('quiet'); root.hidden = true } }
    document.dispatchEvent(new CustomEvent('mascot-toggle', { detail: { on } }))
  },

  /** Put the cat in its corner. Called once at start-up; harmless to call again. */
  mount() {
    if (!this.enabled) return
    build()
    root.hidden = false
  },

  /**
   * The cat has something to say: it meows and waits to be clicked. Nothing opens by itself.
   * @returns {boolean} false when the cat is switched off, or when a tip would displace a hint
   */
  notify({ kind = 'tip', text, title, owner = null }) {
    if (!text || !this.enabled) return false
    if (kind === 'tip' && message && message.kind === 'hint') return false
    build(); root.hidden = false
    message = { kind, text, title, owner }
    fill()
    setState('meowing')
    hop()
    live.textContent = kind === 'hint' ? 'The cat has a hint. Select the cat to read it.' : 'The cat has a tip. Select the cat to read it.'
    return true
  },

  /**
   * Open the bubble now — for when the reader ASKED (the Hint button, a tip's label in the text). An
   * explicit request always wins; the hint-beats-tip rule is only for things that arrive by themselves.
   */
  say({ kind = 'tip', text, title, owner = null }) {
    if (!text || !this.enabled) return false
    build(); root.hidden = false
    message = { kind, text, title, owner }
    fill()
    open()
    return true
  },

  /** Forget the message — only if it belongs to `owner` (or no owner is given). The cat stays put. */
  hide(owner) {
    if (!root || !message) return
    if (owner != null && message.owner !== owner) return
    message = null
    setState('quiet')
  },

  /** What the cat has, and whether it is showing it. */
  get showing() { return message ? { kind: message.kind, open: root && root.dataset.state === 'open' } : null },
}

function build() {
  if (root) return
  root = document.createElement('aside')
  root.className = 'mascot'
  root.dataset.state = 'quiet'
  root.innerHTML = `
    <span class="mascot-live" aria-live="polite"></span>
    <div class="mascot-bubble" role="dialog" aria-label="The cat says">
      <svg class="mascot-outline" aria-hidden="true"><path/></svg>
      <button class="mascot-close" type="button" aria-label="Close">×</button>
      <span class="mascot-label"></span>
      <p class="mascot-text"></p>
    </div>
    <div class="mascot-body">
      <span class="mascot-meow" aria-hidden="true">
        <svg viewBox="0 0 16 16" class="mascot-sound"><path d="M13 2.5 9.8 6.2M14.6 7.4 10.4 8.3M12.4 12.6 9.4 10.2"/></svg>
        <span>meow</span>
      </span>
      <button class="mascot-cat" type="button">
        <svg viewBox="${INK.join(' ')}" aria-hidden="true"><image href="${SRC}" width="1000" height="1000"/></svg>
      </button>
      <span class="mascot-hearts" aria-hidden="true"></span>
    </div>`
  document.body.append(root)
  bubble = root.querySelector('.mascot-bubble')
  textEl = root.querySelector('.mascot-text')
  labelEl = root.querySelector('.mascot-label')
  outline = root.querySelector('.mascot-outline')
  catBtn = root.querySelector('.mascot-cat')
  live = root.querySelector('.mascot-live')

  catBtn.addEventListener('click', onCat)
  root.querySelector('.mascot-close').addEventListener('click', close)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.dataset.state === 'open') close() })
  if (typeof ResizeObserver === 'function') new ResizeObserver(drawOutline).observe(bubble)
  addEventListener('resize', drawOutline)
  setState('quiet')
}

function onCat() {
  squish()
  const state = root.dataset.state
  if (state === 'open') close()
  else if (state === 'meowing' && message) open()
  else hearts()
}

function open() {
  setState('open')
  // lay out the closed bubble before opening it, or it simply appears instead of popping
  void bubble.offsetWidth
  drawOutline()
  requestAnimationFrame(drawOutline)
  live.textContent = `${labelEl.textContent}: ${message ? message.text.replace(/\*\*/g, '') : ''}`
  lastShownAt = Date.now()
}

/** Read and done: closing the bubble forgets the message. A new wrong answer brings a new meow. */
function close() {
  message = null
  setState('quiet')
}

function setState(state) {
  root.dataset.state = state
  if (message) root.dataset.kind = message.kind
  catBtn.setAttribute('aria-label',
    state === 'meowing' ? `The cat has a ${message.kind} — open it` : state === 'open' ? 'Close the cat’s note' : 'Pet the cat')
  catBtn.setAttribute('aria-expanded', String(state === 'open'))
  if (state === 'quiet') live.textContent = ''
}

function fill() {
  labelEl.textContent = message.title || (message.kind === 'hint' ? 'Hint' : 'Meow tip')
  textEl.innerHTML = inline(message.text)
}

// --- little motions, all restarted by removing and re-adding a class ---------------------------------
function restart(el, cls, ms) {
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)
  // timed rather than tied to animationend, which never fires in a background tab
  setTimeout(() => el.classList.remove(cls), ms)
}
const hop = () => restart(root.querySelector('.mascot-body'), 'hop', 700)
const squish = () => restart(catBtn, 'squish', 260)

/** A handful of hearts rising from the cat's head — what you get for petting it with nothing to say. */
function hearts() {
  const box = root.querySelector('.mascot-hearts')
  const n = 3
  for (let i = 0; i < n; i++) {
    const h = document.createElement('span')
    h.className = 'heart'
    h.style.setProperty('--dx', `${Math.round((i - (n - 1) / 2) * 20 + (Math.random() * 10 - 5))}px`)
    h.style.setProperty('--delay', `${i * 90}ms`)
    h.style.setProperty('--size', `${14 + Math.round(Math.random() * 4)}px`)
    h.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.3-4.4-9.3-8.8C1.2 8.4 3.1 4.6 6.7 4.6c2 0 3.5 1.1 4.3 2.5.8-1.4 2.3-2.5 4.3-2.5 3.6 0 5.5 3.8 4 7.1-2 4.4-9.3 8.8-9.3 8.8z"/></svg>'
    box.append(h)
    setTimeout(() => h.remove(), 1400)
  }
}

/**
 * The bubble's outline, drawn to the bubble's actual size: a rounded rectangle whose bottom edge runs
 * out into a tail aimed at the cat's head, as ONE continuous line — with one short break left in it near
 * the top-left corner, the way the artwork's own lines are drawn.
 */
function drawOutline() {
  if (!bubble || !root || root.hidden) return
  const cs = getComputedStyle(root)
  const sw = parseFloat(cs.getPropertyValue('--mascot-stroke')) || 1.3
  const tailH = parseFloat(cs.getPropertyValue('--mascot-tail')) || 9
  const w = bubble.offsetWidth, h = bubble.offsetHeight
  if (!w || !h) return
  const r = Math.min(12, h / 2 - 2)
  const i = sw / 2 + 0.5
  const bb = bubble.getBoundingClientRect(), cb = catBtn.getBoundingClientRect()
  const headX = cb.left + cb.width * HEAD.x - bb.left
  const tx = Math.max(r + 10, Math.min(w - r - 5, headX))
  const tailW = 11
  const tipX = Math.min(w - i - 2, tx + 5), tipY = h - i + tailH
  const L = i, T = i, R = w - i, B = h - i
  const d = [
    `M ${L + r} ${T}`, `H ${R - r}`, `A ${r} ${r} 0 0 1 ${R} ${T + r}`,
    `V ${B - r}`, `A ${r} ${r} 0 0 1 ${R - r} ${B}`,
    `H ${tx + tailW / 2}`, `L ${tipX} ${tipY}`, `L ${tx - tailW / 2} ${B}`,
    `H ${L + r}`, `A ${r} ${r} 0 0 1 ${L} ${B - r}`,
    `V ${T + r}`, `A ${r} ${r} 0 0 1 ${L + r} ${T}`,
  ].join(' ')
  outline.setAttribute('viewBox', `0 0 ${w} ${h + tailH}`)
  outline.setAttribute('width', w); outline.setAttribute('height', h + tailH)
  const path = outline.querySelector('path')
  path.setAttribute('d', d)
  try {
    const len = path.getTotalLength()
    const gap = Math.max(4, sw * 3.5)
    const at = len - (Math.PI * r / 2) - 7     // counted back from the end: just below the top-left curve
    path.setAttribute('stroke-dasharray', `${at} ${gap} ${len}`)
  } catch { path.removeAttribute('stroke-dasharray') }
}

/** Plain text in, safe HTML out. **bold** is the only markup a hint or tip may use. */
function inline(s) {
  const esc = String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  return esc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}

/**
 * The small cat on an inline tip: a crop of the same file, sized for a line of text.
 * Returned as an HTML string so lesson.js can drop it into the prose.
 */
export function catHeadHTML(px = 28) {
  const [x, y, w, h] = HEAD_CROP
  return `<svg class="tip-cat" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(px * w / h)}" height="${px}" aria-hidden="true"><image href="${SRC}" width="1000" height="1000"/></svg>`
}

/** For tests and the dev console: when the bubble last opened. */
export const _lastShownAt = () => lastShownAt
