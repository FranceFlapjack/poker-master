// The default set of seat portraits.
//
// Artwork by shigureni (https://shigureni.com), used under the terms at https://shigureni.com/terms.
// Copyright is theirs, not ours. Every file, its source page and its licence are recorded in
// content/images/avatars/manifest.json — read that, and the README beside it, before adding, swapping
// or editing anything here. In particular: these may be resized, cropped and flipped, but never
// redrawn, traced, or put through a generative model.
//
// Paths are relative to the site root, because the site lives under /poker-master/ on GitHub Pages and
// nothing here may be absolute.

export const DEFAULT_AVATARS = [
  'content/images/avatars/shigureni-icon-05.png',
  'content/images/avatars/shigureni-icon-06.png',
  'content/images/avatars/shigureni-icon-07.png',
  'content/images/avatars/shigureni-icon-08.png',
  'content/images/avatars/shigureni-icon-09.png',
  'content/images/avatars/shigureni-icon-10.png',
  'content/images/avatars/shigureni-icon-11.png',
  'content/images/avatars/shigureni-icon-12.png',
  'content/images/avatars/shigureni-icon-01.png',
]

/** Our own figure, drawn for this project — the zero-dependency fallback. */
export const PLACEHOLDER = 'content/images/avatars/example-figure.svg'

/**
 * A seat → portrait map for an n-handed table.
 *
 * `offset` rotates the assignment so the same seat number does not always wear the same outfit across
 * consecutive hands; pass the hand number and opponents stop looking like fixtures.
 * Seats beyond the set wrap, which only matters above nine.
 */
export function avatarsForSeats(n, { offset = 0, skip = [] } = {}) {
  const out = {}
  let pick = 0
  for (let seat = 0; seat < n; seat++) {
    if (skip.includes(seat)) continue
    out[seat] = DEFAULT_AVATARS[(pick + offset) % DEFAULT_AVATARS.length]
    pick++
  }
  return out
}
