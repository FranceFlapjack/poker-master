# Roadmap

The agreed phases. Read this before starting work; update it as phases land.

## Why this app exists

Two readers who want opposite things from the same subject:

1. **A friend who has never played.** A linear course — short lesson, a table to act on, immediate
   feedback. This is the *first* purpose, so it ships before the trainers.
2. **The owner**, preparing for a **live MTT, normal structure**. Not basics: ranges, pot odds, EV, ICM,
   push/fold.

A third pillar — reviewing hands you have played — is **roadmap, not v1**, by the owner's call. See
"Phase 8" for why it does not port cleanly from Chess Master.

## Status

| Phase | Deliverable | State |
|---|---|---|
| **0** | Repo skeleton from the sibling pattern; accent chosen; shell boots | ✅ done 2026-09-24 |
| **1** | `js/engine/`: `cards`, `evaluator`, `rules`, `hand`, `ranges`, `equity`; `js/table.js`; `scripts/engine-test.mjs` | next |
| **2** | Learn: `lesson.js` + `exercise.js` pipeline, mode switch, tracks 0–1 written | |
| **3** | `engine/ev.js` → Equity & Odds sandbox + Preflop range trainer | |
| **4** | `js/bot/` + Play a hand + track 2 written | |
| **5** | `engine/icm.js` + `engine/pushfold.js` → Push/fold trainer + ICM lab | |
| **6** | Tracks 3–4 written, weak-spot report, live MTT utilities, polish | |
| **7** | Publish to GitHub Pages → **then** copy `js/family.js` into `chess-master` and `go-master` | |
| **8** | *Roadmap:* manual hand builder + per-decision review | |

## Phase 0 — done 2026-09-24

Skeleton ported from `go-master` rather than written fresh, so the series stays consistent:
`index.html`, `css/app.css` (goban block stripped, poker table block stubbed), `css/tokens.css` (new
navy draft), `js/app.js` (sidebar + home only), `js/progress.js` (rewritten for poker: hands not stones,
per-topic accuracy added, streak and export/import deliberately absent), `js/activity-grid.js`,
`js/family.js` (**Poker entry added — this copy is ahead of the siblings**), `js/frontmatter.js`,
`js/sound.js`, `vendor/marked`, `scripts/serve.py` on **port 8002**, `.nojekyll`.

Verified by running it: boots with no console errors, the curriculum renders greyed out, the family
bubble opens and lists Chess and Go with Poker correctly omitted.

### Open decisions for the owner

Three judgement calls were made to get Phase 0 running. All are one-line diffs; none should survive by
default just because they shipped first.

1. **The home hero has no quotation.** Chess Master and Go Master each open with a sourced quote; a poker
   one was deliberately *not* invented, per the rule about verifying against a source rather than trusting
   memory. A candidate would need to be public domain (e.g. John Blackbridge, *The Complete Poker Player*,
   1875) and checked against a real copy before use.
2. **Activity grid thresholds were rescaled**, `js/activity-grid.js`: go-master shades at 10/30/80 stones
   per day, this uses **5/15/40 hands**, because a hand is a far coarser unit than a stone. The right
   numbers depend on how much the owner actually drills; revisit once there is real data in the grid.
3. **Beginner mode defaults ON**, `js/progress.js` — go-master's equivalent defaults off. The reasoning is
   that the first reader of this app is someone learning the game, so the friend should not have to find a
   switch. It does mean the owner sees the First steps track on first load and has to turn it off once.

## Phase 1 — the engine, first

The engine comes before any content, because `scripts/verify-drills.mjs` checks every lesson answer
against it. Content written before the engine exists cannot be trusted.

`js/table.js` is the load-bearing piece — street progression, turn order, legal actions, bet/raise sizing,
pot and **side-pot** management, showdown, **2–9 handed**. It is needed by the lessons' interactive spots,
by play-vs-bots, and by the Phase 8 replayer. One module, three features.

Test targets for `scripts/engine-test.mjs`:
- evaluator: every hand category, kicker and tie edges, the wheel (A-5).
- rules: legal actions at every node; min-raise; all-in under a min-raise; **side pots in multi-way
  all-ins** — the usual place hand engines break.
- equity: enumeration deterministic and cross-checked against published values hardcoded as fixtures;
  Monte Carlo converges within its reported standard error.
- ranges: parse → grid → re-serialize round-trip; combo counts with and without card removal.

## Phase 8 — why review does not port from Chess Master

Chess Master's **My games** page works because two things exist: a public API returning the owner's
*finished* games, and an engine that evaluates any position near-objectively.

Poker has neither. **Live MTT hands are held by no site and have no API**, so the input has to be a manual
hand builder — a different build entirely from fetching by username. And evaluation is range-vs-range
under hidden information, so any "accuracy %" is partly an artifact of the opponent range assumed. That is
why the owner was unsure what this part should be, and why it is deferred rather than guessed at.

What is honest, when it is built: per-decision equity against an **explicitly stated** assumed range,
pot odds/MDF, EV of each candidate action, and a chip-EV or ICM-EV delta — with the range assumption
visible in the UI, not hidden behind a score.

Phase 1 defines the `Hand` record in `js/engine/hand.js` so this needs no rewrite later.

## Standing risk

**Content is the long pole, not code.** Five tracks of lessons and drills is a lot of writing, and it is
the part no library provides. Go Master and Chess Master both took far longer on content than on engine.
