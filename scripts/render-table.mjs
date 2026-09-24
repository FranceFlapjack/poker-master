#!/usr/bin/env node
// Render a table to a standalone HTML file, using the real js/table.js rather than a mock-up.
//
// Why this exists: the table is the one part of this app that cannot be checked by assertions — it has
// to be looked at. This produces a self-contained file (styles inlined, artwork base64'd) that can be
// opened anywhere or sent to someone, with no server and no relative paths to break.
//
//   node scripts/render-table.mjs out.html
//
// It runs table.js against a minimal DOM shim. The shim covers only what a NON-INTERACTIVE render
// touches; the action controls build real form elements and are deliberately out of scope.

import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- the smallest DOM that table.js needs -----------------------------------
const ESC = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

class Node {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.text = null }
  setAttribute(k, v) { this.attrs[k] = String(v) }
  getAttribute(k) { return this.attrs[k] ?? null }
  append(...kids) { for (const k of kids) if (k != null) this.children.push(k) }
  set textContent(v) { this.text = v; this.children.length = 0 }
  get textContent() { return this.text }
  set className(v) { this.attrs.class = v }
  set innerHTML(v) { if (v === '') this.children.length = 0 }
  addEventListener() {}
  remove() {}
  toString() {
    const a = Object.entries(this.attrs).map(([k, v]) => ` ${k}="${ESC(v)}"`).join('')
    const inner = this.text != null ? ESC(this.text) : this.children.map(String).join('')
    return `<${this.tag}${a}>${inner}</${this.tag}>`
  }
}

globalThis.document = {
  createElementNS: (_ns, tag) => new Node(tag),
  createElement: tag => new Node(tag),
}

// --- render -----------------------------------------------------------------
const { parseCards } = await import('../js/engine/cards.js')
const { createHand, applyAction } = await import('../js/engine/rules.js')
const { mountTable } = await import('../js/table.js')
const { avatarsForSeats } = await import('../js/avatars.js')

const H = s => parseCards(s)
const act = (s, type, amount) => applyAction(s, amount == null ? { type } : { type, amount })
const named = (n, size, names) => Array.from({ length: n }, (_, i) => ({ stack: size, name: names[i] }))

function render(state, opts) {
  const host = new Node('div')
  mountTable(host, { state, ...opts })
  return host.children.map(String).join('')
}

// 1 — nine handed, the widest layout, with the real portrait set
const nine = createHand({
  seats: named(9, 25000, ['Hero', 'Ana', 'Bo', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal']),
  button: 6, blinds: { sb: 100, bb: 200, ante: 25 }, anteType: 'each', seed: 11,
  hole: { 0: H('As Kh') },
})

// 2 — a finished hand, every card face up
let shown = createHand({
  seats: [{ stack: 300, name: 'Short' }, { stack: 1000, name: 'Mid' }, { stack: 2000, name: 'Deep' }],
  button: 0, blinds: { sb: 50, bb: 100 },
  hole: { 0: H('As Ks'), 1: H('Qh Qd'), 2: H('7c 7s') }, board: H('2c 7d 9h Ts 3h'),
})
shown = act(shown, 'raise', 300); shown = act(shown, 'raise', 1000); shown = act(shown, 'call')

const panels = [
  ['Nine-handed, antes posted', 'Every seat is one centred column: illustration, name, stack and big blinds on one line, then cards. The ring marks who is to act.',
    render(nine, { hero: 0, avatars: avatarsForSeats(9) })],
  ['Three-way all-in, shown down', 'Three seats, all cards face up, side pots paid. Board cards are drawn larger than hole cards because they belong to everyone.',
    render(shown, { hero: null, reveal: true, avatars: avatarsForSeats(3) })],
]

// --- inline everything so the file stands alone -----------------------------
let css = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8')
const app = readFileSync(join(ROOT, 'css/app.css'), 'utf8')
for (const block of app.split('\n')) {
  if (/^(svg\.pk-table|\.pk-table|\.table-wrap)/.test(block)) css += '\n' + block
}

let html = panels.map(([title, note, svg]) =>
  `<section><h2>${ESC(title)}</h2><p>${ESC(note)}</p>${svg}</section>`).join('\n')

// artwork → data uris, so nothing depends on a path
html = html.replace(/href="(content\/images\/avatars\/[^"]+)"/g, (_, rel) => {
  const buf = readFileSync(join(ROOT, rel))
  const mime = rel.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  return `href="data:${mime};base64,${buf.toString('base64')}"`
})

const out = process.argv[2] || join(ROOT, 'table-snapshot.html')
writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Poker Master — table</title>
<style>
${css}
body { margin: 0; padding: 30px; background: #fff; font-family: var(--font-sans); color: var(--ink); }
section { max-width: 760px; margin: 0 0 44px; }
h2 { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 6px; }
p { font-size: 13px; color: var(--ink-2); line-height: 1.6; margin: 0 0 16px; max-width: 62ch; }
.table-wrap { max-width: 760px; }
</style>
${html}
`)
console.log(`${out} — ${(readFileSync(out).length / 1024).toFixed(0)}KB, ${panels.length} tables`)
