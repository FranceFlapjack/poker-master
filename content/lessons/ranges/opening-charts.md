---
id: opening-charts
track: Ranges
title: Opening charts — what to raise from each seat
lede: Everyone before you has folded. Raise or fold? An opening chart answers that for every seat, and reading one takes ten seconds.
level: Tournament
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "Position (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Position_(poker)"
  - The chart in this lesson is this app's own, content/charts/rfi-9max.json — the same one the range trainer and the game score against. Its percentages are recomputed from the ranges by scripts/check-charts.mjs, and every drill below is checked against it by scripts/verify-drills.mjs
---

You are at a nine-player table. Nobody has put any chips in yet except the blinds, and everyone before
you has folded. Now it is your turn: **raise, or fold?**

An **opening chart** answers exactly that question. For each seat it lists the hands to raise with.
Every other hand, you fold.

## Reading the chart

Three steps:

1. **Find your seat** along the top. The seats run in the order they act, from *under the gun* — the
   first to speak, just left of the big blind — round to the *small blind*.
2. **Find your hand** on the grid. Pairs run down the diagonal, suited hands sit above it and offsuit
   hands below, exactly as in [the 169-hand lesson](#/lesson/ranges/the-169-grid).
3. **Coloured means raise. Grey means fold.**

Try it. Pick a seat, then tap any hand.

```grid
show: chart
position: UTG
caption: Start under the gun, then step through the seats to the button and watch the coloured area grow.
```

## The pattern: the later you sit, the more you raise

| Seat | Players still to act behind you | Hands to raise |
|---|---|---|
| Under the gun | 8 | 10% |
| Under the gun + 1 | 7 | 12.5% |
| Middle position | 6 | 16.3% |
| Lojack | 5 | 18.9% |
| Hijack | 4 | 22.5% |
| Cutoff | 3 | 26.4% |
| Button | 2 | 41.5% |
| Small blind | 1 | 36.7% |

The big blind has no row: if everyone folds to it, the hand is already over and the big blind wins.

Two reasons, both simple:

- **Fewer players can have you beaten.** Under the gun, eight players still get to look at their cards.
  One of them will often hold something better than yours. On the button only the two blinds are left.
- **Acting last is worth a lot.** The button acts last on every round after the flop, so it gets to see
  what everyone else does first. That is why it raises more hands than any other seat — about four
  in ten. The [position lesson](#/lesson/ranges/position-and-ranges) has the full story.

## Five things worth remembering

You do not need to memorise all 169 squares. These five facts, all straight from the chart, get you most
of the way:

- **Under the gun, about 1 hand in 10.** Pairs from 55 up, big aces (A9 suited or better, AQ offsuit or
  better), KJ, KQ, QJ and JT suited, and KQ offsuit.
- **Every pair is a raise from the lojack onward.** Before that, the smallest pairs fold.
- **Every suited ace is a raise from the hijack onward.**
- **The button raises about 4 hands in 10** — more than any other seat.
- **Suited before offsuit.** Under the gun you raise A9 suited but fold AJ offsuit. Suited hands make
  flushes, so they are worth more, and the chart reaches for them first.

```try
type: action
chart: UTG
seats: 9
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
stacks: 10000
blinds: 100/200
button: 6
hero: 0
hand: 7s 7h
ask: You are under the gun, first to act, with a pair of sevens. Raise or fold?
options: Fold | Raise to 500
answer: Raise to 500
hint: Under the gun the chart raises pairs from 55 upward. Is 77 in?
why: Under the gun the chart raises every pair from 55 up, and 77 is one of them. Pairs are the one kind of hand that is often already best before the flop.
```

```try
type: action
chart: UTG
seats: 9
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
stacks: 10000
blinds: 100/200
button: 6
hero: 0
hand: Ks Ts
ask: Under the gun again, now with king-ten suited. Raise or fold?
options: Fold | Raise to 500
answer: Fold
hint: Under the gun the suited kings start at KJ.
why: Under the gun the chart raises suited kings only from KJ up. With eight players still to act, king-ten too often runs into a better king or a bigger hand.
```

```try
type: action
chart: BTN
seats: 9
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
stacks: 10000
blinds: 100/200
button: 0
hero: 0
hand: Ks Ts
actions: fold, fold, fold, fold, fold, fold
ask: Same king-ten suited — but now everyone has folded to you on the button. Raise or fold?
options: Fold | Raise to 500
answer: Raise to 500
hint: Only the two blinds are left, and you act last for the rest of the hand.
why: On the button the chart raises every suited king. The cards did not change; the seat did. Only the blinds can wake up with something, and you will act last on every round after the flop.
success: Right — same cards, opposite answer. That is the whole idea of a chart.
```

```try
type: action
chart: HJ
seats: 9
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
stacks: 10000
blinds: 100/200
button: 2
hero: 0
hand: Ad 5d
actions: fold, fold, fold, fold
ask: Folded to you in the hijack, with ace-five suited. Raise or fold?
options: Fold | Raise to 500
answer: Raise to 500
hint: One of the five things worth remembering is about suited aces.
why: From the hijack on, every suited ace is a raise. The small ones are not there for the ace — they can make a flush, and holding an ace makes it less likely anyone else has one.
```

```try
type: action
chart: CO
seats: 9
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
stacks: 10000
blinds: 100/200
button: 1
hero: 0
hand: Qc 9h
actions: fold, fold, fold, fold, fold
ask: Folded to you in the cutoff, with queen-nine offsuit. Raise or fold?
options: Fold | Raise to 500
answer: Fold
hint: Offsuit hands come in last. In the cutoff the offsuit queens start at QT.
why: In the cutoff the chart raises offsuit queens from QT up, so Q9 offsuit is a fold. One seat later, on the button, it becomes a raise — offsuit hands are the last to join, seat by seat.
```

## What the chart does not tell you

A chart answers **one** question: everyone before you folded — what do you open? It says nothing about
what to do when somebody has already raised, when someone just called the big blind, or anything after
the flop. Those are different questions; [defending the blinds](#/lesson/ranges/defending-the-blinds)
covers the first of them.

Treat the chart as your **starting point**. Change it only for a reason you could say out loud — the
players behind you fold too much, say, or one of them re-raises everything.

```tip
The chart is your **default**. Leave it only for a reason you could say out loud at the table.
```

```try
type: choice
ask: Which question does an opening chart answer?
options: What to do on every street | What to raise with when everyone before you has folded | What to do when someone has raised | Which hands win most often
answer: What to raise with when everyone before you has folded
hint: Think about what has happened before it is your turn.
why: Just that one moment. Facing a raise, facing a call, and everything after the flop are separate questions.
```

## Where this chart comes from

Charts come from three places:

- **A solver** — a computer program that works out a strategy nobody can exploit, for a simplified game.
  The most rigorous kind, and usually somebody's commercial product.
- **A database** — what winning players actually did, measured over millions of real hands.
- **Principles** — someone writes ranges down from rules like the ones in this lesson.

**The chart in this app is the third kind.** It was written for this course from positional principles:
it is not solver output, not GTO, and not copied from anyone else's chart. It is simple on purpose, so you
can hold it in your head at a real table. A solver would disagree with some squares, and the range trainer
says so on its page too.

+++ Read more: solvers, mixed strategies, and why a simple chart can beat a better one

A solver's chart often says something like "raise this hand 65% of the time". That is a **frequency**, not a
win rate: the solver plays the same hand more than one way so that nobody can read it from its action. It
is also why solver charts are hard to use at a live table — nobody can run a random number generator in
their head.

And that points at a real argument for a simple chart. One you have memorised and follow consistently
gives you a sensible range. One you half-remember gives you something worse than either: you recall the
hands you like, forget the ones you do not, and end up with a range shaped by taste rather than by seat.
"Raise this 65% of the time" tends to become "raise this when I feel like it", which is exactly the drift a
chart is supposed to stop.

So the useful test of a chart is not how close it comes to a solver. It is whether you will actually
follow it.
+++

## Remember

- A chart answers one question: **everyone before you folded — raise or fold?**
- **Find your seat, find your hand: coloured is raise, grey is fold.**
- **The later you sit, the more you raise** — about 1 hand in 10 under the gun, about 4 in 10 on the button.
- Every pair from the lojack on, every suited ace from the hijack on, and suited hands before offsuit.
- This app's chart is written from principles, not a solver — a starting point you leave only for a reason.
- Practise it in the [range trainer](#/tools/ranges).
