// The single table component. Every table in this app — lesson spots, drills, play-vs-bots, and the
// Phase 8 replayer — goes through here, the way every board in Go Master goes through goban.js.
//
// It renders a `rules.js` state as SVG and, when interactive, asks for an action. It holds no game
// logic of its own: what is legal comes from legalActions(), and applying it is the caller's job.
// Anything here that decided a rule would be a second implementation to keep in sync.
//
// The hero always sits at the bottom and the other seats run clockwise from there, which is what every
// poker client does and therefore what a reader's eye already expects.

import { RANKS, SUIT_GLYPH, rankOf, suitOf, isRed, cardGlyph } from './engine/cards.js'
import { legalActions, potTotal, sbSeat, bbSeat } from './engine/rules.js'

const NS = 'http://www.w3.org/2000/svg'

// ---------------------------------------------------------------------------------------------------
// SIZES ARE IN RENDERED PIXELS.
//
// The first versions of this component sized everything in SVG units and let each table scale to fit
// its column. That made the same name render anywhere from 19.5px (heads-up, desktop) down to 7.8px
// (six- or nine-handed on a phone), with bets as small as 6.4px — measured, at every seat count, not
// guessed. The scale factor depended on seat count and screen, so no single unit size could be right.
//
// So the table is now laid out at 1 unit = 1 rendered pixel, for the width it actually has. Text, cards
// and figures come out the same size at every table; what changes with seat count is only the felt and
// where the seats go. The numbers themselves live in css/tokens.css (--tb-size-*) so they can be tuned
// by comment like every other visual decision; these are the fallbacks, and what the Node renderer uses.
// ---------------------------------------------------------------------------------------------------
export const SIZE_DEFAULTS = {
  name: 13, stack: 12, bet: 12.5, pot: 14, street: 11, tag: 9.5, dealer: 11,
  card: 42, board: 48, figure: 58, hero: 70,
}

function readSizes(node) {
  const z = { ...SIZE_DEFAULTS }
  try {
    const cs = getComputedStyle(node)
    for (const k of Object.keys(z)) {
      const v = parseFloat(cs.getPropertyValue(`--tb-size-${k}`))
      if (Number.isFinite(v) && v > 0) z[k] = v
    }
  } catch { /* no layout engine (the Node renderer): the defaults are the design */ }
  return z
}

/** Everything derived from the sizes — the column's vertical rhythm comes from its own type. */
function metrics(z) {
  return {
    ...z,
    cardH: z.card, cardW: Math.round(z.card * 0.72), cardGap: 4,
    boardH: z.board, boardW: Math.round(z.board * 0.72), boardGap: 6,
    gapFigName: Math.round(z.name * 0.5),     // figure → name
    gapLines: Math.round(z.stack * 0.35),     // name → stack
    gapCards: Math.round(z.stack * 0.6),      // stack → cards
    railOffset: 7,       // the rail is drawn this far outside the felt edge
    railStroke: 5,
    railGap: 12,         // no seat furniture comes closer than this to the rail
    seatPad: 8,          // nor closer than this to its neighbour
    viewPad: 8,
  }
}
const cap = f => f * 0.72      // cap height of the sans face, as a share of its size
const desc = f => f * 0.22     // descender

/**
 * The two shapes, and which one a table gets.
 *
 * Owner's rule (2026-09-26): on a desktop a table is the ordinary wide oval; on a phone it is ROUND.
 * "Phone" is the app's own switch — the width at which the sidebar becomes a menu button — so the table
 * changes shape exactly when the rest of the page does. The wide oval used to be dropped for a tall one
 * whenever it rendered below 85% of its size, and on a desktop that was most dense tables: they were
 * capped at 660px, and nine seats need 815. The cap is now --table-max, and drills put the question
 * under a table that will not fit beside it (js/exercise.js), so the desktop table has its room.
 *
 * One exception, kept deliberately: a desktop window narrow enough that the wide oval would render
 * below ROUND_FLOOR — a tablet held upright, a window dragged thin — gets the round table too, since at
 * that scale the wide one's type is under 9px. At 1024px and wider no table in the app comes near it.
 */
const PHONE = '(max-width: 760px)'
const ROUND_FLOOR = 0.7
const isPhone = () => { try { return typeof matchMedia === 'function' && matchMedia(PHONE).matches } catch { return false } }

/**
 * Felt size by seat count, in pixels. The only hand-tuned geometry left: seats are placed from it.
 *
 * `round` is the phone table — a circle, one size at every seat count. A phone has no width to spare,
 * and nine seats round a wide oval need 815px to keep 12px type. The radius was measured, radii 90–160
 * at every seat count on a 343px column (a 375px phone): 110 renders 3–7 seats at 0.81–0.86 of full
 * size, better than the tall oval it replaced (0.78–0.81), and nine at 0.73 against 0.75, with the
 * circle a quarter shorter. Eight seats lose most, 0.71 against 0.79; no lesson seats eight. Below 110
 * the five board cards come within a few pixels of the rail.
 */
const ROUND_R = 110
function feltFor(n, round) {
  if (round) return { rx: ROUND_R, ry: ROUND_R }
  if (n <= 2) return { rx: 150, ry: 80 }
  if (n <= 4) return { rx: 172, ry: 94 }
  if (n <= 6) return { rx: 192, ry: 104 }
  return { rx: 186, ry: 112 }
}

/**
 * The middle of the table: board, pot and street as one centred stack, with its own box so the wagers
 * can keep off it. A round table's board cards are drawn a little smaller — its felt is small, and at
 * full size five cards all but fill it.
 */
function middleLayout(s, m, round) {
  const cardH = round ? Math.round(m.boardH * 0.86) : m.boardH
  const cardW = Math.round(cardH * 0.72)
  const pot = potTotal(s)
  const potText = pot > 0 ? `POT ${chips(pot)}` : s.result ? `POT ${chips(s.result.total)} — PAID` : null
  const hasBoard = s.board.length > 0
  const lines = []
  let w = 0
  if (hasBoard) {
    const bw = s.board.length * cardW + (s.board.length - 1) * m.boardGap
    lines.push({ kind: 'board', h: cardH, w: bw }); w = Math.max(w, bw)
  }
  if (potText) { lines.push({ kind: 'pot', text: potText, size: m.pot, h: cap(m.pot) }); w = Math.max(w, measure(potText, m.pot, 600, 0.1)) }
  if (!hasBoard) { const t = streetLabel(s); lines.push({ kind: 'street', text: t, size: m.street, h: cap(m.street) }); w = Math.max(w, measure(t, m.street, 400, 0.1)) }
  const gap = 9
  const h = lines.reduce((a, l) => a + l.h, 0) + gap * (lines.length - 1)
  let y = -h / 2
  for (const l of lines) { l.y = y; y += l.h + gap }
  return { lines, w, h, cardW, cardH }
}

/** Seat k's direction, with the hero pinned to the bottom and the rest running clockwise. */
const seatAngle = (k, n, hero, offset = 0) => (90 - ((k - hero + n) % n) * 360 / n + offset) * Math.PI / 180

/**
 * Seat directions round a CIRCLE. Evenly spaced angles suit an oval, not a circle: a seat is a tall,
 * narrow column (figure, name, stack, cards), so the seats on the left and right of a circle stack on
 * top of one another and need far more arc than the ones across the top and bottom, which sit side by
 * side. Spaced evenly, nine seats pushed each other out until the table was 0.58 of its size on a phone.
 * So each gap is sized to what its two seats take up along the rim at that point — width across the top
 * and bottom, height down the sides — and the angles are solved for that. The hero stays at the bottom.
 */
function roundAngles(cols, n, hero) {
  const order = Array.from({ length: n }, (_, i) => (hero + i) % n)       // the hero, then round the table
  let th = order.map((_, i) => 90 - i * 360 / n)
  const along = (c, deg) => {
    const a = deg * Math.PI / 180
    return 2 * c.half * Math.abs(Math.sin(a)) + (c.top + c.bottom) * Math.abs(Math.cos(a))
  }
  for (let it = 0; it < 24; it++) {
    const gaps = order.map((k, i) => {
      const j = (i + 1) % n
      return (along(cols[k], th[i]) + along(cols[order[j]], th[j])) / 2 + 8
    })
    const total = gaps.reduce((a, b) => a + b, 0)
    const next = [90]
    for (let i = 1; i < n; i++) next.push(next[i - 1] - gaps[i - 1] / total * 360)
    th = next
  }
  const out = []
  order.forEach((k, i) => { out[k] = th[i] * Math.PI / 180 })
  return out
}

// ---------------------------------------------------------------------------------------------------

const el = (name, attrs = {}, children = []) => {
  const n = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, String(v))
  for (const c of [].concat(children)) if (c) n.append(c)
  return n
}
const text = (s, attrs) => { const t = el('text', attrs); t.textContent = s; return t }
const px = v => `font-size:${Math.round(v * 10) / 10}px`
const chips = n => n >= 1000000 ? `${round(n / 1000000)}M` : n >= 10000 ? `${round(n / 1000)}k` : String(n)
const round = n => String(Math.round(n * 10) / 10)
/** Big blinds to a sensible precision: a decimal only matters when you are short. */
const inBigBlinds = (stack, bb) => { const v = stack / bb; return v >= 20 ? String(Math.round(v)) : round(v) }

let measureCtx
/** Text width in pixels. Canvas where there is one; a per-character estimate under the Node shim. */
function measure(str, size, weight = 400, spacingEm = 0) {
  try {
    if (measureCtx === undefined) {
      const c = document.createElement('canvas')
      measureCtx = typeof c.getContext === 'function' ? c.getContext('2d') : null
    }
    if (measureCtx) {
      measureCtx.font = `${weight} ${size}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`
      return measureCtx.measureText(str).width + spacingEm * size * str.length
    }
  } catch { measureCtx = null }
  return str.length * size * (weight >= 600 ? 0.62 : 0.56) + spacingEm * size * str.length
}

/**
 * @param {Element} host
 * @param {object} opts
 * @param {object} opts.state          a rules.js state
 * @param {number} [opts.hero]         which seat sits at the bottom; null shows every hand face up
 * @param {boolean} [opts.interactive] show action controls for the player to act
 * @param {(action:{type:string, amount?:number}) => void} [opts.onAction]
 * @param {boolean} [opts.reveal]      show every hole card (a finished hand, or a teaching spot)
 * @param {boolean} [opts.showBB]      label stacks in big blinds as well as chips
 * @param {Record<number, string|{src:string, ink?:number[], size?:number[]}>} [opts.avatars]  seat →
 *        artwork. Presentation only, deliberately not part of the engine's seat record: `rules.js` should
 *        never carry anything a renderer invented. Seats with no entry get the built-in figure, so a
 *        table never depends on an outside file.
 */
export function mountTable(host, opts) {
  let o = { hero: 0, interactive: false, onAction: null, reveal: false, showBB: true, avatars: {}, ...opts }
  const root = document.createElement('div')
  root.className = 'table-wrap'
  host.append(root)

  // The layout depends on the width available, so a change of width is a re-layout — not a rescale.
  let lastWidth = -1, observer = null, naturalWidth = 0
  const available = () => {
    const w = root.clientWidth
    return Number.isFinite(w) && w > 0 ? w : 640
  }
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => { if (Math.abs(available() - lastWidth) >= 2) render() })
    observer.observe(root)
  }
  // Crossing the phone switch changes the SHAPE, so it redraws on the switch itself rather than waiting
  // for the column's width to be reported changed — a notification a background tab may never deliver.
  let phoneQuery = null
  try { if (typeof matchMedia === 'function') { phoneQuery = matchMedia(PHONE); phoneQuery.addEventListener('change', render) } } catch { phoneQuery = null }

  function render() {
    root.innerHTML = ''
    const s = o.state
    const n = s.seats.length
    const hero = o.hero ?? 0
    const m = metrics(readSizes(root))
    const W = available()
    lastWidth = W

    // Wide on a desktop, round on a phone — see ROUND_FLOOR for the one exception. Whichever it is, the
    // drawing is shown at its natural size, and scaled down only as far as the column makes it.
    const wide = layout(s, n, hero, m, false)
    naturalWidth = wide.box.w
    let L = wide
    if (isPhone()) L = layout(s, n, hero, m, true)
    else if (W / wide.box.w < ROUND_FLOOR) {
      const R = layout(s, n, hero, m, true)
      if (W / R.box.w > W / wide.box.w) L = R
    }
    const { box, felt, seats, bets } = L

    const svg = el('svg', {
      class: 'pk-table' + (L.round ? ' round-table' : ''),
      viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, role: 'img', 'aria-label': describeTable(s, o),
    })
    // natural size, and never wider than the column
    svg.style.width = `${Math.round(box.w)}px`
    svg.style.maxWidth = '100%'

    svg.append(el('ellipse', { class: 'felt', cx: 0, cy: 0, rx: felt.rx, ry: felt.ry }))
    svg.append(el('ellipse', { class: 'rail', cx: 0, cy: 0, rx: felt.rx + m.railOffset, ry: felt.ry + m.railOffset }))

    middle(svg, s, m, L.mid)
    for (const st of seats) svg.append(drawSeat(s, st, m))
    for (const b of bets) {
      svg.append(text(b.label, { class: 'bet-t', x: b.x, y: b.y + cap(m.bet) / 2, 'text-anchor': 'middle', style: px(m.bet) }))
      svg.append(el('line', { class: 'bet-rule', x1: b.x - b.w / 2 - 3, x2: b.x + b.w / 2 + 3, y1: b.y + cap(m.bet) / 2 + 4, y2: b.y + cap(m.bet) / 2 + 4 }))
    }

    root.append(svg)
    if (o.interactive && s.toAct != null) root.append(controls(s))
  }

  /**
   * The middle of the table, as one centred stack: board, then the pot, then the street. Laid out in
   * `middleLayout` so the wagers can be kept off it.
   */
  function middle(svg, s, m, mid) {
    for (const l of mid.lines) {
      if (l.kind === 'board') {
        s.board.forEach((c, i) => svg.append(card(c, -l.w / 2 + i * (mid.cardW + m.boardGap), l.y, false, mid.cardW, mid.cardH)))
      } else {
        svg.append(text(l.text, { class: l.kind, x: 0, y: l.y + l.h, 'text-anchor': 'middle', style: px(l.size) }))
      }
    }
  }

  /**
   * A seat is one centred column, the same shape at every seat:
   *
   *      figure         bottom-aligned in its slot, ringed when it is that seat's turn
   *      SB  name       the position tag rides on the name line — it used to be a chip above the
   *                     figure, which made every column taller and put it nearest the rail
   *      stack · bb
   *      cards
   *
   * Every row is placed from the SLOT and the type sizes, never from the artwork or the state. A
   * figure that happens to be short, a seat that comes to act, a player who folds — none of them move
   * anything, because a table whose seats shift between hands has to be re-read every hand.
   */
  function drawSeat(s, st, m) {
    const { k, x, y, col } = st
    const p = s.seats[k]
    const isHero = k === o.hero
    const toAct = s.toAct === k
    const g = el('g', {
      class: ['seat', p.folded ? 'folded' : '', p.allIn ? 'allin' : '', toAct ? 'to-act' : '', isHero ? 'hero' : ''].filter(Boolean).join(' '),
    })
    const slotMid = y - col.figH / 2
    if (isHero) g.append(el('circle', { class: 'hero-ring', cx: x, cy: slotMid, r: col.ringR }))
    if (toAct) g.append(el('circle', { class: 'act-ring', cx: x, cy: slotMid, r: col.ringR }))
    g.append(illustration(x, y, col.figH, k, o.avatars[k], p.name))

    // The name row carries the seat's position: the dealer disc, then SB or BB, then the name, centred
    // as one group. The button used to be a chip on the felt, and a chip on the felt can only ever be
    // NEAR its owner — measured across every seat count, it sat nearer a neighbour in a quarter of cases.
    // On the name line it cannot belong to anyone else.
    const row = col.row
    let rx = x - row.w / 2
    const base = y + col.nameBase
    if (row.dealer) {
      const r = row.dealerR
      g.append(el('circle', { class: 'dealer', cx: rx + r, cy: base - cap(m.name) / 2, r }))
      g.append(text('D', { class: 'dealer-t', x: rx + r, y: base - cap(m.name) / 2 + cap(m.dealer) / 2, 'text-anchor': 'middle', style: px(m.dealer) }))
      rx += 2 * r + row.gap
    }
    if (row.tag) {
      g.append(text(row.tag, { class: 'seat-tag', x: rx, y: base, style: px(m.tag) }))
      rx += row.tagW + row.gap
    }
    g.append(text(p.name, { class: 'seat-name', x: rx, y: base, style: px(m.name) }))

    const bbText = o.showBB && s.blinds.bb ? `${inBigBlinds(p.stack, s.blinds.bb)} bb` : ''
    if (p.stack <= 0) {
      g.append(text('ALL IN', { class: 'seat-detail', x, y: y + col.stackBase, 'text-anchor': 'middle', style: px(m.stack) }))
    } else if (col.twoLine && bbText) {
      g.append(text(chips(p.stack), { class: 'seat-detail', x, y: y + col.stackBase, 'text-anchor': 'middle', style: px(m.stack) }))
      g.append(text(bbText, { class: 'seat-detail bb', x, y: y + col.bbBase, 'text-anchor': 'middle', style: px(m.stack) }))
    } else {
      g.append(text(chips(p.stack) + (bbText ? ` · ${bbText}` : ''), { class: 'seat-detail', x, y: y + col.stackBase, 'text-anchor': 'middle', style: px(m.stack) }))
    }

    const shown = o.reveal || isHero || o.hero == null
    if (p.hole && !p.folded) {
      g.append(card(p.hole[0], x - m.cardW - m.cardGap / 2, y + col.cardsTop, !shown, m.cardW, m.cardH))
      g.append(card(p.hole[1], x + m.cardGap / 2, y + col.cardsTop, !shown, m.cardW, m.cardH))
    }
    return g
  }

  /**
   * Where everything goes, for one orientation.
   *
   * Seats are PLACED, not looked up. Each starts on the rail in its own direction and is pushed straight
   * out along that line until nothing of it is within `railGap` of the rail; then any two seats closer
   * than `seatPad` are pushed apart the same way until none are. The old version put seats on a fixed
   * ellipse per seat count, and measured against drawn pixels that ellipse had cards 27px into the rail
   * at three-handed, 17px at six-handed, and the hero's figure sitting on the felt heads-up. A placement
   * that is computed cannot drift out of step with the column it is placing.
   */
  function layout(s, n, hero, m, round) {
    const felt = feltFor(n, round)
    const sb = sbSeat(s), bb = bbSeat(s)

    // the name row of each seat — dealer disc, position tag, name — measured once
    const rowFor = (p, k) => {
      const tag = k === sb ? 'SB' : k === bb ? 'BB' : null
      const dealer = k === s.button
      const gap = Math.round(m.name * 0.35), dealerR = Math.round(m.dealer * 0.72)
      const tagW = tag ? measure(tag, m.tag, 700, 0.08) : 0
      const nameW = measure(p.name, m.name, 600, 0.06)
      const w = (dealer ? 2 * dealerR + gap : 0) + (tag ? tagW + gap : 0) + nameW
      return { tag, dealer, gap, dealerR, tagW, w }
    }
    const rows = s.seats.map(rowFor)
    // one nominal column width for every seat, from the widest thing any seat could show — so a stack
    // growing from 9,800 to 24,800 mid-hand, or the button moving on, never shifts a seat sideways
    const nameW = Math.max(...s.seats.map((p, k) => measure(p.name, m.name, 600, 0.06)
      + 2 * Math.round(m.dealer * 0.72) + measure('BB', m.tag, 700, 0.08) + 2 * Math.round(m.name * 0.35)))
    const twoLine = round && o.showBB
    const stackW = twoLine ? measure('188.8 bb', m.stack, 400, 0.04) : measure('88.8k · 188 bb', m.stack, 400, 0.04)
    const textW = Math.max(nameW, stackW)

    const cols = s.seats.map((p, k) => {
      const isHero = k === hero && o.hero != null
      const figH = isHero ? m.hero : m.figure
      const ringR = figH / 2 + (isHero ? 5 : 3)
      const dip = ringR - figH / 2                          // how far the ring reaches below the slot
      const nameBase = dip + m.gapFigName + cap(m.name)
      const stackBase = nameBase + desc(m.name) + m.gapLines + cap(m.stack)
      const bbBase = stackBase + desc(m.stack) + Math.round(m.gapLines * 0.7) + cap(m.stack)
      const cardsTop = (twoLine ? bbBase : stackBase) + desc(m.stack) + m.gapCards
      return {
        figH, ringR, nameBase, stackBase, bbBase, cardsTop, twoLine,
        row: rows[k],
        top: figH / 2 + ringR,                              // above the anchor (the slot floor)
        bottom: cardsTop + m.cardH,                         // below it — cards are always reserved
        half: Math.max(ringR, m.cardW + m.cardGap / 2, textW / 2),
        blockTop: dip,                                      // where the rectangular part begins
      }
    })

    // the clearance ellipse: the rail's outer edge plus the gap
    const clear = { rx: felt.rx + m.railOffset + m.railStroke / 2 + m.railGap, ry: felt.ry + m.railOffset + m.railStroke / 2 + m.railGap }
    const inside = (x, y) => (x / clear.rx) ** 2 + (y / clear.ry) ** 2 < 1
    const intrudes = (c, ax, ay) => {
      // the ring as a circle, and the text-and-cards block as a rectangle
      for (let i = 0; i < 32; i++) {
        const a = i * Math.PI / 16
        if (inside(ax + c.ringR * Math.cos(a), ay - c.figH / 2 + c.ringR * Math.sin(a))) return true
      }
      const x1 = ax - c.half, x2 = ax + c.half, y1 = ay + c.blockTop, y2 = ay + c.bottom
      for (let i = 0; i <= 10; i++) {
        const fx = x1 + (x2 - x1) * i / 10, fy = y1 + (y2 - y1) * i / 10
        if (inside(fx, y1) || inside(fx, y2) || inside(x1, fy) || inside(x2, fy)) return true
      }
      return false
    }
    const rail = { rx: felt.rx + m.railOffset, ry: felt.ry + m.railOffset }
    const angles = round ? roundAngles(cols, n, hero) : null
    const seats = cols.map((col, k) => {
      const th = round ? angles[k] : seatAngle(k, n, hero)
      const dir = { x: rail.rx * Math.cos(th), y: rail.ry * Math.sin(th) }
      let t = 1
      while (t < 6 && intrudes(col, t * dir.x, t * dir.y)) t += 0.004
      return { k, col, dir, t }
    })
    const rect = st => {
      const x = st.t * st.dir.x, y = st.t * st.dir.y
      return { x1: x - st.col.half, x2: x + st.col.half, y1: y - st.col.top, y2: y + st.col.bottom }
    }
    const overlap = (a, b) => a.x1 < b.x2 + m.seatPad && b.x1 < a.x2 + m.seatPad && a.y1 < b.y2 + m.seatPad && b.y1 < a.y2 + m.seatPad
    for (let it = 0; it < 2000; it++) {
      let moved = false
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (overlap(rect(seats[i]), rect(seats[j]))) { seats[i].t += 0.004; seats[j].t += 0.004; moved = true }
      }
      if (!moved) break
    }
    for (const st of seats) { st.x = st.t * st.dir.x; st.y = st.t * st.dir.y }

    const mid = middleLayout(s, m, round)

    // Wagers sit on an ellipse inset from the felt edge, at each seat's own angle — in front of the
    // player, the same depth from the rail at every seat. Where that spot is on the board (a round
    // table's felt is small, and five cards nearly fill it) or on another wager, the wager slides round
    // its ring, away from the middle, by the smallest step that clears. It stays in front of its player.
    const inset = Math.round(Math.min(felt.rx, felt.ry) * 0.3)
    const bets = []
    const midBox = { x1: -mid.w / 2 - 6, x2: mid.w / 2 + 6, y1: -mid.h / 2 - 6, y2: mid.h / 2 + 6 }
    const betBox = (b, x, y) => ({ x1: x - b.w / 2 - 4, x2: x + b.w / 2 + 4, y1: y - cap(m.bet) / 2 - 3, y2: y + cap(m.bet) / 2 + 7 })
    const clash = (A, B) => A.x1 < B.x2 && B.x1 < A.x2 && A.y1 < B.y2 && B.y1 < A.y2
    s.seats.forEach((p, k) => {
      if (!(p.committed > 0)) return
      const label = chips(p.committed)
      const b = { k, label, w: measure(label, m.bet, 700, 0.02) }
      const base = seatAngle(k, n, hero)
      // slide away from the horizontal axis first: that is the direction that leaves the board behind
      const away = Math.sin(base) >= 0 ? 1 : -1
      for (const deg of [0, 4, 8, 12, 16, 20, 25, 30, 36, -4, -8, -12]) {
        const th = base + away * deg * Math.PI / 180
        const x = (felt.rx - inset) * Math.cos(th), y = (felt.ry - inset) * Math.sin(th)
        const box = betBox(b, x, y)
        if (!clash(box, midBox) && !bets.some(o => clash(box, betBox(o, o.x, o.y)))) { b.x = x; b.y = y; break }
      }
      if (b.x == null) { b.x = (felt.rx - inset) * Math.cos(base); b.y = (felt.ry - inset) * Math.sin(base) }
      bets.push(b)
    })

    let x1 = -rail.rx - m.railStroke, x2 = rail.rx + m.railStroke, y1 = -rail.ry - m.railStroke, y2 = rail.ry + m.railStroke
    for (const st of seats) { const r = rect(st); x1 = Math.min(x1, r.x1); x2 = Math.max(x2, r.x2); y1 = Math.min(y1, r.y1); y2 = Math.max(y2, r.y2) }
    const box = { x: x1 - m.viewPad, y: y1 - m.viewPad, w: x2 - x1 + 2 * m.viewPad, h: y2 - y1 + 2 * m.viewPad }
    return { round, felt, seats, bets, box, mid }
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
    /** The wide oval's natural width — what a drill needs beside its question to show it at full size. */
    get naturalWidth() { return naturalWidth },
    destroy() { if (observer) observer.disconnect(); if (phoneQuery) phoneQuery.removeEventListener('change', render); root.remove() },
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
 * The seat's figure, bottom-aligned in its slot so every seat stands on the same line.
 *
 * The artwork is CROPPED TO ITS INK before it is fitted. Every shigureni file is a 1000px square that is
 * 70–86% transparent, and the drawing sits somewhere different in each: the blanket is wide and short,
 * the runner tall and narrow. Fitted as whole squares, the blanket drew nearly twice the width of the
 * runner in the same slot, so the seats looked randomly sized. Cropping to the measured ink box (stored
 * beside each file in js/avatars.js) makes every figure fill its slot the same way. Cropping is
 * permitted by the licence; redrawing is not, and none is done.
 *
 * Any artwork passed in here belongs to whoever made it. `content/images/avatars/manifest.json` is where
 * each file's source and licence are recorded — see the README there before adding any.
 */
function illustration(cx, floor, figH, k, art, name) {
  const g = el('g', { class: `portrait tint-${k % 9}` })
  const src = typeof art === 'string' ? art : art && art.src
  if (src) {
    const size = (art && art.size) || [1000, 1000]
    const [ix, iy, iw, ih] = (art && art.ink) || [0, 0, size[0], size[1]]
    const slotW = figH * 0.95
    // an inner svg whose viewBox is the ink box: the image inside it is drawn at its own pixel size, and
    // the viewBox does the crop and the fit — bottom-aligned, centred
    const frame = el('svg', {
      x: cx - slotW / 2, y: floor - figH, width: slotW, height: figH,
      viewBox: `${ix} ${iy} ${iw} ${ih}`, preserveAspectRatio: 'xMidYMax meet', overflow: 'hidden',
    })
    const img = el('image', { href: src, x: 0, y: 0, width: size[0], height: size[1] })
    const t = el('title'); t.textContent = name
    img.append(t)
    frame.append(img)
    g.append(frame)
  } else {
    // No artwork: our own marker gets a disc, because unlike an illustration it has no silhouette of
    // its own and would read as a smudge.
    const r = figH / 2 - 3
    g.append(el('circle', { class: 'av-disc', cx, cy: floor - figH / 2, r }))
    g.append(builtInFigure(cx, floor - figH / 2, r))
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

function card(c, x, y, faceDown, w, h) {
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
  if (s.board.length) parts.push(`board ${s.board.map(cardGlyph).join(' ')}`)
  parts.push(`pot ${potTotal(s) || (s.result ? s.result.total : 0)}`)
  if (s.toAct != null) parts.push(`${s.seats[s.toAct].name} to act`)
  return parts.join(', ')
}

// --- hand comparison --------------------------------------------------------

/**
 * A board and a set of hands, as rows of cards. NOT a table.
 *
 * "Which hand wins?" is a card comparison, not a spot: there are no blinds, no pot, no button and
 * nobody to act, and mountTable would draw all of that as noise. It also draws exactly two hole cards
 * per seat — correct for hold'em, wrong for a five-card ranking question, which is how a drill came to
 * show two cards while asking about five.
 *
 * Row labels are A, B, C… to match the option buttons the reader is choosing between.
 */
const HAND_CARD_W = 46, HAND_CARD_H = 64

export function mountHands(host, { board = [], hands = [], caption = null } = {}) {
  const LBL = 26, GAP = 8, PAD = 10
  const widest = Math.max(board.length, ...hands.map(h => h.length), 1)
  const W2 = PAD * 2 + LBL + widest * HAND_CARD_W + (widest - 1) * GAP
  const rowH = HAND_CARD_H + 16
  const rows = (board.length ? 1 : 0) + hands.length
  const H2 = PAD * 2 + rows * rowH - 16

  const root = document.createElement('div')
  root.className = 'hands-wrap'
  const svg = el('svg', { class: 'pk-hands', viewBox: `0 0 ${W2} ${H2}`, role: 'img', 'aria-label': describeHands(board, hands) })

  let y = PAD
  const row = (label, cards, cls) => {
    svg.append(text(label, { class: `hand-label ${cls}`, x: PAD + LBL - 8, y: y + HAND_CARD_H / 2 + 5, 'text-anchor': 'end' }))
    cards.forEach((c, i) => svg.append(card(c, PAD + LBL + i * (HAND_CARD_W + GAP), y, false, HAND_CARD_W, HAND_CARD_H)))
    y += rowH
  }
  if (board.length) row('', board, 'board')
  hands.forEach((h, i) => row(String.fromCharCode(65 + i), h, 'hand'))

  root.append(svg)
  if (caption) {
    const cap = document.createElement('div')
    cap.className = 'hands-caption'
    cap.textContent = caption
    root.append(cap)
  }
  host.append(root)
  return { destroy() { root.remove() } }
}

/**
 * One row of cards as a small SVG, in rendered pixels — the hand rankings chart. Drawn by the same
 * card() as every table and drill, so a card in the chart is the card the reader meets later.
 * `faded` holds the indexes drawn pale (the chart's kickers).
 */
export function cardRowSVG(cards, { height = 48, gap = 4, faded = [], label = null } = {}) {
  const w = Math.round(height * 0.72)
  const W = cards.length * w + (cards.length - 1) * gap
  // a pixel of room all round, or the card edges' outer half is clipped
  const svg = el('svg', { class: 'pk-cards', width: W + 2, height: height + 2, viewBox: `-1 -1 ${W + 2} ${height + 2}`,
    role: 'img', 'aria-label': label || cards.map(cardGlyph).join(' ') })
  cards.forEach((c, i) => {
    const g = card(c, i * (w + gap), 0, false, w, height)
    if (faded.includes(i)) g.setAttribute('class', 'card kicker')
    svg.append(g)
  })
  return svg
}

function describeHands(board, hands) {
  const say = cs => cs.map(cardGlyph).join(' ')
  const parts = board.length ? [`board ${say(board)}`] : []
  hands.forEach((h, i) => parts.push(`${String.fromCharCode(65 + i)} ${say(h)}`))
  return parts.join(', ')
}
