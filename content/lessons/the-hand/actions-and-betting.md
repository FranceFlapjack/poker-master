---
id: actions-and-betting
track: How a hand is played
title: Check, bet, call, raise, fold
lede: Five things you can ever do, and a rule about the smallest raise that catches everybody once.
level: Beginner
sources:
  - "Betting in poker — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Betting_in_poker"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - Which actions are legal in the drills below is decided by this app's own engine, js/engine/rules.js
---

When it is your turn, there are only ever five things you can do — and which of them are available
depends entirely on one question: **has anyone bet yet this round?**

## If nobody has bet

- **Check** — stay in, put nothing in, pass the turn along.
- **Bet** — put chips in and make everyone else answer.

## If somebody has bet

- **Fold** — give up the hand. You lose whatever you already put in and owe nothing more.
- **Call** — match the bet and stay in.
- **Raise** — match it and add more, which makes everyone answer again.

That is the whole list. Checking is not available when there is a bet to answer — "check" means betting
nothing, and you cannot bet nothing when someone has bet something. And calling is not available when
nobody has bet, because there is nothing to match.

```try
type: legal
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
street: flop
board: 7c 2d 9h Ts 4c
ask: The flop is out and nobody has bet yet. Which one of these is NOT allowed?
options: Check | Bet 200 | Call 100
hint: Calling means matching somebody's bet. Has anyone made one?
why: With no bet in front of you, you may check or bet — but there is nothing to call. Calling only exists as an answer to a bet.
```

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 4
actions: raise 300
ask: The player before you made it 300. Which one of these is NOT allowed?
options: Fold | Call 300 | Check
hint: There is a bet in front of you now. What does that remove from the list?
why: Facing a bet you may fold, call or raise. Check disappears the moment somebody bets — you have to answer it or give up the pot.
```

## The minimum raise

This is the rule that catches everyone once, so it is worth getting right now.

**A raise must be at least as large as the previous raise.**

Blinds are 50/100 and somebody makes it 300. They raised by 200 — from the big blind's 100 up to 300. So
the next raise must add at least another 200, which means making it **500 or more**. You cannot make it
400, even though 400 is clearly more than 300.

The number the rule cares about is the size of the *increase*, not the total.

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 4
actions: raise 300
ask: Blinds are 50/100 and the player before you made it 300. Which one of these is NOT allowed?
options: Raise to 400 | Raise to 500 | Fold
hint: The last raise went from 100 up to 300. How much was the increase, and what does that make the smallest legal re-raise?
why: The raise from 100 to 300 was an increase of 200, so the next raise must add at least 200 more — 500 at the minimum. Making it 400 adds only 100 and is not a legal raise. Either put in 500 or more, or just call.
success: Right. Remember it as "match the size of the last raise", not "beat the last number".
```

## One more word: all in

If a bet is larger than the chips you have, you can still play — you put in everything you have left and
you are **all in**. You stay in the hand and can win as much as you matched, but no more. That case has
enough detail to deserve its own lesson, which is the next one.

+++ Read more: bet sizing, in one paragraph

Nothing above says *how much* to bet, because the rules barely constrain it: in no-limit hold'em you may
bet anything from one big blind up to your whole stack.

The useful starting frame is that a bet's size should be measured against the pot, not against your
stack or your mood. Betting half the pot asks your opponent to put in a third of the new pot to continue.
Betting the whole pot asks for half. Bigger bets win more when they work and lose more when they do not,
and the right size depends on how often you expect to be called — which is a question about the other
player, not about your cards.

That is as far as this track goes. Sizing properly is Track 4, once pot odds are in place.
+++

## Remember

- No bet in front of you: **check** or **bet**.
- A bet in front of you: **fold**, **call** or **raise**.
- You cannot check facing a bet, and you cannot call when nobody has bet.
- A raise must increase by at least as much as the last raise did.
