// The home page's story, on the dark navy ground before the course: "Your hand" (owner 2026-10-31, from a draft
// they tried). Each visitor is dealt one real hand, and scrolling deals it street by street — the cards stay
// pinned while the words go by, and at every street the engine names the hand and works out its chance against
// one random hand. Then Moneymaker's 2003 river, and "Even aces lose": one of four match-ups dealt a thousand times,
// counted as they fall (owner 2026-11-16, in place of a timeline). The fixed facts live in
// js/story-facts.js and are checked by scripts/engine-test.mjs; the rest is computed here, for this deal.
//
// Everything stops when the page is left (the returned function); reduced motion gets no turning or counting.
import { makeDeck, shuffle, rankOf, suitOf, isRed, RANKS, SUIT_GLYPH, parseCards } from './engine/cards.js'
import { evaluate, describe } from './engine/evaluator.js'
import { equityMC } from './engine/equity.js'
import { handToCell } from './engine/ranges.js'
import { COUNTS, ODDS, gridAgainst, MATCHUPS, dealOnce, longRun } from './story-facts.js'
import { HERO_AVATAR } from './avatars.js'

const rk = r => (r === 'T' ? '10' : r)
/** "32o" → "3-2 offsuit", "AA" → "A-A", "76s" → "7-6 suited". */
export const handWords = name => name.length === 2 ? `${rk(name[0])}-${rk(name[1])}` : `${rk(name[0])}-${rk(name[1])} ${name[2] === 's' ? 'suited' : 'offsuit'}`
const pct = x => `${Math.round(x * 100)}%`
const n = x => x.toLocaleString('en-US')
const ordinal = k => k + (k % 100 > 10 && k % 100 < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th')
const RANDOM = new Float32Array(169).fill(1)       // "one random hand": all 1,326 equally likely
const TRIALS = 12000                               // sampled: about a point either way, and the page says "about"
const MM = { hole: parseCards('Ks 7h'), board: parseCards('9s 2d 6s 8s 3h') }   // content/famous/moneymaker-bluff-2003.json

// Draft 8: you sit at the home's table — the app's own portrait of your seat, cropped to its drawing (the ink box
// in js/avatars.js), never redrawn. Only you: two opponents stood above the table at first and the owner had them
// taken out (2026-11-14: "look weird, the head is cut out").
const fig = (a, cls) => `<svg class="story-fig ${cls}" viewBox="${a.ink.join(' ')}" aria-hidden="true"><image href="${a.src}" width="${a.size[0]}" height="${a.size[1]}"/></svg>`
const up = html => html.replace('class="sc"', 'class="sc up"')
const card = (c, k) => `<div class="sc" style="--k:${k}"><div class="sc-turn"><div class="sc-side sc-back"></div><div class="sc-side sc-front${isRed(c) ? ' red' : ''}"><b>${rk(RANKS[rankOf(c)])}</b><i>${SUIT_GLYPH[suitOf(c)]}</i></div></div></div>`

/** `cta`: { href, label, secondary: { href, label } } — decided by the app (start or continue). `grinder`: the mode switch. */
export function mountStory(el, { cta, grinder = false }) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const grid1 = gridAgainst(1)
  el.className = 'story' + (still ? ' story-still' : '')
  el.innerHTML = `
    <div class="story-hand">
      <div class="story-steps">
        <section class="story-step story-intro" data-s="0">
          <p class="story-kicker">A course in no-limit hold’em</p>
          <h1 class="story-title">52 cards.<br>${n(COUNTS.starting)} hands.<br><em>One of them<br>is yours.</em></h1>
          <p class="story-lead">It has just been dealt to you, face down: two cards of your own, and five to share. Scroll, and it plays out one street at a time — or start right now.</p>
          <div class="story-cta"><a class="btn primary" href="${cta.href}">${cta.label}</a>${cta.secondary ? `<a class="btn" href="${cta.secondary.href}">${cta.secondary.label}</a>` : ''}</div>
          <button class="story-cue" type="button" data-turn>Turn your cards over</button>
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
        <div class="story-felt">
          ${fig(HERO_AVATAR, 'you')}
          <div><div class="story-label">The board</div><div class="story-row" id="ss-board"></div></div>
          <div class="story-hole"><div class="story-label" id="ss-hole-label">Your hand</div><div class="story-row" id="ss-hole"></div></div>
        </div>
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

    <section class="story-scene story-luck">
      <p class="story-kicker">One last thing</p>
      <h2 class="story-h">Even aces <em>lose.</em></h2>
      <p class="story-body"><span id="lk-what"></span> All the money goes in before the flop. Deal it a thousand times and count. Every hand is a real shuffle by this app’s own engine.</p>
      <div class="seg seg-wrap luck-pick" role="group" aria-label="Match-up">${MATCHUPS.map((m, k) => `<button class="btn" type="button" data-m="${k}" aria-pressed="false">${m.tab}</button>`).join('')}</div>
      <div class="luck">
        <div class="luck-side"><div class="story-label" id="lk-na"></div><div class="story-row" id="lk-ha"></div><b class="luck-n" id="lk-a">0</b></div>
        <div class="luck-board"><div class="story-label" id="lk-count">The board</div><div class="story-row" id="lk-board"></div></div>
        <div class="luck-side luck-kings"><div class="story-label" id="lk-nb"></div><div class="story-row" id="lk-hb"></div><b class="luck-n" id="lk-k">0</b></div>
        <div class="story-meter"><i id="lk-bar"></i></div>
        <svg class="luck-line" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path id="lk-long" d=""/><polyline id="lk-path" points=""/></svg>
      </div>
      <p class="story-body" id="lk-say" aria-live="polite"></p>
      <div class="story-cta"><button class="btn primary" type="button" data-luck>Deal 1,000 hands</button><a class="btn" href="${cta.href}">${cta.label}</a></div>
      <p class="story-src">Sources: the 2003 hand from PokerNews and CardPlayer, credited on its replay. Every chance on this page is worked out by this app: before the flop from its table of the 169 hands (scripts/build-preflop-strength.mjs), after it by dealing out ${n(TRIALS)} random finishes, so each is good to about a point. The thousand hands above are dealt here, one shuffle each; nothing about them is stored or scripted.</p>
    </section>`
  const $ = s => el.querySelector(s)

  // the last scene rises in as it arrives
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('story-in') }), { threshold: 0.2 })
  el.querySelectorAll('.story-scene').forEach(s => io.observe(s))

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
      $('#ss-hole').innerHTML = h.map(card).join(''); $('#ss-board').innerHTML = b.map((c, k) => card(c, k + 2)).join('')   // --k: hole cards land first, then the board
    }
    $('#ss-hole-label').textContent = famous ? 'Moneymaker’s hand' : 'Your hand'
    const up = famous ? 5 : [0, 0, 3, 4, 5][s]
    el.querySelectorAll('#ss-hole .sc').forEach(c => c.classList.toggle('up', s >= 1))
    el.querySelectorAll('#ss-board .sc').forEach((c, k) => c.classList.toggle('up', k < up))
    $('#ss-mini').classList.toggle('on', s === 1)
    words(s)
    if (s === 0) { cancelAnimationFrame(raf); $('#ss-big').textContent = '?'; $('#ss-delta').textContent = ''; $('#ss-made').textContent = ''; $('#ss-meter').style.width = '0'; shownEq = null; return }
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
  // the cue under the first words, and your own cards while they are face down, both move on to the next step
  const turn = () => steps[Math.min(shown + 1, steps.length - 1)].scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' })
  $('[data-turn]').addEventListener('click', turn)
  $('#ss-hole').addEventListener('click', () => { if (shown === 0) turn() })
  deal(); onScroll()

  // --- even aces lose: a thousand hands of the chosen match-up, dealt in handfuls so the count can be watched ---
  const HANDS = 1000
  let luckRun = 0, m = null
  function pick(k) {   // a match-up on the table, nothing dealt yet
    m = MATCHUPS[k]; luckRun++
    el.querySelectorAll('[data-m]').forEach((b, i) => { b.classList.toggle('on', i === k); b.setAttribute('aria-pressed', i === k) })
    $('#lk-what').textContent = m.what
    $('#lk-na').textContent = m.names[0]; $('#lk-nb').textContent = m.names[1]
    $('#lk-ha').innerHTML = m.a.map((c, i) => up(card(c, i))).join(''); $('#lk-hb').innerHTML = m.b.map((c, i) => up(card(c, i))).join('')
    $('#lk-a').textContent = $('#lk-k').textContent = '0'
    $('#lk-count').textContent = 'The board'; $('#lk-board').innerHTML = [0, 1, 2, 3, 4].map(i => card(0, i)).join('')
    $('#lk-bar').style.width = '0'; $('#lk-path').setAttribute('points', ''); $('#lk-long').setAttribute('d', ''); $('#lk-say').textContent = ''
    const btn = $('[data-luck]'); btn.disabled = false; btn.textContent = 'Deal 1,000 hands'
  }
  function luck() {
    const me = ++luckRun, now = m, btn = $('[data-luck]')
    const long = now.long ??= longRun(now)
    let a = 0, k = 0, split = 0, done = 0, streak = 0, worst = 0, last = null
    const pts = []
    const y = share => Math.max(0, Math.min(100, (1 - share) * 200)).toFixed(1)   // the chart shows 50% to 100%
    $('#lk-long').setAttribute('d', `M0 ${y(long)}H1000`)
    btn.disabled = true
    const step = () => {
      if (me !== luckRun || !el.isConnected) return
      for (let i = still ? HANDS : 20; i > 0 && done < HANDS; i--) {
        last = dealOnce(now); done++
        if (last.result > 0) { a++; streak = 0 } else if (last.result < 0) { k++; worst = Math.max(worst, ++streak) } else split++
        pts.push(`${done},${y(a / done)}`)
      }
      $('#lk-a').textContent = n(a); $('#lk-k').textContent = n(k)
      $('#lk-count').textContent = `Hand ${n(done)}`
      $('#lk-board').innerHTML = last.board.map((c, i) => up(card(c, i))).join('')
      $('#lk-bar').style.width = `${(100 * a / done).toFixed(1)}%`
      $('#lk-path').setAttribute('points', pts.join(' '))
      if (done < HANDS) return void setTimeout(step, 50)
      $('#lk-say').innerHTML = `${now.names[0]}: <b>${n(a)}</b>. ${now.names[1]}: <b>${n(k)}</b>.${split ? ` Split: ${split}.` : ''} Over the long run the favourite wins this about <b>${pct(long)}</b> of the time: the dashed line.` +
        (worst > 1 ? ` Yet at one point here the underdog won <b>${worst} in a row</b>.` : '') + ' The better hand is a favourite, never a promise.'
      btn.disabled = false; btn.textContent = 'Deal another 1,000'
    }
    step()
  }
  $('[data-luck]').addEventListener('click', luck)
  el.querySelector('.luck-pick').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { pick(+b.dataset.m); luck() } })
  pick(0)

  return () => { luckRun = -1; io.disconnect(); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
}
