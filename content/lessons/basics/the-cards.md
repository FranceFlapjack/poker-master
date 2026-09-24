---
id: the-cards
track: Basics
title: The cards
lede: Fifty-two cards, one rule — a hand is always five cards — and nine kinds of hand in order.
level: Beginner
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "List of poker hands — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/List_of_poker_hands"
  - Every hand comparison in the drills below is decided by this app's own engine, js/engine/evaluator.js
---

One deck, fifty-two cards. Four suits, thirteen ranks each, deuce up to ace. Suits do not outrank each
other — the ace of spades and the ace of hearts are worth exactly the same.

**A poker hand is five cards. Always exactly five.** Everything below rests on that.

## Two in your hand, five in the middle

You get **two cards face down** — yours alone. Then **five are dealt face up in the middle**, shared by
everyone. That's seven cards, but a hand is five, so your hand is **the best five out of the seven**.

You may use both of your cards, one, or neither. If the best five are the five on the board, that is your
hand — and everyone else's too, which is how pots get split.

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
caption: Your best five here are the ace, the king, and the ten, nine and seven from the board. Ace high — a real hand, just not much of one.
```

## What beats what

Nine kinds, strongest first:

1. **Straight flush** — five in a row, one suit. Ace-high is a royal flush.
2. **Four of a kind**
3. **Full house** — three of one rank, two of another
4. **Flush** — five of a suit, not in a row
5. **Straight** — five in a row, mixed suits
6. **Three of a kind**
7. **Two pair**
8. **One pair**
9. **High card** — none of the above

Each is harder to make than the one below, which is the whole logic. Two consequences trip up every
beginner:

**A category always beats the one below it, however big the cards.** Three deuces beat aces-and-kings.

**Inside a category, compare from the top card down.** Two players with a pair of kings? The unused
cards — the **kickers** — decide it.

```try
type: rank
hands: Ah Jh 8h 5h 2h | 9c 8d 7h 6s 5c
ask: Which is the stronger hand?
hint: One is five of a suit, the other five in a row.
why: A flush beats a straight — there are fewer ways to be dealt one. It does not matter that the straight looks tidier.
```

```try
type: rank
hands: 5c 5d 5h Kc 2s | Ad As Kd Kh 3c
ask: This is the one that costs beginners money. Which hand wins?
hint: Aces and kings is two pair. Three fives is three of a kind. Where do those sit in the list?
why: Three of a kind beats two pair, always. Aces-and-kings is the best two pair there is and still loses to the smallest trips. The category comes first; card size only breaks ties inside a category.
success: Correct — if that felt wrong, read it again. It is the most expensive misunderstanding in this lesson.
```

```try
type: showdown
board: 2c 7d 9h Ts 3h
hands: As Kd | 7s 4c
ask: The board from earlier. Who wins this pot?
hint: A pair beats a hand with no pair, however big its cards are.
why: Ace-king never paired, so it is only ace high. Seven-four paired the seven on the board, and the smallest pair beats the biggest no-pair hand.
success: Correct — and this is the single most common surprise for a new player.
```

```try
type: rank
hands: Ah 2c 3d 4s 5h | 6d 5c 4h 3s 2h
ask: The ace can be low. Which straight wins?
hint: A-2-3-4-5 is a straight, but what is its highest card?
why: A-2-3-4-5 is the wheel, and the ace plays LOW — a straight to the five, the weakest there is. Six-high beats it.
```

```try
type: showdown
board: Ah Kh Qh Jh Th
hands: 2c 2d | 3s 4s
ask: Every card of the hand is already in the middle. Who wins?
hint: Read the board on its own. What five-card hand is sitting there?
why: The board is a royal flush and it belongs to both players equally. Neither pair improves on it, so the pot is split.
success: Right — the board played, and the pot is chopped.
```

+++ Read more: say your hand out loud as five cards

New players lose pots they think they won, almost always for the same reason: they count six cards, or
they treat their two cards as a bonus on top of the board rather than as candidates for a place in the
five.

The fix is a habit. Don't say "I've got an ace and there's an ace out there." Say "ace, ace, king, ten,
nine." If you cannot name five specific cards, you have not finished reading your hand — and the same
habit stops you missing that the board has handed everyone the same hand as you.
+++

## Remember

- Fifty-two cards; suits do not outrank each other.
- A hand is **five cards**, always. Best five out of your two plus the five in the middle.
- The category beats card size: three deuces beat aces-up.
- A-2-3-4-5 is a straight to the **five**.
