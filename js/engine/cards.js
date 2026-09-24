// Card primitives. A card is an integer 0..51:
//   rank = c >> 2   (0 = deuce, 8 = ten, 12 = ace)
//   suit = c & 3    (0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades)
// Integers rather than objects because the equity code evaluates millions of hands and allocation is
// the whole cost. Nothing else in the app should care about the encoding — use the helpers.

export const RANKS = '23456789TJQKA'
export const SUITS = 'cdhs'
export const SUIT_GLYPH = ['♣', '♦', '♥', '♠']
export const RED_SUITS = [1, 2]   // diamonds and hearts

export const rankOf = c => c >> 2
export const suitOf = c => c & 3
export const makeCard = (rank, suit) => (rank << 2) | suit
export const isRed = c => (c & 3) === 1 || (c & 3) === 2

/** "As" / "Th" / "2c" → 0..51. Throws on anything else, so a typo in a lesson fails loudly. */
export function parseCard(s) {
  if (typeof s !== 'string' || s.length !== 2) throw new Error(`Bad card: ${JSON.stringify(s)}`)
  const r = RANKS.indexOf(s[0].toUpperCase())
  const u = SUITS.indexOf(s[1].toLowerCase())
  if (r < 0 || u < 0) throw new Error(`Bad card: ${s}`)
  return makeCard(r, u)
}

export const cardStr = c => RANKS[rankOf(c)] + SUITS[suitOf(c)]

/** "As Kd" or "AsKd" or ["As","Kd"] → [int, int]. */
export function parseCards(input) {
  if (Array.isArray(input)) return input.map(parseCard)
  const s = String(input).replace(/[\s,]+/g, '')
  if (s.length % 2) throw new Error(`Bad card list: ${input}`)
  const out = []
  for (let i = 0; i < s.length; i += 2) out.push(parseCard(s.slice(i, i + 2)))
  return out
}

export const cardsStr = cards => cards.map(cardStr).join(' ')

export function makeDeck() {
  const d = new Array(52)
  for (let i = 0; i < 52; i++) d[i] = i
  return d
}

/** Deck minus the given cards. Used everywhere a runout is dealt. */
export function deckWithout(dead) {
  const seen = new Uint8Array(52)
  for (const c of dead) seen[c] = 1
  const out = []
  for (let i = 0; i < 52; i++) if (!seen[i]) out.push(i)
  return out
}

// A seeded PRNG, so every Monte Carlo result in the tests is reproducible. Math.random would make a
// failing equity assertion impossible to re-run.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates, in place. */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t
  }
  return arr
}
