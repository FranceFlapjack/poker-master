// The single table component. Every table in this app — lesson spots, drills, play-vs-bots, and the
// Phase 8 replayer — goes through here, the way every board in Go Master goes through goban.js.
//
// It renders a `rules.js` state as SVG and, when interactive, asks for an action. It holds no game
// logic of its own: what is legal comes from legalActions(), and applying it is the caller's job.
// Anything here that decided a rule would be a second implementation to keep in sync.
//
// The hero always sits at the bottom and the other seats run clockwise from there, which is what every
// poker client does and therefore what a reader's eye already expects.

import { RANKS, SUIT_GLYPH, rankOf, suitOf, isRed } from './engine/cards.js'
import { legalActions, potTotal, sbSeat, bbSeat } from './engine/rules.js'

const NS = 'http://www.w3.org/2000/svg'
const W = 960, HGT = 600
const CX = W / 2, CY = 286
const FELT_RX = 330, FELT_RY = 176
const SEAT_RX = 392, SEAT_RY = 236          // 392, not more: a 160-wide plate at the far seats must stay on canvas
const CARD_W = 44, CARD_H = 62
const PLATE_W = 160, PLATE_H = 48
const AVATAR_R = 19

let instances = 0   // clipPath ids must be unique when several tables share a page

const el = (name, attrs = {}, children = []) => {
  const n = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v))
  for (const c of [].concat(children)) if (c) n.append(c)
  return n
}
const text = (s, attrs) => { const t = el('text', attrs); t.textContent = s; return t }
const chips = n => n >= 1000000 ? `${round(n / 1000000)}M` : n >= 10000 ? `${round(n / 1000)}k` : String(n)
const round = n => String(Math.round(n * 10) / 10)

/**
 * @param {Element} host
 * @param {object} opts
 * @param {object} opts.state          a rules.js state
 * @param {number} [opts.hero]         which seat sits at the bottom; null shows every hand face up
 * @param {boolean} [opts.interactive] show action controls for the player to act
 * @param {(action:{type:string, amount?:number}) => void} [opts.onAction]
 * @param {boolean} [opts.reveal]      show every hole card (a finished hand, or a teaching spot)
 * @param {boolean} [opts.showBB]      label stacks in big blinds as well as chips
 * @param {Record<number, string>} [opts.avatars]  seat → image url. Presentation only, deliberately not
 *        part of the engine's seat record: `rules.js` should never carry anything a renderer invented.
 *        Seats with no entry get the built-in figure, so a table never depends on an outside file.
 */
export function mountTable(host, opts) {
  let o = { hero: 0, interactive: false, onAction: null, reveal: false, showBB: true, avatars: {}, ...opts }
  const uid = `t${++instances}`
  const root = document.createElement('div')
  root.className = 'table-wrap'
  host.append(root)

  function render() {
    root.innerHTML = ''
    const s = o.state
    const svg = el('svg', { class: 'pk-table', viewBox: `0 0 ${W} ${HGT}`, role: 'img', 'aria-label': describeTable(s, o) })
    const defs = el('defs')
    svg.append(defs)

    svg.append(el('ellipse', { class: 'felt', cx: CX, cy: CY, rx: FELT_RX, ry: FELT_RY }))
    svg.append(el('ellipse', { class: 'rail', cx: CX, cy: CY, rx: FELT_RX + 10, ry: FELT_RY + 10 }))

    // pot and board in the middle
    const pot = potTotal(s)
    if (pot > 0) {
      svg.append(text(`POT ${chips(pot)}`, { class: 'pot', x: CX, y: CY - 74, 'text-anchor': 'middle' }))
    } else if (s.result) {
      svg.append(text(`POT ${chips(s.result.total)} — PAID`, { class: 'pot', x: CX, y: CY - 74, 'text-anchor': 'middle' }))
    }
    const boardW = 5 * CARD_W + 4 * 8
    s.board.forEach((c, i) => {
      svg.append(card(c, CX - boardW / 2 + i * (CARD_W + 8), CY - CARD_H / 2, false))
    })
    if (!s.board.length) {
      svg.append(text(streetLabel(s), { class: 'street', x: CX, y: CY + 6, 'text-anchor': 'middle' }))
    }

    const n = s.seats.length
    const sb = sbSeat(s), bb = bbSeat(s)
    for (let k = 0; k < n; k++) svg.append(seat(s, k, n, sb, bb, defs))

    // The button sits just inside the felt, offset around the rim rather than straight in towards the
    // middle — directly in line it lands on top of that seat's hole cards.
    const bpos = seatPos(s.button, n, o.hero ?? 0, FELT_RX - 30, FELT_RY - 24, 360 / n * 0.42)
    svg.append(el('circle', { class: 'dealer', cx: bpos.x, cy: bpos.y, r: 15 }))
    svg.append(text('D', { class: 'dealer-t', x: bpos.x, y: bpos.y + 5, 'text-anchor': 'middle' }))

    root.append(svg)
    if (o.interactive && s.toAct != null) root.append(controls(s))
  }

  function seat(s, k, n, sb, bb, defs) {
    const p = s.seats[k]
    const pos = seatPos(k, n, o.hero ?? 0, SEAT_RX, SEAT_RY)
    const isHero = k === o.hero
    const toAct = s.toAct === k
    const g = el('g', {
      class: ['seat', p.folded ? 'folded' : '', p.allIn ? 'allin' : '', toAct ? 'to-act' : '', isHero ? 'hero' : ''].filter(Boolean).join(' '),
    })

    // Hole cards sit on the side of the plate that faces the middle of the table. Always drawing them
    // above the plate puts the top seats' cards off the top of the canvas, and buries the bet pill.
    const shown = o.reveal || isHero || o.hero == null
    const cy = pos.y < CY ? pos.y + 54 : pos.y - 54
    if (p.hole && !p.folded) {
      g.append(card(p.hole[0], pos.x - CARD_W - 3, cy - CARD_H / 2, !shown))
      g.append(card(p.hole[1], pos.x + 3, cy - CARD_H / 2, !shown))
    }

    // name plate, with the portrait inset at its leading edge
    const left = pos.x - PLATE_W / 2
    g.append(el('rect', { class: 'plate', x: left, y: pos.y - PLATE_H / 2, width: PLATE_W, height: PLATE_H }))
    g.append(portrait(left + 26, pos.y, k, o.avatars[k], p.name, defs, uid))
    const textX = left + 52
    g.append(text(p.name, { class: 'seat-name', x: textX, y: pos.y - 3 }))
    const bbCount = o.showBB && s.blinds.bb ? ` · ${round(p.stack / s.blinds.bb)}bb` : ''
    g.append(text(p.stack > 0 ? chips(p.stack) + bbCount : 'ALL IN', { class: 'seat-stack', x: textX, y: pos.y + 15 }))

    // blind marker
    const blind = k === sb ? 'SB' : k === bb ? 'BB' : null
    if (blind) g.append(text(blind, { class: 'blind-tag', x: pos.x + PLATE_W / 2 - 6, y: pos.y - PLATE_H / 2 - 5, 'text-anchor': 'end' }))

    // Chips wagered, between the seat and the middle — far enough in to clear that seat's hole cards.
    if (p.committed > 0) {
      const b = lerp(pos, { x: CX, y: CY }, 0.52)
      g.append(el('rect', { class: 'bet-pill', x: b.x - 30, y: b.y - 12, width: 60, height: 24 }))
      g.append(text(chips(p.committed), { class: 'bet-t', x: b.x, y: b.y + 5, 'text-anchor': 'middle' }))
    }
    return g
  }

  function controls(s) {
    const acts = legalActions(s)
    const p = s.seats[s.toAct]
    const bar = document.createElement('div')
    bar.className = 'table-actions'

    const raise = acts.find(a => a.type === 'raise' || a.type === 'bet')
    let amount = raise ? raise.min : 0

    for (const a of acts) {
      if (a.type === 'raise' || a.type === 'bet') continue
      const b = document.createElement('button')
      b.className = 'btn' + (a.type === 'call' ? ' primary' : '')
      b.textContent = a.type === 'call'
        ? `Call ${chips(a.amount)}${a.allIn ? ' (all in)' : ''}`
        : a.type[0].toUpperCase() + a.type.slice(1)
      b.addEventListener('click', () => o.onAction && o.onAction({ type: a.type }))
      bar.append(b)
    }

    if (raise) {
      const wrap = document.createElement('div')
      wrap.className = 'raise-control'
      const out = document.createElement('span')
      out.className = 'raise-amount'
      const slider = document.createElement('input')
      Object.assign(slider, { type: 'range', min: raise.min, max: raise.max, step: 1, value: amount })
      const paint = () => { out.textContent = `${chips(amount)}${amount >= raise.max ? ' (all in)' : ''}` }
      slider.addEventListener('input', () => { amount = Number(slider.value); paint() })
      const go = document.createElement('button')
      go.className = 'btn primary'
      go.textContent = raise.type === 'bet' ? 'Bet' : 'Raise to'
      go.addEventListener('click', () => o.onAction && o.onAction({ type: raise.type, amount }))
      paint()
      wrap.append(go, slider, out)
      bar.append(wrap)
      // pot-sized and all-in shortcuts, the two sizings anyone actually reaches for
      for (const [label, value] of sizingShortcuts(s, p, raise)) {
        const b = document.createElement('button')
        b.className = 'btn quiet'
        b.textContent = label
        b.addEventListener('click', () => { amount = value; slider.value = String(value); paint() })
        bar.append(b)
      }
    }
    return bar
  }

  render()
  return {
    update(next) { o = { ...o, ...next }; render() },
    get options() { return o },
    destroy() { root.remove() },
  }
}

function sizingShortcuts(s, p, raise) {
  const pot = potTotal(s)
  const toCall = s.currentBet - p.committed
  const out = []
  for (const [label, frac] of [['½ pot', 0.5], ['Pot', 1]]) {
    // a pot-sized raise is call + (pot after the call) × fraction
    const to = Math.round(s.currentBet + (pot + toCall) * frac)
    if (to > raise.min && to < raise.max) out.push([label, to])
  }
  out.push(['All in', raise.max])
  return out
}

function streetLabel(s) {
  if (s.street === 'complete') return 'HAND COMPLETE'
  return s.street.toUpperCase()
}

/**
 * Seat k's position, with the hero pinned to the bottom and the rest running clockwise.
 * `degOffset` nudges around the rim, for markers that should sit beside a seat rather than on it.
 */
function seatPos(k, n, hero, rx, ry, degOffset = 0) {
  const step = 360 / n
  const deg = 90 - ((k - hero + n) % n) * step + degOffset
  const rad = deg * Math.PI / 180
  return { x: CX + rx * Math.cos(rad), y: CY + ry * Math.sin(rad) }
}

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/**
 * The portrait inset in a seat plate. With a url it clips that image to a circle; without one it draws
 * the built-in figure, so a table never depends on an outside file being present.
 *
 * Any artwork passed in here belongs to whoever made it. `content/images/avatars/manifest.json` is where
 * each file's source and licence are recorded — see the README there before adding any.
 */
function portrait(cx, cy, k, url, name, defs, uid) {
  const g = el('g', { class: `portrait tint-${k % 9}` })
  g.append(el('circle', { class: 'av-disc', cx, cy, r: AVATAR_R }))
  if (url) {
    const id = `${uid}-av${k}`
    defs.append(el('clipPath', { id }, el('circle', { cx, cy, r: AVATAR_R })))
    const img = el('image', {
      href: url, x: cx - AVATAR_R, y: cy - AVATAR_R, width: AVATAR_R * 2, height: AVATAR_R * 2,
      preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${id})`,
    })
    const t = el('title'); t.textContent = name
    img.append(t)
    g.append(img)
  } else {
    g.append(builtInFigure(cx, cy))
  }
  g.append(el('circle', { class: 'av-ring', cx, cy, r: AVATAR_R }))
  return g
}

/**
 * Our own placeholder: a disc, a head and a pair of shoulders, deliberately faceless and geometric so it
 * reads as a marker rather than a person, and sits inside the series' flat, square-cornered language.
 */
function builtInFigure(cx, cy) {
  const g = el('g', { class: 'av-figure' })
  g.append(el('circle', { cx, cy: cy - 4.5, r: 5.6 }))
  g.append(el('path', { d: `M ${cx - 10} ${cy + 11} a 10 10 0 0 1 20 0 z` }))
  return g
}

function card(c, x, y, faceDown) {
  const g = el('g', { class: 'card' + (faceDown ? ' back' : '') })
  g.append(el('rect', { x, y, width: CARD_W, height: CARD_H }))   // corner radius comes from --card-radius
  if (faceDown || c == null) return g
  const r = RANKS[rankOf(c)], glyph = SUIT_GLYPH[suitOf(c)]
  const cls = isRed(c) ? 'pip red' : 'pip black'
  g.append(text(r, { class: `rank ${isRed(c) ? 'red' : 'black'}`, x: x + CARD_W / 2, y: y + 26, 'text-anchor': 'middle' }))
  g.append(text(glyph, { class: cls, x: x + CARD_W / 2, y: y + 50, 'text-anchor': 'middle' }))
  return g
}

/** A one-line description for screen readers and for test output. */
export function describeTable(s, o = {}) {
  const parts = [`${s.seats.length}-handed, ${s.street}`]
  if (s.board.length) parts.push(`board ${s.board.map(c => RANKS[rankOf(c)] + SUIT_GLYPH[suitOf(c)]).join(' ')}`)
  parts.push(`pot ${potTotal(s) || (s.result ? s.result.total : 0)}`)
  if (s.toAct != null) parts.push(`${s.seats[s.toAct].name} to act`)
  return parts.join(', ')
}
