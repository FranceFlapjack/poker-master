---
id: blinds-and-antes
track: First steps
title: Blinds and antes — why anyone bets at all
lede: Without forced bets there is no reason ever to play a hand. The blinds are what put something worth fighting over in the middle.
level: Beginner
sources:
  - "Blind (poker) — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Blind_(poker)"
  - "Betting in poker — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Betting_in_poker"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - Which actions are legal in the drills below is decided by this app's own engine, js/engine/rules.js
---

Imagine poker with no forced bets. You would fold everything except aces, so would everyone else, and
nothing would ever happen. The game needs money in the middle before the cards are dealt, or there is
nothing to win and no cost to waiting.

That is the blinds' entire job.

```table
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 3
hand: As Kh
names: Ana, Bo, Cy, You, Dee, Eli
caption: Bo posts 50, Cy posts 100. Nobody chose to — the seats did. You are first to act, and it already costs 100 to play.
```

## Small blind, big blind

The player left of the button posts the **small blind**. The next player posts the **big blind**, normally
twice the small. They are real bets, not a fee: if nobody raises, the big blind's money stays in front of
them as part of the pot they are contesting.

The big blind sets the price. Before the flop, the amount to call is one big blind, and every raise is
measured from it.

Two consequences:

**You cannot check before the flop, unless you are the big blind.** There is already a bet — the big
blind's. Checking means "I bet nothing", and you cannot bet nothing when someone has bet.

**The big blind gets an option.** If everyone only calls, the big blind has already matched the bet and
may simply check to see a flop for free. That's the one seat with that privilege, and it is compensation
for having to put money in blind.

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 3
hand: As Kh
ask: You are first to act. Which one of these is NOT allowed?
options: Fold | Call 100 | Check
hint: Has anybody bet yet? Look at what the big blind did.
why: The big blind is a live bet of 100, so there is already something to answer. You may fold or call, but you cannot check — checking means betting nothing, and that is only available when nobody has bet.
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
why: You may check, because your blind already matches. You may raise, because a bet exists to raise. What you cannot do is bet: betting is what you do when nobody has bet yet, and the big blind itself counts.
success: Right — and this is the big blind's option, the one seat that gets to see a flop for free when nobody raises.
```

## Antes

In tournaments, blinds alone stop being enough. As stacks shorten relative to the blinds, folding every
hand becomes too cheap. So tournaments add an **ante**: a small extra forced bet that inflates the pot
before anyone acts.

Two ways it is collected, and you will meet both in a live event:

- **Everybody antes.** Each player puts in a small amount every hand.
- **Big blind ante.** One player — whoever is in the big blind — posts the whole table's ante at once.
  Same money in the pot, far less time spent collecting it, which is why most modern tournaments use it.

An ante changes the arithmetic straight away. With blinds at 100/200 the pot is 300 before cards. Add a
25 ante from nine players and it is 525. Attacking that pot is now worth much more, and folding every
hand costs much more. This is the seed of everything in the tournament track.

```try
type: choice
ask: Blinds are 100/200 and every one of the nine players antes 25. What is in the pot before anybody acts?
options: 300 | 525 | 725 | 225
answer: 525
hint: The two blinds, plus an ante from each of the nine seats.
why: 100 + 200 from the blinds is 300, and nine antes of 25 is another 225 — 525 in total. Nearly half the pot is now ante money, which is exactly why antes make people play more hands.
```

```try
type: choice
ask: Why do tournaments add an ante at all?
options: To pay the dealer | To make folding every hand more expensive | To replace the blinds | To speed up the deal
answer: To make folding every hand more expensive
hint: Think about what a bigger starting pot does to the value of sitting and waiting.
why: An ante puts more in the middle every single hand, so waiting for a premium hand costs more and winning an uncontested pot is worth more. It pushes the whole table towards playing, which is the point — a tournament has to end.
```

+++ Read more: the blinds are a tax you pay in turn

Over a full orbit — one trip round the table — every player posts both blinds exactly once. Nobody is
singled out.

But that means you are paying one and a half big blinds per orbit just to sit there, before you play a
single hand. At a nine-handed table with 100/200 blinds and a 25 ante, an orbit costs you 300 in blinds
plus 225 if you are the one posting the big blind ante.

That number is the clock this whole game runs on, and in a tournament the clock speeds up: the blinds go
up at fixed intervals whether or not you have had a hand worth playing. Track 3 is about what to do as
that number gets large relative to your stack.
+++

## Remember

- Blinds are forced bets that give everyone something to play for.
- Small blind left of the button, big blind next, usually double.
- **You cannot check preflop** — the big blind is a live bet. Unless you *are* the big blind, in which
  case you have the option.
- Antes are extra forced money in tournaments, making the pot worth attacking and folding expensive.
