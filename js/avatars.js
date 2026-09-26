// The seat portraits.
//
// Artwork by shigureni (https://shigureni.com), used under the terms at https://shigureni.com/terms.
// Copyright is theirs, not ours. Every file, its source page and its licence are recorded in
// content/images/avatars/manifest.json — read that, and the README beside it, before adding, swapping
// or editing anything here. In particular: these may be resized, cropped and flipped, but never
// redrawn, traced, or put through a generative model.
//
// WHY THESE AND NOT THE ICON SET. The first draft used shigureni's icons, and eight of the nine were
// one character in eight colours — the same pose holding the same fan. That is not nine players, it is
// one player photocopied, and at a glance no seat could be told from another. The icon section only has
// twelve images in it, so the fix was not to pick better icons; it was to leave them.
//
// These come from the main illustration library instead, chosen one per activity and spread across the
// colour wheel: a runner in yellow, a blanket in purple, denim, teal, periwinkle, a green apron, navy,
// pink. Same artist and the same face — that part is unavoidable, because the whole catalogue is one
// character — but no two seats share an outfit, a prop or a silhouette.
//
// Paths are relative to the site root, because the site lives under /poker-master/ on GitHub Pages and
// nothing here may be absolute.

const DIR = 'content/images/avatars/'

/**
 * YOUR seat. Deliberately the loudest thing at the table — bunny ears, popcorn and a soft toy, against
 * eight people who are variously running, working or lying down with a headache. The table component
 * also draws the hero larger and ringed; this is the third signal, and the one you notice first.
 */
export const HERO_AVATAR = DIR + 'shigureni-illust-111.webp'

/** The opponents, in the order they are handed out. No two share a colour or a silhouette. */
export const OPPONENT_AVATARS = [
  DIR + 'shigureni-illust-123.png',    // running — yellow
  DIR + 'shigureni-illust-66.webp',    // a sales call — denim blue
  DIR + 'shigureni-illust-102.webp',   // a horror film, under a blanket — purple
  DIR + 'shigureni-illust-124.png',    // having blood taken — teal
  DIR + 'shigureni-illust-87.webp',    // a headache — periwinkle
  DIR + 'shigureni-illust-76.webp',    // new skincare — green apron
  DIR + 'shigureni-illust-37.webp',    // hunting a lost tweet — navy
  DIR + 'shigureni-illust-119.webp',   // stepping on the scales — pink
]

/** Kept so anything that just wants "the set" still works. Hero first, then the eight. */
export const DEFAULT_AVATARS = [HERO_AVATAR, ...OPPONENT_AVATARS]

/** Our own figure, drawn for this project — the zero-dependency fallback. */
export const PLACEHOLDER = DIR + 'example-figure.svg'

/**
 * A seat → portrait map for an n-handed table.
 *
 * `hero` always gets HERO_AVATAR, whichever seat number it is, so your own portrait never changes from
 * one spot to the next — a table you have to re-learn every hand is worse than no portraits at all.
 * `offset` rotates the OPPONENTS only; pass the hand number and they stop looking like fixtures while
 * you stay put. Seats beyond the set wrap, which only matters above nine.
 */
export function avatarsForSeats(n, { offset = 0, skip = [], hero = 0 } = {}) {
  const out = {}
  let pick = 0
  for (let seat = 0; seat < n; seat++) {
    if (skip.includes(seat)) continue
    if (seat === hero) { out[seat] = HERO_AVATAR; continue }
    out[seat] = OPPONENT_AVATARS[(pick + offset) % OPPONENT_AVATARS.length]
    pick++
  }
  return out
}
