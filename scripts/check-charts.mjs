#!/usr/bin/env node
// Chart checks: every file in content/charts/. Exit code 1 on any failure.
//
// A chart is the one kind of content in this app that looks authoritative while being, unavoidably,
// somebody's opinion. So this checker enforces the two things that keep it honest:
//
//   1. the percentages are RECOMPUTED from the range notation. A chart that says a range is 10% must
//      actually be 10%, or the number is decoration.
//   2. the provenance block must exist and must say whether it is solver output. "Where did this come
//      from" has to be answerable for every chart, forever, by anyone reading the file.
//
// It also checks the shape makes sense: an opening chart that does not widen as position improves is
// either mis-authored or mis-labelled.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseRange, countCombos, serializeRange } from '../js/engine/ranges.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'content/charts')
const VERBOSE = process.argv.includes('-v')
let fails = 0, charts = 0, ranges = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }

if (!existsSync(DIR)) { console.log('no content/charts/ yet'); process.exit(0) }

for (const file of readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  charts++
  const chart = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  const where = file

  if (!chart.id || !chart.title) bad(where, 'a chart needs an id and a title')

  const p = chart.provenance
  if (!p) bad(where, 'no `provenance` — every chart must say where it came from')
  else {
    if (typeof p.isSolverOutput !== 'boolean') bad(where, 'provenance must state isSolverOutput true or false')
    if (typeof p.isGTO !== 'boolean') bad(where, 'provenance must state isGTO true or false')
    if (!p.basis) bad(where, 'provenance must say what the chart is based on')
    if (p.isSolverOutput && !p.source) bad(where, 'a solver-derived chart must name its source — and check the licence before adding one')
  }

  // A solved chart stores rows per stack depth rather than per position. Same guarantee applies: the
  // stated width must be recomputable from the notation, and the solve must have actually converged.
  let prevDepth = null
  for (const d of chart.depths || []) {
    const w = `${file} ${d.bb}bb`
    for (const side of ['push', 'call']) {
      ranges++
      let weights
      try { weights = parseRange(d[side]) } catch (e) { bad(w, `${side} range will not parse: ${e.message}`); continue }
      const pct = 100 * countCombos(weights) / 1326
      const stated = d[`${side}Pct`]
      if (typeof stated !== 'number') bad(w, `no ${side}Pct`)
      else if (Math.abs(pct - stated) > 0.1) bad(w, `${side} says ${stated}% but the range is ${pct.toFixed(1)}%`)
      if (VERBOSE) console.log(`ok    ${w.padEnd(22)} ${side.padEnd(4)} ${pct.toFixed(1).padStart(5)}%`)
    }
    if (d.converged === false) bad(w, 'the solver did not converge at this depth — do not ship an unconverged row')
    // shorter stacks must shove wider; if they do not, the solve is wrong
    if (prevDepth && d.pushPct > prevDepth.pushPct + 0.5) {
      bad(w, `shoves ${d.pushPct}% at ${d.bb}bb but only ${prevDepth.pushPct}% at ${prevDepth.bb}bb — a deeper stack should not shove wider`)
    }
    prevDepth = d
  }

  let prev = null
  for (const pos of chart.positions || []) {
    const w = `${file} ${pos.id}`
    ranges++
    let weights
    try { weights = parseRange(pos.range) } catch (e) { bad(w, `range will not parse: ${e.message}`); continue }

    const combos = countCombos(weights)
    const pct = 100 * combos / 1326
    if (typeof pos.pct !== 'number') bad(w, 'no `pct` — state it so it can be checked')
    else if (Math.abs(pct - pos.pct) > 0.1) {
      bad(w, `says ${pos.pct}% but the range is ${pct.toFixed(1)}% (${combos} of 1326 combos). Fix the number, not the range.`)
    }

    // the notation must survive a round trip, or the chart viewer will show something else
    const back = serializeRange(weights)
    if (countCombos(parseRange(back)) !== combos) bad(w, `range does not survive a round trip: "${pos.range}" -> "${back}"`)

    if (VERBOSE) console.log(`ok    ${w.padEnd(28)} ${String(combos).padStart(4)} combos  ${pct.toFixed(1)}%`)

    // an opening chart should widen as position improves; the small blind is the known exception,
    // because it acts last preflop and first on every street after
    if (chart.id.startsWith('rfi') && prev && pos.id !== 'SB' && pos.pct < prev.pct) {
      bad(w, `opens ${pos.pct}% with ${pos.seatsBehind} behind, but ${prev.id} opens ${prev.pct}% with ${prev.seatsBehind}. An opening chart should widen as position improves.`)
    }
    prev = pos
  }
}

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${charts} chart${charts === 1 ? '' : 's'}, ${ranges} ranges checked`)
process.exit(fails ? 1 : 0)
