// The home page's story, on the dark navy ground before the course: "Your hand" (owner 2026-10-31, from a draft
// they tried). Each visitor is dealt one real hand, and scrolling deals it street by street — the cards stay
// pinned while the words go by, and at every street the engine names the hand and works out its chance against
// one random hand. Then Moneymaker's 2003 river, and a sourced timeline. The fixed facts live in
// js/story-facts.js and are checked by scripts/engine-test.mjs; the rest is computed here, for this deal.
//
// Everything stops when the page is left (the returned function); reduced motion gets no turning or counting.
import { makeDeck, shuffle, rankOf, suitOf, isRed, RANKS, SUIT_GLYPH, parseCards } from './engine/cards.js'
import { evaluate, describe } from './engine/evaluator.js'
import { equityMC } from './engine/equity.js'
import { handToCell } from './engine/ranges.js'
import { COUNTS, ODDS, gridAgainst } from './story-facts.js'

const rk = r => (r === 'T' ? '10' : r)
/** "32o" → "3-2 offsuit", "AA" → "A-A", "76s" → "7-6 suited". */
export const handWords = name => name.length === 2 ? `${rk(name[0])}-${rk(name[1])}` : `${rk(name[0])}-${rk(name[1])} ${name[2] === 's' ? 'suited' : 'offsuit'}`
const pct = x => `${Math.round(x * 100)}%`
const n = x => x.toLocaleString('en-US')
const ordinal = k => k + (k % 100 > 10 && k % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th')
const RANDOM = new Float32Array(169).fill(1)       // "one random hand": all 1,326 equally likely
const TRIALS = 12000                               // sampled: about a point either way, and the page says "about"
const MM = { hole: parseCards('Ks 7h'), board: parseCards('9s 2d 6s 8s 3h') }   // content/famous/moneymaker-bluff-2003.json

const card = c => `<div class="sc"><div class="sc-turn"><div class="sc-side sc-back"></div><div class="sc-side sc-front${isRed(c) ? ' red' : ''}"><b>${rk(RANKS[rankOf(c)])}</b><i>${SUIT_GLYPH[suitOf(c)]}</i></div></div></div>`

/** `cta`: { href, label, today, secondary: { href, label } } — decided by the app (start or continue). `grinder`: the mode switch. */
export function mountStory(el, { cta, grinder = false }) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const grid1 = gridAgainst(1)
  el.className = 'story' + (still ? ' story-still' : '')
  el.innerHTML = `
    <section class="story-scene story-intro">
      <p class="story-kicker">A course in no-limit hold’em</p>
      <h1 class="story-title">52 cards.<br>${n(COUNTS.starting)} hands.<br><em>One of them is yours.</em></h1>
      <p class="story-lead">Two cards of your own, five to share, and a bet at every turn. Scroll, and a hand is dealt to you one street at a time — or start right now.</p>
      <div class="story-cta"><a class="btn primary" href="${cta.href}">${cta.label}</a>${cta.secondary ? `<a class="btn" href="${cta.secondary.href}">${cta.secondary.label}</a>` : ''}</div>
    </section>

    <div class="story-hand">
      <div class="story-steps">
        <section class="story-step" data-s="0">
          <p class="story-kicker">Your hand</p>
          <h2 class="story-h">Two cards. <em>Yours.</em></h2>
          <p class="story-body">Of the <b>${n(COUNTS.starting)}</b> two-card hands the deck can deal, this is the one you got. Keep scrolling and it plays out.</p>
        </section>
        <section class="story-step" data-s="1">
          <p class="story-kicker">Before the flop</p>
          <h2 class="story-h" id="sh-pre"></h2>
          <p class="story-body" id="st-pre"></p>
        </section>
        <section class="story-step" data-s="2">
          <p class="story-kicker">The flop</p>
          <h2 class="story-h">Three cards <em>for everyone.</em></h2>
          <p class="story-body" id="st-3"></p>
        </section>
        <section class="story-step" data-s="3">
          <p class="story-kicker">The turn</p>
          <h2 class="story-h">One more <em>changes it.</em></h2>
          <p class="story-body" id="st-4"></p>
        </section>
        <section class="story-step" data-s="4">
          <p class="story-kicker">The river</p>
          <h2 class="story-h">The last card.</h2>
          <p class="story-body" id="st-5"></p>
        </section>
        <section class="story-step" data-s="5">
          <p class="story-kicker">A famous river</p>
          <h2 class="story-h">King-high, <em>for the world title.</em></h2>
          <p class="story-body">The 2003 World Series main event, heads-up. Chris Moneymaker, an amateur who qualified online, holds these cards on this board: no pair, no draw. Across the table, Sam Farha, one of the most feared players in the game. What would you do?</p>
          <p class="story-body">Farha did not hold a random hand, and his cards stay hidden until you play it.</p>
          <div class="story-cta"><a class="btn" href="#/tools/game">Play the hand →</a><button class="btn" type="button" data-again>Deal yourself another</button></div>
        </section>
      </div>
      <div class="story-stage" aria-live="polite">
        <div><div class="story-label">The board</div><div class="story-row" id="ss-board"></div></div>
        <div class="story-hole"><div class="story-label" id="ss-hole-label">Your hand</div><div class="story-row" id="ss-hole"></div></div>
        <div class="story-read">
          <div class="story-big" id="ss-big">?</div>
          <div><div class="story-delta" id="ss-delta"></div><div class="story-made" id="ss-made"></div></div>
          <div class="story-meter"><i id="ss-meter"></i></div>
          <div class="story-sub">its chance against one random hand${grinder ? ' — equity, ties counted as half; sampled after the flop' : ''}</div>
        </div>
        <div class="story-mini" id="ss-mini"><svg viewBox="0 0 13 13" aria-hidden="true" id="ss-grid"></svg><span id="ss-mini-text"></span></div>
        <button class="btn story-again" type="button" data-again>Deal another hand</button>
      </div>
    </div>

    <section class="story-scene">
      <p class="story-kicker">The story so far</p>
      <h2 class="story-h">Since 1970, <em>five moments.</em></h2>
      <ol class="story-time">
        <li><b>1970</b><span>Las Vegas: the first World Series of Poker, at Binion’s Horseshoe. Its champion, Johnny Moss, is voted in by the players.</span></li>
        <li><b>2003</b><span>Chris Moneymaker, who qualified online, wins the main event. It grows from 839 players that year to 8,773 by 2006.</span></li>
        <li><b>2017</b><span>Pittsburgh: Libratus, from Carnegie Mellon, beats four top pros heads-up over 120,000 hands.</span></li>
        <li><b>2019</b><span>Pluribus, from Carnegie Mellon and Facebook’s AI lab, beats professionals at a six-player table.</span></li>
        <li><b>Today</b><span>You. <a href="${cta.href}">${cta.today}</a>.</span></li>
      </ol>
      <p class="story-src">Sources: Wikipedia, “World Series of Poker”, “Libratus” and “Pluribus (poker bot)” (CC BY-SA); the 2003 hand from PokerNews and CardPlayer, credited on its replay. Every chance on this page is worked out by this app: before the flop from its table of the 169 hands (scripts/build-preflop-strength.mjs), after it by dealing out ${n(TRIALS)} random finishes, so each is good to about a point.</p>
    </section>`
  const $ = s => el.querySelector(s)

  // the intro and the timeline rise in as they arrive
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('story-in') }), { threshold: 0.2 })
  el.querySelectorAll('.story-scene').forEach(s => io.observe(s))
  setTimeout(() => $('.story-intro').classList.add('story-in'), 30)   // the first screen never waits for the observer

  // --- the hand ------------------------------------------------------------------------------------------
  let hole, board, cell, eq, shown = -1, shownEq = null, raf = 0
  const made = (h, b) => { const d = describe(evaluate([...h, ...b])); return d[0].toLowerCase() + d.slice(1) }   // "one pair, sevens"
  const move = (a, b) => b > a + 0.005 ? `up, from ${pct(a)} to <b>${pct(b)}</b>` : b < a - 0.005 ? `down, from ${pct(a)} to <b>${pct(b)}</b>` : `about the same, <b>${pct(b)}</b>`
  const flushDraw = cards => [0, 1, 2, 3].some(s => cards.filter(c => suitOf(c) === s).length === 4)

  function deal() {
    const d = shuffle(makeDeck())
    hole = [d.pop(), d.pop()]; board = d.slice(-5)
    const { i, j } = handToCell(hole[0], hole[1])
    cell = grid1.find(c => c.i === i && c.j === j)
    // the chance at each street, worked out the first time that street is shown (a phone should not do all three at once)
    const memo = {}
    eq = s => memo[s] ??= s === 1 ? cell.equity : equityMC([hole, RANDOM], board.slice(0, s + 1), [], { trials: TRIALS, seed: 7 }).equity[0]
    const combos = cell.name.length === 2 ? 6 : cell.name[2] === 's' ? 4 : 12
    $('#sh-pre').innerHTML = `${handWords(cell.name)}: <em>number ${cell.rank}</em> of 169.`
    $('#st-pre').innerHTML = `Suits aside, there are only 169 kinds of starting hand. Ranked by how often each wins against one random hand, yours comes <b>${ordinal(cell.rank)}</b>: about <b>${pct(cell.equity)}</b> of the time.` +
      (grinder ? ` There are ${combos} ways to be dealt it.` : '')
    $('#ss-grid').innerHTML = grid1.map(c => `<rect x="${c.j + .06}" y="${c.i + .06}" width=".88" height=".88"${c === cell ? ' class="me"' : ''}/>`).join('')
    $('#ss-mini-text').textContent = `${cell.name}: number ${cell.rank} of 169`
    shown = -1; shownEq = null
    show(current())
  }
  // the street texts need the chance before and after, so they are written as each street arrives
  function words(s) {
    if (s < 2 || s > 4) return
    const cards = s + 1, now = eq(s), before = eq(s - 1)
    const text = {
      2: `This exact flop is one of <b>${n(COUNTS.flops)}</b> your hand could have seen. You have <b>${made(hole, board.slice(0, 3))}</b>, and your chance went ${move(before, now)}.` +
        (flushDraw([...hole, ...board.slice(0, 3)]) ? ` Four cards to a flush: it arrives by the river about <b>${pct(ODDS.flushDraw)}</b> of the time.` : ''),
      3: `Now <b>${made(hole, board.slice(0, 4))}</b>. Your chance went ${move(before, now)}, with one card to come.`,
      4: `Final hand: <b>${made(hole, board)}</b>. Against one random hand it wins about <b>${pct(now)}</b>. The cards are done; from here, only the betting decides who takes the pot.`,
    }[s]
    $(`#st-${cards}`).innerHTML = text
  }

  function setNumber(v) {
    $('#ss-delta').className = 'story-delta' + (shownEq != null && v > shownEq + 0.005 ? ' up' : '')
    $('#ss-delta').textContent = shownEq == null || Math.abs(v - shownEq) < 0.005 ? '' : `${v > shownEq ? '▲' : '▼'} ${Math.abs(Math.round(v * 100) - Math.round(shownEq * 100))} points`
    const from = shownEq ?? v, t0 = performance.now()
    shownEq = v
    $('#ss-meter').style.width = pct(v)
    cancelAnimationFrame(raf)
    if (still) { $('#ss-big').textContent = pct(v); return }
    const tick = now => { const p = Math.min(1, (now - t0) / 600); $('#ss-big').textContent = pct(from + (v - from) * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(tick) }
    $('#ss-big').textContent = pct(from); raf = requestAnimationFrame(tick)
  }

  let face = null   // whose cards are on the stage: 'mine' or 'famous'
  function show(s) {
    if (s === shown) return
    shown = s
    const famous = s === 5
    const h = famous ? MM.hole : hole, b = famous ? MM.board : board
    if (face !== (famous ? 'famous' : 'mine')) {
      face = famous ? 'famous' : 'mine'
      shownEq = null   // a different hand on the stage: no "up" or "down" across the swap
      $('#ss-hole').innerHTML = h.map(card).join(''); $('#ss-board').innerHTML = b.map(card).join('')
    }
    $('#ss-hole-label').textContent = famous ? 'Moneymaker’s hand' : 'Your hand'
    const up = famous ? 5 : [0, 0, 3, 4, 5][s]
    el.querySelectorAll('#ss-hole .sc').forEach(c => c.classList.toggle('up', s >= 1))
    el.querySelectorAll('#ss-board .sc').forEach((c, k) => c.classList.toggle('up', k < up))
    $('#ss-mini').classList.toggle('on', s === 1)
    words(s)
    if (s === 0) { $('#ss-big').textContent = '?'; $('#ss-delta').textContent = ''; $('#ss-made').textContent = ''; $('#ss-meter').style.width = '0'; shownEq = null; return }
    setNumber(famous ? equityMC([MM.hole, RANDOM], MM.board, [], { trials: TRIALS, seed: 7 }).equity[0] : eq(s))
    $('#ss-made').textContent = s === 1 ? handWords(cell.name) : describe(evaluate([...h, ...b.slice(0, up)]))
  }

  // the step nearest the middle of the screen is the one being read (a scroll listener, not an observer: it
  // cannot miss a step on a fast fling)
  const steps = [...el.querySelectorAll('.story-step')]
  const current = () => {
    // on a phone the cards are pinned across the top, so "the middle" is the middle of what is left below them
    const top = matchMedia('(max-width: 760px)').matches ? $('.story-stage').getBoundingClientRect().bottom : 0
    const mid = (top + innerHeight) / 2, dist = st => Math.abs(st.getBoundingClientRect().top + st.offsetHeight / 2 - mid)
    return +steps.reduce((a, b) => dist(b) < dist(a) ? b : a).dataset.s
  }
  const onScroll = () => { const s = current(); steps.forEach(x => x.classList.toggle('on', +x.dataset.s === s)); show(s) }
  addEventListener('scroll', onScroll, { passive: true })
  el.querySelectorAll('[data-again]').forEach(b => b.addEventListener('click', () => { face = null; deal(); steps[0].scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' }) }))
  deal(); onScroll()

  return () => { io.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
}
