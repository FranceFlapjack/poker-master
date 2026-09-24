# Poker Master

A no-limit hold'em course as a website, the third of the Master series alongside
[Chess Master](https://franceflapjack.github.io/chess-master/) and
[Go Master](https://franceflapjack.github.io/go-master/). Not yet published.

Two readers, one app. The course teaches someone who has never played a hand — short lesson, a live table
inside the text, then drills. The trainers cover what a tournament actually asks of you: starting-hand
ranges, pot odds, EV, ICM, and push/fold. A `Beginner` / `Grinder` switch decides how much jargon and how
much arithmetic you see.

Static site, no build. Run locally:

```
python3 scripts/serve.py 8002
```

Open http://localhost:8002. Check the engine with `node scripts/engine-test.mjs`, the drill answers with
`node scripts/verify-drills.mjs`, and the content with `node scripts/check-content.mjs`.

The table, the betting rules and all the poker maths are our own (`js/table.js`, `js/engine/`). The only
library is [marked](https://github.com/markedjs/marked) (MIT). See `vendor/VERSIONS.md`.

**On "GTO":** hand evaluation, equity, pot odds, ICM and heads-up push/fold Nash are computed here and are
real. Multiway push/fold is an approximation and is labelled as one. There is no postflop solver — postflop
is served by equity against an assumed range, pot odds, MDF and blockers, which is useful and honest about
what it is. No chart is ever labelled "GTO" unless we computed it.

Every lesson lists its sources; quotations come only from public-domain or Creative Commons material.
Nothing here assists a hand in progress — review is post-session, always.
