// Hand strength: the best five-card hand out of five, six or seven cards.
//
// Why this and not a lookup table: the two-plus-two 7-card table is ~130 MB and the Cactus-Kev tables
// need a generation step. This site has no build step and vendors nothing it cannot read, so the
// evaluator counts ranks and suits directly. It costs roughly a microsecond, which is ample — a
// 50,000-trial Monte Carlo is 100,000 evaluations.
//
// `score` is a single integer; higher always wins, equal always ties. It packs the category and exactly
// five tiebreakers in base 13. The tiebreaker count is fixed per category, so padding with zeros can
// never collide with a real deuce (rank 0) in a shorter list.

import { rankOf, suitOf, RANKS } from './cards.js'

export const HIGH_CARD = 0, PAIR = 1, TWO_PAIR = 2, TRIPS = 3, STRAIGHT = 4
export const FLUSH = 5, FULL_HOUSE = 6, QUADS = 7, STRAIGHT_FLUSH = 8

export const CATEGORY_NAMES = [
  'High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight',
  'Flush', 'Full house', 'Four of a kind', 'Straight flush',
]

const pack = (cat, tb) => {
  let s = cat
  for (let i = 0; i < 5; i++) s = s * 13 + (tb[i] || 0)
  return s
}

/**
 * Highest card of a straight present in `mask` (bit i set = rank i present), or -1.
 * The wheel A-2-3-4-5 is a straight to the five, so it is checked separately — an ace is the only
 * card that plays at both ends and it is the classic off-by-one in a hand evaluator.
 */
export function straightHigh(mask) {
  for (let hi = 12; hi >= 4; hi--) {
    if ((mask & (0b11111 << (hi - 4))) === (0b11111 << (hi - 4))) return hi
  }
  const WHEEL = (1 << 12) | 0b1111   // A,5,4,3,2
  return (mask & WHEEL) === WHEEL ? 3 : -1
}

/**
 * @param {number[]} cards 5..7 card integers
 * @returns {{score:number, cat:number, tb:number[]}} tb is the tiebreaker list, high to low
 */
export function evaluate(cards) {
  if (cards.length < 5) throw new Error(`evaluate needs at least 5 cards, got ${cards.length}`)

  const rankCount = new Uint8Array(13)
  const suitCount = new Uint8Array(4)
  const suitMask = new Uint16Array(4)
  let mask = 0

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i], r = rankOf(c), u = suitOf(c)
    rankCount[r]++
    suitCount[u]++
    suitMask[u] |= 1 << r
    mask |= 1 << r
  }

  // flush / straight flush
  let flushSuit = -1
  for (let u = 0; u < 4; u++) if (suitCount[u] >= 5) { flushSuit = u; break }

  if (flushSuit >= 0) {
    const sfHigh = straightHigh(suitMask[flushSuit])
    if (sfHigh >= 0) return result(STRAIGHT_FLUSH, [sfHigh])
    const top = topRanks(suitMask[flushSuit], 5)
    return result(FLUSH, top)
  }

  // group ranks by count, each group high to low
  const quads = [], trips = [], pairs = [], singles = []
  for (let r = 12; r >= 0; r--) {
    const n = rankCount[r]
    if (n === 4) quads.push(r)
    else if (n === 3) trips.push(r)
    else if (n === 2) pairs.push(r)
    else if (n === 1) singles.push(r)
  }

  if (quads.length) {
    // the kicker is the best card outside the quads — it may be a pair or a trip card
    const kicker = bestExcluding(rankCount, [quads[0]], 1)
    return result(QUADS, [quads[0], kicker[0]])
  }
  if (trips.length >= 2) return result(FULL_HOUSE, [trips[0], trips[1]])     // two trips: the lower plays as the pair
  if (trips.length === 1 && pairs.length) return result(FULL_HOUSE, [trips[0], pairs[0]])

  const stHigh = straightHigh(mask)
  if (stHigh >= 0) return result(STRAIGHT, [stHigh])

  if (trips.length === 1) return result(TRIPS, [trips[0], ...bestExcluding(rankCount, [trips[0]], 2)])
  if (pairs.length >= 2) return result(TWO_PAIR, [pairs[0], pairs[1], bestExcluding(rankCount, [pairs[0], pairs[1]], 1)[0]])
  if (pairs.length === 1) return result(PAIR, [pairs[0], ...bestExcluding(rankCount, [pairs[0]], 3)])
  return result(HIGH_CARD, singles.slice(0, 5))
}

function result(cat, tb) { return { score: pack(cat, tb), cat, tb } }

/** The `n` highest ranks set in `mask`, high to low. */
function topRanks(mask, n) {
  const out = []
  for (let r = 12; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r)
  return out
}

/** The `n` highest ranks present, skipping `exclude`. Counts, not a mask: a pair can supply a kicker. */
function bestExcluding(rankCount, exclude, n) {
  const out = []
  for (let r = 12; r >= 0 && out.length < n; r--) {
    if (rankCount[r] && !exclude.includes(r)) out.push(r)
  }
  return out
}

export const compare = (a, b) => a.score - b.score

const PLURALS = ['deuces', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines',
  'tens', 'jacks', 'queens', 'kings', 'aces']
const plural = r => PLURALS[r]

/** Human wording, for the UI and for readable test failures. */
export function describe(ev) {
  const [a, b] = ev.tb
  switch (ev.cat) {
    case STRAIGHT_FLUSH: return a === 12 ? 'Royal flush' : `Straight flush, ${RANKS[a]} high`
    case QUADS: return `Four of a kind, ${plural(a)}`
    case FULL_HOUSE: return `Full house, ${plural(a)} full of ${plural(b)}`
    case FLUSH: return `Flush, ${RANKS[a]} high`
    case STRAIGHT: return a === 3 ? 'Straight, five high (the wheel)' : `Straight, ${RANKS[a]} high`
    case TRIPS: return `Three of a kind, ${plural(a)}`
    case TWO_PAIR: return `Two pair, ${plural(a)} and ${plural(b)}`
    case PAIR: return `One pair, ${plural(a)}`
    default: return `High card, ${RANKS[a]}`
  }
}
