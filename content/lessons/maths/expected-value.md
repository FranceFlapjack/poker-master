---
id: expected-value
track: The maths
title: Expected value
lede: What a decision is worth if you made it a thousand times. It is the only scoreboard that is not lying to you.
level: Tournament
sources:
  - Every figure here is computed by this app from js/engine/ev.js and reproducible in the pot odds & equity sandbox — EV arithmetic is arithmetic, not anybody's material
---

You call, you lose, and it was the right call. You call, you win, and it was a terrible one. Both of those
sentences are ordinary, and any way of thinking that cannot say them is not going to survive a tournament.

**Expected value** is the fix. It is what a decision would be worth on average if you could take it a
thousand times — chips gained or lost per attempt — and it does not care what happened this once.

## The EV of a call

One line, and you can do it at the table:

> **EV = your equity × (pot + what it costs) − what it costs**

There is 300 in the middle and it costs you 100. So a call contests 400, and you paid 100 to do it:

| Your equity | The sum | EV |
|---|---|---|
| 20% | 0.20 × 400 − 100 | **−20** |
| 25% | 0.25 × 400 − 100 | **0** |
| 30% | 0.30 × 400 − 100 | **+20** |
| 40% | 0.40 × 400 − 100 | +60 |

The 25% row is the pot-odds threshold from the last lesson, and here it is with its real meaning: at
exactly the required equity the call is worth **nothing**. Not good, not bad — nothing. Above it you are
printing chips, below it you are giving them away, and the threshold itself is a coin you neither win nor
lose.

That reframing matters more than it looks. "I had the right price" is not a reason to be pleased with a
call. It is a reason to be *indifferent*. The money is in the gap between your equity and the bar, and
close calls have almost no gap.

## The EV of a shove

A shove is a better bet than a call because it has two ways to win: they fold, or they call and you win
the showdown. That gives it two terms rather than one.

You move in for 1,000 with 500 already in the middle, and when you are called you have 35%:

| They fold | EV |
|---|---|
| never | **−125** |
| 20% of the time | **0** |
| 40% | +125 |
| 60% | +250 |

At 35% equity the call-me-please version of this hand is a loser: called every time, you lose 125 chips a
go. Folds turn it into a winner, and it needs only **20%** of them to get to break even.

This is why aggression is worth chips in a way that "having the better hand" is not. The passive version
of your hand has one way to win. The aggressive version has two, and the second one does not require your
cards to be any good at all.

```table
seats: 6
stacks: 12000
blinds: 400/800/100
ante: each
button: 5
hero: 0
hand: 9h 9d
names: You, Ana, Bo, Cy, Dee, Eli
caption: Fifteen big blinds, six-handed with a 100 ante. That puts 1,800 in the middle before anybody acts — more than two big blinds — which is most of why shoving works here.
```

## Counting in the right unit

Chips move every level, so a tournament EV is worth converting: **divide by the big blind**. "+20 chips"
means nothing across a ten-hour day. "+0.4bb" is comparable against every other decision you will make.

It is also the unit the push/fold trainer's solver works in, and the unit the ICM lab converts *out* of
when it tells you what chips are worth in money. Chips for the hand, big blinds for the decision, money
for the tournament — three scales, and mixing them up is how people talk themselves into bad calls.

```try
type: choice
ask: The pot is 300, it costs you 100, and you have 30% equity. What is the EV of calling?
options: +20 chips | −20 chips | +120 chips | +90 chips
answer: +20 chips
hint: You end up contesting the pot plus your own call, and you paid the call to do it.
why: 0.30 × 400 − 100 = +20. The common wrong answer is 0.30 × 300 = +90, which forgets that the chips you call with join the pot you are trying to win — you are contesting 400, not 300.
```

```try
type: choice
ask: You call with exactly the equity the pot odds require. What is that call worth?
options: A small profit — you had the price | Nothing at all | A small loss, because of the rake | It cannot be worked out without knowing the opponent
answer: Nothing at all
hint: Break-even means break even.
why: Zero. The required equity is precisely the point where calling and folding are worth the same, so "I had the odds" is a reason to be indifferent rather than pleased. All the money in poker is in the distance between your equity and the bar — which is why the big wins come from clearly good spots, not from technically-correct ones.
```

```try
type: choice
ask: Facing 100 into 300 you have 20% — the call is 20 chips short. What would make it right anyway?
options: Nothing; 20% is close enough to 25% | Expecting to win about 100 more chips on later streets | Your opponent being a frequent bluffer | Having position on them
answer: Expecting to win about 100 more chips on later streets
hint: Being 20 chips short at 20% equity — how much extra winnings would cover that?
why: A shortfall of 20 chips at 20% equity needs about 100 more chips won on the times you hit: 20 ÷ 0.20 = 100. That is what implied odds actually are — a number you can name, not a feeling. If you cannot say where those 100 chips come from, you do not have implied odds, you have hope. Being bluffed at changes your equity, not your price, and that is a different calculation.
```

```try
type: action
seats: 6
stacks: 12000
blinds: 400/800/100
ante: each
button: 5
hero: 0
hand: 9h 9d
actions: fold, fold, fold, fold
ask: Fifteen big blinds, folded to you in the small blind with pocket nines. There is 1,800 in the middle already.
options: Fold | Call 400 | Raise all in
answer: Raise all in
why: Two ways to win against one. The big blind folds often enough on its own to make this profitable, and when they do call, nines are rarely in terrible shape against a calling range. Calling 400 gets you the worst of it: no chance of winning immediately, and a flop played first-to-act with fourteen big blinds behind. The dead money from the antes is what tips it: 1,800 sitting there, and 1,300 of it is not yours — over a big blind and a half, won without a showdown every time everyone passes.
success: Right. And notice the EV came from the folds, not from the nines.
```

+++ Read more: EV is not a promise

Two honest limits, because EV gets quoted with more confidence than it deserves.

**It is an average over a distribution you estimated.** Your "35% when called" is a guess about what they
call with. Change the range and the EV changes with it. The arithmetic is exact; the input is not, and a
number carried to one decimal place off an assumed range is precision that does not exist. This is the
same reason the push/fold chart is solved to 0.005bb and not to 1e-5.

**A tournament is not an infinite sequence.** EV counts chips, and once you have none there is no next
hand to average over. That is the whole content of the ICM section: a chip-EV-positive call can be
money-EV-negative, and at a final table it frequently is. EV in chips is the right tool for most of a
tournament and the wrong one for the end of it.

Neither of those makes EV less useful. They make it a tool with edges, which is what everything in this
app is.
+++

## Remember

- **EV = equity × (pot + cost) − cost.** The chips you call with are part of the pot you are contesting.
- At exactly the required equity the call is worth **zero**. The money is in the gap, not the threshold.
- A shove has **two ways to win**; a call has one. That second way needs no cards.
- Convert to **big blinds** to compare decisions across levels — and remember chip EV stops being the
  right measure once the payouts are close.
