---
id: chips-are-not-money
track: Stack depth and ICM
title: Chips are not money
lede: Every chip you win is worth less than the one before it. That single fact generates every adjustment in this section.
level: Tournament
sources:
  - "Independent Chip Model — Wikipedia, CC BY-SA 4.0: https://en.wikipedia.org/wiki/Independent_Chip_Model — the model \"first developed\" by David Harville in 1973 for horse racing and independently rediscovered for poker by Mason Malmuth in 1987, which the article also calls \"the Malmuth–Harville method\""
  - Every figure below is computed by this app with js/engine/icm.js for a five-handed table of 100,000 chips paying 5,000 / 3,000 / 2,000 / 1,200 / 800, and can be reproduced in the ICM lab
  - Shoving widths quoted come from content/charts/pushfold-hu.json, solved by this app
---

You cannot cash out a chip. There is no window. The only way chips become money is by outlasting people,
and the prize for outlasting them was decided before the tournament started.

So the question "what is this chip worth?" has an answer, and it is not "one chip".

## The curve

Five players left, 100,000 chips between them, paying 5,000 / 3,000 / 2,000 / 1,200 / 800. Here is what
your seat is worth as your stack grows — everyone else sharing the rest equally:

| Your stack | Share of chips | Share of the money | Worth | What that last 10,000 added |
|---|---|---|---|---|
| 0 | 0% | 6.7% | $800 | — |
| 10,000 | 10% | 14.4% | $1,725 | **$925** |
| 20,000 | 20% | 20.0% | $2,400 | $675 |
| 30,000 | 30% | 24.4% | $2,927 | $527 |
| 40,000 | 40% | 28.0% | $3,359 | $431 |
| 60,000 | 60% | 33.7% | $4,038 | $315 |
| 80,000 | 80% | 38.0% | $4,566 | **$249** |

Read the last column downwards. The first ten thousand chips you own are worth $925. The eighth ten
thousand is worth $249 — less than a third as much, for exactly the same chips.

Owning 80% of the chips in play does not give you 80% of the money. It gives you 38%.

## Doubling never doubles

That curve has a tidy consequence. Take any stack at that table and double it:

| | Money before | Money after | Multiplier |
|---|---|---|---|
| 10,000 → 20,000 | $1,725 | $2,400 | **×1.39** |
| 20,000 → 40,000 | $2,400 | $3,359 | **×1.40** |
| 40,000 → 80,000 | $3,359 | $4,566 | **×1.36** |

Twice the chips is worth about **1.4 times the money**, wherever you start from. Which is the cleanest
way to see why a 50/50 for your stack is a losing bet: you are risking one unit to win 0.4 of one.

## The same thing at a real table

```table
seats: 5
stacks: 48000, 31000, 25000, 16000, 9000
blinds: 1000/2000
ante: each
hero: 0
hand: Qh Qd
button: 3
names: You, Ana, Bo, Cy, Dee
caption: A final table with five left. The stacks are the ICM lab's default, so every figure below is one you can go and reproduce.
```

| Seat | Stack | Chips | Money |
|---|---|---|---|
| You | 48,000 | 37.2% | **27.3%** |
| Ana | 31,000 | 24.0% | 22.7% |
| Bo | 25,000 | 19.4% | 20.6% |
| Cy | 16,000 | 12.4% | 16.7% |
| Dee | 9,000 | 7.0% | **12.7%** |

You hold 37.2% of the chips and 27.3% of the money — a tenth of the prize pool, evaporated, for the
privilege of being in front. Dee holds 7.0% of the chips and 12.7% of the money.

None of that is a reason to be unhappy about having chips. It is the reason **the way you use them
changes**: the leader's chips are discounted, so they are the right chips to put at risk in spots where
everyone else's are not.

## What this app will and will not do with that

Two of the tools speak directly to this, and the split between them is deliberate:

- **The ICM lab** gives you the numbers above exactly. No sampling, no approximation — enumerate it twice
  and you get the same answer.
- **The push/fold trainer** is solved for **chip EV only**, and it says so on the page. At 10 big blinds
  heads-up the equilibrium shoves 58.7% and calls 36.3%. Those are the right widths when chips are money.

At a final table they are not. The clear adjustment, and the one that follows directly from everything
above, is that **calls get tighter** — every caller is risking chips worth more to them than the pot is
offering. The shoving side is genuinely harder: tighter callers mean more folds, which pushes the other
way, and this app does **not** solve ICM push/fold. Where it has not solved something it tells you, rather
than adjusting a number by an amount it cannot justify.

```try
type: choice
ask: At that five-handed table, which chips are worth the most money to you?
options: The first 10,000 — worth $925 | The middle ones, around a 40,000 stack | The last 10,000 that takes you to 80,000 | They are all worth the same — a chip is a chip
answer: The first 10,000 — worth $925
hint: Look at the right-hand column of the first table and read it downwards.
why: The first 10,000 adds $925; the ten thousand that takes you from 70,000 to 80,000 adds $249. Chips buy you a prize, and once you have most of the prize sewn up there is progressively less left to buy.
```

```try
type: choice
ask: You have 20,000 at that table and you double to 40,000. How much does your MONEY go up by?
options: It doubles — ×2.0 | About ×1.6 | About ×1.4 | It stays the same
answer: About ×1.4
hint: $2,400 before. Look up what a 40,000 stack is worth.
why: $2,400 becomes $3,359, a multiplier of 1.40 — and the same double from 10,000 or from 40,000 gives almost exactly the same 1.4. That constant is the reason risking your stack to win an equal one is a losing proposition even when the chips are exactly even.
```

```try
type: choice
ask: The push/fold chart shoves 58.7% of hands at 10 big blinds. You are at a final table with real ICM pressure. What does the app tell you to do with that number?
options: Shove the same range — an equilibrium is an equilibrium | Call much tighter than the chart; the shoving adjustment it does not claim to know | Shove roughly half as wide | Ignore the chart entirely, ICM makes it useless
answer: Call much tighter than the chart; the shoving adjustment it does not claim to know
hint: One side of that game has a clear direction under ICM. The other does not.
why: Calling is unambiguous — you are risking chips worth more than the pot pays, so the calling range tightens. Shoving pulls in two directions at once: your own chips are worth more, but everyone behind you is folding more than they would in a chip-EV game, and that is worth something too. This app has not solved that, so it does not pretend to have. A tool that quietly narrowed the range by "about 20%" would be inventing a number.
```

+++ Read more: where chips ARE money

The curve above is steep because five players are splitting a ladder. Two situations flatten it back out
almost completely.

**Winner takes all.** One prize means no positions to finish into. Your equity is exactly your chip share,
doubling up exactly doubles your money, and every ICM adjustment in this section evaluates to 1.00. If you
ever want to see the effect isolated, set the ICM lab's payouts to a single number and watch every premium
disappear at once.

**Very early in a big field.** With 900 players left of 1,000 and a ladder that starts at 150th, the
ladder is so far away that the model barely notices. The premium in the bubble lesson at nine-handed,
three paid was already down to 1.06; at three hundred players from the money it is indistinguishable from
1.00. Early tournament play really is close to a cash game in this one respect, which is why accumulating
chips early is not the reckless thing it sounds like after reading a lesson on ICM.

The pressure arrives with the money, and it arrives gradually. Knowing roughly where you are on that
curve is most of knowing how tight to be.
+++

## Remember

- Chips buy prizes, so **each one you win is worth less than the last**: $925 for your first ten thousand,
  $249 for your eighth.
- 80% of the chips is **38%** of the money.
- **Doubling your stack multiplies your money by about 1.4**, from anywhere on the curve.
- Big stacks hold discounted chips, short stacks hold premium ones — which is why the same risk is cheap
  for one and expensive for the other.
- Under ICM, **calls tighten**. The shoving adjustment is not something this app has solved, and it says
  so rather than guessing.
