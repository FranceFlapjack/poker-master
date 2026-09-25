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
| **1** | `js/engine/`: `cards`, `evaluator`, `rules`, `hand`, `ranges`, `equity`; `js/table.js`; `scripts/engine-test.mjs` | ✅ done 2026-09-24 |
| **2** | Learn: pipeline, mode switch, **Basics part** written (4 lessons) | ✅ done 2026-09-24 |
| **3** | `engine/ev.js` → Equity & odds sandbox + Preflop range trainer | ✅ done 2026-09-25 |
| **4** | `js/bot/` + Play a hand + Ranges section written | ✅ done 2026-09-25 |
| **5** | `engine/icm.js` + `engine/pushfold.js` → Push/fold trainer + ICM lab | ICM done 2026-09-25; push/fold still to build |
| **6** | Stacks/ICM + Maths sections written, weak-spot report, live MTT utilities, polish | |
| **7** | Publish to GitHub Pages → **then** copy `js/family.js` into `chess-master` and `go-master` | |
| | ↳ **publish checklist:** decide `dev-table.html` — it is committed, so it goes live at `/poker-master/dev-table.html` with no nav path to it. Remove it, or keep it deliberately. | |
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

## Phase 1 — done 2026-09-24

`js/engine/` — `cards`, `evaluator`, `rules`, `hand`, `ranges`, `equity` — plus `js/table.js` and
`scripts/engine-test.mjs` (**177 checks, all passing**, ~1s including full preflop enumeration).

Verified by running it, not by reading it: `dev-table.html` renders the four shapes the table has to
handle — nine-handed with antes, a three-way all-in with side pots shown down, a playable heads-up spot,
and a board with folded and all-in seats. Three layout bugs were found that way and only that way: the
dealer button sat on the bottom seat's cards, top seats drew their hole cards off the top of the canvas,
and the bet pill overlapped the hero's hand.

**On equity fixtures.** `engine-test.mjs` deliberately hardcodes no published percentage. It asserts
invariants instead: equities summing to one, wins and ties accounting for every runout, and — the useful
one — that two hands related by a suit swap have *exactly* equal equity, which catches suit-handling bugs
no remembered number would. For the record, our own exhaustive enumeration gives **AsAh vs KsKh =
82.64% / 17.36% over all 1,712,304 runouts**. That figure is self-computed, not quoted, and it is
suit-specific: two black aces against two black kings is not the same enumeration as aces against kings
with all four suits live, so it should not be compared casually against a chart. Checking it against an
independent calculator is still worth doing once, with matching suits.

**Known gap, deliberate:** a big blind whose big-blind-ante obligation exceeds their stack simply posts
what they have and is all-in before cards. Real rooms differ on the remedy; it is marked TODO in
`rules.js` rather than guessed at.

### Why the engine came first

`scripts/verify-drills.mjs` checks every lesson answer against this engine. Content written before it
existed could not be trusted.

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

## Phase 2 — the lesson pipeline

Done: `js/lesson.js` (Markdown → components), `js/exercise.js` (drills), `js/spot.js` (one spot builder
shared by lessons, drills and the checkers), the lesson route and the Beginner/Grinder mode switch,
`scripts/check-content.mjs` and `scripts/verify-drills.mjs`.

**Four kinds of drill, and the split between them is the important part:**

| kind | question | answer comes from |
|---|---|---|
| `showdown` | who wins this board? | **the engine** |
| `rank` | which hand is stronger? | **the engine** |
| `action` | fold, call or raise? | the author — it is a judgement |
| `choice` | a plain question | the author |

The first two cannot be authored wrong because nobody authors them; `verify-drills.mjs` recomputes every
one offline. The last two have no ground truth, and the checker reports them as **unverified** rather
than implying it has confirmed an opinion. It also rejects an `answer:` written on an engine-decided
drill, since that number would be silently ignored and the author would never know.

**A third engine-decided type was added while writing:** `legal`, which asks which of several actions is
(or is not) allowed and gets the answer from `legalActions()`. A rules drill therefore can never drift out
of step with the rules the app itself enforces — and the rules lessons needed exactly that.

`solveDrill` also refuses a hand set where a card appears twice. Two players cannot both hold the same
queen, and a drill that says they do teaches a position that cannot happen.

### Structure: two parts, not a numbered ladder (owner's call, 2026-09-24)

The first draft was five numbered tracks — Track 0 through Track 4 — and the owner's note was that it
reads as far too much in the sidebar for someone who has never played. So:

- **Basics** — one flat part, four lessons, no sub-headings and no numbers. Someone learning the game
  should see a short list, not a syllabus. The eight original lessons were merged in pairs and trimmed
  (28 drills down to 18), keeping the engine-verified drills and cutting prose.
- **Tournament** — the large part, grouped into *Ranges*, *Stack depth and ICM* and *The maths*. This one
  is allowed to be big; it is where the owner's own material lives, and it will keep growing.

`js/curriculum.js` is the single walker for this shape — a part holds either `lessons` directly (flat) or
`sections` (grouped), and `groupsOf` flattens the difference. The sidebar, the home page and both
checkers all read through it, so they cannot disagree about what exists.

**Basics is written: 4 lessons, 18 drills, 4 tables.** 13 drills are decided by the engine; the other 5
are judgement or plain-fact questions the checker reports as unverified.

**One gap worth naming.** The checker verifies that an engine-decided drill's *answer* is right, but it
cannot check the prose. A `choice` drill that states a number — the side pots in `all-in-and-side-pots`,
the ante arithmetic in `blinds-and-antes` — could be confidently wrong and pass. Those figures were
checked by running the spot through the engine and reading `result.pots` (900 / 1,400, and a 525 pot from
nine 25 antes at 100/200). Any future lesson quoting a number should get the same treatment.

## Phase 3 — done 2026-09-25

`js/engine/ev.js` (pot odds, required equity, exact outs, MDF, alpha, EV of a call or shove, break-even
fold equity, implied odds), the **pot odds & equity sandbox** at `#/tools/odds`, and the **preflop range
trainer** at `#/tools/ranges`.

**On the chart, because this is the part that could quietly go wrong.** `content/charts/rfi-9max.json`
holds eight opening ranges, UTG through SB, at 40–60bb. It is **authored for this app** from general
positional principles — not solver output, not equilibrium, and not copied from anybody's chart. The
shape of a positional opening range is ordinary poker knowledge; a solver's cell-by-cell output is
somebody's product, and the content rules forbid lifting it.

The app says all of this **on the page**, not just in the file, because a chart looks authoritative
whether or not it has earned it.

`scripts/check-charts.mjs` recomputes every percentage from the range notation and fails if the file
drifts, requires a provenance block stating `isSolverOutput`, and checks the shape makes sense — an
opening chart that does not widen as position improves is either mis-authored or mis-labelled. The small
blind is the one allowed exception, because it acts last preflop and first on every street after.

**One deliberate distortion, stated on the page.** The trainer draws hands half from inside the range and
half outside. A real table would have you folding nine hands in ten under the gun, learning almost
nothing per spot; drawing from both sides puts you on the boundary, which is the only part of a range
anyone has to remember. It means your accuracy in the trainer is not your accuracy at a table, and the
page says so.

## Phase 4 — bots and Play, done 2026-09-25

`js/bot/` (three rule-based opponents), `js/engine/preflop-strength.js` (generated), `scripts/bot-test.mjs`,
and **Play a hand** at `#/tools/play` — six-handed, stacks and button carrying over between hands.

**A lesson about tests worth keeping.** `bot-test.mjs` asserts the things that would corrupt a session:
no illegal action, every hand reaching a conclusion, chips conserved. All of those passed on the first
run while all three bots played **over 80% of their hands** — because the strength signal was equity
against ONE random hand, and a median holding is about half, which clears the price of a big blind.

Green assertions, maniac bots. The test caught it only because it also PRINTS behaviour, and a "solid"
player that plays 81% of hands is obviously mis-tuned however many invariants hold. Any future trainer
or bot test should print what it did, not only assert what it must not do.

The fix split the signal into two scales that are not interchangeable: `equity` (raw share, the right
scale against pot odds) and `edge` (that share over an even split, so 1.0 is average whatever the seat
count). They now play 31% / 20% / 23%.

**The bots are not opponents worth copying**, and both the module and the page say so. A bot that folds
too much is beaten by betting every hand, and this one can be. They exist so the shape of a hand stops
needing thought, not to teach strategy.

## Phase 5 — ICM done 2026-09-25

`js/engine/icm.js` (exact Malmuth–Harville) and the **ICM lab** at `#/tools/icm`.

Exact, not sampled: finishing orders are enumerated only as deep as there are prizes, so nine-handed
paying three is 504 orders rather than 362,880. The O(n!) warning attached to ICM everywhere assumes you
enumerate the whole permutation, and there is no reason to.

**The behaviour was checked against what a final table does before any of it became a test:**

| spot | factor |
|---|---|
| heads-up for the whole tournament | 1.00 — no ladder left |
| winner-take-all, any stacks | 1.00 — nothing to ladder into |
| four left, three paid, big stack | **1.46** — needs 72.9% to call |
| the same spot as the SHORT stack | 1.15 — less to lose |
| nine left → four left | 1.11 → 1.35 |

That short-stack row is the one to remember: **ICM pressure is not a property of the bubble, it is a
property of how much you personally have to lose.** A big stack calling off is paying the premium; the
short stack shoving into them mostly is not.

**Still to build:** `engine/pushfold.js`. Heads-up push/fold Nash is genuinely solvable by iterated best
response and would be the app's first *computed* chart rather than an authored one. It needs a 169×169
preflop equity matrix generated offline first — about 14,000 matchups after exploiting symmetry.

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
