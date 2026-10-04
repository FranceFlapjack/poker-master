// The game: ten spots from what the course teaches, scored, with an analysis at the end.
//
// The spots and their scoring live in js/game/spots.js, which has no DOM and is checked by
// scripts/game-test.mjs. This page only deals them out, takes the answers, and explains them.
//
// What the page must say, because the scoring rests on it: what scores each kind of spot (a chart, a
// solved equilibrium, pot odds, ICM), that the opening chart is not solver output, that bet size is not
// scored, and that "compared with folding" is the zero every EV is measured from.

import { gamePlan, makeSpot, grade, GAME_LENGTH } from '../game/spots.js'
import { mountTable } from '../table.js'
import { avatarsForSeats } from '../avatars.js'
import { progress } from '../progress.js'
import { sound } from '../sound.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const sign = x => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100) / 100).toFixed(2)}`
const unitWord = u => u === 'bb' ? 'big blinds' : u

const SOURCES = [
  ['Open or fold', "this app's opening chart — written from general positional principles, not solver output, not GTO. Right is 100, wrong is 0."],
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

  main.innerHTML = `
    <div class="page tool game-page">
      <header class="hero">
        <span class="eyebrow">Tournament · game</span>
        <h1>Test yourself</h1>
        <p>Ten spots from what the course teaches, each scored by the maths behind it. Play the right move every time and you score 100%.</p>
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
        <p class="note"><b>Not scored: bet size.</b> No lesson teaches a sizing rule and the app has no solver, so opens are offered at one size, 2.5 big blinds, and the size is never graded.</p>
      </section>
      ${past.length ? `<section class="panel"><h2>Your last games</h2><p class="note">${past.map(g => `<b>${g.score}%</b> <span class="gm-when">${new Date(g.t).toLocaleDateString()}</span>`).join(' · ')}</p></section>` : ''}
      <div class="actions"><button class="btn primary" data-go="start">Start a game</button></div>`
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
        <div class="gm-table"></div>
        <p class="gm-prompt">${esc(spot.prompt)}</p>
        <ul class="gm-facts">${spot.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="gm-opts">${spot.options.map((o, i) => `<button class="opt" data-opt="${o.id}"><span class="mark">${String.fromCharCode(65 + i)}</span><span class="t">${esc(o.label)}${o.note ? `<small>${esc(o.note)}</small>` : ''}</span></button>`).join('')}</div>
        <div class="gm-result" aria-live="polite"></div>`
      view = mountTable(stage.querySelector('.gm-table'), {
        state: spot.state, hero: spot.hero,
        avatars: avatarsForSeats(spot.state.seats.length, { hero: spot.hero }),
      })
    }, 30)
  }

  function answer(id) {
    const k = game.k, spot = game.spots[k]
    if (!spot || game.answers[k]) return
    const g = grade(spot, id)
    game.answers[k] = { id, ...g }
    sound.unlock()
    if (g.best) sound.play('success')
    // the trainers' topic keys where the skill is the same, so a weakness shows once wherever it was drilled
    if (g.points != null) progress.recordDrill(`game#${game.seed}#${k}`, { firstAttempt: true, topic: spot.topic, correct: g.points >= 90 })
    progress.recordHand()
    stage.querySelectorAll('.gm-opts .opt').forEach(b => {
      b.disabled = true
      if (spot.best.includes(b.dataset.opt)) b.classList.add('right')
      else if (b.dataset.opt === id) b.classList.add('wrong')
    })
    const bestLabel = spot.options.filter(o => spot.best.includes(o.id)).map(o => o.label).join(' or ')
    const last = k === GAME_LENGTH - 1
    stage.querySelector('.gm-result').innerHTML = `
      <p class="verdict ${g.best ? 'good' : 'bad'}">${g.best ? 'Best play' : `The best play was ${esc(bestLabel)}`} — <b>${g.points} points</b>.</p>
      <div class="actions"><button class="btn primary" data-go="${last ? 'finish' : 'next'}">${last ? 'See your analysis' : 'Next spot'}</button></div>`
  }

  // --- the analysis ---
  function finish() {
    dropTable()
    const scored = game.answers.filter(a => a.points != null)
    const score = Math.round(scored.reduce((s, a) => s + a.points, 0) / scored.length)
    const bestCount = game.answers.filter(a => a.best).length
    progress.recordGame({ score, spots: GAME_LENGTH })
    // the weakest kind of spot, as a next step
    const byTitle = {}
    game.spots.forEach((s, k) => { (byTitle[s.title] = byTitle[s.title] || { pts: [], lesson: s.lesson }).pts.push(game.answers[k].points) })
    const worst = Object.entries(byTitle).map(([t, v]) => ({ t, avg: v.pts.reduce((a, b) => a + b, 0) / v.pts.length, lesson: v.lesson })).sort((a, b) => a.avg - b.avg)[0]
    stage.innerHTML = `
      <section class="gm-score">
        <span class="eyebrow">Your score</span>
        <div class="gm-big">${score}%</div>
        <p class="note">The best play in ${bestCount} of ${GAME_LENGTH} spots.${worst && worst.avg < 100 ? ` Your weakest kind of spot: <b>${esc(worst.t)}</b>, ${Math.round(worst.avg)} points. To go over it: <a href="${worst.lesson.href}">${esc(worst.lesson.title)}</a>.` : ' Every spot played the best way.'}</p>
      </section>
      <h2 class="gm-h2">The analysis</h2>
      <ol class="gm-review">${game.spots.map((s, k) => review(s, game.answers[k], k)).join('')}</ol>
      <div class="actions"><button class="btn primary" data-go="start">Play another game</button> <button class="btn" data-go="intro">How it is scored</button></div>`
    window.scrollTo({ top: 0 })
  }

  function review(s, a, k) {
    const lab = id => (s.options.find(o => o.id === id) || {}).label || id
    const evRows = s.ev
      ? `<table class="gm-ev"><tbody>${s.options.map(o => `<tr class="${s.best.includes(o.id) ? 'best' : ''}${o.id === a.id ? ' mine' : ''}"><td>${esc(o.label)}</td><td class="num">${o.id === 'fold' ? '0 (the zero)' : `${sign(s.ev[o.id])} ${esc(unitWord(s.unit))}`}</td></tr>`).join('')}</tbody></table>
         <p class="gm-small">On average, compared with folding. At stake: ${Math.round(s.stake * 100) / 100} ${esc(unitWord(s.unit))}.</p>`
      : ''
    return `<li class="${a.best ? 'good' : 'bad'}">
      <div class="gm-rhead"><b>${k + 1}. ${esc(s.title)}</b><span class="gm-pts">${a.points} points</span></div>
      <p class="gm-small">${esc(s.prompt)}</p>
      <p>You: <b>${esc(lab(a.id))}</b>${a.best ? ' — the best play.' : ` · Best: <b>${esc(s.best.map(lab).join(' or '))}</b>`}</p>
      ${evRows}
      <p>${esc(s.answer)}</p>
      <p class="gm-small">Scored by ${esc(s.scoredBy)}. Learn it: <a href="${s.lesson.href}">${esc(s.lesson.title)}</a>.</p>
    </li>`
  }

  stage.addEventListener('click', e => {
    const o = e.target.closest('[data-opt]')
    if (o) return answer(o.dataset.opt)
    const b = e.target.closest('[data-go]')
    if (!b) return
    const go = b.dataset.go
    if (go === 'start') start()
    else if (go === 'next') { game.k++; show() }
    else if (go === 'finish') finish()
    else if (go === 'intro') intro()
  })

  intro()
  return { destroy() { alive = false; dropTable() } }
}
