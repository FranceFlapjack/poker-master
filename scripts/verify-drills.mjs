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
//   action / choice   "should you raise here?" is a judgement. There is no engine that settles it, and
//                     pretending otherwise would be the exact dishonesty this project is trying to
//                     avoid. These are checked for being well formed and then reported as UNVERIFIED.
//
// Every `table` fence is also built, because a spot that throws renders as an error box in the lesson.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseFrontmatter, parseParams } from '../js/frontmatter.js'
import { spotFromParams, solveDrill } from '../js/spot.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VERBOSE = process.argv.includes('-v')
let fails = 0, verified = 0, unverified = 0, tables = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }

const ENGINE_DECIDES = new Set(['showdown', 'rank'])

/** Pull every fenced block of the given languages out of a markdown body. */
function fences(md, langs) {
  const out = []
  const re = /^```([a-z]+)[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm
  let m
  while ((m = re.exec(md))) if (langs.includes(m[1])) out.push({ lang: m[1], text: m[2] })
  return out
}

const curriculum = JSON.parse(readFileSync(join(ROOT, 'content/curriculum.json'), 'utf8'))

for (const track of curriculum.tracks) {
  for (const lesson of track.lessons) {
    if (!lesson.ready) continue
    const file = join(ROOT, 'content/lessons', track.id, `${lesson.slug}.md`)
    if (!existsSync(file)) continue          // check-content.mjs reports this one
    const { body } = parseFrontmatter(readFileSync(file, 'utf8'))

    fences(body, ['table']).forEach((f, i) => {
      const where = `${track.id}/${lesson.slug} table#${i}`
      tables++
      try {
        const { state } = spotFromParams(parseParams(f.text))
        if (VERBOSE) console.log(`ok    ${where} — ${state.seats.length}-handed, ${state.street}`)
      } catch (e) { bad(where, e.message) }
    })

    fences(body, ['try']).forEach((f, i) => {
      const where = `${track.id}/${lesson.slug} try#${i}`
      const p = parseParams(f.text)
      const kind = p.type || 'action'
      let solved
      try { solved = solveDrill(p) } catch (e) { return bad(where, e.message) }

      if (!p.ask) bad(where, 'no `ask` — the reader is given no question')

      if (ENGINE_DECIDES.has(kind)) {
        // An authored answer here is silently ignored by solveDrill, so the author would believe a
        // number is being checked that is not. Say so rather than letting it rot.
        if (p.answer) bad(where, `a ${kind} drill's answer comes from the engine; remove \`answer: ${p.answer}\` so it cannot drift out of step`)
        verified++
        if (VERBOSE) console.log(`ok    ${where} — ${kind}, engine says "${solved.options[solved.correct]}"`)
      } else {
        // The spot still has to be buildable even though the answer is a judgement.
        if (kind !== 'choice') {
          try { spotFromParams(p) } catch (e) { return bad(where, `spot will not build: ${e.message}`) }
        }
        if (!p.why) bad(where, 'a judgement drill must say `why`, or the reader learns nothing from being right')
        unverified++
        if (VERBOSE) console.log(`note  ${where} — ${kind}, answer "${solved.options[solved.correct]}" is authored, not verified`)
      }
    })
  }
}

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${tables} table${tables === 1 ? '' : 's'} built, ` +
  `${verified} drill${verified === 1 ? '' : 's'} verified against the engine, ` +
  `${unverified} judgement drill${unverified === 1 ? '' : 's'} checked but NOT verified`)
if (unverified && !fails) console.log('(a judgement drill has no ground truth — its answer is the author\'s opinion)')
process.exit(fails ? 1 : 0)
