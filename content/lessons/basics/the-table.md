---
id: the-table
track: Basics
title: The table
lede: Where you sit decides how much you know when it is your turn — and the blinds are what make the hand worth playing at all.
level: Beginner
sources:
  - "Position (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Position_(poker)"
  - "Blind (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Blind_(poker)"
  - Which actions are legal in the drills below is decided by this app's own engine, js/engine/rules.js
---

One small disc sits in front of one player: the **button**. It marks who would be dealing, and it moves
one seat left after every hand. Everything about the order of play is measured from it.

```table
seats: 9
stacks: 25000
blinds: 100/200
button: 6
hero: 0
hand: As Kh
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
caption: Fay has the button. Gus posts the small blind and Hal the big blind — the two seats to its left. You are first to act.
```

## The blinds

The two players left of the button post forced bets before anyone sees a card: **small blind**, then
**big blind**, normally double. Without them nobody would ever need to play a hand, and nothing would
happen.

The big blind sets the price. Before the flop, calling costs one big blind, and every raise is measured
from it. Two consequences:

**You cannot check before the flop** — there is already a bet. Checking means betting nothing, which is
not an answer to a bet.

**Unless you are the big blind.** If everyone only calls, the big blind has already matched and may check
to see a flop for free. That is the one seat with that option.

In tournaments an **ante** is added too — a small extra forced bet from everyone, or posted in one lump by
the big blind. It inflates the pot before anyone acts, which makes folding every hand expensive and
attacking the pot worthwhile. That is the seed of the whole tournament part of this course.

## Who acts when

Before the flop, action starts to the big blind's **left** and runs clockwise. The blinds act last.

After the flop — and every round after — it starts left of the **button**, and the button acts last. The
same seat is last to act for the rest of the hand.

**That is why position is worth money.** When it is your turn, everyone before you has already told you
something: they bet, or they didn't, and how much. You act knowing that. They acted knowing nothing. The
same two cards are worth raising on the button and folding from the first seat, purely because of what
you will know later.

```try
type: choice
ask: Nine-handed. Before the flop, who acts first?
options: The button | The small blind | The player to the big blind's left | The big blind
answer: The player to the big blind's left
hint: The blinds already have money in. Do they act early or late before the flop?
why: Preflop action starts to the big blind's left and runs clockwise, so the blinds act last. That is the one round where they have position on everybody.
```

```try
type: choice
ask: The flop comes down. Who acts first now?
options: The button | The first player left of the button who is still in | Whoever bet last | The big blind
answer: The first player left of the button who is still in
hint: From the flop onward the button always acts last. So who goes first?
why: Action starts left of the button and the button acts last. If the small blind is still in, that is them — which is why the blinds are awkward seats: last to act once, first to act three times.
```

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 3
hand: As Kh
ask: You are first to act before the flop. Which one of these is NOT allowed?
options: Fold | Call 100 | Check
hint: Has anybody bet yet? Look at what the big blind did.
why: The big blind is a live bet of 100, so there is something to answer. You may fold or call, but you cannot check — checking means betting nothing, and that is only available when nobody has bet.
```

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 2
actions: call, fold, fold, fold, call
ask: Everyone has just called. You are the big blind. Which one of these is NOT allowed?
options: Check | Bet 200 | Raise to 300
hint: You have already matched the bet. But there IS a bet — so what is the word for putting in more?
why: You may check, because your blind already matches, and you may raise, because a bet exists to raise. What you cannot do is bet: betting is for when nobody has bet yet, and the big blind itself counts.
success: Right — this is the big blind's option, the one seat that sees a flop free when nobody raises.
```

+++ Read more: the blinds are a tax you pay in turn

Over one orbit of the table every player posts both blinds exactly once, so nobody is singled out. But it
means you pay one and a half big blinds per orbit just to sit there, before playing a single hand.

At nine-handed with 100/200 blinds and a 25 ante, an orbit costs you 300 in blinds plus your share of the
antes. That number is the clock the game runs on — and in a tournament the clock speeds up, because the
blinds rise at fixed intervals whether or not you have had a hand worth playing.
+++

## Remember

- The button moves one seat left each hand; the blinds are the two seats to its left.
- **Preflop:** action starts left of the big blind, blinds act last.
- **After the flop:** action starts left of the button, button acts last.
- You cannot check preflop unless you are the big blind.
- Acting last means acting with more information. It is worth more than most starting hands.
