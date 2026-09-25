---
id: the-bubble
track: Stack depth and ICM
title: The bubble
lede: One place from the money, the same call costs different players completely different amounts. That asymmetry is the whole game.
level: Tournament
sources:
  - "Independent Chip Model — Wikipedia, CC BY-SA 4.0: https://en.wikipedia.org/wiki/Independent_Chip_Model — \"Every player's chance of finishing 1st is proportional to the player's chip count\""
  - Every factor and percentage below is computed by this app with js/engine/icm.js for a four-handed table of 40,000 / 25,000 / 15,000 / 10,000 paying 5,000 / 3,000 / 2,000 — all of it reproducible in the ICM lab
---

Four players left. Three get paid. Fourth gets a handshake.

| Seat | Stack | Share of chips | Share of the money |
|---|---|---|---|
| Chip leader | 40,000 | 44.4% | **35.3%** |
| Second | 25,000 | 27.8% | 28.6% |
| Third | 15,000 | 16.7% | **21.1%** |
| Short | 10,000 | 11.1% | **15.1%** |

Look at the two right-hand columns. The leader's chips are worth *less* than their count says; everyone
else's are worth *more*. That is not a quirk of these numbers — it happens at every final table, always
in that direction, and it is what the rest of this lesson is about.

## The bubble factor

The pot is offering you a price. ICM is charging you a different one. The ratio between them is what
people call the **bubble factor**.

The short stack moves all in for 10,000. There is 1,500 in blinds already. Anyone calling puts in 10,000
to win 11,500, so the **pot odds say 46.5%**. What the three possible callers actually need:

| Caller | Needs | Factor |
|---|---|---|
| Chip leader, 40,000 | 52.4% | 1.13 |
| Second, 25,000 | 55.4% | 1.19 |
| Third, 15,000 | **58.8%** | **1.26** |

Same pot. Same price. Three different answers, and the smallest bill goes to the biggest stack.

**That is the mechanism behind bubble bullying**, and it is worth being precise about it. The chip leader
is not pressuring anyone because they are brave or because it feels strong. They are doing it because the
identical call is genuinely cheaper for them than for the player they are pressuring — a hand the 15,000
stack has to fold is a hand the leader can profitably take on.

## The other way to read the same number

Hold the *amount at risk* constant, as above, and the big stack pays least.

Hold *"all my chips"* constant and it reverses:

| Player calling off everything | Needs | Factor |
|---|---|---|
| Second, 25,000 | 71.6% | 1.48 |
| Third, 15,000 | 66.4% | 1.39 |
| Short, 10,000 | 59.6% | 1.28 |

Now the short stack pays the least, because they have the least left to lose — their equity is already
near the bottom of the ladder, so busting takes less from them.

Both tables are correct and they are the same fact stated twice: **what you pay is set by how much of
your own tournament you are putting at risk**, not by your seat and not by the word "bubble". The leader
risking a quarter of their stack risks little. The leader risking all of it would pay plenty.

## Distance from the money

The premium is not switched on at the bubble. It grows as the money approaches. The chip leader making
exactly that 10,000 call:

| | Factor |
|---|---|
| Nine left, three paid | 1.06 |
| Six left | 1.10 |
| Four left — the bubble | 1.13 |
| Four left, **winner takes all** | **1.00** |

That last row is the control. Take away the ladder and the premium vanishes entirely: with one prize
there is nothing to finish *into*, so chips and money are the same thing again and a flip is a flip. The
premium was never about the bubble. It was always about the payout structure.

It is also worth looking at that structure directly. Paying 5,000 / 3,000 / 2,000, the step from fourth to
third is worth 2,000 — exactly as much as the step from second to first. On the bubble you are playing for
the largest single jump on the ladder, and it is the one you get for doing nothing at all.

```table
seats: 4
stacks: 40000, 25000, 15000, 10000
blinds: 500/1000
button: 0
hero: 0
hand: Ah Jd
names: You, Ana, Bo, Short
caption: The bubble as the chip leader sees it. Three of these four get paid, and the 10,000 stack is first to act.
```

```try
type: choice
ask: The short stack shoves 10,000 and there is 1,500 dead in the middle. Three players can call. Which of them needs the MOST equity to make that call?
options: The chip leader with 40,000 | The 25,000 stack | The 15,000 stack | They all need the same — it is the same price
answer: The 15,000 stack
hint: The pot offers everyone the same odds. What differs is what losing would cost each of them.
why: The 15,000 stack needs 58.8% against the leader's 52.4% — they have the most to lose relative to what they are risking, because a loss drops them to the bottom of the ladder with the bubble still live. The pot odds are 46.5% for all three; the pot is the only thing that treats them equally.
```

```try
type: choice
ask: Same four players, same stacks — but the tournament pays the winner only and nobody else. What happens to the premium on that call?
options: It gets larger, because there is more to play for | It stays about the same | It disappears — the factor is 1.00 | It only matters for the short stack now
answer: It disappears — the factor is 1.00
hint: The premium comes from finishing positions being worth different amounts. How many are worth anything here?
why: With one prize there is nothing to ladder into, so chips and money move together and pot odds are the whole answer. The premium was never created by the bubble; it is created by the payout ladder, and a flat prize pool is the sharpest way to see that.
```

```try
type: action
seats: 4
stacks: 15000, 25000, 40000, 10000
blinds: 500/1000
button: 0
hero: 0
hand: Ah Jd
actions: raise 10000
ask: You have 15,000 on the button. The short stack has opened all in for 10,000 and it is on you, with ace-jack offsuit and a clean 10,000 to call.
options: Fold | Call all in | Raise
answer: Fold
why: Ace-jack is comfortably ahead of a short stack's shoving range in chips — this is a call you would snap in a cash game. It is still a fold, because you need 58.8% and ace-jack offsuit is not that against any range wide enough to be shoving here. Note the seat: risking a clean 10,000 is what the 58.8% was computed for. Facing the same shove from the big blind, where 1,000 of your 10,000 is already posted, the threshold is a different number — 60.6% — which is the kind of detail worth recomputing rather than carrying over. Call and lose and you are the short stack on a live bubble; fold and you are still third with the two stacks below you doing the sweating.
hint: Work out what you need before you work out what you have.
```

```try
type: action
seats: 4
stacks: 40000, 25000, 15000, 10000
blinds: 500/1000
button: 0
hero: 0
hand: Ah Jd
actions: raise 10000
ask: The same cards and the same clean 10,000 to call, but now you are the chip leader with 40,000.
options: Fold | Call all in | Raise
answer: Call all in
why: Identical hand, identical pot, opposite answer. You need 52.4% rather than 58.8%, and losing leaves you with 30,000 and the chip lead intact rather than on the rail. This is the asymmetry from the top of the lesson doing its work: the call that is too expensive for the 15,000 stack is a routine one for you.
success: Right — and note that nothing about the cards, the pot or the odds changed between these two spots. Only the stack behind them did.
```

+++ Read more: what ICM does not know

Every number in this lesson comes from the Malmuth–Harville model, and that model makes exactly one
assumption: your chance of finishing first is your share of the chips. Everything else follows from it.

Which means it does not know:

- **That you are better than the other three.** A strong player's equity is higher than their chip share
  suggests, and busting costs them more, because they had more to come.
- **Where anyone is sitting.** Having the short stack directly to your left is a different tournament from
  having them on your right.
- **That the blinds are about to double.** The model treats the hand as if the tournament stopped there.
  A 15,000 stack about to pay 4,500 an orbit is worth less than the same 15,000 at the start of a level.
- **What you would do with the chips.** It assumes everyone plays identically after the pot.

So read the factor as a floor on how tight to be, not as the answer. It tells you the direction and the
rough size of an effect that is genuinely there and genuinely large. It does not tell you that 58.8% is
precise to a tenth of a percent, and nobody should act as if it does.
+++

## Remember

- On the bubble your chips are worth **less** than your chip count if you are big, **more** if you are
  short. Always in that direction.
- The **bubble factor** is the ratio between what the pot offers and what ICM charges. 1.00 means they
  agree.
- Hold the risk constant and the **big stack pays least** — that is bubble pressure, and it is real
  arithmetic rather than table image.
- Hold "all my chips" constant and the **short stack pays least** — they have the least left to lose.
- Remove the ladder and the premium goes to 1.00. It was always the payout structure, never the bubble.
