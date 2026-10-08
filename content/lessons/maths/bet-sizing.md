---
id: bet-sizing
track: The maths
title: Bet sizing
lede: How much you bet is a decision too. The size sets the price your opponent gets — and the risk you take.
level: Tournament
sources:
  - "Every percentage in this lesson is computed by this app's own engine, js/engine/ev.js (betSizing, requiredEquity, alpha), as the page draws — none is typed in — and every sizing drill is checked against it by scripts/verify-drills.mjs"
  - "Opening sizes in tournaments: Will Shillibier, 'How to Bet in Poker Tournaments', PokerNews (2015, updated 2022) — https://www.pokernews.com/strategy/how-to-bet-in-poker-tournaments-22371.htm — paraphrased"
  - "Opening sizes by position, and the break-even figures for an open with antes: Miikka Anttonen, 'How To Open-Raise In MTTs', Upswing Poker (2017) — https://upswingpoker.com/open-raise-tournaments-mtt-strategy/ — paraphrased; this app's engine reproduces his figures"
  - "Opening and re-raise sizes: Jonathan Little, 'The Ultimate Guide to Preflop Bet Sizing', PokerCoaching (2025) — https://pokercoaching.com/blog/preflop-strategy-guide-the-ultimate-guide-to-preflop-bet-sizing/ — paraphrased"
  - "Sizes after the flop, by board: Jonathan Little, 'Poker Bet Sizing Strategy: 8 Tips', PokerCoaching (2024) — https://pokercoaching.com/blog/bet-sizing-tips/ — paraphrased, one short quotation"
---

Every bet asks a question with a number in it. **The size of your bet decides what that number is** —
for the player deciding whether to call, and for you, if you are bluffing.

There is no single right size: the sizes below are the common ones and the reasons behind them, from
coaches and writers named in the sources. The maths of each size is not a matter of opinion, though, and
this app works it out for you.

## A bet is a price

Bet into a pot and you offer a deal. The caller pays your bet to win the pot plus your bet, so the bigger
you bet, the more often they need to win to call. And if you are bluffing, you risk your bet to win the
pot, so the bigger you bet, the more often they must fold.

```sizing
show: postflop
sizes: 0.33, 0.5, 0.66, 1, 2
caption: Move the slider: every number here is worked out by the app as you go.
```

Two things to notice:

- **Small bets are cheap to call.** A third of the pot asks the caller to win only one time in five.
- **Big bets are hard to call — and need more folds when they are bluffs.** The same size does both jobs
  at once, which is why sizing is a real decision.

```try
type: choice
math: caller
bet: 50
pot: 100
ask: You bet half the pot — 50 into 100. How often does a caller need to win for the call to break even?
options: 50.0% | 33.3% | 25.0% | 20.0%
answer: 25.0%
hint: They pay 50 to win the pot plus your bet. Pay 50 to win 150 — what share is 50 of the 200 at the end?
why: The caller puts in 50 and the pot will be 200 (100, your 50, their 50). Winning one time in four breaks even. This is why a half-pot bet still lets a lot of drawing hands call.
```

```try
type: choice
math: bluff
bet: 100
pot: 100
ask: You bluff the size of the pot — 100 into 100. How often must everyone fold for the bluff to break even?
options: 33.3% | 50.0% | 66.7% | 25.0%
answer: 50.0%
hint: You risk 100 to win 100.
why: Risk 100 to win 100 and you need it to work half the time. The bigger the bluff, the more often it has to succeed — the bluffing lesson has the other side of this, how often a defender must call.
```

```try
type: choice
math: caller
bet: 200
pot: 100
ask: Your opponent bets twice the pot — 200 into 100. How often do you need to win to call?
options: 66.7% | 50.0% | 40.0% | 33.3%
answer: 40.0%
hint: You pay 200 to win the pot and their bet, 300. What share is 200 of the 500 at the end?
why: You put in 200 and the pot ends at 500, so you need to win 40% of the time. Big bets ask for a lot — which is exactly what they are for.
```

## Before the flop: how big to open

When everyone has folded to you and you raise, the common tournament size is **between 2 and 2.5 big
blinds**, and sizes from 2 to 3 are all normal. PokerNews describes opens of about 2.2 to 2.5 times the
big blind as the usual range, and notes that a minimum raise is popular with many top players; Jonathan
Little calls two to three times the big blind standard, and 2 to 2.5 often enough with shorter stacks.

Why so small? In a tournament the antes mean there is already money in the middle, and a smaller raise
risks less to win it:

```sizing
show: steal
dead: 2.5
opens: 2, 2.25, 2.5, 3
caption: With the blinds (1.5 big blinds) and antes worth one big blind already in the pot.
```

A 2-big-blind open needs everyone to fold less than half the time to show a profit on the spot. Those are
the same break-even figures Miikka Anttonen gives in his Upswing article; this app works them out itself.

Two adjustments the coaches name:

- **By seat.** Anttonen suggests smaller opens from early seats, where your range is strong, and larger
  ones from the cutoff, the button and especially the small blind, where you want to discourage calls
  from a player who will act after you.
- **Re-raises.** Little's rule of thumb for a re-raise (a "3-bet") is about **three times the opponent's
  raise when you will act after them**, and **closer to four times when you will act first**.

And when you are short — about 15 big blinds or less — raising and folding to a re-raise wastes chips;
most decisions become **all in or fold**, which the [push/fold trainer](#/tools/pushfold) covers.

```try
type: choice
ask: A tournament, 25 big blinds deep. Everyone folds to you on the button and you want to raise. Which size is the common choice?
options: About 2 to 2.5 big blinds | 4 big blinds | 6 big blinds | All in
answer: About 2 to 2.5 big blinds
hint: In a tournament, the antes mean a small raise already wins a good pot when everyone folds.
why: Small opens risk little to win the blinds and antes, and the coaches cited here all put the usual tournament open at about 2 to 2.5 big blinds. Going all in with 25 big blinds risks your whole stack to win the same small pot.
```

## After the flop: small on dry boards, big on wet ones

The size that fits depends on the board.

- **Dry boards** — few draws, like 4♦ 3♥ 3♣. Little recommends **about a quarter to a third of the pot**
  here: a small bet wins about as often as a big one when the board has missed almost everyone, at a
  fraction of the risk.
- **Wet boards** — many draws, like T♠ 9♠ 7♣. Here a small bet achieves little, because so many hands
  connect. Little suggests **about 70% of the pot up to the full pot**, with fewer hands.
- **The rule behind both**, in Little's words: "the more frequently you bet in a given spot, the smaller
  your bet size should be."
- **Later streets** — on the turn and river the bets get bigger, and when only you can hold the best
  possible hand, a bet **bigger than the pot** can be right. PokerNews says the same of turns and rivers.

```try
type: choice
ask: The flop is 4♦ 3♥ 3♣ — almost nothing to draw to. You plan to bet with most of the hands you raised with. Which size fits?
options: About a third of the pot | About the size of the pot | Twice the pot
answer: About a third of the pot
hint: When you bet often, and the board has missed nearly everyone, how much do you need to risk?
why: On a dry board a small bet does nearly everything a big one does — few hands can call either way — and risks much less. Jonathan Little recommends about a quarter to a third of the pot on boards like this one, betting often.
```

```try
type: choice
ask: The flop is T♠ 9♠ 7♣ — straight and flush draws everywhere. You bet a strong hand. Which size fits better?
options: A third of the pot | About three-quarters of the pot or more
answer: About three-quarters of the pot or more
hint: A small bet gives every draw a cheap price.
why: On a wet board, a small bet lets every draw call cheaply — a third of the pot asks them to win only one time in five. A bigger bet charges them a real price. Little suggests about 70% of the pot up to the full pot here.
```

```tip
The size is a **price**. A third of the pot asks a caller to win 1 time in 5; the full pot asks 1 time in 3.
```

+++ Read more: why the same size has to do two jobs

If you only ever bet big with your best hands and small with your bluffs, an attentive opponent would
call every small bet and fold to every big one. So a player who wants to be hard to read uses the **same
size** for the hands that want a call and the bluffs that want a fold — which is why, in each spot, one
size has to be a fair compromise between the two.

That is also why the size you choose is so tied to the board. On a dry board your strong hands and your
bluffs both do well with a small bet; on a wet board both need a bigger one. The table at the top of this
lesson is the price of each choice; the board decides which price you want to charge.
+++

## Remember

- **A bet is a price.** The caller needs B ÷ (pot + 2B) of the time; a bluff needs B ÷ (pot + B).
- **Open small in tournaments:** about 2 to 2.5 big blinds is the common size; re-raise about 3× the
  raise when you act after them, closer to 4× when you act first.
- **Short — about 15 big blinds or less — it is mostly all in or fold.**
- **Dry board, small bet, often. Wet board, bigger bet, less often.**
- These sizes are the common ones, not laws — the maths of each one is what this app can tell you exactly.
