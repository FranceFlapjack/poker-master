// The home page's story: poker told in short scenes on the dark navy ground, before the course. Modelled on
// Chess Master's story home (2026-10-27) at the owner's request, 2026-10-28: the site stays light, the entry
// is dark; one highlight, brass gold; every number is computed by this app (js/story-facts.js, checked by
// scripts/engine-test.mjs) or sourced on the page.
//
// Each scene rises in as it reaches the screen and only then starts its own animation; everything stops
// when the page is left (the returned function), and reduced motion gets the finished pictures, still.
import { makeDeck, shuffle, rankOf, suitOf, isRed, RANKS, SUIT_GLYPH, parseCards } from './engine/cards.js'
import { handToCell } from './engine/ranges.js'
import { COUNTS, SHAPES, ODDS, gridAgainst } from './story-facts.js'

const RANK_WORD = { T: '10' }
const rk = r => RANK_WORD[r] || r
/** "32o" → "3-2 offsuit", "AA" → "A-A", "76s" → "7-6 suited". */
export const handWords = name => name.length === 2 ? `${rk(name[0])}-${rk(name[1])}` : `${rk(name[0])}-${rk(name[1])} ${name[2] === 's' ? 'suited' : 'offsuit'}`
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`
const n = x => x.toLocaleString('en-US')

/** A card in hairlines, as on the welcome: rank and suit where the table draws them. */
const cardFace = c => `<svg class="sc-svg" viewBox="-1 -1 74 102" aria-hidden="true"><rect class="sc-edge" width="72" height="100" rx="6"/>
  <g class="${isRed(c) ? 'sc-red' : 'sc-ink'}"><text x="36" y="42" font-size="34">${rk(RANKS[rankOf(c)])}</text><text x="36" y="81" font-size="31">${SUIT_GLYPH[suitOf(c)]}</text></g></svg>`
const turnCard = c => `<div class="sc"><div class="sc-turn"><div class="sc-side sc-back"></div><div class="sc-side sc-front">${cardFace(c)}</div></div></div>`

/** `cta`: { href, label, today, secondary: { href, label } } — decided by the app (start or continue). `grinder`: the mode switch. */
export function mountStory(el, { cta, grinder = false }) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let dead = false
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const grid1 = gridAgainst(1)
  const famous = parseCards('Ks 7h'), famousBoard = parseCards('9s 2d 6s 8s 3h')
  el.className = 'story'
  el.innerHTML = `
    <section class="story-scene story-hero">
      <div class="story-copy">
        <p class="story-kicker">A course in no-limit hold’em</p>
        <h1 class="story-title">52 cards.<br>${n(COUNTS.starting)} hands.<br><em>One decision at a time.</em></h1>
        <p class="story-lead">Two cards of your own, five to share, and a bet at every turn. Scroll to see what is in it, or start right now.</p>
        <div class="story-cta"><a class="btn primary" href="${cta.href}">${cta.label}</a>${cta.secondary ? `<a class="btn" href="${cta.secondary.href}">${cta.secondary.label}</a>` : ''}</div>
      </div>
      <figure class="story-figure">
        <div class="story-deal" id="story-deal"></div>
        <figcaption id="story-deal-text"></figcaption>
        <button class="btn story-again" id="story-again" type="button">Deal again</button>
      </figure>
    </section>

    <section class="story-scene">
      <p class="story-kicker">1 · Possibilities</p>
      <h2 class="story-h">From 52 cards, <em>millions of hands.</em></h2>
      <ol class="story-count">${[[COUNTS.cards, 'cards in the deck'], [COUNTS.starting, 'two-card hands you can be dealt'], [COUNTS.flops, 'flops that can come with any one of them'], [COUNTS.fiveCard, 'five-card poker hands']].map(([v, what]) =>
        `<li><b data-n="${v}">${n(v)}</b><i style="--w:${(Math.log10(v) / Math.log10(COUNTS.fiveCard)).toFixed(3)}"></i><span>${what}</span></li>`).join('')}</ol>
      <p class="story-body story-after">But only <b>169</b> kinds of starting hand: ${SHAPES.pair.cells} pairs, ${SHAPES.suited.cells} suited and ${SHAPES.offsuit.cells} offsuit${grinder ? ` — ${SHAPES.pair.combos}, ${SHAPES.suited.combos} and ${n(SHAPES.offsuit.combos)} combinations` : ''}. They fit on one grid.</p>
      <p class="story-src">Counted, not looked up: these are combinations, worked out by this page.</p>
    </section>

    <section class="story-scene story-split">
      <div>
        <p class="story-kicker">2 · The 169</p>
        <h2 class="story-h">Every starting hand, <em>on one grid.</em></h2>
        <p class="story-body" id="story-grid-text"></p>
        <div class="story-chips" role="group" aria-label="Players against you" id="story-opp">${[1, 2, 3, 4, 5, 6, 7, 8].map(k => `<button class="story-chip${k === 1 ? ' on' : ''}" data-k="${k}" aria-pressed="${k === 1}">${k}</button>`).join('')}</div>
        <p class="story-hint">Players against you. The brighter the square, the more often that hand wins.</p>
      </div>
      <div class="story-grid" id="story-grid"></div>
    </section>

    <section class="story-scene">
      <p class="story-kicker">3 · Odds you can feel</p>
      <h2 class="story-h">How often, <em>really?</em></h2>
      <ol class="story-count story-odds">${[
        [`1 in ${Math.round(ODDS.aces)}`, 1 / ODDS.aces, 'you are dealt two aces'],
        [`1 in ${Math.round(ODDS.pair)}`, 1 / ODDS.pair, 'you are dealt a pair, any pair'],
        [pct(ODDS.flushDraw, 0), ODDS.flushDraw, 'four cards to a flush on the flop makes the flush by the river'],
        [pct(ODDS.acesVsKings), ODDS.acesVsKings, 'aces beat kings, all in before the flop'],
      ].map(([big, p, what]) => `<li><b>${big}</b><i style="--w:${p.toFixed(4)}"></i><span>${what}</span></li>`).join('')}</ol>
      <p class="story-src">Computed by this app: the dealing odds by counting, the flush draw from its nine outs, and aces against kings (A♠A♥ against K♠K♥) over all ${n(1712304)} boards.</p>
    </section>

    <section class="story-scene story-split">
      <div>
        <p class="story-kicker">4 · A famous hand</p>
        <h2 class="story-h">King-high, <em>for the world title.</em></h2>
        <p class="story-body">The 2003 World Series main event, heads-up. Chris Moneymaker, an amateur who qualified online, holds king-seven: no pair, and no draw left. Across the table, Sam Farha, one of the most feared players in the game. The river is dealt. What would you do?</p>
        <div class="story-cta"><a class="btn" href="#/tools/game">Play the hand →</a></div>
      </div>
      <figure class="story-figure story-famous">
        <div class="story-row" aria-label="Moneymaker's cards: king of spades, seven of hearts">${famous.map(cardFace).join('')}</div>
        <div class="story-row story-board" aria-label="The board: nine of spades, two of diamonds, six of spades, eight of spades, three of hearts">${famousBoard.map(cardFace).join('')}</div>
        <figcaption>His two cards, and the board. Farha’s cards stay hidden, as they did for him.</figcaption>
      </figure>
    </section>

    <section class="story-scene">
      <p class="story-kicker">5 · The story so far</p>
      <h2 class="story-h">Since 1970, <em>five moments.</em></h2>
      <ol class="story-time">
        <li><b>1970</b><span>Las Vegas: the first World Series of Poker, at Binion’s Horseshoe. Its champion, Johnny Moss, is voted in by the players.</span></li>
        <li><b>2003</b><span>Chris Moneymaker, who qualified online, wins the main event. It grows from 839 players that year to 8,773 by 2006.</span></li>
        <li><b>2017</b><span>Pittsburgh: Libratus, from Carnegie Mellon, beats four top pros heads-up over 120,000 hands.</span></li>
        <li><b>2019</b><span>Pluribus, from Carnegie Mellon and Facebook’s AI lab, beats professionals at a six-player table.</span></li>
        <li><b>Today</b><span>You. <a href="${cta.href}">${cta.today}</a>.</span></li>
      </ol>
      <p class="story-src">Sources: Wikipedia, “World Series of Poker”, “Libratus” and “Pluribus (poker bot)” (CC BY-SA); the 2003 hand from PokerNews and CardPlayer, credited on its replay. Starting-hand odds simulated by this app (scripts/build-preflop-strength.mjs): each hand against random hands, all five board cards to come, accurate to about a percentage point.</p>
    </section>`
  const $ = s => el.querySelector(s)

  // scenes rise in as they arrive, and start their own motion then
  const starts = new Map()
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return
    e.target.classList.add('story-in')
    const go = starts.get(e.target); if (go) { starts.delete(e.target); go() }
  }), { threshold: 0.2 })
  const scenes = [...el.querySelectorAll('.story-scene')]
  scenes.forEach(s => io.observe(s))
  setTimeout(() => scenes[0].classList.add('story-in'), 30)   // the first screen never waits for the observer (or for a frame: background tabs get none)

  // hero: two cards from a real shuffle, turned face up; where that hand stands among the 169
  let deck = []
  const deal = async () => {
    if (deck.length < 2) deck = shuffle(makeDeck())
    const hand = [deck.pop(), deck.pop()]
    const { i, j } = handToCell(hand[0], hand[1])
    const cell = grid1.find(c => c.i === i && c.j === j)
    $('#story-deal').innerHTML = hand.map(turnCard).join('')
    $('#story-deal-text').innerHTML = `<b>1</b> of ${n(COUNTS.starting)} starting hands: <span>${handWords(cell.name)}, number ${cell.rank} of 169 against one player.</span>`
    const cards = [...el.querySelectorAll('#story-deal .sc')]
    if (still) { cards.forEach(c => c.classList.add('up')); return }
    for (const c of cards) { await wait(260); if (dead) return; c.classList.add('up') }
  }
  starts.set(scenes[0], deal)
  $('#story-again').addEventListener('click', deal)

  // 1: count up to the exact numbers, the bars growing on a log scale
  starts.set(scenes[1], () => {
    if (still) return
    scenes[1].querySelectorAll('.story-count b').forEach((b, k) => {
      const v = +b.dataset.n, t0 = performance.now() + k * 300
      const tick = now => { if (dead) return; const p = Math.min(1, Math.max(0, (now - t0) / 1300)); b.textContent = n(Math.round(v * (1 - (1 - p) ** 3))); if (p < 1) requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
  })

  // 2: the grid as a heatmap of each hand's chance against 1–8 players
  const grid = k => {
    const cells = gridAgainst(k)
    const lo = Math.min(...cells.map(c => c.equity)), hi = Math.max(...cells.map(c => c.equity))
    const best = cells.find(c => c.rank === 1), worst = cells.find(c => c.rank === 169)
    const sc = cells.find(c => c.name === '76s'), sc1 = grid1.find(c => c.name === '76s')
    $('#story-grid').innerHTML = `<svg class="sg" viewBox="0 0 13 13" role="img" aria-label="The 169 starting hands against ${k} ${k === 1 ? 'player' : 'players'}. Best: ${handWords(best.name)}, ${pct(best.equity, 0)}. Worst: ${handWords(worst.name)}, ${pct(worst.equity, 0)}.">${cells.map(c => {
      const v = ((c.equity - lo) / (hi - lo)) ** 2   // squared: most hands stay dark and the strong ones stand out, instead of a wash of half-tones
      return `<g class="${v > 0.55 ? 'sg-hot' : ''}"><rect class="sg-sq" style="--v:${v.toFixed(3)}" x="${c.j + .04}" y="${c.i + .04}" width=".92" height=".92"><title>${handWords(c.name)}: ${pct(c.equity)}, number ${c.rank} of 169</title></rect>` +
        `<text class="sg-name" x="${c.j + .5}" y="${c.i + (grinder ? .4 : .5)}">${c.name}</text>${grinder ? `<text class="sg-num" x="${c.j + .5}" y="${c.i + .72}">${Math.round(c.equity * 100)}</text>` : ''}</g>`
    }).join('')}</svg>`
    $('#story-grid-text').textContent = (k === 1
      ? `Against one player, aces win about ${pct(best.equity, 0)} of the time. The weakest hand is not 7-2, the one with the bad name: it is ${handWords(worst.name)}, at ${pct(worst.equity, 0)}.`
      : `Against ${k} players, aces still lead, at about ${pct(best.equity, 0)}; the weakest is ${handWords(worst.name)}, at ${pct(worst.equity, 0)}. ${handWords('76s')} climbs from number ${sc1.rank} to number ${sc.rank}: with more players in, the hands that make straights and flushes gain.`)
      + (grinder ? ' Each square: its equity in per cent, ties counted as half.' : '')
  }
  const opp = $('#story-opp')
  opp.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return
    opp.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b) })
    grid(+b.dataset.k)
  })
  grid(1)

  return () => { dead = true; io.disconnect() }
}
