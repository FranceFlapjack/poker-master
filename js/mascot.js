// The cat in the box — hints when you answer wrong, and tips tucked into some lessons.
//
// It sits in the bottom-right corner of the screen, below the edge until it has something to say, then
// pops up in its box with a speech bubble. One cat, one bubble, one message at a time.
//
// THE ARTWORK is shigureni's, not ours: "すぐ箱に吸い込まれてしまう猫のイラスト" (a cat that gets
// sucked straight into any box), https://shigureni.com/illust/82, recorded in
// content/images/mascot/manifest.json. Their terms permit adding text, simple compositing and animation,
// which is all this does; they forbid making another illustration from theirs by any means, including
// hand-drawing and tracing. So the cat is only ever the file itself — cropped, scaled, moved — and the
// small cat on an inline tip is a CROP of the same file, never a redrawn head.
//
// THE BUBBLE is ours: a plain speech bubble drawn to sit beside that artwork — the same pure black, the
// same stroke weight at the size the cat is shown, rounded ends, and the single break in the outline
// that shigureni's line work habitually leaves. It is a generic shape in a matching hand, not a copy of
// anything in theirs.
//
// Priorities: a HINT (you just got something wrong) always replaces a TIP. A tip never interrupts a
// hint. The owner can switch the cat off from the sidebar; hints and tips then fall back to showing
// inline in the page, so nothing is lost by turning it off.

const SRC = 'content/images/mascot/shigureni-illust-82.webp'
// the drawn pixels of the file, measured by alpha across every pixel (2026-09-26): [x, y, w, h] of 1000²
const INK = [148, 248, 707, 535]
// where the cat's head is, as a share of the ink box — the bubble's tail points here
const HEAD = { x: 0.40, y: 0.10 }
// a crop of the same file for the inline tip cue: just the cat above the rim of the box
export const HEAD_CROP = [345, 240, 215, 170]

const KEY = 'poker-master.mascot'

let root = null, bubble = null, textEl = null, labelEl = null, outline = null
let current = null          // { kind, owner, timer }
let hideTimer = null
let lastShownAt = 0

export const mascot = {
  get enabled() {
    try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
  },
  set enabled(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch {}
    if (!on) this.hide()
    document.dispatchEvent(new CustomEvent('mascot-toggle', { detail: { on } }))
  },

  /**
   * Say something.
   * @param {object} m
   * @param {'hint'|'tip'} m.kind
   * @param {string} m.text        plain text; **bold** is honoured, nothing else
   * @param {string} [m.title]     defaults to "Hint" or "Tip"
   * @param {*} [m.owner]          whatever asked — so only that owner's hide() can dismiss it
   * @returns {boolean} whether the cat said it (false when switched off, or a tip lost to a hint)
   */
  say({ kind = 'tip', text, title, owner = null }) {
    if (!text || !this.enabled) return false
    if (kind === 'tip' && current && current.kind === 'hint') return false
    build()
    clearTimeout(current && current.timer)
    labelEl.textContent = title || (kind === 'hint' ? 'Hint' : 'Tip')
    textEl.innerHTML = inline(text)
    root.dataset.kind = kind
    current = { kind, owner, timer: null }
    // a tip that nobody touches goes back in its box after a while; a hint waits for the answer
    if (kind === 'tip') current.timer = setTimeout(() => this.hide(owner), 14000)
    const wasOpen = root.classList.contains('open')
    clearTimeout(hideTimer)
    root.hidden = false
    // re-trigger the pop if a new message replaces an open one, so the change is noticed
    if (wasOpen) root.classList.remove('open')
    // make the browser lay out the CLOSED position before it is told to open — coming out of hidden,
    // it would otherwise never see the start of the motion and the cat would simply appear
    void root.offsetWidth
    drawOutline()
    requestAnimationFrame(() => { root.classList.add('open'); drawOutline() })
    lastShownAt = Date.now()
    return true
  },

  /** Put the cat away — only if what it is saying belongs to `owner` (or no owner is given). */
  hide(owner) {
    if (!root || !current) return
    if (owner != null && current.owner !== owner) return
    clearTimeout(current.timer)
    current = null
    root.classList.remove('open')
    // once it is back in the box, take it out of the page — and out of the screen reader's live region.
    // Timed rather than tied to transitionend, which does not arrive when motion is reduced or the tab
    // is in the background.
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { if (!current) root.hidden = true }, 520)
  },

  /** What the cat is saying right now, for anything that needs to know. */
  get showing() { return current ? { kind: current.kind } : null },
}

function build() {
  if (root) return
  root = document.createElement('aside')
  root.className = 'mascot'
  root.hidden = true
  root.setAttribute('role', 'status')
  root.setAttribute('aria-live', 'polite')
  root.innerHTML = `
    <div class="mascot-bubble">
      <svg class="mascot-outline" aria-hidden="true"><path/></svg>
      <button class="mascot-close" type="button" aria-label="Close">×</button>
      <span class="mascot-label"></span>
      <p class="mascot-text"></p>
    </div>
    <button class="mascot-cat" type="button" aria-label="Put the cat away">
      <svg viewBox="${INK.join(' ')}" aria-hidden="true"><image href="${SRC}" width="1000" height="1000"/></svg>
    </button>`
  document.body.append(root)
  bubble = root.querySelector('.mascot-bubble')
  textEl = root.querySelector('.mascot-text')
  labelEl = root.querySelector('.mascot-label')
  outline = root.querySelector('.mascot-outline')
  root.querySelector('.mascot-close').addEventListener('click', () => mascot.hide())
  root.querySelector('.mascot-cat').addEventListener('click', () => mascot.hide())
  root.addEventListener('mouseenter', () => current && clearTimeout(current.timer))
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) mascot.hide() })
  if (typeof ResizeObserver === 'function') new ResizeObserver(drawOutline).observe(bubble)
  addEventListener('resize', drawOutline)
}

/**
 * The bubble's outline, drawn to the bubble's actual size: a rounded rectangle whose bottom edge runs
 * out into a tail aimed at the cat's head, as ONE continuous line — then one short break left in it,
 * near the top-left corner, because that is how the artwork's own lines are drawn.
 */
function drawOutline() {
  if (!bubble || root.hidden) return
  const cs = getComputedStyle(root)
  const sw = parseFloat(cs.getPropertyValue('--mascot-stroke')) || 2
  const w = bubble.offsetWidth, h = bubble.offsetHeight
  if (!w || !h) return
  const r = Math.min(16, h / 2 - 2)
  const i = sw / 2 + 0.5                       // keep the stroke inside the box
  // where the tail lands: on the bottom edge, above the cat's head
  const cat = root.querySelector('.mascot-cat')
  const bb = bubble.getBoundingClientRect(), cb = cat.getBoundingClientRect()
  const headX = cb.left + cb.width * HEAD.x - bb.left
  const tx = Math.max(r + 14, Math.min(w - r - 6, headX))  // tail tip x, inside the rounded corners
  const tailW = 16, tailH = parseFloat(cs.getPropertyValue('--mascot-tail')) || 14
  const tipX = Math.min(w - i - 2, tx + 7), tipY = h - i + tailH
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
  // the break: a short gap just after the top-left corner
  try {
    const len = path.getTotalLength()
    const gap = Math.max(5, sw * 3)
    const at = len - (Math.PI * r / 2) - 10     // counted back from the end: just past the top-left arc
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

/** For tests and the dev console: when the cat last spoke. */
export const _lastShownAt = () => lastShownAt
