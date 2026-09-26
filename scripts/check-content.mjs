#!/usr/bin/env node
// Content checks: run before every commit. Exit code 1 on any failure.
//
// What it enforces, and why each one is here:
//   - a lesson marked `ready` must actually exist, or the sidebar links to nothing
//   - frontmatter must carry id, track and title
//   - `sources:` must be non-empty. This is the owner's non-negotiable rule, and a checker is the only
//     thing that keeps it true once there are fifty lessons
//   - the id in the frontmatter must match the file name, or progress records key off the wrong thing

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseFrontmatter } from '../js/frontmatter.js'
import { allLessons, lessonPath } from '../js/curriculum.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0, checked = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }

const curriculum = JSON.parse(readFileSync(join(ROOT, 'content/curriculum.json'), 'utf8'))

const seen = new Set()
for (const lesson of allLessons(curriculum)) {
  const where = `${lesson.dir}/${lesson.slug}`
  if (seen.has(where)) bad('curriculum.json', `duplicate lesson: ${where}`)
  seen.add(where)
  if (!lesson.title) bad(where, 'lesson has no title in curriculum.json')

  const file = join(ROOT, lessonPath(lesson.dir, lesson.slug))
  if (!lesson.ready) {
    if (existsSync(file)) console.log(`note  ${where} has a file but is still ready:false`)
    continue
  }
  checked++
  if (!existsSync(file)) { bad(where, 'marked ready but its .md file does not exist'); continue }

  const { meta } = parseFrontmatter(readFileSync(file, 'utf8'))
  if (!meta.id) bad(where, 'frontmatter has no id')
  else if (meta.id !== lesson.slug) bad(where, `frontmatter id "${meta.id}" does not match the file name "${lesson.slug}"`)
  if (!meta.title) bad(where, 'frontmatter has no title')
  if (!meta.track) bad(where, 'frontmatter has no track')
  // tips are said by the cat, in a bubble about 300px wide: keep them to a sentence or two
  const { body } = parseFrontmatter(readFileSync(file, 'utf8'))
  for (const m of body.matchAll(/```tip\n([\s\S]*?)```/g)) {
    const t = m[1].replace(/^title:.*\n/i, '').trim()
    if (!t) bad(where, 'an empty ```tip block')
    else if (t.length > 220) bad(where, `a tip of ${t.length} characters — the cat's bubble reads well up to about 220: "${t.slice(0, 60)}…"`)
  }
  const sources = Array.isArray(meta.sources) ? meta.sources.filter(x => x.trim()) : []
  if (!sources.length) bad(where, 'frontmatter has no `sources:` — every lesson must say where it got its material')
}

// every part must be reachable and named
for (const part of curriculum.parts || []) {
  if (!part.id || !part.title) bad('curriculum.json', `a part is missing id or title: ${JSON.stringify(part).slice(0, 60)}`)
  if (!part.lessons && !part.sections) bad(part.id || '?', 'a part must hold either `lessons` or `sections`')
}

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${checked} ready lesson${checked === 1 ? '' : 's'} checked`)
process.exit(fails ? 1 : 0)
