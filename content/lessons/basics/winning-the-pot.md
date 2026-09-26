---
id: winning-the-pot
track: Basics
title: Winning the pot
lede: Read the board before you read your hand, and know exactly how much you can win when you are all in.
level: Beginner
sources:
  - "All-in — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/All-in"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - The pots in this lesson are built and paid by this app's own engine, js/engine/rules.js
---

## Read the board first

The habit that fixes most showdown mistakes: **read the board on its own before you look at your hand.**

Ask what five-card hand is already sitting in the middle. If the board is K-K-9-9-4, two pair is out
there and it belongs to everyone equally. Only then look at your two cards, and ask the narrower
question: do these actually improve on it? Often they do not.

```try
type: showdown
board: Kh Kd 9c 9s 4h
hands: As 2c | Ad 3h
ask: Read the board first. Who wins?
hint: The board is already two pair. What does each ace add — and what does the deuce or the three add?
why: The board plays kings and nines, and each player's ace is the fifth card. The deuce and the three never come into it, because a hand is five cards and both players' best five are identical. Split pot.
success: Right — and a player holding the three here might think they have something. They do not.
```

```try
type: showdown
board: Ah 9d 4c 2s 7h
hands: As Kd | Ac Qh
ask: Both players paired the ace. Who wins?
hint: Both play A-A and then the three best cards left. Compare those from the top, one at a time.
why: Same pair, so compare kickers: king beats queen at the fourth card and it is over there. This is why ace-king is far better than ace-queen — not because it pairs more often, but because when it does, it makes the better one.
```

Holding an ace with a weak second card, you win small pots when ahead and lose large ones when behind.
The pots are not the same size, which is why "any ace" is an expensive habit.

```try
type: showdown
board: 8h 8d 8s 2c 2d
hands: Ah Kd | 3c 3h
ask: The board is already a full house. Who wins?
hint: Eights full of deuces is out there. A full house is three of one rank and two of another — can either player make a better one?
why: Ace-king cannot improve on the board and just plays it. The pair of threes makes eights full of THREES, replacing the deuces with a bigger pair. A hand that looked like nothing wins it.
success: Well read. This is exactly where a beginner announces a split pot and is wrong.
```

At a live table you never have to show a losing hand — you can muck quietly. But to **win** the pot your
cards must be face up. Dealers award pots to visible cards, not announcements.

```tip
Read the **board on its own** before anyone's cards. If it is already the best five for everybody, the pot is split, whatever anyone holds.
```

## All in, and side pots

Sooner or later somebody bets more than you have. You are not forced out: you put in everything left and
you are **all in**, playing to the river. But there is a limit, and it is the only rule you need:

**You can only win from each player as much as you put in yourself.**

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
caption: Short is all in for 300 with aces, Mid for 1,000 with queens, Deep called with sevens. Two pots, not one.
```

The chips split into two piles:

- **Main pot — 900.** Three hundred from each of the three. Everyone eligible.
- **Side pot — 1,400.** The extra 700 each from Mid and Deep. Short cannot win a chip of it.

Short has the best hand and wins the main pot: 900. Short does *not* win the side pot, despite having the
best hand at the table, because that money was never within reach. It goes to the better of the two hands
that paid into it — Mid's queens beat Deep's sevens — so Mid takes 1,400.

```try
type: choice
ask: Short is all in for 300 and has the best hand at the table. How much does Short win?
options: 900 | 1400 | 2300 | 3300
answer: 900
hint: Three hundred from each of how many players?
why: Short put in 300 and collects 300 from each opponent — 900 including their own. The other 1,400 was bet beyond what Short could match, so it was never available to win.
```

```try
type: choice
ask: Who wins the 1,400 side pot?
options: Short, who has the best hand | Mid, whose queens beat the sevens | Deep, who called last | It is split between Mid and Deep
answer: Mid, whose queens beat the sevens
hint: Only players who paid into a pot can win it. Which two were those?
why: Short is not eligible for the side pot at all, so the best hand in it is the better of Mid and Deep. Queens beat sevens, so Mid takes 1,400 — even though Short beat them both.
success: Correct. A short stack can win the pot they are in and still watch a bigger one go to a worse hand.
```

The first time this happens it feels like a swindle. It is the opposite: the rule means nobody can push
you off a hand just by having more money, and you can never lose more than you brought. In a tournament,
where stacks are never equal, going all in short is completely normal — and knowing exactly what you can
win is part of deciding whether to do it.

+++ Read more: the three phrases that cause misreads

**"I have a flush"** — with four hearts on the board and one in your hand. So does everyone else with a
heart, and the biggest one wins. If yours is the deuce, you have the worst possible version.

**"We both have a straight"** — board 5-6-7-8, one player holds a nine. A straight to the nine beats a
straight to the eight. Same category, different size, not a split.

**"My kicker plays"** — when it does not. If the board is A-A-A-K-K, everyone already has a full house
using all five cards. There is no sixth slot for a kicker.

All three come from reading your two cards first and adding the board. Read the board first and they
disappear.
+++

## Remember

- Read the **board on its own first**, then ask what your two cards add.
- If the board is the best five, the pot is split.
- Kickers decide most pots — compare from the top down.
- All in: you can win from each opponent **only as much as you put in**. The rest is a side pot you are
  not in.
