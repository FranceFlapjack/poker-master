// Bet sizing as a lesson block: ```sizing fences.
//
// Every number here is computed by js/engine/ev.js as the block draws — none is typed into a lesson —
// so a lesson cannot quote a price that the maths does not give.
//
//   show: postflop   a bet as a share of the pot: what a caller needs to win, and how often a bluff of
//                    that size must work. A table of common sizes, then a slider for any size.
//                    `sizes: 0.33, 0.5, 0.75, 1, 1.5` picks the rows.
//   show: steal      an open-raise before the flop: how often it must win the blinds and antes straight
//                    away to break even. `dead: 2.5` is the money already out (blinds 1.5 + antes 1, in
//                    big blinds); `opens: 2, 2.5, 3` picks the sizes.

import { betSizing, alpha } from './engine/ev.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const pct = x => `${(x * 100).toFixed(1)}%`
const list = (v, d) => (v ? String(v).split(/[\s,]+/).map(Number).filter(n => n > 0) : d)
/** "a third of the pot" for 1/3, "half the pot", "the pot", "2× the pot", else a percentage. */
function sizeName(f) {
  const near = (a, b) => Math.abs(a - b) < 0.006
  if (near(f, 1 / 4)) return 'a quarter of the pot'
  if (near(f, 1 / 3)) return 'a third of the pot'
  if (near(f, 1 / 2)) return 'half the pot'
  if (near(f, 2 / 3)) return 'two-thirds of the pot'
  if (near(f, 3 / 4)) return 'three-quarters of the pot'
  if (near(f, 1)) return 'the size of the pot'
  if (f > 1 && near(f, Math.round(f * 2) / 2)) return `${f}× the pot`
  return `${Math.round(f * 100)}% of the pot`
}

/** Mount a ```sizing fence in place of `blk`. */
export function mountSizingBlock(blk, p = {}) {
  const fig = document.createElement('figure')
  fig.className = 'sizingblock'
  if (p.show === 'steal') {
    const dead = Number(p.dead) || 2.5
    const opens = list(p.opens, [2, 2.25, 2.5, 3])
    fig.innerHTML = `
      <table class="sz-table"><thead><tr><th>Open to</th><th class="num">You risk</th><th class="num">To win</th><th class="num">Must win at once</th></tr></thead>
      <tbody>${opens.map(o => `<tr><td>${o} big blinds</td><td class="num">${o}</td><td class="num">${dead}</td><td class="num"><b>${pct(alpha(o, dead))}</b></td></tr>`).join('')}</tbody></table>
      <p class="sz-note">With ${dead} big blinds already in the middle. "Must win at once" is how often everyone has to fold for the raise to break even before a single card is dealt: you risk the open to win what is out there, so it is open ÷ (open + what is out there).</p>
      ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}`
  } else {
    const sizes = list(p.sizes, [1 / 3, 0.5, 2 / 3, 1, 2]).map(f => (Math.abs(f - 0.33) < 0.005 ? 1 / 3 : Math.abs(f - 0.66) < 0.007 ? 2 / 3 : f))
    fig.innerHTML = `
      <table class="sz-table"><thead><tr><th>Bet</th><th class="num">The caller needs to win</th><th class="num">A bluff must work</th></tr></thead>
      <tbody>${sizes.map(f => { const b = betSizing(f, 1); return `<tr><td>${esc(sizeName(f))}</td><td class="num"><b>${pct(b.callerRequires)}</b></td><td class="num"><b>${pct(b.alpha)}</b></td></tr>` }).join('')}</tbody></table>
      <div class="sz-try">
        <label for="sz-range-${p.id || 'x'}">Try any size</label>
        <input type="range" min="10" max="250" step="5" value="50" id="sz-range-${p.id || 'x'}">
        <p class="sz-live" aria-live="polite"></p>
        <div class="sz-bars" aria-hidden="true"><span class="sz-bar call"><i></i></span><span class="sz-bar bluff"><i></i></span></div>
      </div>
      <p class="sz-note">Bet B into a pot P. The caller pays B to win P + B, so they need B ÷ (P + 2B) of the time. A bluff risks B to win P, so it needs everyone to fold B ÷ (P + B) of the time.</p>
      ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}`
    const range = fig.querySelector('input[type=range]')
    const paint = () => {
      const f = Number(range.value) / 100, b = betSizing(f, 1)
      fig.querySelector('.sz-live').innerHTML = `Bet <b>${esc(sizeName(f))}</b> — for a pot of 1,000, a bet of ${Math.round(f * 1000).toLocaleString('en')}. The caller needs to win <b>${pct(b.callerRequires)}</b> of the time; a bluff must work <b>${pct(b.alpha)}</b> of the time.`
      fig.querySelector('.sz-bar.call i').style.width = pct(b.callerRequires)
      fig.querySelector('.sz-bar.bluff i').style.width = pct(b.alpha)
    }
    range.addEventListener('input', paint)
    paint()
  }
  blk.replaceWith(fig)
  return { destroy() { fig.remove() } }
}
