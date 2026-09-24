---
id: the-four-streets
track: How a hand is played
title: Preflop, flop, turn, river
lede: One hand is four rounds of betting with cards appearing in between. Learn the shape and the rest is detail.
level: Beginner
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "Betting in poker — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Betting_in_poker"
  - Every board in this lesson is dealt by this app's own engine, js/engine/rules.js
---

A hand of hold'em has four betting rounds. Poker calls them **streets**. Between them, community cards
appear in the middle. The pattern never varies, so it is worth learning once, properly.

## Preflop — two cards, no board

The blinds are posted, everyone gets two cards face down, and there is a round of betting. Nothing is in
the middle yet: you are betting on two cards and your read of the table.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 0
hand: As Kh
names: You, Opponent
board: 7c 2d 9h Ts 4c
caption: Preflop. Two cards each, nothing shared, and already a bet to answer.
```

## The flop — three cards at once

Three community cards are turned over together. This is the biggest single jump in information in the
whole hand: you go from two cards to seven-eighths of your final hand in one moment.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 0
hand: As Kh
names: You, Opponent
board: 7c 2d 9h Ts 4c
street: flop
caption: The flop. Ace-king has not improved — no ace, no king. That is the normal outcome, and learning to let go here is most of what separates beginners from everyone else.
```

Then a round of betting. From here on, the player left of the button acts first and the button acts last.

## The turn — one card

A fourth card. One more round of betting. Bets tend to get bigger here, because the pot is bigger and
there is only one card left to come.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 0
hand: As Kh
names: You, Opponent
board: 7c 2d 9h Ts 4c
street: turn
caption: The turn brings the ten. Still nothing for ace-king.
```

## The river — the last card

A fifth and final card, then the last round of betting. Nothing more is coming. Whatever you have now is
what you have, and every bet from here is about the hand as it actually is rather than what it might
become.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 0
hand: As Kh
names: You, Opponent
board: 7c 2d 9h Ts 4c
street: river
caption: The river. Five cards in the middle, two in your hand, and a last decision to make.
```

If two or more players are still in after the river betting, there is a **showdown** and the best five
cards win. If everyone folds at any point before that, the last player standing takes the pot and never
has to show anything.

## Two things worth noticing

**A hand can end on any street.** Most hands never reach the river. Somebody bets, everybody folds, the
pot is collected and the cards are mucked. That is normal poker, not an anticlimax.

**Three of the four rounds happen with the board incomplete.** You are almost always deciding with
missing information, and the whole skill of the game lives in that gap.

```try
type: choice
ask: How many cards are turned over on the flop?
options: One | Two | Three | Five
answer: Three
hint: It is the only street that brings more than one card.
why: The flop is three cards at once. The turn and the river bring one each, which makes five community cards in total.
```

```try
type: choice
ask: How many betting rounds are there in one complete hand?
options: Two | Three | Four | Five
answer: Four
hint: One before the flop, and one after each batch of community cards.
why: Preflop, flop, turn, river. Four rounds — and a hand that reaches the river has had four chances for someone to fold.
```

```try
type: showdown
board: 7c 2d 9h Ts 4c
hands: As Kh | 9c 3d
ask: That board again, all five cards out. Who wins?
hint: Did ace-king ever pair anything? Did nine-three?
why: Ace-king never improved — it is only ace high. Nine-three paired the nine on the board. The smallest pair beats the biggest unpaired hand, which is why chasing big cards to the river is expensive.
success: Correct. Ace-king is a strong hand before the flop and nothing at all after it, unless it connects.
```

+++ Read more: why the flop is the street that matters most

Before the flop you know two cards out of seven. After it you know five. That is the largest single
change in information you will ever get, and it is why so much poker theory is really flop theory.

It also means the flop is where most of the money gets decided. A pot that is small preflop becomes a
real pot on the flop, and the decisions there — bet or check, call or fold — set up everything that
follows.

A useful habit while you are learning: before you act on the flop, say out loud what your five cards
currently are, and then say what the board would need to bring to improve them. If the answer to the
second question is "nothing helps", that is usually a fold.
+++

## Remember

- Four streets: **preflop, flop, turn, river**. A betting round on each.
- Flop is three cards, turn is one, river is one. Five in the middle.
- Preflop the blinds act last; from the flop onward the button acts last.
- Most hands end before the river, and that is fine.
