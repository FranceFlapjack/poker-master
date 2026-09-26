---
id: position-and-ranges
track: Ranges
title: Why position changes the answer
lede: The same two cards are a raise in one seat and a fold in another. Nothing about the cards changed.
level: Tournament
sources:
  - "Position (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Position_(poker)"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - Range widths quoted here are computed by this app from content/charts/rfi-9max.json
---

Ace-jack offsuit is a good-looking hand. Under the gun at a nine-handed table it is a fold. On the button
it is a clear raise. Both of those are true at the same time, and the cards are identical.

Two separate things are doing the work.

## How many are left to act

Open under the gun and eight players can still wake up with something better. Open on the button and two
can. That is not a small difference — each player behind is another chance that your hand is second best
before the flop is even dealt.

So the width of an opening range tracks the number of seats behind almost mechanically:

| Seat | Players behind | Opens |
|---|---|---|
| Under the gun | 8 | 10.0% |
| Middle position | 6 | 16.3% |
| Hijack | 4 | 22.5% |
| Cutoff | 3 | 26.4% |
| Button | 2 | **41.5%** |

The button opens four times as many hands as the first seat. Same deck, same cards, four times the range.

```tip
Before you look at your cards, **count the players still to act**. Eight behind and two behind are different questions about the same hand.
```

## What happens after the flop

The second reason is bigger and less obvious. From the flop onward, **the button acts last on every
street**. Every decision you make is taken knowing what everyone else did; every decision they make is
taken blind.

That is worth more than a pair of decent cards. It means you can check back and see a free card, or bet
when everyone shows weakness, or fold cheaply when someone shows strength — all with information nobody
else had.

Which is why a marginal hand is playable in position and unplayable out of it. The hand is the same; what
differs is how many of the remaining decisions you will get to make with your eyes open.

```try
type: action
seats: 9
stacks: 25000
blinds: 100/200
button: 6
hero: 0
hand: As Jd
ask: Nine-handed. You are first to act before the flop, with eight players behind you. What do you do?
options: Fold | Call 200 | Raise to 500
answer: Fold
why: Ace-jack offsuit is comfortably above average as a pair of cards, and still a fold here. Eight players can beat it, and the ones who play back at you mostly have it dominated — ace-queen and ace-king both leave you drawing thin. It is also offsuit, so it flops well far less often than the picture suggests.
hint: Count the players still to act behind you — and think about which hands they would play back at you with.
```

```try
type: action
seats: 9
stacks: 25000
blinds: 100/200
button: 0
hero: 0
hand: As Jd
actions: fold, fold, fold, fold, fold, fold
ask: Identical cards. Everyone has folded to you on the button. Now what?
options: Fold | Call 200 | Raise to 500
answer: Raise to 500
why: Same hand, opposite answer. Only the two blinds are left, both of whom will be playing the rest of the hand out of position against you, and ace-jack is well ahead of two random hands. Raising also wins the blinds outright a good share of the time — which is most of what a button raise is for.
success: Right — and this pair of spots is the whole lesson. Nothing about the cards changed.
hint: How many players are left to beat now, and who will act last on every street after the flop?
```

```try
type: choice
ask: The button opens 41.5% of hands and under the gun opens 10%. What is the main reason?
options: The button gets better cards | The button has fewer players left to act, and will act last after the flop | Under the gun has to post a blind | The button is next to the dealer
answer: The button has fewer players left to act, and will act last after the flop
hint: Two things, and both of them are about information rather than cards.
why: Fewer players behind means fewer chances to be beaten before the flop; acting last means every decision afterwards is made with more information than anyone else has. Cards are dealt at random and every seat gets the same ones over time.
```

+++ Read more: the small blind is the odd one out

Look at a chart and the widths climb steadily from under the gun to the button — and then the small blind
opens wide too, around 37%, with only one player behind.

That looks like it fits the pattern, and it does not. The small blind acts *last* before the flop, which
is why the number is high, but acts *first* on every street after it. It has the best position for one
round and the worst for three.

That is why the small blind raises rather than limps. Calling invites the big blind along cheaply into a
pot you will have to play first-to-act for the rest of the hand, which is the situation to avoid. Raising
at least gives you a chance to end it immediately.

It is the one seat where the two forces point in opposite directions, and it is worth knowing that the
number in the chart is not the same kind of number as the others.
+++

## Remember

- Range width tracks **how many players are still to act**: eight behind is 10%, two behind is 41.5%.
- Acting last on every street after the flop is worth more than most hands.
- The same cards are correctly a fold in one seat and a raise in another.
- The small blind is the exception — wide because it acts last preflop, awkward because it acts first
  after it.
