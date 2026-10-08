// The game: ten spots from what the course teaches, scored, with an analysis at the end.
//
// The spots and their scoring live in js/game/spots.js, which has no DOM and is checked by
// scripts/game-test.mjs. This page only deals them out, takes the answers, and explains them.
//
// What the page must say, because the scoring rests on it: what scores each kind of spot (a chart, a
// solved equilibrium, pot odds, ICM), that the opening chart is not solver output, that bet size is not
// scored, and that "compared with folding" is the zero every EV is measured from.

import { gamePlan, makeSpot, gradeChoice, optionFor, GAME_LENGTH } from '../game/spots.js'
import { mountTable, mountHands } from '../table.js'
import { decisions, mathsAt, describeAction, boardNews, replay, stepChoice } from '../game/famous.js'
import { cardsGlyph, parseCards } from '../engine/cards.js'
import { avatarsForSeats } from '../avatars.js'
import { progress } from '../progress.js'
import { sound } from '../sound.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const sign = x => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100) / 100).toFixed(2)}`
const unitWord = u => u === 'bb' ? 'big blinds' : u

const SOURCES = [
  ['Open or fold', "this app's opening chart — written from general positional principles, not solver output, not GTO. Right is 100, wrong is 0. When raising is right, the size counts too: 2 to 3 big blinds (3.5 from the small blind) is full marks, and each big blind outside that costs 25 points — the rule the Bet sizing lesson teaches."],
  ['Shove or fold, call a shove', 'the heads-up push/fold equilibrium this app solved, and the EV against it. Heads-up and chips only.'],
  ['Catch a bluff on the river, call an all-in with a draw', 'pot odds against the range or hand the spot states. Exact: nothing can be bet afterwards.'],
  ['The bubble', 'ICM on the stated stacks and payouts. The shover\'s range is a stated assumption.'],
]

export async function mountGame(main) {
  document.title = 'Test yourself · Poker Master'
  const [rfi, pushfold] = await Promise.all([
    fetch('content/charts/rfi-9max.json').then(r => r.json()),
    fetch('content/charts/pushfold-hu.json').then(r => r.json()),
  ])
  const charts = { rfi, pushfold }
  // the famous hands: content/famous/, each checked by scripts/famous-test.mjs
  const famousIndex = await fetch('content/famous/index.json').then(r => r.json())
  const famous = await Promise.all(famousIndex.hands.map(id => fetch(`content/famous/${id}.json`).then(r => r.json())))

  main.innerHTML = `
    <div class="page tool game-page">
      <header class="hero">
        <span class="eyebrow">Tournament · game</span>
        <h1>Test yourself</h1>
        <p>Ten spots from what the course teaches, each scored by the maths behind it — or a famous hand, replayed one decision at a time.</p>
      </header>
      <div id="stage"></div>
    </div>`
  const stage = main.querySelector('#stage')
  let view = null, game = null, alive = true

  const dropTable = () => { if (view) { view.destroy(); view = null } }

  // --- the intro ---
  function intro() {
    dropTable()
    const past = progress.games.slice(-5).reverse()
    stage.innerHTML = `
      <section class="panel">
        <h2>How it is scored</h2>
        <p class="note">Each decision earns up to 100 points. The best play scores 100. Anything else loses points for what it gives up on average, compared with folding, against what the decision put at stake:</p>
        <p class="gm-formula">points = 100 × (1 − 2 × EV given up ÷ stake), never below 0</p>
        <p class="note">So a play that throws away a quarter of the stake on average scores 50, and half of it scores 0. Your score is the average of the ten.</p>
        <ul class="gm-sources">${SOURCES.map(([k, v]) => `<li><b>${esc(k)}</b> — scored by ${esc(v)}</li>`).join('')}</ul>
        <p class="note"><b>Dealt near the line.</b> The spots are dealt near the line on purpose — hands half inside and half outside a range, prices tuned so the answer could go either way — because that is where a decision is worth testing. So your score here is how well you play close spots, not your accuracy at a real table, where most decisions are easy.</p>
        <p class="note"><b>Bet size.</b> The size of an open is scored against the <a href="#/lesson/maths/bet-sizing">Bet sizing</a> lesson's rule — a rule from its sources, not a solved answer. Every other size is explained but not graded: scoring it would need a solver, which this app does not have.</p>
      </section>
      ${past.length ? `<section class="panel"><h2>Your last games</h2><p class="note">${past.map(g => `<b>${g.score}%</b> <span class="gm-when">${new Date(g.t).toLocaleDateString()}</span>`).join(' · ')}</p></section>` : ''}
      <div class="actions"><button class="btn primary" data-go="start">Start a game of ten spots</button></div>
      <section class="panel gm-famous">
        <h2>Famous hands</h2>
        <p class="note">Real hands from the World Series, replayed decision by decision. At each one you choose; then you see what the player really did, why, what each option would have meant, and the maths. <b>Not scored</b>: the players could see only their own cards, so most of these spots have no single right answer — and choosing differently from a world champion is how you find out what they were thinking.</p>
        <ul class="gm-hands">${famous.map((h, n) => `<li>
          <b>${esc(h.title)}</b><span class="gm-small">${esc(h.event)}</span>
          <p class="gm-small">${esc(h.blurb)}</p>
          <div class="actions">${Object.keys(h.play).map(seat => `<button class="btn" data-famous="${n}" data-seat="${seat}">Play as ${esc(h.seats[seat].name)}</button>`).join(' ')}</div>
        </li>`).join('')}</ul>
      </section>`
  }

  // --- a famous hand ---
  let rep = null
  function startFamous(n, seat) {
    const hand = famous[n]
    rep = { hand, seat, steps: decisions(hand, seat), frames: replay(hand).frames, i: 0, chose: [] }
    famousStep()
  }

  function famousStep() {
    dropTable()
    const { hand, seat, steps, frames, i } = rep
    const d = steps[i]
    // what happened since the last decision: the actions, and any cards dealt in between
    const from = i === 0 ? 0 : steps[i - 1].k
    const lines = []
    for (let j = from; j < Math.min(d.k, hand.actions.length); j++) {
      const before = frames[j], after = frames[j + 1] || replay(hand).end
      lines.push(esc(describeAction(hand, hand.actions[j], before)).replace(hand.seats[seat].name, `${hand.seats[seat].name} (you)`))
      for (const news of boardNews(before, after)) lines.push(`<b>${news.label}:</b> ${esc(cardsGlyph(news.cards))}`)
    }
    stage.innerHTML = `
      <div class="gm-head"><span class="eyebrow">${esc(hand.title)} · as ${esc(hand.seats[seat].name)} · decision ${i + 1} of ${steps.length}</span></div>
      ${i === 0 ? `<p class="gm-prompt">${esc(hand.play[seat].intro)}</p><ul class="gm-facts">${hand.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${lines.length ? `<ul class="gm-story">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
      <p class="gm-prompt">${esc(d.step.ask)}</p>
      <div class="gm-table"></div>
      <p class="gm-small gm-howto">Act with the buttons under the table — any size you like. Nothing is scored.</p>
      <div class="gm-result" aria-live="polite"></div>`
    view = mountTable(stage.querySelector('.gm-table'), {
      state: d.state, hero: seat, unknownChips: hand.unknown || undefined, interactive: true,
      onAction: a => famousAnswer(stepChoice(hand, d, a)),
      avatars: avatarsForSeats(hand.seats.length, { hero: seat }),
    })
  }

  function famousAnswer(choice) {
    const { hand, seat, steps, i } = rep
    const d = steps[i]
    if (rep.chose[i]) return
    rep.chose[i] = choice
    const id = choice.id
    sound.unlock()
    if (view) view.update({ interactive: false })
    const label = x => (d.step.options.find(o => o.id === x) || {}).label || x
    const canCheck = d.state.currentBet - d.state.seats[seat].committed <= 0
    const note = d.step.notes[id] || (id === 'fold' && canCheck ? 'Folding when you can check for free gives the pot away for nothing — checking costs no chips and keeps you in the hand.' : '')
    const m = mathsAt(hand, seat, d.state)
    const pct = x => `${(x * 100).toFixed(1)}%`
    const who = hand.seats[seat].name, them = hand.seats[1 - seat]
    const same = id === d.step.real
    // the same kind of action at a clearly different size: say so, rather than "the same as you"
    const sameKindOnly = same && !!choice.size && !/^About the size/.test(choice.size)
    const last = i === steps.length - 1
    stage.querySelector('.gm-result').innerHTML = `
      <div class="gm-explain">
        <p><b>You chose ${esc(choice.said)}.</b> ${sameKindOnly ? '' : esc(note)}</p>
        ${choice.size ? `<p class="gm-small">${esc(choice.size)}</p>` : ''}
        ${d.step.real ? `<p><b>${esc(who)} chose ${esc(label(d.step.real))}${sameKindOnly ? ' — the same kind of play as yours, at a different size' : same ? ' — the same as you' : ''}.</b> ${esc(d.step.why)}</p>`
                      : `<p><b>What happened next is disputed.</b> ${esc(hand.gap)} ${esc(d.step.why)}</p>`}
        <p class="gm-lesson"><b>The lesson:</b> ${esc(d.step.lesson)}</p>
        ${m.price ? `<p class="gm-small"><b>The price.</b> Calling costs ${m.price.toCall.toLocaleString('en')} to win ${m.price.pot.toLocaleString('en')}, so the call needs to win ${pct(m.price.need)} of the time.</p>` : ''}
        <p class="gm-small">${esc(them.name)}'s cards stay hidden until the hand is over — you decide with what ${esc(who)} could see.</p>
        ${!same && d.step.real ? `<p class="gm-small">The hand carries on as it really went.</p>` : ''}
      </div>
      <div class="actions"><button class="btn primary" data-go="${last ? 'fend' : 'fnext'}">${last ? 'See how it ended' : 'Next decision'}</button></div>`
  }

  function famousEnd() {
    dropTable()
    const { hand, seat, steps } = rep
    const them = hand.seats[1 - seat]
    const end = replay(hand).end
    const label = (d, x) => (d.step.options.find(o => o.id === x) || {}).label || x
    stage.innerHTML = `
      <div class="gm-head"><span class="eyebrow">${esc(hand.title)} · how it ended</span></div>
      <div class="gm-table"></div>
      <p class="gm-prompt">${esc(hand.ending)}</p>
      <p class="gm-prompt">${esc(them.name)} held <b>${esc(cardsGlyph(parseCards(them.hole)))}</b>.</p>
      <h2 class="gm-h2">Your choices, and what you were really up against</h2>
      <ol class="gm-review">${steps.map((d, n) => {
        const m = mathsAt(hand, seat, d.state)
        return `<li class="${rep.chose[n].id === d.step.real ? 'good' : 'other'}">
        <p class="gm-small">${esc(d.step.ask)}</p>
        <p>You: <b>${esc(rep.chose[n].said)}</b> · ${esc(hand.seats[seat].name)}: <b>${d.step.real ? esc(label(d, d.step.real)) : 'disputed — see above'}</b></p>
        <p class="gm-small"><b>With hindsight:</b> against ${esc(cardsGlyph(parseCards(them.hole)))}, your hand was winning ${m.exact ? '' : 'about '}${(m.equity * 100).toFixed(1)}% of the time at this point${m.exact ? ', every remaining card counted' : ''}.${m.price ? ` The call needed ${(m.price.need * 100).toFixed(1)}%.` : ''}</p>
        <p class="gm-small">${esc(d.step.lesson)}</p></li>`
      }).join('')}</ol>
      <details class="more gm-howknow"><summary>How we know this hand</summary><div class="more-body">
        <ul>${hand.sources.map(src => `<li>${esc(src.what)} — <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.by)}</a></li>`).join('')}</ul>
        ${hand.conflicts.length ? `<p class="gm-small"><b>Where the sources disagree, and what we did:</b></p><ul>${hand.conflicts.map(c => `<li class="gm-small">${esc(c)}</li>`).join('')}</ul>` : ''}
      </div></details>
      <div class="actions"><button class="btn primary" data-go="intro">Back to the game</button></div>`
    const host = stage.querySelector('.gm-table')
    if (hand.gap) {
      // the betting after the gap is not recorded, so the end is shown as cards only — no chips invented
      const names = hand.seats.map(x => x.name)
      view = mountHands(host, { board: parseCards(hand.board), hands: hand.seats.map(x => parseCards(x.hole)), caption: names.map((nm, k) => `${String.fromCharCode(65 + k)} — ${nm}`).join(' · ') })
    } else {
      view = mountTable(host, { state: end, hero: seat, reveal: true, unknownChips: hand.unknown || undefined, avatars: avatarsForSeats(hand.seats.length, { hero: seat }) })
    }
    window.scrollTo({ top: 0 })
  }

  // --- a game ---
  function start() {
    const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0
    game = { seed, plan: gamePlan(seed), spots: [], answers: [], k: 0 }
    show()
  }

  function show() {
    dropTable()
    const k = game.k
    stage.innerHTML = `<p class="note">Dealing…</p>`
    // build on the next tick so "Dealing…" paints first: a spot takes a few dozen milliseconds
    setTimeout(() => {
      if (!alive) return
      const p = game.plan[k]
      const spot = game.spots[k] || (game.spots[k] = makeSpot(p.type, p.seed, charts))
      const done = game.answers.filter(a => a.points != null)
      const running = done.length ? Math.round(done.reduce((s, a) => s + a.points, 0) / done.length) : null
      stage.innerHTML = `
        <div class="gm-head"><span class="eyebrow">Spot ${k + 1} of ${GAME_LENGTH} · ${esc(spot.title)}</span>${running != null ? `<span class="gm-running">${running}% so far</span>` : ''}</div>
        <p class="gm-prompt">${esc(spot.prompt)}</p>
        <ul class="gm-facts">${spot.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="gm-table"></div>
        <p class="gm-small gm-howto">Act with the buttons under the table — fold, call, or raise with the slider. An open's size is scored; other sizes are explained, not graded.</p>
        <div class="gm-result" aria-live="polite"></div>`
      // the table's own controls: whatever you do is turned into the decision the spot scores
      view = mountTable(stage.querySelector('.gm-table'), {
        state: spot.state, hero: spot.hero, interactive: true,
        onAction: a => answer(optionFor(spot, a)),
        avatars: avatarsForSeats(spot.state.seats.length, { hero: spot.hero }),
      })
    }, 30)
  }

  function answer(choice) {
    const k = game.k, spot = game.spots[k]
    if (!spot || game.answers[k]) return
    const id = choice.id
    const g = gradeChoice(spot, choice)
    game.answers[k] = { id, said: choice.said, size: choice.size, why: choice.why, ...g }
    if (view) view.update({ interactive: false })
    sound.unlock()
    if (g.best) sound.play('success')
    // the trainers' topic keys where the skill is the same, so a weakness shows once wherever it was drilled
    if (g.points != null) progress.recordDrill(`game#${game.seed}#${k}`, { firstAttempt: true, topic: spot.topic, correct: g.points >= 90 })
    const bestLabel = spot.options.filter(o => spot.best.includes(o.id)).map(o => o.label).join(' or ')
    const last = k === GAME_LENGTH - 1
    stage.querySelector('.gm-result').innerHTML = `
      <p class="verdict ${g.points == null ? '' : g.best ? 'good' : 'bad'}">You: <b>${esc(choice.said)}</b>. ${g.points == null ? `Not scored — ${esc(choice.why)} The best of the scored plays: ${esc(bestLabel)}.` : `${g.best ? 'Best play' : g.sizeOff ? `Right to raise — the size was outside ${g.band[0]}–${g.band[1]} big blinds` : `The best play was ${esc(bestLabel)}`} — <b>${g.points} points</b>.`}</p>
      ${choice.size ? `<p class="gm-small">${esc(choice.size)}</p>` : ''}
      <div class="actions"><button class="btn primary" data-go="${last ? 'finish' : 'next'}">${last ? 'See your analysis' : 'Next spot'}</button></div>`
  }

  // --- the analysis ---
  function finish() {
    dropTable()
    const scored = game.answers.filter(a => a.points != null)
    const score = scored.length ? Math.round(scored.reduce((s, a) => s + a.points, 0) / scored.length) : 0
    const unscored = GAME_LENGTH - scored.length
    const bestCount = game.answers.filter(a => a.best).length
    progress.recordGame({ score, spots: GAME_LENGTH })
    // the weakest kind of spot, as a next step
    const byTitle = {}
    game.spots.forEach((s, k) => { if (game.answers[k].points != null) (byTitle[s.title] = byTitle[s.title] || { pts: [], lesson: s.lesson }).pts.push(game.answers[k].points) })
    const worst = Object.entries(byTitle).map(([t, v]) => ({ t, avg: v.pts.reduce((a, b) => a + b, 0) / v.pts.length, lesson: v.lesson })).sort((a, b) => a.avg - b.avg)[0]
    stage.innerHTML = `
      <section class="gm-score">
        <span class="eyebrow">Your score</span>
        <div class="gm-big">${score}%</div>
        <p class="note">These spots were dealt near the line, so this measures close decisions, not your accuracy at a real table, where most decisions are easy.</p>
        <p class="note">The best play in ${bestCount} of ${GAME_LENGTH} spots${unscored ? ` (${unscored} not scored — see below)` : ''}.${worst && worst.avg < 100 ? ` Your weakest kind of spot: <b>${esc(worst.t)}</b>, ${Math.round(worst.avg)} points. To go over it: <a href="${worst.lesson.href}">${esc(worst.lesson.title)}</a>.` : ' Every spot played the best way.'}</p>
      </section>
      <h2 class="gm-h2">The analysis</h2>
      <ol class="gm-review">${game.spots.map((s, k) => review(s, game.answers[k], k)).join('')}</ol>
      <div class="actions"><button class="btn primary" data-go="start">Play another game</button> <button class="btn" data-go="intro">How it is scored</button></div>`
    window.scrollTo({ top: 0 })
  }

  function review(s, a, k) {
    const lab = id => (s.options.find(o => o.id === id) || {}).label || id
    const evRows = s.ev
      ? `<div class="grinder-only"><table class="gm-ev"><tbody>${s.options.map(o => `<tr class="${s.best.includes(o.id) ? 'best' : ''}${o.id === a.id ? ' mine' : ''}"><td>${esc(o.label)}</td><td class="num">${o.id === 'fold' ? '0 (the zero)' : `${sign(s.ev[o.id])} ${esc(unitWord(s.unit))}`}</td></tr>`).join('')}</tbody></table>
         <p class="gm-small">On average, compared with folding. At stake: ${Math.round(s.stake * 100) / 100} ${esc(unitWord(s.unit))}.</p></div>`
      : ''
    return `<li class="${a.points == null ? 'other' : a.best ? 'good' : 'bad'}">
      <div class="gm-rhead"><b>${k + 1}. ${esc(s.title)}</b><span class="gm-pts">${a.points == null ? 'not scored' : `${a.points} points`}</span></div>
      <p class="gm-small">${esc(s.prompt)}</p>
      <p>You: <b>${esc(a.said || lab(a.id))}</b>${a.best ? ' — the best play.' : a.sizeOff ? ` · Right to raise; the best size is ${a.band[0]}–${a.band[1]} big blinds.` : ` · Best: <b>${esc(s.best.map(lab).join(' or '))}</b>`}</p>
      ${a.why ? `<p class="gm-small">Not scored: ${esc(a.why)}</p>` : ''}
      ${a.size ? `<p class="gm-small">${esc(a.size)}</p>` : ''}
      ${evRows}
      <p>${esc(s.answer)}</p>
      <p class="gm-small">Scored by ${esc(s.scoredBy)}. Learn it: <a href="${s.lesson.href}">${esc(s.lesson.title)}</a>.</p>
    </li>`
  }

  stage.addEventListener('click', e => {
    const fh = e.target.closest('[data-famous]')
    if (fh) return startFamous(Number(fh.dataset.famous), Number(fh.dataset.seat))
    const fo = e.target.closest('[data-fopt]')
    if (fo) return famousAnswer(fo.dataset.fopt)
    const o = e.target.closest('[data-opt]')
    if (o) return answer(o.dataset.opt)
    const b = e.target.closest('[data-go]')
    if (!b) return
    const go = b.dataset.go
    if (go === 'start') start()
    else if (go === 'next') { game.k++; show() }
    else if (go === 'finish') finish()
    else if (go === 'intro') intro()
    else if (go === 'fnext') { rep.i++; famousStep() }
    else if (go === 'fend') famousEnd()
  })

  intro()
  return { destroy() { alive = false; dropTable() } }
}
