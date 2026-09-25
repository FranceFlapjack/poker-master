---
id: bluffing-and-mdf
track: The maths
title: Bluffing, and how often to fold
lede: A bluff is a bet that needs your opponent's folds to pay for it. Both sides of that have a number.
level: Tournament
sources:
  - Every figure here is computed by this app from js/engine/ev.js — alpha, minimum defence frequency and break-even fold equity are arithmetic, and the pot odds & equity sandbox recomputes them live
---

A value bet wants a call. A bluff wants a fold. That is the whole difference, and it means the two are
judged by completely different numbers: a value bet asks *how often am I best*, a bluff asks *how often
do they pass*.

The good news is that the second question has an exact answer.

## How often a bluff has to work

Bet 100 into a pot of 100. If they fold you win 100; if they call — and you have nothing — you lose 100.
So it has to work half the time. That number is called **alpha**, and it is fixed entirely by your bet
size:

> **alpha = bet ÷ (pot + bet)**

| You bet, into 100 | It must work |
|---|---|
| 33 | **24.8%** |
| 50 | 33.3% |
| 75 | 42.9% |
| 100 | **50.0%** |
| 150 | 60.0% |

Bigger bluffs need to work more often. That is obvious once it is written down and routinely forgotten at
the table, where "I'll make it big so they definitely fold" is a sentence people say while raising their
own bar.

## The other side: minimum defence frequency

Now sit in the other chair. If you fold too often, your opponent can bet with any two cards and profit
without ever needing a hand. How often must you continue to stop that?

> **MDF = pot ÷ (pot + bet)** — exactly what is left when alpha is taken out

| They bet, into 100 | You must continue with |
|---|---|
| 25 | **80.0%** of your range |
| 50 | 66.7% |
| 100 | **50.0%** |
| 200 | 33.3% |

Small bets are cheap for them, so you have to defend nearly everything. Huge bets buy them fewer folds,
so you are allowed to let most of your hands go.

**And here is the part that gets misused.** MDF is a property of the **bet size**, not of your hand. It
answers "am I folding too much overall" and it *never* answers "should I call with this one". Those are
different questions, and calling with a hand you know is beaten because "MDF says 66%" is not defending —
it is donating with a footnote.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
hand: Ac 4d
board: Kh 9s 2c 7d Js
actions: call, check, check, check, check, check, check, bet 200
names: Ana, You
caption: Checked down to the river, and now a pot-sized bet of 200 into 200. You have ace-high. The bluff needs to work 50% of the time; you need 33.3% to call.
```

## "They might fold" is not a reason

Here is the number that kills more stacks than any other missing one.

You shove 1,000 into a pot of 500 and you have 35% when called. How often do they have to fold?

**20%.** Comfortably achievable, so the shove is good.

Now try 20% equity when called. The answer becomes **50%** — a completely different proposition against
the same opponent.

And the one to sit with: shoving **10,000 into a pot of 100 with no equity whatsoever** breaks even if
they fold **99.0%** of the time. Such a number always exists whenever there is anything at all in the
middle to win. So "they might fold" is never an argument. Only **"they fold this often"** is, and that is
a number you have to be willing to say out loud.

The reverse case is the cleanest proof of it. With **no dead money at all** the break-even fold frequency
is **100%** — there is nothing to win by making them fold, so the bluff has to work every single time,
which means it never works. Bluffs are paid for by what is already in the pot, always.

```try
type: choice
ask: You bet the size of the pot as a pure bluff. How often does it need to work to break even?
options: 33.3% | 50.0% | 66.7% | It depends what you are holding
answer: 50.0%
hint: You are risking the pot to win the pot.
why: 100 ÷ (100 + 100) = 50%. What you hold does not enter into it — a pure bluff wins only when they fold, so the cards are irrelevant and the bet size is everything. Note that betting bigger raises this bar rather than lowering it.
```

```try
type: choice
ask: Your opponent bets half the pot. Minimum defence frequency says you continue with 66.7% of your range. You look down at a hand you are certain is beaten. What does MDF tell you to do?
options: Call — 66.7% means you must defend | Nothing at all; it is about your range, not this hand | Fold, because MDF only applies to strong hands | Raise, since calling is the worst option
answer: Nothing at all; it is about your range, not this hand
hint: Read the question MDF was built to answer.
why: MDF is a property of the bet size and it answers "am I folding too much overall". Your worst hands are exactly the ones that should make up the folding portion. Calling a bet with a hand you know is beaten because a range-level frequency told you to is the most common way this idea gets people into trouble.
```

```try
type: choice
ask: Shoving 10,000 into a pot of 100 with no equity at all breaks even if your opponent folds 99% of the time. What should you take from that?
options: Big shoves are profitable because people fold | "They might fold" is never a reason — only "they fold this often" is | You should never shove without equity | The maths is broken at extremes
answer: "They might fold" is never a reason — only "they fold this often" is
hint: The number exists. The question is whether it is a number anyone could actually hit.
why: A break-even fold frequency always exists whenever there is dead money to win, however terrible your hand — so the existence of one proves nothing. The decision is whether your opponent really folds that often, which is a claim about them you have to be prepared to state. 99% is not a claim anyone can honestly make.
```

```try
type: action
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
hand: Ac 4d
board: Kh 9s 2c 7d Js
actions: call, check, check, check, check, check, check, bet 200
ask: Checked to the river, and now they bet the pot — 200 into 200. You have ace-high, which beats nothing they would bet for value.
options: Fold | Call 200 | Raise to 600
answer: Fold
why: You need 33.3% and ace-high beats only a bluff. A hand that checked three streets and then bet the pot is weighted heavily towards value — and crucially, ace-high is the bottom of your own range, which is exactly the part that is supposed to fold. MDF says continue with half your range against this size; it does not say continue with this hand. Defend with the pairs, fold this.
hint: MDF tells you how much of your range defends. Which part of your range is this hand in?
```

+++ Read more: what MDF assumes, and when to ignore it

Minimum defence frequency comes out of one assumption: that your opponent could be betting **any two
cards**. It is the frequency that makes a pure bluff exactly break even, so that bluffing indiscriminately
stops being free money.

Most opponents are not doing that, which gives you a licence the formula does not.

- **Against someone who never bluffs**, MDF is irrelevant. Fold everything that cannot beat a value bet,
  and keep folding until they show you otherwise. You are not being exploited; there is nothing to exploit.
- **Against someone who bluffs constantly**, MDF is a floor rather than a target. Continue *more* than it
  says, because your calls are now profitable on their own merits and not merely as a deterrent.
- **The bet sizes people actually use matter more than the theory.** A player who bets 200% pot on the
  river is telling you something, and folding 67% of your range to it is correct rather than exploitable.

MDF is a defence against being run over by a theoretical opponent. Read the actual one first.

Worth naming one more limit, because this app is careful about it elsewhere: MDF says nothing about
*which* hands to defend with, and that part is genuinely a solver's job. This app has no postflop solver
and will not pretend — what it gives you is the frequency, the price, your equity against an assumed
range, and the honest note that choosing the hands is judgement.
+++

## Remember

- **alpha = bet ÷ (pot + bet)** — how often a bluff must work. Pot-sized is 50%, and bigger is harder.
- **MDF = pot ÷ (pot + bet)** — how much of your range must continue. It is about the **bet size**, never
  about the hand you are holding.
- A break-even fold frequency **always exists** when there is dead money. Its existence justifies nothing;
  only whether they actually fold that often does.
- With **no dead money**, a bluff needs 100% — which is why bluffs are paid for by the pot, not by courage.
