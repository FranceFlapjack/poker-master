---
id: playing-a-hand
track: Basics
title: Playing a hand
lede: Four rounds of betting with cards appearing in between, and only five things you can ever do on your turn.
level: Beginner
sources:
  - "Texas hold 'em — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Texas_hold_%27em"
  - "Betting in poker — Wikipedia, CC BY-SA: https://en.wikipedia.org/wiki/Betting_in_poker"
  - Which actions are legal in the drills below is decided by this app's own engine, js/engine/rules.js
---

A hand has four betting rounds, called **streets**. Between them, community cards appear. The pattern
never varies:

- **Preflop** — two cards each, nothing shared. A round of betting.
- **The flop** — three community cards at once. A round of betting.
- **The turn** — one more card. A round of betting.
- **The river** — the fifth and last card. The final round.

If two or more players are left after the river, there is a **showdown** and the best five cards win. If
everyone folds earlier, the last player standing takes the pot and shows nothing.

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
caption: The flop is the biggest jump in information in the whole hand — two cards to five in one moment. Ace-king has not improved, which is the normal outcome.
```

Most hands never reach the river. Somebody bets, everybody folds, the pot is collected. That is normal
poker, not an anticlimax.

<aside class="trick">
<b>Quick trick — the rule of 4 and 2</b>
<p>Count your <b>outs</b>, the cards that would make your hand. Multiply by <b>4</b> for your chance of
hitting by the river with two cards still to come, or by <b>2</b> with one card to come. Nine outs for a
flush is about 36% from the flop, 18% from the turn.</p>
<p>It is accurate to within a point up to nine outs, which covers nearly every draw you will hold. Three
caveats matter more than the rule itself:</p>
<ul>
<li><b>×4 only counts if you are all in.</b> With betting still to come on the turn you will not see both
cards for free, so the honest number is ×2. The true figure for nine outs on one card is 19.6%, not 36%.</li>
<li><b>Discount dirty outs.</b> A flush card that pairs the board can give somebody a full house; the low
end of a straight can leave you second best. An out is only an out if hitting actually wins.</li>
<li><b>It tells you nothing about the money.</b> Whether the pot is paying you enough is a separate
question — that is pot odds, in the Tournament part.</li>
</ul>
</aside>

## The five actions

Which are available depends on one question: **has anyone bet yet this round?**

**If nobody has bet** — you may **check** (stay in, put nothing in) or **bet**.

**If somebody has bet** — you may **fold** (give up), **call** (match it) or **raise** (match and add
more).

That is the whole list. You cannot check facing a bet, and you cannot call when nobody has bet.

## The minimum raise

The rule that catches everyone once: **a raise must be at least as large as the previous raise.**

Blinds are 50/100 and somebody makes it 300. They raised *by* 200. So the next raise must add at least
another 200 — making it **500 or more**. You cannot make it 400, even though 400 beats 300. The rule
counts the size of the increase, not the total.

```try
type: choice
ask: How many cards are turned over on the flop?
options: One | Two | Three | Five
answer: Three
hint: It is the only street that brings more than one card.
why: Three at once. The turn and the river bring one each, making five community cards in total.
```

```try
type: legal
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
street: flop
board: 7c 2d 9h Ts 4c
ask: The flop is out and nobody has bet. Which one of these is NOT allowed?
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
why: Facing a bet you may fold, call or raise. Check disappears the moment somebody bets — answer it or give up the pot.
```

```try
type: legal
seats: 6
stacks: 10000
blinds: 50/100
button: 0
hero: 4
actions: raise 300
ask: Same spot, blinds 50/100, the player before you made it 300. Which raise is NOT allowed?
options: Raise to 400 | Raise to 500 | Fold
hint: The last raise went from 100 up to 300. How big was the increase, and what does that make the smallest legal re-raise?
why: The raise from 100 to 300 was an increase of 200, so the next must add at least 200 more — 500 minimum. Making it 400 adds only 100 and is not a legal raise. Either make it 500 or more, or just call.
success: Right. Remember it as "match the size of the last raise", not "beat the last number".
```

```tip
A raise must go up by at least as much as the last raise did. Someone bets 100 and another raises to 300 — the next raise has to be to **500** or more.
```

+++ Read more: how much to bet

The rules barely constrain sizing — in no-limit you may bet anything from one big blind to your whole
stack. The useful frame is that a bet's size is measured against **the pot**, not against your stack.

Betting half the pot asks your opponent to put in a third of the new pot to continue. Betting the whole
pot asks for half. Bigger bets win more when they work and lose more when they do not, and the right size
depends on how often you expect to be called — a question about the other player, not about your cards.

Doing that properly needs pot odds, which is in the tournament part.
+++

## Remember

- Four streets: **preflop, flop, turn, river**. A betting round on each.
- Flop is three cards, turn one, river one.
- No bet in front of you: **check** or **bet**. A bet in front of you: **fold**, **call** or **raise**.
- A raise must increase by at least as much as the last raise did.
