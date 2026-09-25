---
id: pot-odds
track: The maths
title: Pot odds
lede: The pot quotes you a price. Your hand either beats it or it does not, and the size of the bet decides which.
level: Tournament
sources:
  - Every figure here is computed by this app from js/engine/ev.js — pot odds, required equity and exact outs are arithmetic, not anybody's material, and the pot odds & equity sandbox recomputes all of it live
---

Somebody bets 100 into a pot of 200. You can call for 100 to win 300.

That is the entire idea. You are being offered a price, and the only question is whether your hand wins
often enough to be worth it. **Not whether you are ahead** — whether you win *often enough*.

## The price, as a percentage

Players say "three to one" out loud and the number they act on is a percentage, so it is worth having both.

Calling 100 to win 300 is 3 to 1. Turn that into the equity you need:

> **required equity = what it costs ÷ (what is in the middle + what it costs)**

100 ÷ (300 + 100) = 25%. You need to win a quarter of the time.

Note the pot **includes their bet**. This is the single most common arithmetic mistake in poker, and it
always errs the same way — pricing yourself out of calls you should make.

## Bet size *is* the price

Every bet size a player can choose maps to exactly one required equity, and this table is worth knowing
by feel rather than working out each time. Against a pot of 100:

| They bet | Fraction of the pot | Pot odds | You need |
|---|---|---|---|
| 25 | quarter | 5.00 to 1 | **16.7%** |
| 33 | third | 4.03 to 1 | 19.9% |
| 50 | half | 3.00 to 1 | **25.0%** |
| 66 | two thirds | 2.52 to 1 | 28.4% |
| 100 | pot | 2.00 to 1 | **33.3%** |
| 200 | twice pot | 1.50 to 1 | 40.0% |

Read it in both directions. Facing a bet, it tells you the bar. Making one, it tells you what bar you are
setting — a quarter-pot bet lets everyone in the world continue, and a pot-sized bet demands a third.

## Will you get there?

Pot odds tell you the bar. **Outs** are how you work out whether you clear it. An out is a card that makes
your hand: nine hearts left for a flush draw, eight cards for an open-ended straight.

Poker's most-used shortcut is the **rule of 4 and 2**: multiply your outs by 4 with two cards to come, or
by 2 with one. Nine outs on the flop, seeing both cards: 36%.

The exact answer is 35.0%, and the shortcut is genuinely good — but it is worth seeing exactly where it
stops being good, because it fails in one direction only:

| Outs | Two cards to come | Rule of 4 says | Out by | One card | Rule of 2 says | Out by |
|---|---|---|---|---|---|---|
| 4 | 16.5% | 16% | −0.5 | 8.7% | 8% | −0.7 |
| 8 | 31.5% | 32% | +0.5 | 17.4% | 16% | −1.4 |
| 9 | 35.0% | 36% | +1.0 | 19.6% | 18% | −1.6 |
| 12 | 45.0% | 48% | **+3.0** | 26.1% | 24% | −2.1 |
| 15 | 54.1% | 60% | **+5.9** | 32.6% | 30% | −2.6 |

Below about eight outs the shortcut is near enough exact. Above that, **×4 flatters you** and keeps
flattering you harder — at fifteen outs it is telling you 60% when the truth is 54%. The rule of 2 leans
the other way and understates slightly, which is the safer direction to be wrong in.

There is also a condition nobody mentions when they teach it: ×4 assumes you will actually *see* both
cards. If calling this bet only buys you the turn, and another bet is coming on it, the honest number is
the one-card figure. Players routinely use ×4 to justify a call and then fold the turn — paying for two
cards and taking one.

```table
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
hand: Ah 7h
board: Kh 9h 2c
actions: call, check, check, bet 100
names: Ana, You
caption: The pot is 300 and it costs you 100. You have four hearts and need a fifth — nine outs, two cards to come.
```

```try
type: choice
ask: There is 200 in the pot and your opponent bets 100. What equity do you need for calling to break even?
options: 33.3% | 25.0% | 50.0% | 20.0%
answer: 25.0%
hint: What is in the middle when you make the decision? Their bet is in there too.
why: You call 100 to win the 200 that was there plus the 100 they just bet: 100 ÷ 400 = 25%. Forgetting to count their bet gives 33.3% and folds hands you should be calling with — it is the most expensive arithmetic slip in the game.
```

```try
type: choice
ask: You flop a flush draw — nine outs, both cards to come. The rule of 4 says 36%. What is the truth?
options: 36%, the rule is exact here | 35.0% — the rule flatters you slightly | 41%, the rule undersells it | It depends on your opponent's cards
answer: 35.0% — the rule flatters you slightly
hint: The two cards are not independent chances at nine outs each.
why: 35.0%. The shortcut treats two draws as twice one draw, which double-counts the times you hit both — so it overstates, and it overstates more the more outs you have. At nine outs the one-point gap costs you nothing. At fifteen it is six points, which is the difference between a call and a fold.
```

```try
type: action
seats: 2
stacks: 10000
blinds: 50/100
button: 0
hero: 1
hand: Ah 7h
board: Kh 9h 2c
actions: call, check, check, bet 100
ask: Flush draw on the flop. The pot is 300, it costs 100, and you are both deep enough that there is money left behind.
options: Fold | Call 100 | Raise to 400
answer: Call 100
why: You need 25% and a nine-out flush draw is 35% to get there by the river — the price is good even before considering that you sometimes win by pairing your ace. Raising is a real option with a draw this strong, but it turns a cheap call into a big pot with a hand that is still behind right now; calling is the plain answer and the one the price alone justifies.
hint: Work out the bar first, then the hand. Not the other way round.
```

+++ Read more: the price is not the whole decision

Pot odds answer a narrower question than people use them for. They tell you whether calling **this bet**
is profitable **if the hand ended right there**. Hands do not end there.

Two things move the real answer, in opposite directions.

**Implied odds** work in your favour. If you hit your flush, you may win more chips on the later streets —
so a call that is slightly short on price can still be right. The size of that "slightly" is calculable
rather than a feeling: at 20% equity facing 100 into 300 you are 20 chips short, which means you need to
expect to win about **100 more** on later streets for the call to break even. If you cannot name where
those chips come from, you do not have implied odds — you have hope.

**Reverse implied odds** work against you, and they are the ones nobody counts. If you hit your card and
*still* lose — your flush comes in and theirs is bigger, your ace pairs and theirs is better — then some
of the times you "get there" cost you money rather than win it. Weak draws to weak hands are where this
quietly eats a stack.

The sandbox at **Pot odds & equity** does all of this live, including the exact outs figure and the size
of the shortcut's error, so you can put your own numbers in rather than remember these.
+++

## Remember

- **Required equity = cost ÷ (pot + cost)**, and the pot includes the bet you are facing.
- Half pot is **25%**, pot is **33%**, twice pot is **40%**. Learn the three and interpolate.
- The **rule of 4 and 2** is fine below eight outs and flatters you above it — by six points at fifteen.
- ×4 assumes you see both cards. If another bet is coming, use ×2.
