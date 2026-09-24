---
id: hand-rankings
track: First steps
title: What beats what
lede: Nine kinds of hand, in order. Learn this once and you never have to think about it again.
level: Beginner
sources:
  - "List of poker hands — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/List_of_poker_hands"
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - Every comparison in the drills below is decided by this app's own engine, js/engine/evaluator.js
---

There are nine kinds of five-card hand. Here they are, strongest first.

1. **Straight flush** — five in a row, all one suit. Ace-high (A-K-Q-J-T) is a royal flush, which is just
   the best straight flush and not a separate thing.
2. **Four of a kind** — all four of one rank.
3. **Full house** — three of one rank and two of another.
4. **Flush** — five of one suit, not in a row.
5. **Straight** — five in a row, mixed suits.
6. **Three of a kind** — three of one rank.
7. **Two pair**
8. **One pair**
9. **High card** — none of the above. You have nothing; the biggest card plays.

## The ordering is not arbitrary

Each hand is harder to make than the one below it. That's the whole logic. There are far more ways to be
dealt a pair than a flush, so a flush wins.

Two things follow that beginners get wrong for months.

**Within a category, compare from the top down.** Two flushes? The higher top card wins; if those tie,
the next card, and so on. Two pairs of kings? The other three cards — the *kickers* — decide it.

**A category always beats the one below it, no matter how big the cards are.** The smallest three of a
kind beats the biggest two pair. Three deuces beat aces-and-kings. This one costs people real money.

```try
type: rank
hands: Ah Jh 8h 5h 2h | 9c 8d 7h 6s 5c
ask: Which is the stronger hand?
hint: One is five of a suit. The other is five in a row.
why: A flush beats a straight, because there are fewer ways to be dealt one. It does not matter that the straight looks tidier.
```

```try
type: rank
hands: 7s 7h 7d 4c 4s | Kh Qh 9h 5h 2h
ask: Which is the stronger hand?
hint: Count how many ranks each hand uses.
why: A full house beats a flush. Three sevens and two fours is rarer than five hearts, even though the hearts include a king.
```

```try
type: rank
hands: 5c 5d 5h Kc 2s | Ad As Kd Kh 3c
ask: This is the one that costs beginners money. Which hand wins?
hint: Aces and kings is two pair. Three fives is three of a kind. Where do those sit in the list?
why: Three of a kind beats two pair, always. Aces and kings is the best two pair there is, and it still loses to the smallest trips. The category comes first; the size of the cards only breaks ties inside a category.
success: Correct — and if that felt wrong, read it again. It is the most common expensive mistake in this lesson.
```

```try
type: showdown
board: 9h 9d 4c 2s 7h
hands: As 9c | Kd Kh
ask: Now the same idea at a real table. Who wins?
hint: There are two nines on the board already. What does the nine in hand A make?
why: Hand A uses its nine with the two on the board for three of a kind. Hand B has kings and nines — two pair — which loses to any three of a kind.
```

```try
type: rank
hands: 9c 8d 7h 6s 5c | 8h 7c 6d 5s 4h
ask: Two straights. Which one wins?
hint: Compare the top card of each.
why: Both are straights, so you compare inside the category: nine-high beats eight-high.
```

```try
type: rank
hands: Ah 2c 3d 4s 5h | 6d 5c 4h 3s 2h
ask: The ace can be low. Which straight wins here?
hint: A-2-3-4-5 is a straight, but what is its highest card?
why: A-2-3-4-5 is called the wheel, and the ace plays LOW — it is a straight to the five, the weakest straight there is. Six-high beats it.
success: Right. The ace is the only card that plays at both ends, and the wheel is where it plays small.
```

+++ Read more: why kickers decide so many pots

Most pots are not won by a flush. They are won by one pair, and when two players both have one pair the
hand comes down to the unused cards.

Say the board is A-9-4-2-7 and you hold ace-king. You have a pair of aces with a king, a nine and a seven
alongside. Someone holding ace-queen has exactly the same pair — and loses, because the king outranks the
queen at the fourth card.

This is why "ace-anything" is a trap. Being the player with the weaker kicker means you win a small pot
when you are ahead and lose a big one when you are behind, which is the wrong way round.
+++

## Remember

- Nine categories, strongest first: straight flush, four of a kind, full house, flush, straight, three of
  a kind, two pair, one pair, high card.
- The category always wins first. Three deuces beat aces-up.
- Inside a category, compare from the top card down.
- A-2-3-4-5 is a straight to the **five**, not to the ace.
