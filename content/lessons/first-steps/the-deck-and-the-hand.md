---
id: the-deck-and-the-hand
track: First steps
title: The deck and the five-card hand
lede: Fifty-two cards, and one rule underneath everything else — a poker hand is always exactly five cards.
level: Beginner
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "List of poker hands — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/List_of_poker_hands"
  - Every hand comparison in the drills below is decided by this app's own engine, js/engine/evaluator.js
---

One deck, fifty-two cards. Four suits — clubs, diamonds, hearts, spades — and thirteen ranks in each,
from the deuce up to the ace. No jokers. Suits have no ranking of their own: the ace of spades and the
ace of hearts are worth exactly the same.

Here is the rule everything else in this course sits on top of:

**A poker hand is five cards. Always exactly five.**

Not two, not seven. Five. Hold on to that, because the game is about to deal you a number that isn't five
and you will have to do the arithmetic yourself.

## Two in your hand, five in the middle

In Texas hold'em you get **two cards face down** — your hole cards, yours alone. Then **five cards are
dealt face up in the middle** for everybody to share. That's the board.

```table
seats: 2
names: You, Opponent
stacks: 10000
blinds: 50/100
button: 0
hero: 0
hand: As Kd
board: 2c 7d 9h Ts 3h
street: river
caption: Two cards that belong to you, five in the middle that belong to everyone.
```

Two plus five is seven. But a hand is five. So your hand is **the best five cards you can make out of
those seven** — and the same five cards in the middle are available to your opponent too.

You are not obliged to use both of your cards. You are not obliged to use either of them. If the best
five cards you can assemble happen to be the five on the board, then that is your hand — and it is also
everybody else's, which is how a pot gets split.

## What that means in practice

Above, you hold the ace and the king. The board is a two, a seven, a nine, a ten and a three. Nothing
pairs up with anything. So your best five cards are: your ace, your king, and the ten, nine and seven
from the board. Ace-high. It is a perfectly real hand — it just isn't much of one.

Now try reading a few yourself.

```try
type: rank
hands: Ac Ad Kh Qs Jc | 9h 8h 7h 6h 5h
ask: Which is the stronger hand?
hint: One of these is five cards of the same suit in a row. That beats a lot of things.
why: A pair of aces looks strong until you meet a straight flush. Big cards are not the same as a big hand.
```

```try
type: showdown
board: 2c 7d 9h Ts 3h
hands: As Kd | 7s 4c
ask: The board is the one from above. Who wins this pot?
hint: A pair beats a hand with no pair, however big its cards are.
why: Ace-king never paired up, so it is only ace high. Seven-four paired the seven on the board, and the smallest pair beats the biggest no-pair hand.
success: Correct — and this is the single most common surprise for a new player.
```

```try
type: showdown
board: Ah Kh Qh Jh Th
hands: 2c 2d | 3s 4s
ask: Every card of the hand is already on the board. Who wins?
hint: Read the board itself. What five-card hand is sitting there?
why: The board is a royal flush, and it belongs to both players equally. Neither pair of hole cards improves on it, so the pot is split.
success: Right — the board played, and the pot is chopped.
```

+++ Read more: why "exactly five" causes so much trouble

New players lose pots they think they have won, and almost always for the same reason: they count six
cards, or they count their two hole cards as a bonus on top of the board rather than as candidates for a
place in the five.

A useful habit is to say your hand out loud as five specific cards. Not "I've got an ace and there's an
ace out there" but "ace, ace, king, ten, nine." If you cannot name five cards, you have not finished
reading your hand.

The same habit stops the other classic error, which is not noticing that the board has handed everyone
the same hand as you.
+++

## Remember

- Fifty-two cards, four suits, thirteen ranks. Suits do not outrank each other.
- A hand is **five cards**, always.
- You get two of your own and share five in the middle, and you pick the best five out of the seven.
- You may use both of your cards, one of them, or neither.
