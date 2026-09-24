---
id: all-in-and-side-pots
track: How a hand is played
title: All in, and how side pots work
lede: You can never win more from someone than they put in. Everything about side pots follows from that one sentence.
level: Beginner
sources:
  - "All-in — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/All-in"
  - "Betting in poker — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Betting_in_poker"
  - The pots in this lesson are built and paid by this app's own engine, js/engine/rules.js
---

Sooner or later somebody wants to bet more than you have. You are not forced out: you put in everything
left in front of you and you are **all in**. You stay in the hand and play to the river.

But there is a limit, and it is the only rule you need:

**You can only win from each player as much as you yourself put in.**

If you are all in for 300 and two opponents keep betting each other for thousands, you can win 300 from
each of them — and not one chip more. The money they bet beyond your 300 is a separate pot that you are
not in.

## What that looks like

Three players. Short has 300, Mid has 1,000, Deep has 2,000. Short shoves, Mid shoves over the top, Deep
calls.

```table
seats: 3
stacks: 300, 1000, 2000
names: Short, Mid, Deep
blinds: 50/100
button: 0
hero: none
reveal: true
hands: As Ac | Qh Qd | 7c 7s
board: 2c 8d 9h Ts 3h
actions: raise 300, raise 1000, call
caption: Short is all in for 300 with aces. Mid is all in for 1,000 with queens. Deep called with sevens. Two pots, not one.
```

The chips split into two piles:

- **Main pot — 900.** Three hundred from each of the three players. Everyone is eligible.
- **Side pot — 1,400.** The extra 700 each that Mid and Deep put in beyond Short's 300. Short cannot win
  a chip of it, because Short never matched it.

Short has the best hand and wins the main pot: 900. Short does *not* win the side pot, despite having the
best hand at the table, because that money was never within reach. The side pot goes to the better of the
two hands that paid into it — Mid's queens beat Deep's sevens — so Mid takes 1,400.

Short turns 300 into 900. Mid turns 1,000 into 1,400. Deep loses the 1,000 they put in.

```try
type: choice
ask: Short is all in for 300 and has the best hand at the table. How much does Short win?
options: 900 | 1400 | 2300 | 3300
answer: 900
hint: Three hundred from each of three players. How many players, and how much from each?
why: Short put in 300 and can collect 300 from each opponent — 900 in total, including their own. The other 1,400 was bet beyond what Short could match, so it was never available to win.
```

```try
type: choice
ask: Who wins the 1,400 side pot?
options: Short, because they have the best hand | Mid, whose queens beat the sevens | Deep, who called last | It is split between Mid and Deep
answer: Mid, whose queens beat the sevens
hint: Only the players who paid into a pot can win it. Which two were those?
why: Short is not eligible for the side pot at all, so the best hand in it is the best hand among Mid and Deep. Queens beat sevens, so Mid takes the 1,400 — even though Short beat them both.
success: Correct. A short stack can win the pot they are in and still watch a bigger pot go to a worse hand.
```

```try
type: choice
ask: Why can a side pot exist at all?
options: Because the dealer decides to split it | Because one player could not match the full betting | Because there were three players | Because the hand went to the river
answer: Because one player could not match the full betting
hint: What made Short different from Mid and Deep?
why: A side pot appears the moment players bet beyond what an all-in player could cover. If everyone can match everything, there is only ever one pot — the number of players has nothing to do with it.
```

## Why this is good for you, not bad

The first time a short stack wins the main pot and loses a bigger side pot, it feels like a swindle. It
is the opposite. The rule protects you: it means nobody can bet you off a hand just by having more money
than you, and it means you can never lose more than you brought to the table.

In a tournament this matters constantly, because stacks are never equal. Going all in for a short stack
is a completely normal, often correct play — and knowing exactly what you can win is part of deciding
whether to do it.

+++ Read more: more than two pots

Nothing limits this to two piles. Every distinct all-in amount creates another layer.

Four players — all in for 100, 400, 900 and 2,000 — produce a main pot everyone can win, then a side pot
for the last three, then another for the last two, and finally the uncalled remainder returns to the
biggest stack, because nobody matched it.

Each pot is awarded separately, to the best hand among the players who paid into it. The same player can
win several of them, or none.

You will never have to compute this at a live table — the dealer does it, and this app does it for you.
But knowing the shape stops the result from ever looking like a mistake.
+++

## Remember

- Short of chips? You go **all in** and play on. You are never forced out of a hand.
- You can win from each opponent **only as much as you put in yourself**.
- Bets beyond an all-in player's stack form a **side pot** they cannot win.
- Each pot goes to the best hand among the players eligible for it.
