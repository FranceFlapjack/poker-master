---
id: showdown
track: How a hand is played
title: Showdown — reading the winner
lede: The cards do not care what you meant. Read the five that actually play, and read them the same way for everyone at the table.
level: Beginner
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "List of poker hands — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/List_of_poker_hands"
  - Every showdown in this lesson is decided by this app's own engine, js/engine/evaluator.js
---

If two or more players are still in after the last round of betting, the hands are turned face up and the
best five cards win. That is the **showdown**.

By now you know the two facts it rests on: a hand is exactly five cards, and the category comes before
the size of the cards. What is left is the reading — doing it accurately, under a little pressure, for
every player at once.

## Read the board first

The habit that fixes most showdown mistakes: **read the board on its own, before you look at anybody's
hand.**

Ask what five-card hand is sitting in the middle. If the board is K-K-9-9-4, there is already two pair
out there and it belongs to everyone equally. Now the only question is whether anyone can beat it — and
often nobody can, in which case the pot is split.

Look at your two cards *after* that, and ask a narrower question: do these actually improve on what is
already there? Quite often they do not.

```try
type: showdown
board: Kh Kd 9c 9s 4h
hands: As 2c | Ad 3h
ask: Read the board first. Who wins?
hint: The board is already two pair. What does each player's ace add to it — and what does the deuce or the three add?
why: The board plays kings and nines, and each player's ace is the fifth card. The deuce and the three never come into it, because a hand is five cards and both players' best five are identical. The pot is split.
success: Right — and notice that a player holding a three here might think they "have" something. They do not.
```

## Kickers decide more pots than flushes do

Most showdowns are two people with the same pair, and the hand turns on the unused cards. The fourth and
fifth card are called **kickers**, and they are doing real work.

```try
type: showdown
board: Ah 9d 4c 2s 7h
hands: As Kd | Ac Qh
ask: Both players paired the ace. Who wins?
hint: Both play A-A and then the three best cards left. Compare those, one at a time, from the top.
why: Both have a pair of aces, so compare kickers: king beats queen at the fourth card and the hand is over there. This is why ace-king is a far better holding than ace-queen — not because it makes a pair more often, but because when it does, it makes the better one.
```

Notice what that means in practice. Holding an ace with a weak second card, you win small pots when you
are ahead and lose large ones when you are behind. The pots are not the same size, which is why "any
ace" is an expensive habit.

```try
type: showdown
board: 8h 8d 8s 2c 2d
hands: Ah Kd | 3c 3h
ask: A tricky one. The board is a full house already. Who wins?
hint: Eights full of deuces is on the board. Can either player improve on it? A full house is three of one rank and two of another.
why: The board is eights full of deuces. Ace-king cannot improve it and just plays the board. But the pair of threes makes eights full of THREES, which beats eights full of deuces — the smaller pair is replaced by a bigger one. A hand that looked like nothing wins it.
success: Well read. This is exactly the spot where a beginner announces a chopped pot and is wrong.
```

## Who shows first

If there was a bet on the river, the player who made that last bet or raise shows first, and the others
may then show or muck. If everybody checked, the first player still in, to the button's left, shows first.

At a live table you never *have* to turn your hand over if you are beaten — you can muck and lose quietly.
But if you want the pot, your cards must be face up on the table. Dealers award pots to visible cards, not
to announcements, and a hand that is thrown away face down cannot be brought back.

Which leads to the one piece of live etiquette in this lesson: **do not announce your hand until the cards
are down and read.** Misreading your own hand out loud commits you to nothing, but it does tell the whole
table what you had. Turn it over and let the dealer read it.

+++ Read more: the words that cause the trouble

Three phrases cause almost every showdown misread at a beginner table.

**"I have a flush"** — when four hearts are on the board and you hold one. That is a flush, yes, but so
does everyone else with a heart, and the biggest heart wins. If yours is the deuce you have the worst
possible version of it.

**"We both have a straight"** — when the board is 5-6-7-8 and one player holds a nine. A straight to the
nine beats a straight to the eight. Same category, different size, and it is not a split.

**"My kicker plays"** — when it does not. If the board is A-A-A-K-K, your kicker does not play, because
the board already gives everyone a full house using all five cards. You have five cards; there is no sixth
slot for your kicker to sit in.

All three come from the same habit: reading your two cards first and adding the board to them. Read the
board first, then ask what your two cards change. The errors disappear.
+++

## Remember

- Best five cards win. Read the **board on its own first**, then ask what your two cards add.
- If the board is the best five, the pot is split.
- Kickers decide most pots — compare from the top card down.
- Last aggressor shows first; a mucked hand cannot win, whatever it was.
