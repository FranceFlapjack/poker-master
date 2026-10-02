---
id: the-169-grid
track: Ranges
title: The 169 hands, on one grid
lede: There are 1,326 hands you can be dealt and only 169 that matter. The difference between those two numbers is where most range mistakes live.
level: Tournament
sources:
  - "Poker probability — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Poker_probability"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - Every count in this lesson is computed by this app from the deck itself, js/engine/ranges.js
---

Two cards from fifty-two is **1,326** distinct hands. But A♠K♠ and A♥K♥ play identically before the flop,
and so do all four suited ace-kings. Collapse the ones that behave the same and you get **169**.

That is the grid everyone draws: thirteen by thirteen, pairs down the diagonal, suited above it, offsuit
below. Rows and columns both run ace down to deuce, so every two ranks meet twice: once above the
diagonal, suited — ace-king suited is in the top row — and once below it, offsuit — ace-king offsuit is
in the first column.

```grid
show: shapes
caption: Tap a square to see the hands inside it. AKs holds four, one per suit; AKo holds twelve.
```

- **13 pairs** — AA down to 22
- **78 suited** hands — AKs down to 32s
- **78 offsuit** hands — AKo down to 32o

## The trap in the picture

The grid gives every cell the same square. That is a lie about frequency, and it is the single most
useful thing to unlearn here.

| | cells | actual hands | share of what you are dealt |
|---|---|---|---|
| Pairs | 13 | 78 | **5.9%** |
| Suited | 78 | 312 | **23.5%** |
| Offsuit | 78 | 936 | **70.6%** |

Each pair is **6** combinations. Each suited hand is **4**. Each offsuit hand is **12** — three times as
many as its suited twin.

So the grid looks about half suited, and suited hands are under a quarter of what you actually get dealt.
Seven hands in ten are offsuit. When you widen a range by adding a row of offsuit hands you are adding
three times the volume that the same row of suited hands would add, which is why charts widen through
suited hands first and reach for offsuit ones last.

Switch the grid below from **as drawn** to **as dealt** and the picture corrects itself: each square
is shaded by the number of real hands in it, and the bottom half fills in.

```grid
show: dealt
caption: As dealt, each square shows its number of hands — 6 for a pair, 4 suited, 12 offsuit.
```

```try
type: choice
ask: How many different ways can you be dealt a specific pair, say aces?
options: Four | Six | Twelve | Thirteen
answer: Six
hint: Four aces, and you need two of them. How many pairs can you make from four cards?
why: Four aces taken two at a time is six combinations. That is why a pair is the rarest shape on the grid despite looking like an equal-sized square.
```

```try
type: choice
ask: Which will you be dealt more often — ace-king suited, or ace-king offsuit?
options: Suited, they look better | Offsuit, three times as often | The same, they are both one cell | Suited, twice as often
answer: Offsuit, three times as often
hint: Suited means both cards share one of four suits. Offsuit means they do not match, which is far easier.
why: Four ways to be suited against twelve ways not to be. Every offsuit cell on the grid is three times the volume of the suited cell above it, which the equal squares hide completely.
```

```tip
The squares are equal, the hands are not: an offsuit square holds **12** hands, a suited one **4**, a pair **6**.
```

## Card removal

The counts above assume you know nothing. The moment cards are face up, they change.

Hold aces and there were six combinations — but now that you hold two of them, nobody else can have any.
Put one ace on the board and the six ways your opponent could hold aces drops to **three**. Hold the ace
of spades yourself and every suited-ace combination they might have is down a quarter.

This is what **blockers** means, and it is not a subtlety: it is arithmetic you can do at the table. A
hand that holds a card your opponent needs has literally removed some of their strongest holdings from
the deck.

```try
type: choice
ask: There is one ace on the board. How many combinations of pocket aces can an opponent still have?
options: Six | Four | Three | One
answer: Three
hint: Three aces are left in the deck. How many pairs can you make from three cards?
why: Three remaining aces make three pairs, down from six. One card changed the odds of the strongest hand by half — and it is on the board where everybody can see it.
```

```try
type: showdown
board: Ah 9d 4c 2s 7h
hands: As Kd | Ac Qh
ask: Both players hold an ace. Who wins?
hint: Both play a pair of aces. Compare the next card down.
why: The kicker decides it, king over queen. Notice also what each player blocks: holding an ace makes it much less likely the other has one, which is exactly why ace-king wants to be in this pot and ace-queen does not.
```

+++ Read more: counting combos at the table

The reason to know 6/4/12 by heart is that it makes "what can they have" answerable rather than
atmospheric.

Say the board is K-7-2 and you think an opponent either has a king or is bluffing. Kings: they hold one
of three remaining kings alongside some kicker, which is a handful of combinations. Bluffs: every missed
draw and every pair of small cards, which is dozens. The counting tells you the bluffs outnumber the
kings heavily, and that is a real argument for calling — not a feeling.

You do not need to be exact. You need to know that a pair is six, a suited hand is four, an offsuit hand
is twelve, and that every visible card knocks some of them out.
+++

## Remember

- 1,326 actual hands, **169** distinct shapes.
- A pair is **6** combos, a suited hand **4**, an offsuit hand **12**.
- The grid's equal squares hide that **70.6%** of hands are offsuit and only **23.5%** suited.
- Every card you can see removes combinations from what anyone else can hold.
