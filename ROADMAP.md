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
| **5** | `engine/icm.js` + `engine/pushfold.js` → Push/fold trainer + ICM lab | ✅ done 2026-09-25 |
| **6** | Stacks/ICM + Maths sections written, weak-spot report, live MTT utilities, polish | ✅ done 2026-09-26 |
| **7** | Publish to GitHub Pages → **then** copy `js/family.js`, `js/welcome.js` and `css/welcome.css` into `chess-master` and `go-master` | ✅ published 2026-09-27; siblings updated the same day |
| | ↳ `dev-table.html` and the nine unused first-draft icons were removed 2026-09-26, so nothing un-linked goes live. | ✅ |
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

### Push/fold — the first computed chart, done 2026-09-25

`js/engine/pushfold.js`, `scripts/build-pushfold.mjs`, `content/charts/pushfold-hu.json` and the
**push/fold trainer** at `#/tools/pushfold`. 1–20bb: **shoving 90.3% at 2bb falling to 40.0% at 20bb**,
the caller 100% → 20.8%. Every depth converged.

This is the one chart in the app that is an *answer* rather than a baseline, which is why it is the only
file here whose provenance says `isGTO: true` and names this repository as the source.

**Two defects, both found by watching the solver rather than trusting it.**

Raw best response never converged — it hit the iteration cap at 8, 13, 20 and 30bb. Not a bug in the
maths: both sides' responses are hard 0/1 thresholds, so they flip past each other forever. That needed
fictitious play, where each side answers the other's running average with a decaying step.

It *still* reported failure, and this time the **test was wrong, not the algorithm**. A 1/t step cannot
move less than about 1/t however settled the answer is, so a movement-based tolerance can never be
satisfied. Convergence is now judged by **exploitability** — how much either side gains by deviating —
at 0.005bb, a bound chosen to sit *under* the sampling error of the equity matrix rather than below it.
Solving to 1e-5 against inputs carrying ±0.8% noise would be inventing precision the data cannot support.

The generator is seeded, and that has been checked rather than assumed: regenerating the chart twice
reproduced all 40 range strings byte for byte, so the shipped file can always be re-derived.

**Mixed hands are shipped, not rounded away.** The solver returns frequencies; a chart needs a decision,
so cells above 0.5 are written in. But a hand the equilibrium plays 48% of the time is not a fold, and a
trainer marking you wrong for shoving it would break the app's own honesty rule in the one place it
claims equilibrium. So `pushMixed` / `callMixed` carry the 0.35–0.65 band — **at most three cells per
depth**, measured before the feature was designed — the grid outlines them, and the trainer does not
score them.

**The trainer deals 2–15bb only,** and both ends of that were cut for a reason. The chart carries
16–20bb and the provenance says those rows are "for completeness, not as advice"; drilling them would
teach a model the file itself disclaims. At the other end, **1bb is not a decision** — the big blind has
already posted their whole stack, so the price line reads "0.0 more to call, 0.0% needed" and every
answer is free. Both ends stay visible in the chart panel and neither is dealt. Both seats are drilled — calling off is where the
equilibrium actually costs money — and hands are dealt half inside the range and half outside, the same
deliberate distortion the range trainer states.

Topic keys are banded rather than per-integer: `pushfold.hu.sb.6-10bb`, and the same for `bb`. Six
buckets instead of thirty, so the Phase 6 weak-spot report has enough samples in each to mean something.

**And a third instance of the lesson this repo keeps relearning.** The first stress run asserted that
every spot produced a verdict, and every spot did — including the 1bb big-blind spots, which produced a
*meaningless* one. Structure green, behaviour wrong, exactly like the maniac bots. The second run checked
what the spots actually said rather than that they said something, and that is the check that found it.

Verified by running it: 350 scripted spots across two runs dealt only depths 2–15, split roughly evenly
between the seats, hit the unscored mixed path, and never once priced a call at zero. Leaving the page
for another tool and coming back twice produced no console output at all, which is the check the Play
page's teardown leak would have failed. No horizontal scroll at 375px. The progress both stress runs
wrote was backed out of localStorage afterwards.

## Phase 6 — Stack depth and ICM written 2026-09-25

Four lessons: `counting-in-big-blinds`, `survival-and-accumulation`, `the-bubble`, `chips-are-not-money`.
14 new drills (one `legal`, decided by the engine; the rest judgement), 4 new tables.

**Every number in these four lessons was computed before it was written**, because this is the section
where that rule bites hardest. `check-content` reads frontmatter and `verify-drills` recomputes only
engine-decided answers — neither reads prose, so an ICM figure stated in a `choice` drill can be
confidently wrong and pass all five checkers. The figures came from scratch scripts against
`js/engine/icm.js` and are all reproducible in the ICM lab, which is what the `sources:` blocks say
instead of citing anybody.

**Writing them caught two errors that had nothing to do with the lessons.**

*A double-counted pot.* The first pass at the bubble factors passed the caller's own risk in as dead money
as well, so a call of 10,000 into 1,500 was being priced as though 11,500 were already in the middle.
`icmRequiredEquity` adds the opponent's contribution itself; `pot` is dead money only. The published
figures use `risk: 10000, pot: 1500`.

*An over-broad claim in shipped text.* `pushfold-hu.json`'s provenance said a chip-EV shoving range "is
too wide wherever ICM pressure is real", and that renders on the trainer page. It is only half true.
Under ICM the **calling** range is unambiguously too wide. The **shoving** side pulls both ways: your own
chips are worth more, but tighter callers fold more often, which is worth something back. This app has
not solved ICM push/fold, so the note now states the calling direction and declines to size the shoving
adjustment. The lesson says the same thing, and the drill asks about exactly that.

**The figures, for the record** — all five-handed unless stated, ICM lab reproducible:

| | |
|---|---|
| even stacks, flip for it all | break-even **61.1%**, not 50% |
| blinding 10,000 → 6,000 | costs **21.8%** of your money |
| first 10,000 chips owned | **$925**; the eighth 10,000 is **$249** |
| doubling up, anywhere on the curve | money ×**1.4** |
| 80% of the chips | **38%** of the money |
| bubble, short shoves 10,000 into 1,500 | leader needs 52.4%, the 15k needs **58.8%** |
| calling off everything | 25k **1.48**, 15k 1.39, short 1.28 |
| nine left → six → four | 1.06 → 1.10 → 1.13 |
| winner takes all | **1.00** |

Two readings of the premium are both true and they confused me before they were computed: hold the
**amount at risk** constant and the big stack pays least (that is bubble pressure); hold **"all my
chips"** constant and the short stack pays least (they have least to lose). Same fact, different thing
held still.

**A third error, found after the lessons were committed.** The bubble lesson's fold drill put the 15,000
stack in the big blind, so the hero had 1,000 already posted and was risking 9,000 more — while the `why:`
quoted 58.8%, the figure computed for a clean 10,000 at risk. The true threshold there is **60.6%**
(`risk: 10000, pot: 500`, measured from pre-hand stacks so the posted blind is accounted for). The drill
was reseated to the button so the quoted figure is the one the spot actually asks, and the `why:` now
names both numbers, because the difference between them is the lesson.

The class of defect is the one this repo keeps meeting: it passed all five checkers, because no checker
reads a `why:`. Any drill quoting a threshold must have that threshold recomputed for *that spot's*
parameterisation, not carried over from the table above it.

**And the heads-up figures were labelled.** Both `survival-and-accumulation` and `chips-are-not-money`
quoted 58.7% / 36.3% from `pushfold-hu.json` inside lessons whose tables are five-handed. Those are
heads-up numbers from the one case this app has solved, and they now say so.

### The Maths section, written 2026-09-25

`pot-odds`, `expected-value`, `bluffing-and-mdf`. 11 drills, 3 tables. **All 15 lessons are now ready** —
the course is written.

**The risk here was redundancy, not correctness.** `#/tools/odds` already computes pot odds, required
equity, exact outs, the rule of 4 and 2 and its error, MDF and alpha, all live. So each lesson is *why
the number is the number*, and each one names the sandbox as the place to put your own figures in —
the same split `chips-are-not-money` draws between itself and the ICM lab.

Three things these lessons say that the tool cannot:

- **The rule of 4 and 2 fails in one direction only.** Below eight outs it is near exact; above that ×4
  flatters you, by 3.0 points at twelve outs and 5.9 at fifteen. And it assumes you will *see* both
  cards — using ×4 to justify a call and then folding the turn is paying for two and taking one. The
  owner asked for this as a quick trick; this is the honest version of it, computed by `outsError`.
- **At exactly the required equity a call is worth zero.** "I had the odds" is a reason to be
  indifferent, not pleased. The money is in the gap, and close calls have no gap.
- **A break-even fold frequency always exists** when there is dead money — shoving 10,000 into 100 with
  no equity breaks even at 99% folds. Its existence justifies nothing. With *no* dead money the answer is
  100%, which is the cleanest proof that bluffs are paid for by the pot.

**MDF is stated as a property of the bet size and never of the hand**, because that is where the idea is
usually misused, and the drill asks exactly that. The read-more also says plainly that *which* hands to
defend with is a solver's job and this app has no postflop solver.

### The weak-spot report, done 2026-09-25

`js/weak-spots.js`, on the home page. It reads the per-topic accuracy every drill in the app has been
recording since Phase 2 and turns three shapes of dotted key back into English: `basics/the-cards.rank`,
`preflop.rfi.BTN`, `pushfold.hu.sb.6-10bb`.

**The open ranking question is answered: one list, worst first, with the area labelled and the sample
size shown on every row.** The risk with a single list was that it would just say "you are worst at
whatever you drilled least" — which is why a topic needs **8 attempts before it can be ranked at all**,
and why `12` and `9/12` sit next to each percentage. A reader can see what a number is based on.

**It does not go quiet when there is no data.** With nothing over the bar it names the closest topic and
how many more attempts it needs — "Pot odds — recall is closest, 3 more to go" — which is a next action
rather than an apology. With nothing recorded at all it renders nothing, because someone who has not
drilled anything should see the course, not an empty widget.

Verified by running it in all three states, with progress backed up and restored afterwards.

### Live MTT utilities — folded in, not a sixth tool, 2026-09-25

**The decision was where they live, not whether they work.** They are now the first panel of
`#/tools/odds` — *At the table*: stack depth in big blinds, what an orbit costs, how many laps you have
left folding every hand, and the effective stack against one opponent.

Not a separate page, for a reason worth keeping: counting in big blinds is one division. What earns it a
panel is sitting *next to the price*, because depth decides whether a price is even the right question —
under ten big blinds there is no call to price, only a shove or a fold. The band readout says which part
of the game you are in and links to the tool that covers it. A sixth route would have been a sixth thing
to maintain for one division.

It handles both ante styles, because the engine does: every player anteing costs `sb + bb + n × ante` a
lap, while one big-blind ante for the table costs `sb + bb + ante`. Same total contributed to pots,
different amount out of *your* stack per lap — 7,200 against 4,800 at level 14 — which is the part that
actually decides how long you can wait.

**Checked against the lessons rather than in isolation**: the panel reproduces every figure in
`counting-in-big-blinds` exactly — 8.3bb and 3.5 laps at 1,500/3,000 with a 300 ante, 125bb and 83.3 laps
at 100/200, 2,400 a lap at 500/1,000. The tool and the lesson cannot drift because both do the division
the same way.

### Polish, and Phase 6 closed 2026-09-26

**The trainers are on the home page.** They were reachable only from the sidebar, which buried half of
what the Tournament part is for — in Grinder mode the tools *are* the app, and a home page listing only
lessons misrepresented it. All five now sit on the part card with their blurbs.

**Verified end to end**: all 22 routes — home, 15 lessons, 5 tools — visited in sequence. Every one
rendered and the console stayed completely silent, which also exercises the teardown path the Play page
once leaked on.

### The Phase 0 decisions, closed

Two of the three judgement calls recorded in Phase 0 are now decided rather than merely shipped.

1. **The home hero keeps no quotation.** Chess Master and Go Master each open with a sourced quote, so
   the house pattern says add one — but the pattern does not fit here. Chess and Go have centuries of
   public-domain literature; poker's quotable writing is almost entirely modern and copyrighted, and the
   content rules forbid both quoting from memory and lifting from modern books. The obvious candidate,
   Blackbridge's *The Complete Poker Player* (1875), is not on Project Gutenberg and has no scan on the
   Internet Archive — both checked, not assumed. So there is nothing to verify a quote against, and the
   app's own rule 4 says that settles it. The written hero line does the work instead.
2. **Beginner mode still defaults ON.** Deliberately unchanged: the stated first purpose of this app is a
   friend who has never played, and they should not have to find a switch. The owner turns it off once.
3. **Activity-grid thresholds stay at 5/15/40 hands a day** — still the one open item, and still waiting
   on real data rather than another guess.

### Two defects the 22-route pass could not see, 2026-09-26

The route sweep proved every page *renders*. It cannot see a wrong number, and both of these were wrong
numbers on pages that rendered perfectly.

**1. Three action drills asked the question of a player who was not to act** — two of them of a hero who
had already folded. The cause was the `button` seat not matching the `actions` list: with six seats and
`button: 3`, the small blind is seat 4, so four folds fold the hero rather than reaching them. Every
checker passed, because none of them had ever asked whose turn it was.

`verify-drills.mjs` now asserts, for every `action` drill, that **the hero is the player to act** and has
not folded, and that the hand is not already over. The answer to an action drill is a judgement; *whose
turn it is* never was — the engine knows, and if it disagrees with the question then the table shown does
not match the words above it. Checked by reintroducing the bug and watching it fail.

**2. Every ante in the new lessons was inert.** `ante:` is the STYLE — `each`, `bb`, `none` — and the
AMOUNT is the third number in `blinds`. Eight fences declared `ante: each` with `blinds: 400/800`, which
is silently a no-ante table: the spot builds, the drill passes, the caption says "with antes", and the
pot is short by every ante in it. One lesson's arithmetic depended on it — the `legal` drill's "23,700
behind" is a 24,000 stack minus a 300 ante that was never posted. A ninth fence had `ante: 300`, which
sets the style to the string `"300"`.

`verify-drills.mjs` now rejects both forms and names the fix. The corrected tables show **1,800** at
400/800/100 six-handed, **1,400** at 300/600/100 five-handed, and **7,200** at 1,500/3,000/300
nine-handed — which is also, exactly, the orbit cost `counting-in-big-blinds` teaches. The prose and the
table now agree because the engine posts what the text claims.

**The pattern, for the fourth time.** Maniac bots passed every invariant; the solver "converged" against
a test that could not fail; a drill scored a 1bb spot that was not a decision; and now three drills asked
a folded player what they would do. In each case the assertions were green and the *behaviour* was wrong.
Both checks added here follow the same rule: if the engine can decide something, the checker should ask
it, rather than trusting prose.

## Design draft 3 — composition, 2026-09-26

Four changes, from the owner's review of the finished app.

**Drill options are content, so they are set as content.** They were boxed uppercase buttons in a flex
row. That works for "Fold" and fails for the eighteen labels that run past forty characters — the
longest is eighty-two — and a border that resizes itself around a sentence gives a ragged stack of
rectangles. They are now a list: a letter marker, then the text in sentence case at reading size, with
hairline rules between. The marker is not decoration — `mountHands` already labels its rows A, B, C so
a reader can match a hand to an option, and where a label arrives carrying that letter it is lifted into
the marker rather than printed twice.

**Choice drills get the width.** `.exercise` was always a two-column grid, picture left and question
right, but a `choice` drill has no picture — so **31 of the 57 drills** rendered with 522px of empty
column beside a crushed 354px question. The grid collapses below 980px, so it was broken on the desktop
and fine on the phone. They are single-column now, with the question at `--fs-3` and the list held to a
620px measure.

**Wagers sit on the table's own shape.** The bet pill was placed 46% of the way along a straight line
from the seat to the middle, which is wrong on an ellipse: the same fraction crosses a 240×150 oval at a
different depth depending on the angle. Measured, two bets at the same table sat at **0.71 and 0.99** of
the way to the rail — one adrift on the felt, the other jammed against it. Every wager now sits on its
own ellipse, inset a constant distance from the felt at the seat's own angle. The pill went with it: an
amount is a number, so it is bold cream with a hairline rule under it rather than boxed — the box had a
fixed width that "25" rattled around in and "23.7k" filled.

**Numbers in prose tables align by content, not by position.** The rule was `td:last-child`, right by
luck most of the time and wrong twice: the rule-of-4-and-2 table has six numeric columns and only the
last was monospaced, and the MDF table put the mono face on the words "80.0% of your range". A column
is numeric only when every cell in its body reads as one; the first column stays left-aligned because it
is the row's label even when it holds a number.

Also: the sandbox's seven inputs wrapped by content and stranded the last one alone on a second row.
They are a four-column grid now, with the field that is about a *different* player taking the width below.

### The seat portraits, redone 2026-09-26

The owner's note was that every player looked the same in a different colour. They were right, and the
cause was the source rather than the choice: **shigureni's icon section holds only twelve images**, and
eight of them are one character in eight colours — the same pose holding the same fan. The app used all
eight. No pick from that set could have fixed it.

So the seats now come from shigureni's **main illustration library** instead (~124 images, square
1001×1001, same licence, already recorded). Nine chosen one per activity and spread across the colour
wheel: a runner in yellow, a blanket in purple, denim, teal, periwinkle, a green apron, navy, pink. The
face is the same in all of them — the whole catalogue is one character, and that is not solvable from
this source — but no two seats share an outfit, a prop or a silhouette.

**The hero is signalled three ways**, because one is not enough at nine seats: a distinctly louder
picture (bunny ears, popcorn, a soft toy, against eight people running or working or lying down with a
headache), drawn 20% larger, and always ringed. `avatarsForSeats` pins that portrait to the hero seat
whatever its index, so your own seat never changes between spots — a table you have to re-learn every
hand is worse than no portraits at all.

The nine retired icon files are kept on disk with a note in the manifest saying why they are unused, so
the decision stays auditable. The portrait box grew 84 → 92px, since a full-body illustration reads
smaller than a head-and-shoulders icon, and the wager inset is now proportional to the felt so a
heads-up bet does not crowd the newly centred pot.

### Design draft 4 — the table, measured, 2026-09-26

The owner asked for a careful look at sizing and positioning, and at the text and row spacing in each
seat. Nothing here was eyeballed: every change came from an audit that renders every seat count 2–9, at
every button position, in four states (preflop, a raise, a flop bet, a full river board), at 343px,
522px and 660px, and measures every element — **528 spots, all clear** at the end.

What the audit found first:

- **Type swung from 19.5px to 7.8px** for the same name. Sizes were SVG units, and each table was scaled
  by a factor set by seat count and screen, so no unit size could be right. Bets reached 6.4px on a phone.
- **Seats hit the rail**, measured against drawn pixels: cards 27px into it at three-handed, 17px at
  six-handed, and the enlarged hero sitting on the felt heads-up. (The portrait "intrusions" at five to
  seven seats were transparent padding — checked against the ink, not the image squares, and dismissed.)
- **Figures varied ~1.9× in drawn width** in identical slots, because each file is 70–86% transparent
  with the drawing placed differently.

What changed:

- **Laid out in real pixels** (`--tb-size-*` in tokens.css) for the width actually available, re-laid out
  on resize. Names 13px, stacks 12, bets 12.5, cards 42 — the same at every table.
- **Seats are placed, not looked up**: each is pushed out along its own ray until nothing of it is within
  12px of the rail, then neighbours are pushed apart. Rows never depend on the artwork or the state, so a
  fold or a change of turn moves nothing.
- **Too wide goes upright, not smaller.** A dense table that would render below 85% is laid out as a tall
  oval with the stack on two lines. On a 343px phone that takes names from 7.8px to ~10.5px and cards
  from 26px to 34px; in a 412px column, nine-handed renders at full size.
- **Figures cropped to their ink** (boxes measured per file, stored in `js/avatars.js`) and bottom-aligned,
  so every seat stands on the same line at the same size.
- **The dealer button rides the name line**, with SB and BB. As a chip on the felt it could only ever be
  near its owner; measured, it was nearer a neighbour in about a quarter of spots. On the name line it
  cannot be anyone else's.
- **Wagers keep off the board**: on an upright felt five cards nearly fill the width, so a wager that
  would land on them slides round its ring — still in front of its player — until it clears.

Two harness bugs were found on the way and are worth remembering: `getBBox` on a nested `<svg>` reports
in that svg's own viewBox, and a board passed to a preflop spot is not on the table yet. Both made
checks pass or fail for reasons that had nothing to do with the layout.

### Design draft 5 — wide on a desktop, round on a phone, 2026-09-27

The owner's comment: on a desktop the table "still shrinks to a vertical oval like mobile" — make it a
normal table there, and make the phone table a circle, which looks nicer than a tall oval.

- **Why the desktop went upright.** Not the shape rule: the room. Every table was capped at
  `--board-max`, 660px, and the wide oval needs 340px heads-up rising to 815px nine-handed. Drills gave it
  less — min(660px, 58%) beside the question, 379px on a 1024px screen — so six- and nine-seat tables
  fell below the 85% line and stood up. The Play page was worse by accident: its page carried the class
  `.play`, which the stylesheet ported from the siblings makes a two-column grid, so since Phase 4 the
  table had been sitting in a 346px right-hand column. That class is now `play-page`.
- **The shape now follows the device.** A phone (the app's own 760px switch, where the sidebar becomes a
  menu button) gets a circle; a desktop gets the wide oval. Crossing the switch redraws the table.
  One exception, stated in `js/table.js`: a desktop-mode window so narrow that the wide oval would render
  below 70% — a tablet held upright, a window dragged thin — gets the circle too. At 1024px and wider no
  table in the app comes near it; at 800px it takes the nine-seat tables only.
- **The desktop table has its room.** `--table-max: 820px`. A drill puts its table beside the question
  only when the table fits at full size with at least 260px left for the options; otherwise the question
  goes underneath. Measured on every table in every lesson and on Play: at 1280 and 1440px everything is
  wide at full size; at 1024px everything is full size except nine-handed, at 0.80.
- **The circle.** One radius, 110px, at every seat count — measured from 90 to 160 on a 343px column.
  Evenly spaced angles do not work on a circle: seats are tall columns, so the ones down the sides stack
  and push each other out (nine-handed fell to 0.58). Each gap round the rim is now sized to what its
  two seats take up at that point — width across the top and bottom, height down the sides. Against the
  tall oval on the same lessons at 375px: three to six seats render larger (e.g. six-handed 0.80 → 0.84),
  and the circle is about a quarter shorter; nine-handed is a little smaller (0.76 → 0.74, drills 0.71 →
  0.67), and eight-handed, which no lesson uses, loses most (0.79 → 0.71).
- **Audited again** in both shapes: every seat count 2–9 at every button position in four states, at
  328, 343 and 398px on a phone and 522, 660 and 820px on a desktop — 1,056 spots, none with a seat on
  the rail or a neighbour, a wager on the board or another wager, or anything outside the picture.
  Illustrations are measured by the box their drawing fills inside the slot, not by the slot, as in
  Draft 4.

### The game — "Test yourself", 2026-10-04

The owner's request: a game mode like a quiz, drawn from what the lessons teach, scored as a percentage —
the right play at the right price is 100% — on random tables, with an analysis afterwards. Ten spots.

- **Scored only where the app knows the answer.** Six kinds of spot, four sources: open or fold (the
  opening chart — authored, not solver output, so right is 100 and wrong is 0); shove or fold and calling
  a shove, heads-up 2–15bb (the solved push/fold chart, with the EV of each option against the other
  side's chart range — mixed hands are never dealt); catching a bluff on the river and calling an all-in
  with a draw on the turn (pot odds against a STATED range or hand — exact, because nothing can be bet
  after either); and a big-blind call on the bubble (ICM on stated stacks and payouts, the shove range a
  stated assumption). Each spot's table is built to be the game its source assumes: the push/fold tables
  are heads-up, 100/200, no ante, as the chart was solved.
- **Bet size is not scored**, which leaves part of the request open: no lesson teaches a sizing rule and
  there is no solver, so opens are offered at one size (2.5bb) and the page says the size is not graded.
  A sourced sizing lesson would be the way to score it.
- **Points:** 100 × (1 − 2 × EV given up ÷ stake), floored at 0 — every EV measured against folding.
  Options within two standard errors of the best (where the equity is simulated) all count as best.
- **Every decision feeds the weak-spot report.** Opening and push/fold spots use the trainers' own topic
  keys, so a weakness shows once wherever it was drilled; river calls, all-in calls and bubble calls have
  their own (`maths.call.river`, `maths.call.allin`, `icm.bubble.call`). Like the trainers, the game does
  not count hands on the activity grid — only Play deals real hands. It keeps a history of scores (no
  streak).
- **Dealt near the line, and the page says so**: half inside and half outside a range, prices tuned so
  the answer can go either way. The score measures close decisions, not accuracy at a real table.
- **The push/fold opponent plays the chart as solved**: its mixed hands (played 35–65% of the time,
  listed apart from the main ranges) at half weight, in both the frequency and the equity.
- **Beginner mode** hides the per-option EV table (the switch governs whether raw EV shows); the
  explanation, in words, stays in both modes.
- **`scripts/game-test.mjs`** builds spots of every kind and checks the hero is to act, every option is
  legal, the best option has the top EV and scores 100, points stay in 0–100, push/fold answers agree with
  the chart wherever it is pure, and the river EV reproduces from the stated counts. 240 spots: all pass,
  every push/fold spot agreeing with the chart.
- **Found on the way:** the page's class `.game` collided with the game-viewer grid ported from the
  siblings (the same trap as `.play` on the Play page) — the page is `.game-page`.

Next, by the owner's choice: famous hands (each checked against a published source first), then full
hands against the bots scored decision by decision where the maths allows.
### Opening charts, rewritten for learning — 2026-10-04

The owner could not follow "Opening charts, and where they come from": it was about where charts come from
(solvers, databases, licensing) — a question for a grinder — and never showed the chart, said how to read
one, gave the ranges, or practised using it. Rewritten as "Opening charts — what to raise from each seat":
the one question a chart answers; three steps to read it; the chart itself on the grid with a seat
switcher (`show: chart` in the ```grid fence, drawn from content/charts/rfi-9max.json, the file the trainer
and the game score against); a table of what each seat raises; five facts to remember, each checked
against the chart; five open-or-fold drills; what a chart does not cover; and where charts come from,
shortened to the end with the solver detail behind "Read more".

New check: a drill tagged `chart: <seat>` is VERIFIED — verify-drills requires the table to put the hero
in that seat with everyone before folded, and the answer to be a raise exactly when the chart opens the
hand there. Deliberate mistakes (a wrong answer, a hero one seat off) are both caught.

### Bet sizing — a lesson, 2026-10-09

The owner asked for a sourced sizing lesson, the step before the game can score the size you choose.
"Bet sizing" closes the Maths section.

- **Every number is computed as the page draws**, by a new ```sizing block (js/sizing-block.js) over the
  engine's betSizing / requiredEquity / alpha — a table of common sizes and a slider for any size
  (`show: postflop`), and the break-even figures for an open with antes (`show: steal`). Nothing is
  typed in, so nothing can drift. The open figures reproduce Upswing's published 44 / 47 / 50 / 55%.
- **The conventions are sourced and paraphrased:** tournament opens of about 2 to 2.5 big blinds
  (PokerNews; Jonathan Little, PokerCoaching; Miikka Anttonen, Upswing — who also sizes up from later
  seats and the small blind), re-raises of about 3× in position and 4× out (Little), and after the flop
  small on dry boards and bigger on wet ones, betting smaller the more often you bet (Little, one short
  quotation; PokerNews on bigger turn and river bets). 888poker's guide could not be read (a regional
  block) and is not used.
- **New check:** a drill tagged `math: caller | bluff` with `bet:` and `pot:` is VERIFIED — its answer
  must be the percentage the engine computes. The check caught a wrong figure while the lesson was being
  written (twice the pot needs 40%, not 50%).
- **Then the game scored open sizes** (owner's go-ahead, the same day): when the chart says raise and you
  do, the size is held to the lesson's band — 2 to 3 big blinds, up to 3.5 from the small blind
  (Anttonen) — full marks inside it and 25 points off per big blind outside, so 4bb scores 75 and an
  all-in open 0. Raising when the chart folds is 0 at any size. The page calls it a rule from the
  lesson's sources, not a solved answer; every other size is still explained, not graded. game-test
  checks the scale on every opening spot.

### Famous hands — 2026-10-08

The owner's request: famous hands in the game, an explanation at every step — why the player did it,
what to do — and room to choose differently, because a mistake is something to learn from.

- **Three hands, four seats to play:** the bluff of the century (2003 — as Farha or as Moneymaker), the
  final hand of 2003 (as Moneymaker), and Chan's trap from Rounders (1988 — as Seidel).
- **Each was checked against published sources first** — PokerNews, CardPlayer, Grantland's oral
  history, Wikipedia, Upswing Poker and others — and the sources disagreed in places that matter. Two
  gave suits that cannot be right (the same card twice); the duplicate check that caught them now runs
  in `scripts/famous-test.mjs` on every file, with each conflict and what we did written into the file.
- **Nothing on screen shows a number the sources do not give.** The 1988 stacks, blinds and final
  all-in are recorded nowhere we found, so the table shows "—" for them (a new `unknownChips` option in
  `js/table.js`), and only the recorded 40,000 and 90,000 bets appear. The 2003 final hand's betting
  after Farha's 175,000 bet is disputed, so the replay stops at that decision and says so.
- **Single-sourced, and said so in the files:** the bluff hand's blinds and ante (PokerNews); the stacks
  around it (worked back from CardPlayer's counts after the hand); the final hand's suits (Wikipedia) and
  its 100,000 / 175,000 bets (CardPlayer); the 1988 bet sizes (Upswing and CardPlayer agree) and suits
  (CardPlayer). The 2003 final hand's blind level is assumed unchanged from the hand before.
- **Not scored, and the page says why.** "Mistake" only where a source says it: PokerNews criticises
  Farha's turn lead but treats his fold as reasonable, and Seidel has said himself he could have got out
  of his hand more cheaply.
- **No spoilers** (owner's comment, the same day): you decide with what the player could see. The
  opponent's cards and the hindsight equity were first shown after every decision — so as Farha you knew
  Moneymaker's hand by the second — and the hand list and several explanations gave the hands away too.
  Now the cards and the hindsight come only at the end, decision by decision, and famous-test fails any
  file that names the opponent's cards (as glyphs, codes or ranks) in the list, the intro, the facts or
  any explanation before the reader's last decision.
- **Fold, call, raise with a slider** (owner's request, 2026-10-08), in the game and the replays alike:
  you act with the table's own controls, any size. The decision is scored as before; THE SIZE IS NEVER
  GRADED — scoring a size needs a solver. The analysis comments on it instead: in the game, the size in
  big blinds (and for an open, that the drills use 2.5bb); in a replay, against the size the real player
  chose. A play outside what a spot's maths covers — a limp or a small raise when the model is
  shove-or-fold, a raise with a bluff-catcher — is not scored, and the page says why. For the 1988 hand,
  with no stacks recorded, the controls are plain buttons with no amounts.
- **The maths:** the price counts only what you can win — facing an all-in bigger than your stack, the
  uncalled part goes back (caught in testing: Farha's last call first showed 21.4% needed; it is 33.2%).

### The cat in the box — hints and tips, 2026-09-26

The owner's request: tips in some lessons, and a hint when you answer wrong, delivered by a mascot — the
cat-in-a-box illustration they supplied — popping up in a corner of the screen with a speech bubble drawn
in the same line as the cat.

- **The artwork** is shigureni illust/82, *すぐ箱に吸い込まれてしまう猫* (a cat that gets sucked
  straight into any box), the exact image the owner sent, recorded in
  `content/images/mascot/manifest.json`. Their terms permit adding text, compositing and animation — a
  bubble and a pop-up are both within that — and forbid redrawing their character by any means. So the
  cat is only ever the file itself, cropped to its measured ink and scaled; the small cat on an inline tip
  is a crop of the same file.
- **The bubble is ours**, a generic speech bubble drawn to match: pure black like the artwork's lines,
  the stroke weight those lines have at the size the cat is shown, rounded ends, and one short break in
  the outline near the top-left — the broken-line habit of shigureni's drawings. It is sized to its text
  and its tail is aimed at the cat's head. (The owner asked for the break to be closed, then kept it once
  its reason was explained: it is a style, not a gap.)
- **Hints** come on the FIRST wrong answer (inline, they used to wait for the second, by which time half
  the options were struck out). A correct answer or a reset sends the cat back into the box.
- **Tips** are ```tip fences, one per lesson, placed at the END of a section as a recap — never before
  the text that establishes the point. The first placement put two of them ahead of their own
  derivation (one gave away the 27.3% a paragraph early) and one echoed the bold line directly under it;
  they were moved. Every tip restates its lesson's own material; the one that states a rule (the minimum
  re-raise) was confirmed by the engine first. A tip never interrupts a hint.
- **It can be switched off** from the sidebar, beside the sound. Off, hints and tips appear inline
  instead, so nothing is lost.

**Draft 2 of the cat, same day (owner's comment):** it now lives in the corner ALL the time, small,
and never opens by itself. When it has something it *meows* — a small drawn "meow" with sound lines
beside its head, and a hop — and waits to be clicked; the bubble opens only then. Clicked with nothing
to say, it answers with hearts and a squish. The bubble is smaller, its line thinner (1.3px) and lighter
(42% black), its type 12.5px. The Hint button and a tip's label in the text still open the bubble
directly, because those are asking; and an explicit request always wins, where the hint-beats-tip rule
is only for things that arrive by themselves.

Enforced from now on: `verify-drills` requires a `hint:` on every drill (the seven judgement drills that
had none now do), and `check-content` keeps tips short enough to read in the bubble.

Found while testing it: lessons never tore down what they mounted, so a hint would have followed the
reader to the next page and every table's resize observer leaked. Lessons now unmount like tools do.

**The licence count.** With the cat, the app uses ten shigureni illustrations, above the five that are
free for commercial use. Poker Master earns nothing, so the ceiling does not apply as things stand; if
that ever changes, five licences are needed.

## The series welcome — 2026-09-26

The owner asked for a first-visit screen for the whole series: full screen in the game's colour, the
game's word large and MASTER small beneath it, the same in every app.

**Draft 1** set POKER MASTER over a poker table with the cast of illustrations seated round it. The
owner's comment: no table and no icons — *plain, bold type fitted tight to the screen, scroll down to
enter.* **Draft 2** is exactly that, and the scene module was deleted rather than kept switched off.

- **Shared, like `family.js`.** `js/welcome.js` and `css/welcome.css` know nothing about poker: the app
  passes its id and word, and the colour is the app's own `--accent`. Every class and state class is
  `wl-` prefixed — Draft 1's `.play` state collided with each app's Play page rule.
- **The word is measured, not guessed.** It is set at a probe size, its INK measured from the glyphs,
  and scaled so the letters themselves run edge to edge at `--wl-margin` — "GO" and "POKER" need very
  different sizes to fill the same width. Fitting the text box instead left the letters off-centre: the
  P's side bearing and the tight tracking put them 21px from the left edge and 14px from the right at
  phone width, a gap that grows with the size. The difference is taken up with `translate`.
  On a short screen height wins: the word is held to the room the title has once the scroll cue has
  taken its place in the column (the cue used to be laid over the bottom, and on a phone turned
  sideways MASTER landed on it).
- **Scroll to enter, and the curtain follows the gesture** — wheel, trackpad or finger. Past a quarter
  of the screen, or flicked, it goes; let go short of that and it settles back. The cue is a button,
  and ArrowDown, PageDown, Space, Enter and Esc all enter, so it never traps anyone.
- **Once per app**, flag `<app>-master.welcomed`. On GitHub Pages the three apps share one origin, so a
  series-wide key would spend the welcome on whichever game someone opened first. `#/welcome` shows it
  again.
- **Reduced motion** gets the final frame with a plain fade.

Verified by running it at 360×740, 375×812, 430×932, 667×375, 812×375, 768×1024, 1024×768 and 1440×900:
the ink of the P and the R sits at the margin on both sides at every size (within 0.2px), and word,
MASTER and cue never overlap. The ink measure itself was checked against a pixel scan of the rendered
word (within 0.6px at 410px type), and its fallback for browsers whose canvas cannot letter-space
against the native one (identical). Keyboard, the cue button, a slow drag (settles back) and a flick (enters) each checked; the
reduced-motion rules checked by applying them directly, since the Browser pane cannot emulate the query.

## What is left after Phase 6

- **Phase 7, publishing — published 2026-09-27** at https://franceflapjack.github.io/poker-master/
  (repo `FranceFlapjack/poker-master`, public, Pages from `main` at the root, as the siblings). Checked
  live: every lesson and tool loads, all 61 files the site requests answer, no console errors, and the
  switcher's links reach all three live sites. Before pushing, every requested file was matched against
  git by exact case — Pages is case-sensitive and a Mac is not — and `table-snapshot.html` was taken out
  of git so an unlinked test page did not go live. **The siblings, the same day:** `js/family.js`,
  `js/welcome.js` and `css/welcome.css` copied byte for byte into `chess-master` and `go-master`, wired
  in as here (stylesheet link, one call at boot, the `#/welcome` route), checked locally, then published.
  Live: Chess opens on CHESS in its green, Go on GO in its red (a two-letter word is held by the screen's
  height on a desktop, not its width); every bubble lists the other two, and every link answers. Copy `js/welcome.js` and `css/welcome.css` at the same time, and in each sibling add
  the stylesheet link and one call in its boot — `mountWelcome({ app: 'chess', word: 'Chess' })` — plus
  the `#/welcome` route; see "The series welcome" above. (`dev-table.html` is gone: the table is checked by `scripts/render-table.mjs` and by
  the layout audit recorded under Draft 4, not by a page that would ship with no link to it.)
- **Phase 8** — the manual hand builder and per-decision review, deferred by the owner.
- **The branch.** `phase-1-engine` was fast-forwarded into `main` for the publish (53 commits). From
  here, work on a new branch and fast-forward `main` after the owner approves: every push to `main`
  redeploys the live site. The weak-spot report now has
`pushfold.hu.<seat>.<band>` keys alongside `preflop.*`, and whether it ranks them in one list or as
separate readouts is an open decision — mixing them may just surface "you are worst at whatever you
drilled least".

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
