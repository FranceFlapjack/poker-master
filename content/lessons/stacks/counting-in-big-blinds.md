---
id: counting-in-big-blinds
track: Stack depth and ICM
title: Counting in big blinds
lede: Twenty-five thousand chips is not a stack size. It is a number waiting for a second number.
level: Tournament
sources:
  - Every stack depth, orbit cost and percentage here is arithmetic done by this app against js/engine/rules.js, not quoted from anywhere
  - Shoving depths refer to content/charts/pushfold-hu.json, solved by this app — see the push/fold trainer
---

Somebody at the table tells you they have twenty-five thousand. You know nothing.

Twenty-five thousand at the first level is a mountain. Twenty-five thousand four hours later is a player
about to be blinded out. The chips did not move. The blinds did.

So tournament players do not count chips. They count **big blinds** — your stack divided by the big blind
— because that is the number that tells you what you are allowed to do.

| The same 25,000 | Big blind | Stack depth |
|---|---|---|
| Level 2 | 200 | **125 bb** |
| Level 9 | 1,000 | **25 bb** |
| Level 14 | 3,000 | **8.3 bb** |

One stack, three different games. At 125bb you can call a raise and play three streets after the flop. At
8.3bb you are shoving or folding before the flop, and there is no third street to reach.

```tip
Say your stack in **big blinds**, never in chips. Twenty-five thousand tells you nothing until you know the blind.
```

## The other number: what an orbit costs

Depth tells you what you can do in a hand. The cost of an **orbit** — one full trip of the button around
the table — tells you how long you can do nothing.

Nine-handed at 500/1,000 with a 100 ante from each player:

- small blind 500 + big blind 1,000 + nine antes of 100 = **2,400 a lap**
- a 25,000 stack is **ten laps** before it is gone

That is the real clock. Not "I have 25bb", but "I have ten orbits, and the blinds go up twice in that
time." Fold every hand for three laps at that level and you have spent nearly a third of your tournament
on nothing.

Later, at 1,500/3,000 with a 300 ante, the same lap costs 7,200. The same 25,000 now buys **three and a
half laps**. This is why short stacks get shorter faster than people expect — the cost of waiting rises
while your stack does not.

```table
seats: 9
stacks: 24000, 96000, 41000, 12000, 63000, 28000, 51000, 19000, 37000
blinds: 1500/3000/300
ante: each
hero: 0
hand: Ah Td
button: 6
names: You, Ana, Bo, Cy, Dee, Eli, Fay, Gus, Hal
caption: Level 14. Every stack at this table is shown in big blinds underneath it — which is the only way any of them can be compared at a glance.
```

## What each depth changes

The bands are not rules, but they are roughly where the game changes shape:

- **Over 40bb.** Everything is available. Raise, call, play after the flop, make a bet on the river that
  is not all your chips.
- **20 to 40bb.** You can still raise and fold, but a raise commits a real share of your stack. Calling a
  raise to see a flop starts getting expensive.
- **10 to 20bb.** One raise is a third of you. Most pots you enter, you enter for everything.
- **Under 10bb.** Shove or fold, and nothing else. This is the part that is **solved** — the push/fold
  trainer will deal you those spots and score you against an equilibrium the app computed itself.

That last band is the one worth knowing cold, because it is the only part of no-limit hold'em with a
right answer. Everything above it is judgement.

```try
type: choice
ask: You have 25,000 chips. The blinds are 1,500/3,000. How deep are you?
options: 25 big blinds | 16.7 big blinds | 8.3 big blinds | It depends on the ante
answer: 8.3 big blinds
hint: Stack divided by the big blind. Nothing else goes in it.
why: 25,000 ÷ 3,000 = 8.3 big blinds. The ante changes what an orbit costs you, but it does not change your depth — depth is your stack measured against the biggest forced bet you have to answer.
```

```try
type: choice
ask: Nine-handed at 500/1,000, every player antes 100. What does one full orbit cost you?
options: 1,500 | 1,600 | 2,400 | 900
answer: 2,400
hint: One small blind, one big blind, and an ante every single hand — nine of them.
why: 500 + 1,000 + (9 × 100) = 2,400. The blinds you pay twice a lap; the ante you pay every hand, which is why antes hurt the patient far more than the blinds do.
```

```try
type: legal
seats: 9
stacks: 24000
blinds: 1500/3000/300
ante: each
hero: 3
hand: As Kh
button: 0
ask: Level 14, you have eight big blinds and you are first to act. Which one of these is NOT allowed?
options: Fold | Call 3000 | Raise to 4500
hint: A raise has a minimum size. How much did the last bet — the big blind — raise by?
why: A raise must be by at least the size of the last bet, so the smallest legal raise here is to 6,000. Raising to 4,500 is not a small raise, it is not a raise at all. At eight big blinds this matters less than it looks: with 23,700 behind, almost any raise you make is most of your stack anyway, which is exactly why this depth collapses into shove or fold.
```

+++ Read more: the big blind ante, and why the total is the same

Many rooms have stopped taking an ante from every seat. Instead one player — usually the big blind —
posts the whole table's ante at once.

Nine players anteing 300 each puts 2,700 in the pot every hand. A big blind ante of 2,700 posted by one
player puts 2,700 in the pot every hand. Over a full orbit you pay exactly the same, because the button
passes you exactly once.

What changes is the *shape* of the cost. Under the old rule you bleed 300 a hand. Under the new one you
pay nothing for eight hands and then 2,700 at once — which means the hand where you are in the big blind
is the one where your stack takes a visible hit, and also the hand with the most dead money in the middle
already. That dead money is why the seat immediately to the left of the button opens so wide at short
stacks: there is more to win before anybody has done anything.

The app supports both. `ante: each` and `ante: bb` are the two settings, and every table in these lessons
says which it is using.
+++

## Remember

- **Stack ÷ big blind** is the only stack number that means anything. Chips alone tell you nothing.
- An **orbit** is the other clock: what one lap of the button costs, and therefore how long you can wait.
- Antes are paid every hand, not twice a lap, so they punish folding far harder than blinds do.
- Under 10bb the game is shove or fold — and that part has a solved answer, which is what the push/fold
  trainer drills.
