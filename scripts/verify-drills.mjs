#!/usr/bin/env node
// Drill checks: every `try` and `table` fence in every ready lesson. Exit code 1 on any failure.
//
// This is the poker equivalent of Chess Master's verify-puzzles.mjs, and it has the same standing rule:
// a drill the engine disagrees with is WRONG, not the engine. Fix the spot.
//
// But it is honest about the limit of that rule. Only two kinds of drill have a ground truth:
//
//   showdown / rank   the engine decides who wins. Nobody authors the answer, so nobody can author it
//                     wrong. These are VERIFIED.
//   legal             which of these may you do? legalActions() decides, so a rules drill can never
//                     drift out of step with the rules the app itself enforces. Also VERIFIED.
//   action / choice   "should you raise here?" is a judgement. There is no engine that settles it, and
//                     pretending otherwise would be the exact dishonesty this project is trying to
//                     avoid. These are checked for being well formed and then reported as UNVERIFIED.
//
// Every `table` fence is also built, because a spot that throws renders as an error box in the lesson.
// Every `rankings` fence — the hand rankings drawn as cards — is evaluated: each example must BE the
// hand its row names, and beat the row below. A "flush" that happens to be a straight flush would
// teach the wrong picture under the right word.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseFrontmatter, parseParams } from '../js/frontmatter.js'
import { spotFromParams, solveDrill } from '../js/spot.js'
import { allLessons, lessonPath } from '../js/curriculum.js'
import { parseCards, cardStr } from '../js/engine/cards.js'
import { parseRange, handToCell, cellName } from '../js/engine/ranges.js'
import { evaluate, describe, CATEGORY_NAMES, STRAIGHT_FLUSH } from '../js/engine/evaluator.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * An ante that does not post.
 *
 * `ante:` is the STYLE — 'each', 'bb' or 'none'. The AMOUNT is the third number in `blinds`. Declaring a
 * style without an amount is silently a no-ante table, which is the worst kind of wrong: the spot builds,
 * the drill passes, the caption says "with antes", and the table quietly shows a pot that is short by
 * every ante in it. Eight fences shipped that way in one session, and one lesson's arithmetic — "23,700
 * behind" after a 300 ante — depended on chips that were never posted.
 *
 * Writing `ante: 300` is the same mistake from the other end: it sets the style to the string "300".
 */
function anteProblem(p) {
  if (p.ante == null || p.ante === '') return null
  const style = String(p.ante).trim()
  const amount = Number(String(p.blinds || '').split('/')[2] || 0)
  if (/^[0-9]+$/.test(style)) {
    const [sb, bb] = String(p.blinds || '').split('/')
    return `\`ante: ${style}\` sets the ante STYLE to "${style}". The amount belongs in \`blinds\` as a third number — \`blinds: ${sb}/${bb}/${style}\` with \`ante: each\`.`
  }
  if (!['each', 'bb', 'none'].includes(style)) return `unknown ante style "${style}" — use each, bb or none`
  if (style !== 'none' && !(amount > 0)) {
    return `\`ante: ${style}\` but \`blinds: ${p.blinds}\` carries no ante amount, so nothing is posted. Write the amount as a third number, e.g. \`blinds: ${p.blinds}/100\`.`
  }
  return null
}
const VERBOSE = process.argv.includes('-v')
let fails = 0, verified = 0, unverified = 0, tables = 0, charted = 0, chartChecked = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }

const ENGINE_DECIDES = new Set(['showdown', 'rank', 'legal'])

/** Pull every fenced block of the given languages out of a markdown body. */
function fences(md, langs) {
  const out = []
  const re = /^```([a-z]+)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm
  let m
  while ((m = re.exec(md))) if (langs.includes(m[1])) out.push({ lang: m[1], text: m[2] })
  return out
}

const curriculum = JSON.parse(readFileSync(join(ROOT, 'content/curriculum.json'), 'utf8'))
const RFI_CHART = JSON.parse(readFileSync(join(ROOT, 'content/charts/rfi-9max.json'), 'utf8'))

for (const lesson of allLessons(curriculum)) {
  if (!lesson.ready) continue
  {
    const file = join(ROOT, lessonPath(lesson.dir, lesson.slug))
    if (!existsSync(file)) continue          // check-content.mjs reports this one
    const { body } = parseFrontmatter(readFileSync(file, 'utf8'))

    fences(body, ['table']).forEach((f, i) => {
      const where = `${lesson.dir}/${lesson.slug} table#${i}`
      tables++
      try {
        const params = parseParams(f.text)
        const ante = anteProblem(params)
        if (ante) bad(where, ante)
        const { state } = spotFromParams(params)
        if (VERBOSE) console.log(`ok    ${where} — ${state.seats.length}-handed, ${state.street}`)
      } catch (e) { bad(where, e.message) }
    })

    // a ```grid fence draws its own numbers from the engine, so all there is to get wrong is the mode
    fences(body, ['grid']).forEach((f, i) => {
      const p = parseParams(f.text)
      if (!['shapes', 'dealt', 'chart'].includes(p.show)) bad(`${lesson.dir}/${lesson.slug} grid#${i}`, `\`show: ${p.show}\` — use shapes, dealt or chart`)
      if (p.show === 'chart' && p.position && !RFI_CHART.positions.some(x => x.id === p.position)) bad(`${lesson.dir}/${lesson.slug} grid#${i}`, `\`position: ${p.position}\` is not a seat in the opening chart`)
    })

    fences(body, ['rankings']).forEach((f, i) => {
      const where = `${lesson.dir}/${lesson.slug} rankings#${i}`
      let prev = null
      for (const line of f.text.split('\n')) {
        if (!line.trim()) continue
        const [name, , spec] = line.split('|').map(s => (s || '').trim())
        let cards
        try { cards = parseCards(spec || '') } catch (e) { bad(where, `${name}: ${e.message}`); continue }
        if (cards.length !== 5) { bad(where, `${name}: ${cards.length} cards — a poker hand is exactly five`); continue }
        if (new Set(cards).size !== 5) { bad(where, `${name}: the same card twice in ${spec}`); continue }
        const ev = evaluate(cards)
        const want = /^royal flush$/i.test(name) ? STRAIGHT_FLUSH : CATEGORY_NAMES.findIndex(n => n.toLowerCase() === name.toLowerCase())
        if (want < 0) bad(where, `"${name}" is not a hand category (${CATEGORY_NAMES.join(', ')})`)
        else if (ev.cat !== want) bad(where, `the row says ${name} but ${spec} is ${describe(ev)}`)
        if (prev && !(prev.ev.score > ev.score)) bad(where, `${prev.name} (${prev.spec}) does not beat ${name} (${spec}) — rows go strongest first`)
        prev = { name, spec, ev }
        charted++
        if (VERBOSE) console.log(`ok    ${where} — ${name}: ${cards.map(cardStr).join(' ')} is ${describe(ev)}`)
      }
    })

    fences(body, ['try']).forEach((f, i) => {
      const where = `${lesson.dir}/${lesson.slug} try#${i}`
      const p = parseParams(f.text)
      // The cat in the corner says the hint on the first wrong answer. A drill without one leaves it
      // with nothing to say at exactly the moment it is meant to help.
      if (!p.hint || !String(p.hint).trim()) bad(where, 'every drill needs a `hint:` — the cat says it on the first wrong answer')
      else if (String(p.hint).length > 240) bad(where, `the hint is ${String(p.hint).length} characters; the cat's bubble reads well up to about 240`)
      const anteBad = anteProblem(p)
      if (anteBad) bad(where, anteBad)
      const kind = p.type || 'action'
      let solved
      try { solved = solveDrill(p) } catch (e) { return bad(where, e.message) }

      if (!p.ask) bad(where, 'no `ask` — the reader is given no question')

      if (ENGINE_DECIDES.has(kind)) {
        // An authored answer here is silently ignored by solveDrill, so the author would believe a
        // number is being checked that is not. Say so rather than letting it rot.
        if (p.answer) bad(where, `a ${kind} drill's answer comes from the engine; remove \`answer: ${p.answer}\` so it cannot drift out of step`)
        if (!p.why) bad(where, 'no `why` — a reader who guessed right still needs to know the reason')
        verified++
        if (VERBOSE) console.log(`ok    ${where} — ${kind}, engine says "${solved.options[solved.correct]}"`)
      } else {
        // The spot still has to be buildable even though the answer is a judgement.
        if (kind !== 'choice') {
          let built
          try { built = spotFromParams(p) } catch (e) { return bad(where, `spot will not build: ${e.message}`) }
          // AND, for an action drill, the hero must be the player to act.
          //
          // The answer is a judgement, but WHOSE TURN IT IS never is — the engine knows, and if it
          // disagrees with the question the drill is showing a table that does not match the words above
          // it. Three drills shipped in one session with the button in the wrong seat, two of them
          // asking "what do you do?" of a hero who had already folded. Every checker passed, because
          // none of them had ever asked this.
          if (kind === 'action') {
            const { state, hero } = built
            if (hero == null) bad(where, 'an action drill needs a `hero` — somebody has to be the one deciding')
            else if (state.result) bad(where, 'the hand is already over in this spot, so there is nothing to decide')
            else if (state.seats[hero] && state.seats[hero].folded) {
              bad(where, `the hero (seat ${hero}) has already folded in this spot — check the \`button\` seat and the \`actions\` list`)
            } else if (state.toAct !== hero) {
              bad(where, `it is seat ${state.toAct}'s turn, not the hero's (seat ${hero}). The table shown will not match the question — check the \`button\` seat against the \`actions\` list.`)
            }
            // `chart: CO` — an open-or-fold drill answered by the opening chart, which makes it VERIFIED:
            // the table must put the hero in that seat with everyone before them folded, and the answer
            // must be a raise exactly when the chart opens the hand there.
            if (p.chart) {
              const pos = RFI_CHART.positions.find(x => x.id === p.chart)
              const n = state.seats.length
              const seatOf = { 0: 'BTN', 1: 'SB', 3: 'UTG', 4: 'UTG1', 5: 'MP', 6: 'LJ', 7: 'HJ', 8: 'CO' }[(hero - state.button + n) % n]
              const entered = state.actions.some(a => a.type !== 'fold' && a.type !== 'post' && a.seat !== hero && !/blind|ante/.test(a.type))
              const cards = parseCards(p.hand || '')
              if (!pos) bad(where, `\`chart: ${p.chart}\` is not a seat in the opening chart`)
              else if (n !== 9) bad(where, `the opening chart is nine-handed; this table has ${n} seats`)
              else if (seatOf !== p.chart) bad(where, `\`chart: ${p.chart}\` but the hero sits ${seatOf || 'in the big blind'} at this table`)
              else if (entered) bad(where, 'somebody has already entered the pot, so the opening chart does not answer this')
              else if (cards.length !== 2) bad(where, 'a chart drill needs the hero\'s `hand`')
              else {
                const { i, j } = handToCell(cards[0], cards[1])
                const opens = parseRange(pos.range)[i * 13 + j] > 0
                const said = String(solved.options[solved.correct])
                if (opens !== /^raise/i.test(said)) bad(where, `the chart ${opens ? 'opens' : 'folds'} ${cellName(i, j)} from ${p.chart}, but the answer is "${said}"`)
                else { chartChecked++; if (VERBOSE) console.log(`ok    ${where} — chart: ${cellName(i, j)} ${opens ? 'opens' : 'folds'} from ${p.chart}`) }
              }
            }
          }
        }
        if (!p.why) bad(where, 'a judgement drill must say `why`, or the reader learns nothing from being right')
        if (p.chart) return
        unverified++
        if (VERBOSE) console.log(`note  ${where} — ${kind}, answer "${solved.options[solved.correct]}" is authored, not verified`)
      }
    })
  }
}

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${tables} table${tables === 1 ? '' : 's'} built, ` +
  `${verified} drill${verified === 1 ? '' : 's'} verified against the engine, ` +
  (charted ? `${charted} charted hand${charted === 1 ? '' : 's'} evaluated, ` : '') +
  (chartChecked ? `${chartChecked} open-or-fold drill${chartChecked === 1 ? '' : 's'} checked against the opening chart, ` : '') +
  `${unverified} judgement drill${unverified === 1 ? '' : 's'} checked but NOT verified`)
if (unverified && !fails) console.log('(a judgement drill has no ground truth — its answer is the author\'s opinion)')
process.exit(fails ? 1 : 0)
