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
const W = 960, HGT = 760
const CX = W / 2, CY = 372
const FELT_RX = 310, FELT_RY = 138
const SEAT_RX = 396, SEAT_RY = 248
const CARD_W = 40, CARD_H = 56
const BOARD_CARD_W = 44, BOARD_CARD_H = 62   // the board reads as the shared hand, so it stays larger

// A seat is a single centred column: illustration, then name, then stack on one line, then cards.
// These offsets are from the seat's centre point and are what keeps every seat on the same grid.
const ILLO = 62                 // illustration box, square
const Y_ILLO_TOP = -78
const Y_NAME = 2
const Y_DETAIL = 19
const Y_CARDS_TOP = 28

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
  const root = document.createElement('div')
  root.className = 'table-wrap'
  host.append(root)

  function render() {
    root.innerHTML = ''
    const s = o.state
    const svg = el('svg', { class: 'pk-table', viewBox: `0 0 ${W} ${HGT}`, role: 'img', 'aria-label': describeTable(s, o) })

    svg.append(el('ellipse', { class: 'felt', cx: CX, cy: CY, rx: FELT_RX, ry: FELT_RY }))
    svg.append(el('ellipse', { class: 'rail', cx: CX, cy: CY, rx: FELT_RX + 10, ry: FELT_RY + 10 }))

    // pot and board in the middle
    const pot = potTotal(s)
    if (pot > 0) {
      svg.append(text(`POT ${chips(pot)}`, { class: 'pot', x: CX, y: CY - 74, 'text-anchor': 'middle' }))
    } else if (s.result) {
      svg.append(text(`POT ${chips(s.result.total)} — PAID`, { class: 'pot', x: CX, y: CY - 74, 'text-anchor': 'middle' }))
    }
    const boardW = 5 * BOARD_CARD_W + 4 * 8
    s.board.forEach((c, i) => {
      svg.append(card(c, CX - boardW / 2 + i * (BOARD_CARD_W + 8), CY - BOARD_CARD_H / 2, false, BOARD_CARD_W, BOARD_CARD_H))
    })
    if (!s.board.length) {
      svg.append(text(streetLabel(s), { class: 'street', x: CX, y: CY + 6, 'text-anchor': 'middle' }))
    }

    const n = s.seats.length
    const sb = sbSeat(s), bb = bbSeat(s)
    for (let k = 0; k < n; k++) svg.append(seat(s, k, n, sb, bb))

    // The button sits just inside the felt, offset around the rim rather than straight in towards the
    // middle — directly in line it lands on top of that seat's hole cards.
    const bpos = seatPos(s.button, n, o.hero ?? 0, FELT_RX - 30, FELT_RY - 24, 360 / n * 0.42)
    svg.append(el('circle', { class: 'dealer', cx: bpos.x, cy: bpos.y, r: 15 }))
    svg.append(text('D', { class: 'dealer-t', x: bpos.x, y: bpos.y + 5, 'text-anchor': 'middle' }))

    root.append(svg)
    if (o.interactive && s.toAct != null) root.append(controls(s))
  }

  /**
   * A seat is one centred column on the seat's own axis, in a fixed order every time:
   *
   *      blind tag
   *      illustration      standing free — no plate behind it
   *      name
   *      stack · big blinds     one line
   *      cards
   *
   * The order does not flip by hemisphere. Consistency is the point: the reader learns one shape and
   * then reads all nine seats the same way, which they cannot do if the top half is upside down.
   */
  function seat(s, k, n, sb, bb) {
    const p = s.seats[k]
    const pos = seatPos(k, n, o.hero ?? 0, SEAT_RX, SEAT_RY)
    const isHero = k === o.hero
    const toAct = s.toAct === k
    const g = el('g', {
      class: ['seat', p.folded ? 'folded' : '', p.allIn ? 'allin' : '', toAct ? 'to-act' : '', isHero ? 'hero' : ''].filter(Boolean).join(' '),
    })

    // The blind marker needs its own chip: depending on the seat it lands on felt or on white, and no
    // single ink colour is legible on both.
    const blind = k === sb ? 'SB' : k === bb ? 'BB' : null
    if (blind) {
      const by = pos.y + Y_ILLO_TOP - 14
      g.append(el('rect', { class: 'blind-chip', x: pos.x - 13, y: by, width: 26, height: 14 }))
      g.append(text(blind, { class: 'blind-tag', x: pos.x, y: by + 10.5, 'text-anchor': 'middle' }))
    }

    // whose turn it is, shown as a ring around the illustration rather than a box around the seat
    if (toAct) {
      g.append(el('circle', { class: 'act-ring', cx: pos.x, cy: pos.y + Y_ILLO_TOP + ILLO / 2, r: ILLO / 2 + 3 }))
    }
    g.append(illustration(pos.x, pos.y + Y_ILLO_TOP, k, o.avatars[k], p.name))

    g.append(text(p.name, { class: 'seat-name', x: pos.x, y: pos.y + Y_NAME, 'text-anchor': 'middle' }))

    const bbCount = o.showBB && s.blinds.bb ? ` · ${round(p.stack / s.blinds.bb)} bb` : ''
    g.append(text(p.stack > 0 ? chips(p.stack) + bbCount : 'ALL IN',
      { class: 'seat-detail', x: pos.x, y: pos.y + Y_DETAIL, 'text-anchor': 'middle' }))

    const shown = o.reveal || isHero || o.hero == null
    if (p.hole && !p.folded) {
      g.append(card(p.hole[0], pos.x - CARD_W - 3, pos.y + Y_CARDS_TOP, !shown))
      g.append(card(p.hole[1], pos.x + 3, pos.y + Y_CARDS_TOP, !shown))
    }

    // Chips wagered, between the seat and the middle — clear of the column at either end.
    if (p.committed > 0) {
      const b = lerp(pos, { x: CX, y: CY }, 0.46)
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
 * The seat's illustration, standing free — no disc, no crop, no box. The supplied artwork is drawn whole
 * at its own aspect ratio, which is why it needs a transparent background to sit on the felt.
 *
 * Any artwork passed in here belongs to whoever made it. `content/images/avatars/manifest.json` is where
 * each file's source and licence are recorded — see the README there before adding any.
 */
function illustration(cx, top, k, url, name) {
  const g = el('g', { class: `portrait tint-${k % 9}` })
  if (url) {
    const img = el('image', {
      href: url, x: cx - ILLO / 2, y: top, width: ILLO, height: ILLO,
      preserveAspectRatio: 'xMidYMid meet',   // whole illustration, never cropped
    })
    const t = el('title'); t.textContent = name
    img.append(t)
    g.append(img)
  } else {
    // No artwork: our own marker gets a disc, because unlike an illustration it has no silhouette of
    // its own and would read as a smudge floating on the felt.
    g.append(el('circle', { class: 'av-disc', cx, cy: top + ILLO / 2, r: ILLO / 2 - 3 }))
    g.append(builtInFigure(cx, top + ILLO / 2, ILLO / 2 - 3))
  }
  return g
}

/**
 * Our own placeholder: a head and a pair of shoulders, deliberately faceless and geometric so it reads
 * as a marker rather than a person. Drawn at r = 19 originally, so it scales from there.
 */
function builtInFigure(cx, cy, r) {
  const k = r / 19
  const g = el('g', { class: 'av-figure' })
  g.append(el('circle', { cx, cy: cy - 4.5 * k, r: 5.6 * k }))
  g.append(el('path', { d: `M ${cx - 10 * k} ${cy + 11 * k} a ${10 * k} ${10 * k} 0 0 1 ${20 * k} 0 z` }))
  return g
}

function card(c, x, y, faceDown, w = CARD_W, h = CARD_H) {
  const g = el('g', { class: 'card' + (faceDown ? ' back' : '') })
  g.append(el('rect', { x, y, width: w, height: h }))   // corner radius comes from --card-radius
  if (faceDown || c == null) return g
  const r = RANKS[rankOf(c)], glyph = SUIT_GLYPH[suitOf(c)]
  const red = isRed(c)
  // proportional to the card, so hole cards and board cards read as the same object at two sizes
  g.append(text(r, { class: `rank ${red ? 'red' : 'black'}`, x: x + w / 2, y: y + h * 0.42,
    'text-anchor': 'middle', style: `font-size:${Math.round(h * 0.34)}px` }))
  g.append(text(glyph, { class: red ? 'pip red' : 'pip black', x: x + w / 2, y: y + h * 0.81,
    'text-anchor': 'middle', style: `font-size:${Math.round(h * 0.31)}px` }))
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
