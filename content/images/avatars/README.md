# Seat portraits

The small round image in each seat plate. Purely presentational: `js/table.js` takes them through
`mountTable(..., { avatars: { 0: 'content/images/avatars/x.png' } })`, and any seat without one gets the
built-in figure, so **the table never depends on a file here being present**.

Every file added here must have a row in `manifest.json` giving its source and licence. That is the same
rule the lessons follow with their `sources:` block, applied to images.

## Using shigureni free illust material

<https://shigureni.com> — terms at <https://shigureni.com/terms>, read 2026-09-24. Summarised here for
working purposes; **the terms themselves govern, and they change** (they were revised in August 2026).
Re-read them before adding anything.

What the terms allow that matters to us:

- Use in **apps and websites** is explicitly permitted, free, personal or commercial.
- Permitted editing: resizing, recolouring, cropping, flipping, adding text, simple compositing, animation.
  Cropping to a circle and scaling — which is all `table.js` does — is within this.

What the terms forbid, and these are the ones that constrain how this repo may be built:

- **Creating another illustration based on theirs by any means, including hand-drawing and tracing.**
  So nobody redraws these characters as SVG, however convenient that would be for a vector table.
- **Feeding their illustrations into generative AI**, or using anything generated from them.
- Changing a character so it reads as a different person (adding facial features, changing gender).
- Uses where the illustration itself is the product — sticker packs, templates, merchandise.
- Copyright stays with shigureni. These files are used here, not owned here.

**The commercial ceiling.** Up to 5 illustrations per production are free; from the sixth onwards each
costs ¥1,000. This applies to 商用利用 — use that generates revenue. Poker Master is a free site with no
revenue, so on its face the ceiling does not apply, **but a nine-handed table wants nine portraits, which
is where it would bite if that ever changed.** That determination is the owner's, not something this file
decides.

The icon set at <https://shigureni.com/icon/> is the avatar-shaped material — square, around 1201×1201.

## Adding one

1. Download from the site itself, not from a hotlink. Framer's CDN urls are not stable addresses.
2. Drop the file in this folder with a descriptive name.
3. Add a row to `manifest.json` with its page url, title and licence.
4. Pass it through the `avatars` option; nothing reads this folder automatically.
