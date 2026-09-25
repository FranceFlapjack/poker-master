---
id: opening-charts
track: Ranges
title: Opening charts, and where they come from
lede: A chart is somebody's answer to a question. Knowing whose, and to which question, is most of knowing how far to trust it.
level: Tournament
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "Position (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Position_(poker)"
  - The chart used in this app is content/charts/rfi-9max.json; its percentages are recomputed from the range notation by scripts/check-charts.mjs
---

An opening chart says: from this seat, raise these hands and fold the rest. It is the most useful single
page in poker and the most often misunderstood, so it is worth being precise about what one actually is.

## Where charts come from

Broadly, three places.

**Solver output.** Run an equilibrium solver over a simplified version of the game and read off what it
does. These are the most rigorous charts available and they come with real caveats: the answer depends
entirely on the assumptions fed in — stack depth, bet sizes allowed, what happens after the flop — and
the output is usually **mixed**, meaning it raises a hand some percentage of the time rather than always.
They are also, almost always, somebody's commercial product.

**Measured from results.** Take a large database of real hands and see what winning players actually did.
Descriptive rather than prescriptive: it tells you what a population does, which may or may not be right.

**Authored from principles.** Someone applies the ideas in the previous lesson — fewer players behind
means wider, position after the flop is worth a lot, suited beats offsuit — and writes down a range that
follows them. Simple enough to memorise, and explicitly an approximation.

## Which one this app uses, and why

**The chart in this app is the third kind.** It was authored from positional principles for this course.
It is not solver output, it is not equilibrium, and it is not copied from anyone else's chart.

That is a deliberate choice rather than a shortcut. Solver-derived charts, cell by cell, are somebody's
product, and lifting one would be taking work that is not ours to take. The *shape* of a positional
opening range — tighter early, wider late, suited before offsuit — is ordinary poker knowledge that
nobody owns.

What the app does instead is tell you, on the page, exactly what the chart is. The trainer carries the
provenance beside the grid rather than hiding it in a file, because a chart looks authoritative whether
or not it has earned it.

The percentages are the one part that cannot drift: they are recomputed from the range notation itself
every time the checkers run, so a chart here can never claim a width it does not have.

```try
type: choice
ask: This app's opening chart was authored from positional principles. What does that mean about it?
options: It is the equilibrium answer | It is a simple approximation that a solver would disagree with in places | It came from a database of winning players | It is wrong
answer: It is a simple approximation that a solver would disagree with in places
hint: Which of these is a claim the app actually makes about itself?
why: It is a teaching baseline — coherent, memorable, and close enough to be useful. A solver would mix some of these hands rather than always opening them, and would size differently by position. Neither "the truth" nor "wrong": an approximation that says so.
```

```try
type: choice
ask: A solver chart says to raise a hand 65% of the time. What does that mean?
options: It wins 65% of the time | Raise it in 65% of seats | Play a mixed strategy — raise it most of the time, fold sometimes | The solver is 65% confident
answer: Play a mixed strategy — raise it most of the time, fold sometimes
hint: It is a frequency, not a probability of winning or a measure of confidence.
why: Equilibrium strategies are often mixed: the same hand gets played more than one way so that an opponent can never read you from your action. It is also why solver charts are hard to use live — you cannot run a random number generator at the table, which is part of why simplified charts exist at all.
```

## How to use one, and when to stop

A chart answers exactly one question: **nobody has entered the pot yet, what do you open?** That is the
"raise first in" part, and it covers a large share of preflop decisions.

It does not tell you what to do facing a raise, what to do after someone limps, or anything at all about
what happens on the flop. Those are different questions and need different answers.

The honest way to hold a chart is as a **default you depart from for a reason**. Knowing the default
matters because it means every departure is a decision rather than a drift. Playing a tight table? Open
wider than the chart. Somebody behind you is re-raising constantly? Open tighter, especially with the
hands that hate being raised. The chart is the thing you adjust *from*.

```try
type: choice
ask: What question does a "raise first in" chart answer?
options: What to do on every street | What to open with when nobody has entered the pot yet | What to do facing a raise | Which hands win most often
answer: What to open with when nobody has entered the pot yet
hint: The name is the answer. Raise FIRST IN.
why: Just that one spot. Facing a raise, facing a limp, and everything after the flop are separate questions, and a chart that claims to answer them all is answering none of them properly.
```

+++ Read more: why a simple chart can beat a better one

There is a real argument for using a simplified chart even when a more accurate one exists.

A chart you have memorised and follow consistently produces a coherent range. A chart you half-remember
produces something worse than either — you will recall the hands you like, forget the ones you do not,
and end up with a range shaped by taste rather than position.

Mixed strategies make this worse rather than better. "Raise this 65% of the time" is not something anyone
executes at a live table; in practice it becomes "raise this when I feel like it", which is exactly the
drift a chart is supposed to prevent.

So the useful test of a chart is not how close it is to equilibrium. It is whether you will actually
follow it.
+++

## Remember

- Charts come from solvers, from databases, or from principles. Each has different authority.
- **This app's chart is authored from principles** — a teaching baseline, not equilibrium, and it says so
  on the page.
- A solver's percentage is a **frequency**, not a win rate.
- A chart answers one question: what to open when nobody has entered.
- Hold it as a default you depart from **for a reason**.
