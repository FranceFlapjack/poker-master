---
id: defending-the-blinds
track: Ranges
title: Defending the blinds
lede: You already have money in the pot, so you get a price nobody else gets — and you will play the rest of the hand first to act. Both are true and they pull opposite ways.
level: Tournament
sources:
  - "Blind (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Blind_(poker)"
  - "Position (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Position_(poker)"
  - Every price in this lesson is computed by this app's engine, js/engine/ev.js
---

Somebody raises and it folds to you in the big blind. Two facts about this spot matter more than your
cards, and they point in opposite directions.

**You are getting a price no one else gets.** Your blind is already in the pot. You are not paying the
full raise — only the difference.

**You will act first for the rest of the hand.** Every street after this one, you decide before they do.

Nearly everything about blind play comes out of holding those two together.

## The price

Blinds 100/200, the button makes it 500, the small blind folds. Your 200 is already in, so calling costs
**300** into a pot of **800**.

That is 300 to win 1,100, so you need to be good **27.3%** of the time to break even. Against the
button's opening range — which the previous lesson put at over 40% of hands — a great many holdings clear
27.3%. Far more than clear the bar for *opening* a hand yourself.

This is why the big blind defends much wider than any opening range. Folding a hand that only needs to be
right 27% of the time, when the raiser has a wide range, is giving the pot away.

Make them raise smaller and the price improves again: a min-raise to 400 costs you 200 into 700, needing
only **22.2%**.

```try
type: choice
ask: Blinds are 100/200. The button makes it 500 and the small blind folds. What does it cost you to call?
options: 500 | 300 | 200 | 700
answer: 300
hint: Your big blind is already in front of you. How much more do you need to add?
why: Your 200 is already in the pot, so you add the difference — 300. That discount is the whole reason the big blind continues with hands nobody would open.
```

```try
type: choice
ask: Calling 300 into a pot of 800, how often do you need to be good to break even?
options: 27.3% | 37.5% | 50% | 21.4%
answer: 27.3%
hint: You are putting in 300 to contest 1,100 in total.
why: 300 divided by 1,100 is 27.3%. Anything better than that and calling gains chips — which a lot of hands manage against a range that wide.
```

```tip
In the big blind you only pay the **difference**. Facing a raise to 500 at 100/200 you call 300 into 800 — you need just **27.3%**.
```

## The catch

If the price were the whole story the big blind would call with everything. It is not, because of the
second fact: from the flop onward you act first, every single street.

That costs real money, and it costs it unevenly. It hurts most with hands that flop marginal pairs and
have to guess whether they are good — the ace with a weak kicker, the offsuit face cards. It hurts least
with hands that flop obviously or not at all: suited connectors, suited aces, small pairs. Those either
make something worth continuing with or fold cheaply, and neither requires a difficult decision out of
position.

So the big blind's defending range is not a tighter version of an opening range. It is a **differently
shaped** one — heavier on suited and connected hands, lighter on the clunky offsuit hands that look
stronger on paper.

```try
type: legal
seats: 6
stacks: 20000
blinds: 100/200
button: 0
hero: 2
actions: fold, fold, fold, raise 500, fold
ask: It folds to the button, who makes it 500. The small blind folds. You are the big blind. Which one of these is NOT allowed?
options: Fold | Call 300 | Check
hint: Somebody has raised. What does that remove from your options?
why: Your blind no longer matches the bet, so checking is gone — there is 300 more to answer. This is the one thing the big blind loses when the pot is raised: the free look it gets when everybody just calls.
```

```try
type: action
seats: 6
stacks: 20000
blinds: 100/200
button: 0
hero: 2
hand: 7h 6h
actions: fold, fold, fold, raise 500, fold
ask: Same spot, and you hold seven-six of hearts. Call 300 or fold?
options: Call 300 | Fold | Raise to 1500
answer: Call 300
why: You need 27.3% and a suited connector clears that comfortably against a button's opening range. It is also exactly the shape that plays well out of position — it flops a draw or a pair or nothing at all, and none of those are hard decisions. Compare an offsuit ace, which flops a weak pair and then has to guess for three streets.
hint: You need 27.3%. Then ask the second question: how easy is this hand to play from the big blind, acting first on every street after this one?
```

+++ Read more: the small blind is a different problem

Everything above is about the big blind. The small blind gets a worse version of the same deal and it
deserves its own treatment.

You have half a big blind in rather than a full one, so the discount is smaller. And you have the big
blind still to act behind you, so calling does not even close the action — they can raise and you have
paid to find out.

Worse, if you do see a flop you are first to act for the whole hand against at least one player, and
possibly two.

Which is why the small blind's sensible strategy is mostly raise-or-fold rather than call. Raising can
win it immediately and at least takes the initiative; calling buys you the worst seat at the table in a
pot you have not even won yet.
+++

## Remember

- In the big blind you pay only the **difference**, so the price is better than anyone else's.
- Facing a 500 raise at 100/200 you call 300 into 800 and need **27.3%**.
- That means defending **much wider** than any opening range.
- But you act first on every later street, so favour hands that flop clearly — suited, connected, pairs —
  over clunky offsuit hands.
- The small blind is a worse version of the deal: raise or fold.
