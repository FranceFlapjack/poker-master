# Poker Master

A no-limit hold'em course as a website: lessons with a live table inside the text, drills that are checked
against the app's own engine, and trainers for the maths a tournament actually asks of you (ranges, pot
odds, ICM, push/fold). The third app of the Master series.

Static site, **no build step, no framework** — deliberate, like the siblings. Plain HTML/CSS/ES modules;
libraries are vendored under `vendor/` (see `vendor/VERSIONS.md`). **Live on GitHub Pages from `main`** at
https://franceflapjack.github.io/poker-master/ (published 2026-09-27): **a push to main is a deploy**, so
merge only what is tested. All paths must stay relative (the site lives under `/poker-master/`), and file
names must match their references exactly — Pages is case-sensitive, a Mac is not.

**Before starting any work here, read `ROADMAP.md`** — it holds the agreed phases and what is next.

## About the owner

- Former architect, now a student pilot. Comfortable with HTML/JS and Python. Knows poker already and is
  preparing for a **live MTT with a normal (non-turbo) structure**; no fixed date.
- **Two audiences, and they pull in opposite directions.** The first purpose of this app is to teach a
  friend who has never played. The second is tournament maths for the owner. The `Beginner` / `Grinder`
  mode switch exists so one UI can serve both — it controls jargon, density, and whether raw EV shows.
  Beginner mode defaults ON.
- Wants explanations before implementation, additive development, and **no claims that something works
  without running it**.
- Design is iterated by comment: keep visual decisions in `css/tokens.css` so each comment is a small diff.
  Draft 1 follows the series language (white ground, Helvetica Neue, small uppercase letter-spaced labels,
  hairline borders, square corners). The theme colour is **deep navy `--accent` (#0f2d57)**, owner-approved
  2026-09-24 — the siblings' tone rotated to blue, and the only cool accent of the three, chosen so the
  Poker tile reads as distinct beside Chess's green and Go's red in the family bubble.
- Carried over from Chess Master: the activity grid shades by **volume, not points, and there is no
  streak**; **no progress export/import** in the UI. `js/progress.js` deliberately exposes neither.

- **The Master series switcher** (`js/family.js`): hovering or clicking the logo opens a rounded glass
  bubble listing the *other* apps of the series, ending with a dashed silhouette, "Coming soon".
  `FAMILY` in that file is the whole registry and **must be identical in every app of the series**.
  This repo's copy is currently the newest one — it is the only copy that contains the Poker entry.
  Links are `../<app>/` on GitHub Pages and the `dev` port on localhost (chess 8000, go 8001, poker 8002).
  **Copy this file into `chess-master` and `go-master` only once Poker Master is published**, or the Poker
  link is a 404 on the live site — the same gate the owner applied when Go Master was added. Poker Master
  was published and the file copied into both siblings on 2026-09-27; all three copies are identical.
- **The Master series welcome** (`js/welcome.js` + `css/welcome.css`): the first-visit screen — the
  game's word in heavy type fitted edge to edge, MASTER small beneath it, in the app's `--accent`; scroll
  down to enter. Shared exactly like `family.js`: identical in every app, knows nothing about any one
  game — Chess Master and Go Master carry the same two files since 2026-09-27, each on its own accent.
  Shown once per app (`<app>-master.welcomed`); `#/welcome` shows it again. A change to either file is a
  change to the series: copy it to all three.

## Run

```
python3 scripts/serve.py
```
then open http://localhost:8002. ES modules and `fetch` do not work over `file://`.

When testing in the in-app Browser pane, keep the pane visible: hidden tabs pause `requestAnimationFrame`,
so table animations stall until the tab is shown again. The dev server sends `Cache-Control: no-store`; if
the browser still runs stale modules, fetch them with `{cache: 'reload'}` once.

Validate before committing:
```
node scripts/check-content.mjs
node scripts/engine-test.mjs
node scripts/verify-drills.mjs
node scripts/check-charts.mjs
```

`check-charts.mjs` recomputes every percentage in `content/charts/` from the range notation itself and
fails if a chart's stated figure has drifted, so a chart can never claim a width it does not have. It
also requires a `provenance` block on every chart stating whether it is solver output — "where did this
come from" must stay answerable by anyone reading the file.

## Layout

- `index.html` shell; `js/app.js` router + sidebar + home; `js/lesson.js` Markdown → components.
- `js/table.js` is the single table component. Every table in the app goes through it.
- `js/engine/` is pure poker maths with no DOM: `cards`, `evaluator`, `rules` (betting, legal actions,
  pots and **side pots**, showdown), `hand` (the Hand record), `ranges` (169 grid + notation parser),
  `equity`, `ev`, `icm`, `pushfold`. It must support **2–9 handed**, since a live MTT runs nine-handed
  down to heads-up.
- `js/progress.js` localStorage progress under the `poker-master.` prefix; drills additionally record
  accuracy **per topic** (a dotted key like `preflop.bbdef.btn.25bb`), which is what the weak-spot report
  reads. `js/activity-grid.js` the 12-week grid, shaded by hands played per day.
- `content/curriculum.json` fixes track and lesson order; a lesson shows only when `"ready": true` and
  `content/lessons/<track>/<slug>.md` exists.

## Honest scope — do not let "GTO" drift

Written down because it is the thing most likely to go wrong:

- Hand evaluation, equity (exact + Monte Carlo), pot odds/MDF, ICM, heads-up push/fold Nash: **all real,
  all ours**.
- **Multiway push/fold is an approximation**, not a true multiway equilibrium — and in a normal-structure
  live MTT those spots are the common case. The UI must say so wherever it shows one.
- **There is no postflop solver and there will not be one.** A real one is CFR over abstracted game trees.
  Postflop is served by equity vs an assumed range, pot odds, required equity, MDF/alpha and blockers —
  useful, and honest about what it is.
- **Never label an approximation "GTO."** Every chart carries a provenance block and the app SHOWS it on
  the page, not just in the file. `content/charts/rfi-9max.json` is authored for this app from general
  positional principles: not solver output, not equilibrium, and not copied from anyone's chart. The
  shape of a positional opening range is ordinary poker knowledge; a solver's cell-by-cell output is
  somebody's product.

## Content rules — non-negotiable

1. **Every lesson has a non-empty `sources:` block.** The checker enforces it.
2. **Quote at length only from public-domain or CC sources** and say so in `sources:`.
3. **Modern books, videos and training sites**: paraphrase and credit, quotes of a sentence or two at most.
   Never copy chapters. **Solver-derived commercial charts are exactly this** — they cannot be lifted.
   Preflop chart data therefore comes from one of two places, and says which: **computed by this app**
   (push/fold Nash is genuinely ours), or an **open source, attributed**.
4. **Verify facts against a source before adding them**; do not trust memory. This applies to quotations
   above all — an unsourced quote does not go in, however well remembered.
5. **Never build anything that assists a hand in progress.** Chess Master's fair-play rule was "finished
   games only, never a running one." The poker analogue is stronger, because acting on live advice at a
   real table is cheating: review is post-session, always.

## Workflow

Branch before editing; merge to `main` with `--ff-only` after the owner approves. Run the checkers before
every commit.
