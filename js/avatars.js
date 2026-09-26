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

// THE INK BOX of each file: [x, y, width, height] of the drawn pixels, in the file's own pixels, and
// the file's size. Every one of these is a 1000px square that is 70–86% transparent, with the drawing
// somewhere different in each — so the table crops to this box before fitting, or the seats come out
// randomly sized. Measured by alpha (> 24/255) across every pixel of each file, 2026-09-26. If a file
// is replaced, its box must be measured again; a stale one crops the drawing.
const ART = {
  'shigureni-illust-111.webp': { size: [1000, 1000], ink: [245, 74, 484, 814] },
  'shigureni-illust-123.png':  { size: [1001, 1001], ink: [282, 110, 419, 800] },
  'shigureni-illust-66.webp':  { size: [1000, 1000], ink: [260, 99, 440, 848] },
  'shigureni-illust-102.webp': { size: [1000, 1000], ink: [124, 235, 751, 539] },
  'shigureni-illust-124.png':  { size: [1001, 1001], ink: [194, 123, 652, 763] },
  'shigureni-illust-87.webp':  { size: [1000, 1000], ink: [202, 132, 561, 735] },
  'shigureni-illust-76.webp':  { size: [1000, 1000], ink: [223, 108, 515, 764] },
  'shigureni-illust-37.webp':  { size: [1000, 1000], ink: [269, 115, 465, 766] },
  'shigureni-illust-119.webp': { size: [1001, 1001], ink: [278, 109, 409, 780] },
}
const art = file => ({ src: DIR + file, ...ART[file] })

/**
 * YOUR seat. Deliberately the loudest thing at the table — bunny ears, popcorn and a soft toy, against
 * eight people who are variously running, working or lying down with a headache. The table component
 * also draws the hero larger and ringed; this is the third signal, and the one you notice first.
 */
export const HERO_AVATAR = art('shigureni-illust-111.webp')

/** The opponents, in the order they are handed out. No two share a colour or a silhouette. */
export const OPPONENT_AVATARS = [
  art('shigureni-illust-123.png'),    // running — yellow
  art('shigureni-illust-66.webp'),    // a sales call — denim blue
  art('shigureni-illust-102.webp'),   // a horror film, under a blanket — purple
  art('shigureni-illust-124.png'),    // having blood taken — teal
  art('shigureni-illust-87.webp'),    // a headache — periwinkle
  art('shigureni-illust-76.webp'),    // new skincare — green apron
  art('shigureni-illust-37.webp'),    // hunting a lost tweet — navy
  art('shigureni-illust-119.webp'),   // stepping on the scales — pink
]

/** Kept so anything that just wants "the set" still works. Hero first, then the eight. */
export const DEFAULT_AVATARS = [HERO_AVATAR, ...OPPONENT_AVATARS]

/** Our own figure, drawn for this project — the zero-dependency fallback. */
export const PLACEHOLDER = DIR + 'example-figure.svg'

/**
 * A seat → artwork map for an n-handed table. Each entry is `{src, ink, size}`.
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
