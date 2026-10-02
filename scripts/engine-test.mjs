#!/usr/bin/env node
// Engine checks: run before touching anything under js/engine/. Exit code 1 on any failure.
//
// On fixtures and honesty: this file asserts almost nothing from memory. Equity is checked against
// INVARIANTS that must hold whatever the true number is — probabilities summing to one, win/tie/lose
// accounting for every runout, and hands related by a suit swap having identical equity. Those catch
// real bugs without quoting a percentage nobody here has verified against a source. The one published
// comparison worth doing is a manual, one-time check recorded in ROADMAP.md, not a hardcoded constant.
//
// Full preflop enumeration (1,712,304 runouts) runs every time — it measured at 0.8s, which is cheap
// enough not to hide behind a flag, and it is the strongest check available.

import { parseCard, parseCards, cardStr, cardsStr, makeDeck, deckWithout, mulberry32, rankOf, suitOf } from '../js/engine/cards.js'
import { evaluate, describe, straightHigh, HIGH_CARD, PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH, FULL_HOUSE, QUADS, STRAIGHT_FLUSH } from '../js/engine/evaluator.js'
import { parseRange, serializeRange, cellName, nameToCell, cellCombos, rangeCombos, countCombos, handToCell, idx, newRange, shapeCounts } from '../js/engine/ranges.js'
import { equityExact, equityMC, runoutCount } from '../js/engine/equity.js'
import { createHand, legalActions, applyAction, buildPots, potTotal, sbSeat, bbSeat, effectiveStack } from '../js/engine/rules.js'
import { newHand, recordFromState, validateHand } from '../js/engine/hand.js'
import { potOdds, requiredEquity, evCall, outsEquity, ruleOf4And2, outsError, mdf, alpha,
         evShove, breakEvenFoldEquity, impliedOddsNeeded, betSizing, inBB } from '../js/engine/ev.js'
import { icmEquity, icmRequiredEquity, bubbleFactor, icmTable } from '../js/engine/icm.js'
import { nashPushFold, widthOf, equityVsRange } from '../js/engine/pushfold.js'
import { preflopStrength } from '../js/engine/preflop-strength.js'

let fails = 0, passes = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg) } else { passes++; if (VERBOSE) console.log('ok  ', msg) } }
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`)
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} — got ${a}, expected ${b} ±${tol}`)
const throws = (fn, msg) => { try { fn(); ok(false, `${msg} — expected a throw`) } catch { ok(true, msg) } }
const VERBOSE = process.argv.includes('-v')
const section = t => console.log(`\n— ${t}`)

const H = s => parseCards(s)
const ev = s => evaluate(H(s))

// ---------------------------------------------------------------- cards
section('cards')
{
  let roundTripped = 0
  for (let c = 0; c < 52; c++) if (parseCard(cardStr(c)) === c) roundTripped++
  eq(roundTripped, 52, 'every card survives format → parse')
  eq(cardStr(parseCard('As')), 'As', 'ace of spades')
  eq(rankOf(parseCard('2c')), 0, 'deuce is rank 0')
  eq(rankOf(parseCard('As')), 12, 'ace is rank 12')
  eq(suitOf(parseCard('Ah')), 2, 'hearts is suit 2')
  eq(cardsStr(parseCards('AsKd')), 'As Kd', 'compact card list parses')
  eq(cardsStr(parseCards('As Kd')), 'As Kd', 'spaced card list parses')
  eq(makeDeck().length, 52, 'a deck has 52 cards')
  eq(deckWithout(H('As Kd')).length, 50, 'removing two cards leaves 50')
  throws(() => parseCard('Xx'), 'a bad card throws rather than returning nonsense')
  throws(() => parseCard('A'), 'a truncated card throws')

  const a = mulberry32(42), b = mulberry32(42)
  ok([...Array(20)].every(() => a() === b()), 'the seeded rng is reproducible')
  ok(mulberry32(1)() !== mulberry32(2)(), 'different seeds give different streams')
}

// ------------------------------------------------------------ evaluator
section('evaluator')
{
  eq(ev('As Ks Qs Js Ts 2c 3d').cat, STRAIGHT_FLUSH, 'royal flush')
  eq(describe(ev('As Ks Qs Js Ts 2c 3d')), 'Royal flush', 'royal flush is named')
  eq(ev('9h 8h 7h 6h 5h 2c 3d').cat, STRAIGHT_FLUSH, 'straight flush')
  eq(ev('Ah 2h 3h 4h 5h Kc Qd').cat, STRAIGHT_FLUSH, 'the wheel is a straight flush')
  eq(ev('Ah 2h 3h 4h 5h Kc Qd').tb[0], 3, 'a steel wheel is a straight flush to the FIVE, not the ace')
  eq(ev('As Ah Ad Ac Kh 2c 3d').cat, QUADS, 'four of a kind')
  eq(ev('As Ah Ad Kc Kh 2c 3d').cat, FULL_HOUSE, 'full house')
  eq(ev('As Ks 9s 5s 2s 3d 4c').cat, FLUSH, 'flush')
  eq(ev('9h 8c 7d 6s 5h Ac Kd').cat, STRAIGHT, 'straight')
  eq(ev('Ah 2c 3d 4s 5h Kc Qd').cat, STRAIGHT, 'the wheel is a straight')
  eq(ev('Ah 2c 3d 4s 5h Kc Qd').tb[0], 3, 'the wheel is a straight to the five')
  eq(describe(ev('Ah 2c 3d 4s 5h Kc Qd')), 'Straight, five high (the wheel)', 'the wheel is named')
  eq(ev('As Ah Ad Kc Qh 2c 3d').cat, TRIPS, 'three of a kind')
  eq(ev('As Ah Kd Kc Qh 2c 3d').cat, TWO_PAIR, 'two pair')
  eq(ev('As Ah Kd Qc Jh 2c 3d').cat, PAIR, 'one pair')
  eq(ev('As Kh Qd Jc 9h 2c 3d').cat, HIGH_CARD, 'high card')

  // category ordering
  const ladder = ['As Kh Qd Jc 9h 2c 4d', 'As Ah Kd Qc Jh 2c 4d', 'As Ah Kd Kc Jh 2c 4d',
    'As Ah Ad Kc Jh 2c 4d', '9h 8c 7d 6s 5h Ac Kd', 'As Ks 9s 5s 2s 3d 4c',
    'As Ah Ad Kc Kh 2c 4d', 'As Ah Ad Ac Kh 2c 4d', '9h 8h 7h 6h 5h 2c 3d']
  let ordered = true
  for (let i = 1; i < ladder.length; i++) if (ev(ladder[i]).score <= ev(ladder[i - 1]).score) ordered = false
  ok(ordered, 'every category beats the one below it')

  // kickers and ties
  ok(ev('As Ah Kd Qc 9h 2c 3d').score > ev('As Ah Kd Qc 8h 2c 3d').score, 'a better fifth card wins')
  ok(ev('As Ah Kd Qc Jh').score === ev('Ac Ad Kh Qs Jc').score, 'the same hand in different suits ties exactly')
  ok(ev('Ks Kh 9d 9c 2h 3s 4d').score > ev('Ks Kh 8d 8c 2h 3s 4d').score, 'the higher second pair wins two pair')
  // three pairs in seven cards: only the top two play, and the third pair supplies the kicker
  const threePair = ev('Ks Kh 9d 9c 4h 4s 2d')
  eq(threePair.cat, TWO_PAIR, 'three pairs in seven cards is still two pair')
  eq(threePair.tb[2], rankOf(parseCard('4c')), 'the third pair plays as the kicker when it beats the singleton')
  // quad kicker comes from anywhere, including a pair
  eq(ev('7s 7h 7d 7c 9h 9s 2d').tb[1], rankOf(parseCard('9c')), 'the quads kicker may come from a pair')
  // two trips is a full house using the lower trip as the pair
  const twoTrips = ev('9s 9h 9d 5c 5h 5s 2d')
  eq(twoTrips.cat, FULL_HOUSE, 'two trips make a full house')
  eq(twoTrips.tb[0], rankOf(parseCard('9c')), 'the higher trip is the trip')
  eq(twoTrips.tb[1], rankOf(parseCard('5c')), 'the lower trip plays as the pair')
  // a flush must beat a lower flush by its top cards
  ok(ev('As Qs 9s 5s 2s 3d 4c').score > ev('Ks Qs 9s 5s 2s 3d 4c').score, 'the higher flush wins')

  // five, six and seven cards all work
  eq(ev('As Ks Qs Js Ts').cat, STRAIGHT_FLUSH, 'five cards evaluate')
  eq(ev('As Ks Qs Js Ts 2c').cat, STRAIGHT_FLUSH, 'six cards evaluate')
  throws(() => evaluate(H('As Ks Qs Js')), 'fewer than five cards throws')

  eq(straightHigh(0b1111100000000), 12, 'straightHigh finds a broadway straight')
  eq(straightHigh((1 << 12) | 0b1111), 3, 'straightHigh finds the wheel')
  eq(straightHigh(0b1010101010101), -1, 'straightHigh rejects a non-straight')
}

// --------------------------------------------------------------- ranges
section('ranges')
{
  eq(cellName(0, 0), 'AA', 'top-left is aces')
  eq(cellName(0, 1), 'AKs', 'above the diagonal is suited')
  eq(cellName(1, 0), 'AKo', 'below the diagonal is offsuit')
  eq(cellName(12, 12), '22', 'bottom-right is deuces')

  const count = r => Array.from(r).filter(w => w > 0).length
  eq(count(parseRange('AA')), 1, 'a single hand is one cell')
  eq(count(parseRange('77+')), 8, '77+ is eight pairs')
  eq(count(parseRange('22+')), 13, '22+ is every pair')
  eq(count(parseRange('AJs+')), 3, 'AJs+ is AJs, AQs, AKs')
  eq(count(parseRange('A5s-A2s')), 4, 'A5s-A2s is four hands')
  eq(count(parseRange('22-55')), 4, '22-55 is four pairs, written low to high')
  eq(count(parseRange('AK')), 2, 'AK with no suffix is both AKs and AKo')
  eq(count(parseRange('77+, AJs+, KQo')), 12, 'a list adds up')
  eq(parseRange('AJo:0.4')[idx(...Object.values(nameToCell('AJo')))], 0.4000000059604645, 'a weight is stored (float32)')
  throws(() => parseRange('AAs'), 'a suited pair throws')
  throws(() => parseRange('AK s'), 'a malformed hand throws')
  throws(() => parseRange('AKs-KQs'), 'a run across different top cards throws')

  // round trip: serialising a parsed range and parsing it again must be stable
  const samples = ['AA', '77+', 'AJs+, KQo', '22-55, A5s-A2s', 'AA, KK, QQ, AKs, AKo', 'JJ+, AQs+, AKo', '']
  let stable = true, detail = ''
  for (const s of samples) {
    const once = serializeRange(parseRange(s))
    const twice = serializeRange(parseRange(once))
    if (once !== twice) { stable = false; detail = `${s}: ${once} ≠ ${twice}` }
  }
  ok(stable, `parse → serialize → parse → serialize is stable ${detail}`)

  // and the weights themselves must survive the trip
  let weightsSurvive = true
  for (const s of samples) {
    const a = parseRange(s), b = parseRange(serializeRange(a))
    for (let i = 0; i < 169; i++) if (a[i] !== b[i]) weightsSurvive = false
  }
  ok(weightsSurvive, 'the weights are identical after a round trip')

  eq(serializeRange(parseRange('77+')), '77+', '77+ serialises back to itself')
  eq(serializeRange(parseRange('AKs')), 'AKs+', 'the strongest suited ace writes as AKs+')

  // combos, with and without card removal
  eq(cellCombos(...Object.values(nameToCell('AA'))).length, 6, 'a pair is 6 combos')
  eq(cellCombos(...Object.values(nameToCell('AKs'))).length, 4, 'a suited hand is 4 combos')
  eq(cellCombos(...Object.values(nameToCell('AKo'))).length, 12, 'an offsuit hand is 12 combos')
  {
    // the lesson grid's key and its "as dealt" bar are read from these
    const sc = shapeCounts()
    eq([sc.pair.cells, sc.suited.cells, sc.offsuit.cells].join('/'), '13/78/78', 'the grid is 13 pairs, 78 suited, 78 offsuit')
    eq([sc.pair.combos, sc.suited.combos, sc.offsuit.combos].join('/'), '78/312/936', 'which hold 78, 312 and 936 hands')
    eq(sc.pair.combos + sc.suited.combos + sc.offsuit.combos, 1326, 'and 1,326 in all — two cards from 52')
  }
  eq(countCombos(parseRange('AA')), 6, 'aces are 6 combos')
  eq(countCombos(parseRange('AA'), H('Ah')), 3, 'one dead ace leaves 3 combos of aces')
  eq(countCombos(parseRange('AA'), H('Ah As')), 1, 'two dead aces leave 1 combo')
  eq(countCombos(parseRange('AKs'), H('Ah')), 3, 'a dead ace removes one suited combo')
  eq(countCombos(parseRange('AKo'), H('Ah')), 9, 'a dead ace removes three offsuit combos')
  near(countCombos(parseRange('AJo:0.5')), 6, 1e-4, 'a half-weighted offsuit hand counts 6')

  const everything = newRange().fill(1)
  eq(countCombos(everything), 1326, 'every hand is 1,326 combos')
  eq(rangeCombos(everything, H('As')).length, 1275, 'one dead card removes 51 combos')

  const cell = handToCell(parseCard('Ah'), parseCard('Kh'))
  eq(cellName(cell.i, cell.j), 'AKs', 'two real cards map back to their grid cell')
  eq(cellName(...Object.values(handToCell(parseCard('Ah'), parseCard('Kd')))), 'AKo', 'offsuit maps correctly')
  eq(cellName(...Object.values(handToCell(parseCard('7h'), parseCard('7d')))), '77', 'a pair maps correctly')
}

// --------------------------------------------------------------- equity
section('equity')
{
  eq(runoutCount(0, 4), 1712304, 'preflop heads-up is C(48,5) runouts')
  eq(runoutCount(3, 7), 990, 'a known flop leaves C(45,2) runouts')
  eq(runoutCount(5, 9), 1, 'a full board has one runout')

  // Invariant 1: equities sum to exactly 1 — every runout is won or split by someone.
  const r1 = equityExact([H('As Ks'), H('Qh Qd')], H('2c 7d 9h'))
  near(r1.equity[0] + r1.equity[1], 1, 1e-12, 'two players\' equities sum to 1')
  eq(r1.trials, 990, 'every runout of a known flop was enumerated')

  // Invariant 2: wins and ties account for every enumeration, with nothing lost.
  const total = r1.win[0] + r1.win[1] + r1.tie[0] + r1.tie[1]
  near(total, 1, 1e-12, 'wins and ties account for every runout')

  // Invariant 3: hands related by a suit swap must have identical equity. AhKh vs AsKs on a board of
  // only clubs and diamonds is fixed by swapping hearts and spades, so the split is exactly 50/50 —
  // whatever the true number for AK vs AK happens to be. This catches suit-handling bugs that a
  // remembered percentage never would.
  const sym = equityExact([H('Ah Kh'), H('As Ks')], H('2c 7d 9c'))
  eq(sym.equity[0], 0.5, 'a suit-symmetric matchup is exactly 50/50')
  eq(sym.equity[1], 0.5, 'and so is the other side')

  // three-way also sums to one
  const r3 = equityExact([H('As Ks'), H('Qh Qd'), H('7c 7s')], H('2d 8h Th'))
  near(r3.equity.reduce((a, b) => a + b, 0), 1, 1e-12, 'three players\' equities sum to 1')

  // a made hand on the river beats a busted draw, with no ties
  const river = equityExact([H('As Ah'), H('Kd Qd')], H('2c 7d 9h Ts 3s'))
  eq(river.equity[0], 1, 'aces win a decided board outright')
  eq(river.trials, 1, 'a full board is a single runout')

  // determinism
  const again = equityExact([H('As Ks'), H('Qh Qd')], H('2c 7d 9h'))
  eq(again.equity[0], r1.equity[0], 'exact enumeration is deterministic')

  throws(() => equityExact([H('As Ks'), H('As Qd')], []), 'a duplicated card throws')
  throws(() => equityExact([H('As Ks'), H('Qh Qd')], []), 'preflop enumeration refuses without an explicit limit')

  // Monte Carlo must land on the exact answer. Tolerance is 4 standard errors, not 1: at 1 SE a
  // correct implementation fails about a third of the time, which would make this test noise.
  let mcOk = true, worst = 0
  for (const seed of [1, 2, 3, 7, 99]) {
    const mc = equityMC([H('As Ks'), H('Qh Qd')], H('2c 7d 9h'), [], { trials: 20000, seed })
    const off = Math.abs(mc.equity[0] - r1.equity[0])
    worst = Math.max(worst, off / mc.stderr[0])
    if (off > 4 * mc.stderr[0]) mcOk = false
  }
  ok(mcOk, `Monte Carlo agrees with enumeration across five seeds (worst ${worst.toFixed(2)} SE)`)

  // more trials must mean a smaller error bar, and roughly as 1/sqrt(n)
  const few = equityMC([H('As Ks'), H('Qh Qd')], H('2c 7d 9h'), [], { trials: 2000, seed: 5 })
  const many = equityMC([H('As Ks'), H('Qh Qd')], H('2c 7d 9h'), [], { trials: 32000, seed: 5 })
  ok(many.stderr[0] < few.stderr[0], 'more trials narrows the error bar')
  near(few.stderr[0] / many.stderr[0], 4, 0.6, 'the error bar shrinks as 1/sqrt(trials)')

  // ranges work, and the suit-symmetry invariant holds there too
  const vsRange = equityMC([H('As Ks'), parseRange('QQ')], H('2c 7d 9h'), [], { trials: 8000, seed: 3 })
  near(vsRange.equity[0] + vsRange.equity[1], 1, 1e-12, 'hand versus range still sums to 1')
  throws(() => equityMC([H('As Ks'), parseRange('AA')], H('As 7d 9h')), 'a hand holding a board card throws')

  {
    const t0 = Date.now()
    const pre = equityExact([H('As Ah'), H('Ks Kh')], [], [], { maxRunouts: Infinity })
    console.log(`     aces vs kings preflop: ${(pre.equity[0] * 100).toFixed(2)}% / ${(pre.equity[1] * 100).toFixed(2)}% ` +
      `over ${pre.trials.toLocaleString()} runouts in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    near(pre.equity[0] + pre.equity[1], 1, 1e-12, 'full preflop enumeration sums to 1')
    eq(pre.trials, 1712304, 'full preflop enumeration covers every runout')
  }
}

// ---------------------------------------------------------------- rules
section('rules')
const stacks = (n, size) => Array.from({ length: n }, () => ({ stack: size }))
const chipsIn = s => s.seats.reduce((n, p) => n + p.startStack, 0)
const chipsOut = s => s.seats.reduce((n, p) => n + p.stack, 0) + potTotal(s)
const act = (s, type, amount) => applyAction(s, amount == null ? { type } : { type, amount })
const can = (s, type) => legalActions(s).some(a => a.type === type)
{
  // blinds and seating
  const six = createHand({ seats: stacks(6, 10000), button: 0, blinds: { sb: 50, bb: 100 } })
  eq(sbSeat(six), 1, 'six-handed, the small blind is left of the button')
  eq(bbSeat(six), 2, 'and the big blind is next')
  eq(six.toAct, 3, 'the player after the big blind acts first before the flop')
  eq(six.seats[1].committed, 50, 'the small blind is posted')
  eq(six.seats[2].committed, 100, 'the big blind is posted')
  eq(potTotal(six), 150, 'the pot holds both blinds')

  const hu = createHand({ seats: stacks(2, 10000), button: 0, blinds: { sb: 50, bb: 100 } })
  eq(sbSeat(hu), 0, 'heads-up, the button posts the small blind')
  eq(bbSeat(hu), 1, 'and the other seat is the big blind')
  eq(hu.toAct, 0, 'heads-up, the button acts first before the flop')

  const nine = createHand({ seats: stacks(9, 10000), button: 4, blinds: { sb: 50, bb: 100 } })
  eq(nine.toAct, 7, 'nine-handed seats wrap correctly')
  throws(() => createHand({ seats: stacks(10, 100), button: 0, blinds: { sb: 1, bb: 2 } }), 'ten seats throws')
  throws(() => createHand({ seats: stacks(2, 1000), button: 0, blinds: { sb: 50, bb: 100 }, hole: { 0: H('As Ks Qs Js Ts') } }),
    'a five-card hole hand throws rather than being silently truncated to two')
  throws(() => createHand({ seats: stacks(1, 100), button: 0, blinds: { sb: 1, bb: 2 } }), 'one seat throws')

  // THE BIG BLIND'S OPTION — the round must not close just because everyone has matched
  let s = createHand({ seats: stacks(6, 10000), button: 0, blinds: { sb: 50, bb: 100 } })
  s = act(s, 'call'); s = act(s, 'fold'); s = act(s, 'fold'); s = act(s, 'fold')  // 3 calls, 4/5/0 fold
  s = act(s, 'call')                                                              // small blind completes
  eq(s.street, 'preflop', 'a limped pot is still preflop after the small blind completes')
  eq(s.toAct, 2, 'the big blind gets the option even though the bet is already matched')
  ok(can(s, 'check'), 'the big blind may check')
  ok(can(s, 'raise'), 'the big blind may also raise')
  s = act(s, 'check')
  eq(s.street, 'flop', 'checking the option moves to the flop')
  eq(s.board.length, 3, 'the flop is three cards')
  eq(s.toAct, 1, 'the small blind acts first after the flop')

  // minimum raise sizing
  let m = createHand({ seats: stacks(6, 10000), button: 0, blinds: { sb: 50, bb: 100 } })
  eq(legalActions(m).find(a => a.type === 'raise').min, 200, 'the first raise must be to at least two big blinds')
  m = act(m, 'raise', 300)
  eq(legalActions(m).find(a => a.type === 'raise').min, 500, 'a raise to 300 sets the next minimum at 500')
  throws(() => act(m, 'raise', 400), 'a raise below the minimum is rejected')

  // AN ALL-IN FOR LESS THAN A FULL RAISE DOES NOT REOPEN BETTING
  let r = createHand({ seats: [{ stack: 10000 }, { stack: 400 }, { stack: 10000 }], button: 0, blinds: { sb: 50, bb: 100 } })
  eq(r.toAct, 0, 'three-handed, the button acts first before the flop')
  r = act(r, 'raise', 300)                       // seat 0 makes it 300; last full raise is 200
  eq(r.toAct, 1, 'action moves to the small blind')
  const shove = legalActions(r).find(a => a.type === 'raise')
  // the 400 stack already has 50 of it posted as the small blind, so 400 is all it can ever total
  eq(shove.max, 400, 'the short stack can only ever get its whole 400 in')
  eq(shove.min, 400, 'so its minimum raise is capped at its stack')
  r = act(r, 'raise', 400)                       // all-in for 100 more: less than a full raise of 200
  eq(r.currentBet, 400, 'the incomplete all-in still raises the amount to call')
  eq(r.lastRaiseSize, 200, 'but it does not change the size of a full raise')
  eq(r.toAct, 2, 'action moves to the big blind')
  ok(can(r, 'raise'), 'a player who had not yet acted may still raise')
  const beforeReopen = act(r, 'call')
  eq(beforeReopen.toAct, 0, 'action returns to the original raiser')
  ok(!can(beforeReopen, 'raise'), 'a player who already acted may NOT raise after an incomplete all-in')
  ok(can(beforeReopen, 'call'), 'but must still be able to answer the larger bet')
  ok(can(beforeReopen, 'fold'), 'or fold')

  // ...AND A LATER FULL RAISE REOPENS IT AGAIN
  const reopened = act(r, 'raise', 900)          // 500 more: a full raise
  eq(reopened.lastRaiseSize, 500, 'a full raise resets the raise size')
  eq(reopened.toAct, 0, 'action returns to the original raiser')
  ok(can(reopened, 'raise'), 'a full raise reopens raising for the player who was restricted')

  // SIDE POTS in a three-way all-in
  let sp = createHand({ seats: [{ stack: 300 }, { stack: 1000 }, { stack: 2000 }], button: 0, blinds: { sb: 50, bb: 100 } })
  const spIn = chipsIn(sp)
  sp = act(sp, 'raise', 300)     // seat 0 all-in for its whole 300
  sp = act(sp, 'raise', 1000)    // seat 1 all-in for its whole 1000 (50 of it already posted)
  sp = act(sp, 'call')           // seat 2 calls 1000
  const pots = buildPots(sp.seats)
  eq(pots.length, 2, 'a three-way all-in with three stack sizes makes two pots')
  eq(pots[0].amount, 900, 'the main pot is three times the shortest stack')
  eq(pots[0].eligible.join(','), '0,1,2', 'everyone can win the main pot')
  eq(pots[1].amount, 1400, 'the side pot is what the other two put in above it')
  eq(pots[1].eligible.join(','), '1,2', 'the short stack cannot win the side pot')
  eq(pots[0].amount + pots[1].amount, 2300, 'the pots account for every chip wagered')
  eq(sp.street, 'complete', 'with everyone all-in the hand runs to the end')
  eq(chipsOut(sp), spIn, 'chips are conserved through a three-way all-in')

  // an uncalled bet comes back
  let u = createHand({ seats: [{ stack: 10000 }, { stack: 10000 }, { stack: 500 }], button: 0, blinds: { sb: 50, bb: 100 } })
  const uIn = chipsIn(u)
  u = act(u, 'raise', 4000)   // seat 0 makes it 4000
  u = act(u, 'fold')          // seat 1 folds
  u = act(u, 'fold')          // seat 2 folds
  eq(u.street, 'complete', 'everyone folding ends the hand')
  eq(u.seats[0].stack, 10000 + 150, 'the raiser gets the blinds and every uncalled chip back')
  eq(chipsOut(u), uIn, 'chips are conserved when a bet goes uncalled')

  // a folded player's chips stay in the pot but cannot be won back
  let f = createHand({ seats: [{ stack: 10000 }, { stack: 10000 }, { stack: 10000 }], button: 0, blinds: { sb: 50, bb: 100 } })
  f = act(f, 'raise', 300); f = act(f, 'raise', 900); f = act(f, 'fold'); f = act(f, 'fold')
  eq(f.seats[1].stack, 10000 + 400, 'the winner collects what the folders left behind')
  eq(chipsOut(f), chipsIn(f), 'chips are conserved when a player folds after betting')

  // antes
  const ea = createHand({ seats: stacks(6, 10000), button: 0, blinds: { sb: 50, bb: 100, ante: 25 }, anteType: 'each' })
  eq(potTotal(ea), 150 + 6 * 25, 'every player antes')
  const ba = createHand({ seats: stacks(6, 10000), button: 0, blinds: { sb: 50, bb: 100, ante: 25 }, anteType: 'bb' })
  eq(potTotal(ba), 150 + 6 * 25, 'the big-blind ante posts the same total for the table')
  eq(ba.seats[2].stack, 10000 - 100 - 150, 'and it comes out of one stack')

  // immutability: applying an action must not disturb the state it came from
  const base = createHand({ seats: stacks(3, 10000), button: 0, blinds: { sb: 50, bb: 100 } })
  const holeBefore = base.seats[0].hole.slice()
  const after = act(base, 'raise', 500)
  eq(base.toAct, 0, 'the original state still has the original player to act')
  eq(base.seats[0].stack, 10000, 'the original stack is untouched')
  eq(after.seats[0].stack, 9500, 'while the new state reflects the bet')
  ok(base.seats[0].hole.every((c, i) => c === holeBefore[i]), 'hole cards are not aliased between states')
  ok(base.actions.length === 0 && after.actions.length === 1, 'the action log is not shared')

  // preset cards make a drill reproducible
  const fixed = createHand({
    seats: stacks(2, 10000), button: 0, blinds: { sb: 50, bb: 100 },
    hole: { 0: H('As Ks'), 1: H('Qh Qd') }, board: H('2c 7d 9h Ts 3s'),
  })
  eq(cardsStr(fixed.seats[0].hole), 'As Ks', 'preset hole cards are dealt as given')
  let done = act(fixed, 'call'); done = act(done, 'check')
  done = act(done, 'check'); done = act(done, 'check')
  done = act(done, 'check'); done = act(done, 'check')
  done = act(done, 'check'); done = act(done, 'check')
  eq(cardsStr(done.board), '2c 7d 9h Ts 3s', 'the preset board comes out in order')
  eq(done.street, 'complete', 'checking it down reaches the end')
  eq(done.result.winners.join(','), '1', 'queens beat ace-king on a board that misses both')
  eq(chipsOut(done), chipsIn(done), 'chips are conserved through a full hand')

  eq(effectiveStack(createHand({ seats: [{ stack: 300 }, { stack: 9000 }], button: 0, blinds: { sb: 50, bb: 100 } })), 300,
    'the effective stack is the shorter of the two')

  // a split pot divides evenly, and an odd chip goes left of the button
  const split = createHand({
    seats: [{ stack: 1000 }, { stack: 1000 }], button: 0, blinds: { sb: 50, bb: 101 },
    hole: { 0: H('As Kh'), 1: H('Ad Kd') }, board: H('2c 7d 9h Ts 3s'),
  })
  let sd = act(split, 'raise', 1000); sd = act(sd, 'call')
  eq(sd.result.payouts[0] + sd.result.payouts[1], 2000, 'a split pot pays out every chip')
  ok(Math.abs(sd.result.payouts[0] - sd.result.payouts[1]) <= 1, 'a split is even to within the odd chip')
  eq(chipsOut(sd), chipsIn(sd), 'chips are conserved through a split pot')

  // every legal action is genuinely applicable — a random walk must never hit an illegal move
  let walkOk = true, walked = 0
  for (let seed = 1; seed <= 200 && walkOk; seed++) {
    const rng = mulberry32(seed * 7919)
    const n = 2 + Math.floor(rng() * 8)
    let g = createHand({
      seats: Array.from({ length: n }, () => ({ stack: 100 + Math.floor(rng() * 5000) })),
      button: Math.floor(rng() * n), blinds: { sb: 50, bb: 100, ante: rng() < 0.5 ? 25 : 0 },
      anteType: rng() < 0.5 ? 'each' : 'none', seed,
    })
    const startChips = chipsIn(g)
    let guard = 0
    while (g.street !== 'complete' && guard++ < 400) {
      const acts = legalActions(g)
      if (!acts.length) { walkOk = false; break }
      const pick = acts[Math.floor(rng() * acts.length)]
      const amount = pick.min != null ? pick.min + Math.floor(rng() * (pick.max - pick.min + 1)) : undefined
      try { g = act(g, pick.type, amount) } catch (e) { walkOk = false; console.log('  walk failed:', e.message); break }
    }
    if (g.street !== 'complete') { walkOk = false; console.log(`  seed ${seed}: hand never completed`) }
    else if (chipsOut(g) !== startChips) { walkOk = false; console.log(`  seed ${seed}: chips ${chipsOut(g)} ≠ ${startChips}`) }
    walked++
  }
  ok(walkOk, `200 random hands, 2 to 9 handed, all completed legally and conserved chips (${walked} run)`)
}

// ----------------------------------------------------------------- hand
section('hand record')
{
  const h = newHand({ seats: [{ stack: 1000 }, { stack: 1000 }], button: 0, blinds: { sb: 50, bb: 100 } })
  eq(validateHand(h).length, 0, 'a fresh record is valid')
  eq(validateHand({ v: 99 }).length > 0, true, 'an unknown version is reported')

  let g = createHand({
    seats: stacks(3, 1000), button: 0, blinds: { sb: 50, bb: 100 },
    hole: { 0: H('As Ks'), 1: H('Qh Qd'), 2: H('7c 7s') }, board: H('2c 7d 9h Ts 3h'), seed: 5,
  })
  g = act(g, 'raise', 1000); g = act(g, 'call'); g = act(g, 'call')
  const rec = recordFromState(g, { hero: 0 })
  eq(validateHand(rec).length, 0, 'a recorded hand is valid')
  eq(rec.seats[0].stack, 1000, 'stacks are recorded as they were at the start')
  eq(rec.actions.length, 3, 'every action is kept')
  eq(cardsStr(rec.board), '2c 7d 9h Ts 3h', 'the board is kept')
  eq(rec.result.showdown, true, 'the result records that it went to showdown')

  const bad = recordFromState(g, { hero: 0 })
  bad.hole[1] = bad.hole[0].slice()
  ok(validateHand(bad).length > 0, 'a duplicated card is caught by validation')
}

// ------------------------------------------------------------------- ev
section('ev')
{
  // pot odds and the equity that makes a call break even
  near(requiredEquity(100, 200), 1 / 3, 1e-12, 'calling 100 into 200 needs a third of the pot')
  near(potOdds(100, 200).ratio, 2, 1e-12, 'that is 2 to 1')
  near(potOdds(100, 300).required, 0.25, 1e-12, 'calling 100 into 300 needs a quarter')
  throws(() => potOdds(0, 100), 'pot odds on a zero call throws rather than dividing by zero')

  // the definition has to agree with itself: EV is exactly zero at the required equity
  for (const [toCall, pot] of [[100, 200], [50, 325], [1200, 1800], [7, 13]]) {
    near(evCall({ equity: requiredEquity(toCall, pot), pot, toCall }), 0, 1e-9,
      `EV of calling ${toCall} into ${pot} is zero at exactly the required equity`)
  }
  ok(evCall({ equity: 0.5, pot: 200, toCall: 100 }) > 0, 'a call above the required equity gains chips')
  ok(evCall({ equity: 0.2, pot: 200, toCall: 100 }) < 0, 'a call below it loses chips')

  // outs: check the closed form against brute enumeration of every runout, not against memory
  for (const outs of [0, 1, 4, 8, 9, 15, 21]) {
    let hits = 0, total = 0
    for (let i = 0; i < 47; i++) for (let j = i + 1; j < 47; j++) { total++; if (i < outs || j < outs) hits++ }
    near(outsEquity(outs, 2), hits / total, 1e-12, `${outs} outs over two cards matches an exhaustive count of all ${total} runouts`)
  }
  near(outsEquity(9, 1), 9 / 46, 1e-12, 'nine outs with one card to come is nine of the forty-six unseen')
  eq(outsEquity(0, 2), 0, 'no outs is no chance')
  ok(outsEquity(9, 2) > outsEquity(9, 1), 'two cards beat one')
  throws(() => outsEquity(9, 3), 'there is no third card to come')
  throws(() => outsEquity(-1), 'negative outs throws')

  // the shortcut, and what it costs — the numbers the lesson quotes
  near(ruleOf4And2(9, 2), 0.36, 1e-12, 'the rule says 36% on nine outs')
  ok(Math.abs(outsError(9, 2)) < 1.5, 'and it is within a point and a half there')
  ok(outsError(20, 2) > 10, 'but it flatters you badly on twenty outs')
  ok(outsError(9, 1) < 0, 'the x2 half is pessimistic, never optimistic')
  ok([1, 2, 4, 6, 8, 9, 12, 15, 20].every(o => outsError(o, 1) <= 0), 'x2 is pessimistic at every out count')

  // MDF and alpha are complements, whatever the sizing
  for (const [bet, pot] of [[100, 100], [50, 200], [300, 100], [1, 7]]) {
    near(mdf(bet, pot) + alpha(bet, pot), 1, 1e-12, `MDF and alpha sum to one at ${bet} into ${pot}`)
  }
  near(mdf(100, 100), 0.5, 1e-12, 'a pot-sized bet must be defended half the time')
  near(alpha(100, 100), 0.5, 1e-12, 'and a pot-sized bluff must work half the time')
  near(mdf(50, 100), 2 / 3, 1e-12, 'a half-pot bet must be defended two thirds of the time')
  ok(mdf(300, 100) < mdf(50, 100), 'the bigger the bet, the less you must defend')

  // shoving
  eq(evShove({ risk: 1000, pot: 500, foldEquity: 1, equityWhenCalled: 0 }), 500, 'a shove that always works wins the pot')
  near(evShove({ risk: 1000, pot: 500, foldEquity: 0, equityWhenCalled: 0.5 }), 250, 1e-9,
    'a shove that is always called wins half the final pot on average')
  eq(breakEvenFoldEquity({ risk: 1000, pot: 500, equityWhenCalled: 0.6 }), 0,
    'a shove that profits when called needs no fold equity at all')
  // With dead money in the pot there is ALWAYS a fold frequency that breaks even, however bad the hand —
  // which is why stealing works, and why "they might fold" is never on its own a reason to shove.
  {
    const hopeless = breakEvenFoldEquity({ risk: 10000, pot: 100, equityWhenCalled: 0 })
    ok(hopeless > 0.98 && hopeless < 1, 'shoving 10,000 into 100 with no equity still breaks even at ~99% folds')
    near(evShove({ risk: 10000, pot: 100, foldEquity: hopeless, equityWhenCalled: 0 }), 0, 1e-6,
      'and at exactly that frequency it is break-even')
  }
  eq(breakEvenFoldEquity({ risk: 100, pot: 0, equityWhenCalled: 0 }), 1,
    'with no dead money a bluff must work every time, which means it never does')
  ok([0.05, 0.2, 0.45].every(e => {
    const fe = breakEvenFoldEquity({ risk: 900, pot: 300, equityWhenCalled: e })
    return fe >= 0 && fe < 1
  }), 'a break-even fold frequency always exists below one when the pot has dead money')
  {
    const args = { risk: 1000, pot: 500, equityWhenCalled: 0.3 }
    const fe = breakEvenFoldEquity(args)
    ok(fe > 0 && fe < 1, 'a marginal shove needs some fold equity')
    near(evShove({ ...args, foldEquity: fe }), 0, 1e-9, 'and at exactly that fold equity it breaks even')
  }

  // implied odds
  eq(impliedOddsNeeded({ equity: 0.5, pot: 200, toCall: 100 }), 0, 'a call that is already good needs nothing later')
  {
    const need = impliedOddsNeeded({ equity: 0.2, pot: 200, toCall: 100 })
    ok(need > 0, 'a call short of the price needs to win more later')
    near(evCall({ equity: 0.2, pot: 200 + need, toCall: 100 }), 0, 1e-9, 'and that much extra makes it break even')
  }

  // sizing, and stack depth
  const sz = betSizing(100, 100)
  near(sz.fraction, 1, 1e-12, 'a pot-sized bet is one pot')
  near(sz.callerRequires, 1 / 3, 1e-12, 'which lays the caller 2 to 1')
  near(inBB(25000, 200), 125, 1e-12, 'a 25,000 stack at 200 is 125 big blinds')
}

// ------------------------------------------------------------------ icm
section('icm')
{
  const sum = a => a.reduce((x, y) => x + y, 0)
  const share = (stacks, payouts) => {
    const eq = icmEquity(stacks, payouts), tot = sum(stacks), prize = sum(eq)
    return stacks.map((s, i) => ({ chip: s / tot, money: eq[i] / prize }))
  }

  // the prize pool is conserved: every seat's share of it adds back up to all of it
  for (const [stacks, payouts] of [
    [[50, 50], [60, 40]], [[70, 20, 10], [50, 30, 20]],
    [[100, 60, 25, 15], [50, 30, 20, 0]], [Array(9).fill(100), [50, 30, 20]],
  ]) {
    near(sum(icmEquity(stacks, payouts)), sum(payouts.slice(0, Math.min(payouts.length, stacks.length))), 1e-9,
      `the whole prize pool is paid out with ${stacks.length} players`)
  }

  const even = icmEquity([100, 100, 100], [50, 30, 20])
  ok(even.every(v => Math.abs(v - even[0]) < 1e-9), 'equal stacks are worth equal money')
  ok(icmEquity([300, 0, 0], [50, 30, 20])[0] === 50, 'one player holding every chip takes first prize')

  // a busted player has PLACED last, not failed to place — the branch that matters for a call
  eq(icmEquity([100, 0], [60, 40])[1], 40, 'a player with no chips collects the bottom payout, not zero')

  // winner-take-all is the one payout where money tracks chips exactly
  for (const st of [[70, 20, 10], [50, 50], [90, 5, 3, 2]]) {
    const sh = share(st, [100, ...Array(st.length - 1).fill(0)])
    ok(sh.every(x => Math.abs(x.chip - x.money) < 1e-9), `winner-take-all pays exactly chip share (${st.length} players)`)
  }

  // and the central ICM fact: a ladder makes big stacks worth less per chip and short stacks worth more
  {
    const sh = share([70, 20, 10], [50, 30, 20])
    ok(sh[0].money < sh[0].chip, 'the chip leader owns a smaller share of the money than of the chips')
    ok(sh[2].money > sh[2].chip, 'and the short stack owns a larger share of the money than of the chips')
  }
  {
    const eqs = icmEquity([100, 60, 25, 15], [50, 30, 20, 0])
    ok(eqs[0] > eqs[1] && eqs[1] > eqs[2] && eqs[2] > eqs[3], 'more chips is still always worth more money')
  }

  // risk premium: when there is no ladder there is no premium, and when there is, it bites
  near(bubbleFactor({ stacks: [50, 50], payouts: [100, 0], hero: 0, risk: 50 }), 1, 1e-9,
    'winner-take-all heads-up: money and chips agree exactly')
  near(bubbleFactor({ stacks: [50, 50], payouts: [60, 40], hero: 0, risk: 50 }), 1, 1e-9,
    'heads-up for the whole tournament: no ladder left, so still no premium')
  near(bubbleFactor({ stacks: [40, 40, 40, 10], payouts: [100, 0, 0, 0], hero: 0, risk: 40 }), 1, 1e-9,
    'winner-take-all on the bubble: still no premium, because there is nothing to ladder into')

  {
    const bubble = { stacks: [40, 40, 40, 10], payouts: [50, 30, 20, 0], hero: 0, risk: 40 }
    const f = bubbleFactor(bubble)
    ok(f > 1.3, `on a real bubble the premium bites (factor ${f.toFixed(2)})`)
    ok(icmRequiredEquity(bubble) > 0.7, 'which means needing far more than a coin flip to call off')

    const asShort = bubbleFactor({ ...bubble, hero: 3, risk: 10 })
    ok(asShort < f, 'the short stack faces LESS pressure than the big stack — it has less to lose')

    const far = bubbleFactor({ stacks: Array(9).fill(100), payouts: [50, 30, 20], hero: 0, risk: 100 })
    const near_ = bubbleFactor({ stacks: Array(4).fill(100), payouts: [50, 30, 20], hero: 0, risk: 100 })
    ok(near_ > far, `pressure grows as the money gets closer (${far.toFixed(2)} with nine left, ${near_.toFixed(2)} with four)`)
  }

  throws(() => icmEquity([10, 10], []), 'ICM with no payouts throws')
  throws(() => icmEquity([0, 0], [10]), 'ICM with no chips in play throws')
}

// ------------------------------------------------------------- pushfold
section('pushfold')
{
  eq(widthOf(newRange()), 0, 'an empty range is none of the hands')
  near(widthOf(newRange().fill(1)), 1, 1e-12, 'a full range is all of them')
  near(widthOf(parseRange('AA')), 6 / 1326, 1e-9, 'aces alone are six of 1,326 hands')

  // a symmetric equity function must give every hand the same answer against any range
  const flat = () => 0.5
  near(equityVsRange(0, newRange().fill(1), flat), 0.5, 1e-12, 'flat equity against everything is a half')

  // A cheap stand-in for the real matrix: strength against one random hand. Not accurate enough to
  // publish, accurate enough to assert the SHAPE of the solution.
  const st = c => preflopStrength(Math.floor(c / 13), c % 13, 1)
  const equity = (a, b) => Math.max(0.02, Math.min(0.98, 0.5 + (st(a) - st(b)) * 1.25))

  const solved = [2, 5, 10, 15, 20].map(bb => nashPushFold({ effStack: bb, equity }))
  ok(solved.every(r => r.converged), 'the solver converges at every depth tested')
  ok(solved.every(r => r.exploitability <= 5e-3 + 1e-9), 'and lands inside its exploitability bound')

  // the shape that makes it poker rather than arithmetic
  for (let i = 1; i < solved.length; i++) {
    ok(solved[i].pushPct <= solved[i - 1].pushPct + 1e-9,
      `a deeper stack shoves no wider (${solved[i - 1].effStack}bb ${(100 * solved[i - 1].pushPct).toFixed(0)}% -> ${solved[i].effStack}bb ${(100 * solved[i].pushPct).toFixed(0)}%)`)
    ok(solved[i].callPct <= solved[i - 1].callPct + 1e-9, 'and calls no wider either')
  }
  ok(solved[0].pushPct > 0.7, 'at two big blinds almost everything is a shove')
  ok(solved.at(-1).callPct < solved.at(-1).pushPct, 'the caller is always tighter than the shover — they need a hand, not fold equity')

  // an ante makes the pot worth taking, so shoving widens
  const noAnte = nashPushFold({ effStack: 10, equity })
  const withAnte = nashPushFold({ effStack: 10, ante: 0.15, equity })
  ok(withAnte.pushPct > noAnte.pushPct, 'an ante widens the shoving range, because there is more dead money to win')

  throws(() => nashPushFold({ effStack: 0, equity }), 'a zero stack throws')
  throws(() => nashPushFold({ effStack: 10 }), 'no equity function throws')
}

// ---------------------------------------------------------------- report
console.log(`\n${fails ? `${fails} FAILED, ` : ''}${passes} checks passed`)
process.exit(fails ? 1 : 0)
