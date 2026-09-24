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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0, checked = 0
const bad = (where, msg) => { fails++; console.log(`FAIL  ${where}\n      ${msg}`) }

const curriculum = JSON.parse(readFileSync(join(ROOT, 'content/curriculum.json'), 'utf8'))

const seenSlugs = new Set()
for (const track of curriculum.tracks) {
  if (!track.id || !track.title) bad('curriculum.json', `a track is missing id or title: ${JSON.stringify(track).slice(0, 80)}`)
  for (const lesson of track.lessons) {
    const where = `${track.id}/${lesson.slug}`
    if (seenSlugs.has(where)) bad('curriculum.json', `duplicate lesson: ${where}`)
    seenSlugs.add(where)
    if (!lesson.title) bad(where, 'lesson has no title in curriculum.json')

    const file = join(ROOT, 'content/lessons', track.id, `${lesson.slug}.md`)
    if (!lesson.ready) {
      // a planned lesson need not exist yet, but if the file IS there it is probably meant to be on
      if (existsSync(file)) console.log(`note  ${where} has a file but is still ready:false`)
      continue
    }
    checked++
    if (!existsSync(file)) { bad(where, 'marked ready but content/lessons/.../*.md does not exist'); continue }

    const { meta } = parseFrontmatter(readFileSync(file, 'utf8'))
    if (!meta.id) bad(where, 'frontmatter has no id')
    else if (meta.id !== lesson.slug) bad(where, `frontmatter id "${meta.id}" does not match the file name "${lesson.slug}"`)
    if (!meta.title) bad(where, 'frontmatter has no title')
    if (!meta.track) bad(where, 'frontmatter has no track')
    const sources = Array.isArray(meta.sources) ? meta.sources.filter(s => s.trim()) : []
    if (!sources.length) bad(where, 'frontmatter has no `sources:` — every lesson must say where it got its material')
  }
}

console.log(`\n${fails ? `${fails} FAILED, ` : ''}${checked} ready lesson${checked === 1 ? '' : 's'} checked`)
process.exit(fails ? 1 : 0)
