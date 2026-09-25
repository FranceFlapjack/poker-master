---
id: survival-and-accumulation
track: Stack depth and ICM
title: Survival against accumulation
lede: A coin flip for your tournament life is a losing bet. So is folding for an hour. Both of those are true.
level: Tournament
sources:
  - "Independent Chip Model — Wikipedia, CC BY-SA 4.0: https://en.wikipedia.org/wiki/Independent_Chip_Model — \"Every player's chance of finishing 1st is proportional to the player's chip count\""
  - Every dollar figure below is computed by this app with js/engine/icm.js for a five-handed table paying 5,000 / 3,000 / 2,000 / 1,200 / 800 — you can reproduce all of them in the ICM lab
---

In a cash game a coin flip for your whole stack is free. Win or lose, you reach into your pocket and the
next hand starts. The chips are money and money is money.

A tournament is not that, and the difference is not a matter of degree.

## The flip that costs you money to win

Five players left, 10,000 chips each, paying 5,000 / 3,000 / 2,000 / 1,200 / 800. Everyone is already in
the money. You are offered a perfect 50/50 for your entire stack.

| | Chips | Your money |
|---|---|---|
| Right now | 10,000 | **$2,400** |
| You win the flip | 20,000 | $3,420 |
| You lose it | 0 | $800 |

Doubling your chips gains you **$1,020**. Busting costs you **$1,600**. The two sides are not the same
size, so a bet that is exactly even in chips is a clear loser in money.

To break even you would need **61.1%** — not 50%. A flip is not a flip.

Nothing unusual is happening here. It is the payout ladder: the first chips you own carry a prize with
them, and the last ones you win are only worth the gap between one finishing position and the next. That
is what everyone means by "chips are not money", and it is the next lesson.

## The mistake that follows from that

Read the paragraph above and the obvious conclusion is: fold. Wait. Let other people flip.

So here is the same table, and this time you do nothing at all while the blinds eat you:

| Your stack | Your money | Against where you started |
|---|---|---|
| 10,000 | $2,400 | — |
| 8,000 | $2,152 | −10.3% |
| 6,000 | $1,876 | **−21.8%** |
| 4,000 | $1,565 | −34.8% |
| 2,000 | $1,211 | −49.5% |

Folding down to 6,000 has cost you a fifth of your money without your ever losing a pot. Nobody beat you.
You did that.

Both tables are the same model saying the same thing. Risk is expensive **and** waiting is expensive.
Anyone who tells you tournaments are about survival has read the first table and not the second.

## Where the actual answer lives

The resolution is not somewhere between the two. It is in a distinction the model makes very sharply:

**The premium applies to calling, not to shoving.**

When you call an all-in you need your hand to be good, because the only way the hand ends is a showdown.
When you *shove*, there is a second way to win: everybody folds and you take the pot uncontested. Those
chips cost you no equity at all.

That is why a short stack at a final table should be shoving frequently and calling rarely, and why the
two ranges in the push/fold trainer are such different widths. **Heads-up** at 10bb — the only case this
app has actually solved — the equilibrium shoves 58.7% of hands and calls with 36.3%. The same player,
the same depth, the same table, and a gap of more than twenty points between the two things they do.

Five-handed the widths will be different, and this app does not claim to know them. What carries over is
the direction and the reason for it, which is the part you need.

```table
seats: 5
stacks: 10000
blinds: 300/600
ante: each
hero: 0
hand: Ad Jc
button: 2
names: You, Ana, Bo, Cy, Dee
caption: Five left, everyone level, sixteen big blinds each. Every decision below is made at this table.
```

```try
type: choice
ask: Five left, 10,000 each, everyone in the money. Somebody offers you a perfect coin flip for your whole stack. What equity would you actually need for it to break even in MONEY?
options: 50% — a flip is a flip | 55.6% | 61.1% | 66.7%
answer: 61.1%
hint: Work out what you gain by winning and what you lose by busting. They are not the same number.
why: Doubling up gains $1,020; busting costs $1,600. Break-even is 1,600 ÷ (1,020 + 1,600) = 61.1%. The flip is fair in chips and badly unfair in money, and that gap is the whole of tournament strategy.
```

```try
type: choice
ask: You fold every hand and blind down from 10,000 to 6,000 at the same table. What has that cost you?
options: Nothing — you still have chips | About a tenth of your money | About a fifth of your money | About half your money
answer: About a fifth of your money
hint: Losing chips costs money whether you lost them in a pot or gave them away in blinds.
why: $2,400 down to $1,876 — you have lost 21.8% of your equity without playing a hand. The model does not care how the chips left, and neither should you.
```

```try
type: action
seats: 5
stacks: 7200, 10000, 10000, 10000, 10000
blinds: 300/600
ante: each
button: 2
hero: 0
hand: Kc 9d
actions: fold, fold
ask: Twelve big blinds, five left, folded to you in the cutoff. King-nine offsuit.
options: Fold | Call 600 | Raise all in
answer: Raise all in
why: Two players behind and a pot already worth more than a big blind before anybody has acted. King-nine is not a strong hand, but you are not asking it to win a showdown — you are asking it to be good enough for the times you get called, which is a minority of the time. Calling 600 is the worst of the three: it puts in chips without the chance of winning immediately, and leaves you playing a flop out of position with eleven big blinds.
```

```try
type: action
seats: 5
stacks: 7200, 22000, 10000, 10000, 10000
blinds: 300/600
ante: each
button: 3
hero: 0
hand: Kc 9d
actions: raise 10000, fold
ask: Same hand, same depth. This time the chip leader has moved all in ahead of you and you are covered.
options: Fold | Call all in | Raise
answer: Fold
why: Identical cards, opposite answer, and the difference is that nobody can fold any more. Shoving king-nine was fine because most of its value came from everyone passing; calling with it wins only when it holds up at showdown against a range that beats it. And busting costs you far more than doubling gains — this is precisely the call the premium is there to stop you making.
success: That pair of spots is the lesson. The hand did not change. The way the hand can win did.
```

+++ Read more: it is not the same for everybody

The 61.1% above is for a player with an average stack. It is not a constant, and the way it moves is the
useful part.

- **The short stack** at the same table — 4,000 while everyone else has 10,000 — needs **56.8%** for the
  same flip. They have less to lose, because their equity is already close to the bottom prize.
- **A bigger stack risking a portion** rather than everything needs about **55.6%**, because losing leaves
  them alive.
- **An average stack risking it all** pays the most: **61.1%**.

So the premium is not a property of the bubble or of the table. It is a property of *how much of your own
tournament you are putting in the middle*. The player with nothing left to lose pays almost nothing for
gambling, which is exactly why a desperate short stack is dangerous and why calling one is expensive.

Run any of these in the ICM lab and you will get the same numbers — they came from the same module the lab
uses.
+++

## Remember

- A 50/50 for your stack needs about **61%** to break even in money at an even five-handed final table.
- Blinding down from 10,000 to 6,000 costs **a fifth of your money**. Waiting is not free.
- The premium is on **calling**. Shoving has a second way to win, and it costs you nothing.
- How much you pay depends on how much of your own tournament is at risk, not on how close the bubble is.
