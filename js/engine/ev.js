// Pot odds, required equity, outs, MDF, alpha, and the chip EV of a call or a shove.
//
// The arithmetic behind every close decision. All of it is exact and none of it is a heuristic — the one
// shortcut here, the rule of 4 and 2, is included only so the app can show what it costs you.
//
// Conventions, because half the confusion about pot odds is people meaning different things:
//   `pot`    chips in the middle INCLUDING the bet you are facing
//   `toCall` what it costs you to continue
//   equity   your share of the pot at showdown, counting a split as half — the same number equity.js
//            returns, so the two modules compose
//
// Pure — no DOM — so the checkers and any trainer can import it.

/** Binomial coefficient, computed to avoid overflow on the sizes we use. */
const C = (n, k) => (k > n || k < 0 ? 0 : Array.from({ length: k }, (_, i) => (n - i) / (k - i)).reduce((a, b) => a * b, 1))

/**
 * The price you are being offered.
 * `ratio` is the "3 to 1" a player says out loud; `required` is the equity that makes calling break even.
 */
export function potOdds(toCall, pot) {
  if (!(toCall > 0)) throw new Error('potOdds needs a positive toCall')
  return { ratio: pot / toCall, required: toCall / (pot + toCall) }
}

/** Break-even equity for a call. Below this, calling loses chips however much you like your hand. */
export const requiredEquity = (toCall, pot) => toCall / (pot + toCall)

/**
 * Chip EV of calling. Positive means calling gains chips on average.
 * You end up contesting `pot + toCall` and you paid `toCall` to do it.
 */
export const evCall = ({ equity, pot, toCall }) => equity * (pot + toCall) - toCall

/**
 * Exact chance of hitting at least one of `outs`.
 *
 * Assumes you can see your two cards and the board, so 47 cards are unseen on the flop and 46 on the
 * turn. That is the standard convention and it is deliberately NOT "cards the opponent might hold" —
 * their hand is unknown to you, so from your seat those cards are still unseen.
 */
export function outsEquity(outs, cardsToCome = 2) {
  if (outs < 0) throw new Error('outs cannot be negative')
  if (cardsToCome === 1) return Math.min(1, outs / 46)
  if (cardsToCome !== 2) throw new Error('cardsToCome must be 1 or 2')
  return Math.min(1, 1 - C(47 - outs, 2) / C(47, 2))
}

/** The shortcut: outs × 4 with two cards to come, × 2 with one. See `outsError` for what it costs. */
export const ruleOf4And2 = (outs, cardsToCome = 2) =>
  Math.min(1, outs * (cardsToCome === 1 ? 2 : 4) / 100)

/** How wrong the shortcut is here, in percentage points. Positive means it flatters you. */
export const outsError = (outs, cardsToCome = 2) =>
  (ruleOf4And2(outs, cardsToCome) - outsEquity(outs, cardsToCome)) * 100

/**
 * Minimum defence frequency: how often you must continue against a bet of `bet` into `pot` so that
 * betting any two cards as a bluff does not print money.
 *
 * This is a property of the BET SIZE, not of your hand. It is the answer to "am I folding too much",
 * never to "should I call with this".
 */
export const mdf = (bet, pot) => pot / (pot + bet)

/** How often a bluff of this size must work to break even. The complement of MDF. */
export const alpha = (bet, pot) => bet / (pot + bet)

/**
 * Chip EV of shoving `risk` into `pot` against one opponent who can cover you.
 *
 * Two ways it goes: they fold and you take the pot, or they call and you contest `pot + 2 × risk`
 * having invested `risk`.
 */
export function evShove({ risk, pot, foldEquity, equityWhenCalled }) {
  if (foldEquity < 0 || foldEquity > 1) throw new Error('foldEquity must be 0..1')
  const called = equityWhenCalled * (pot + 2 * risk) - risk
  return foldEquity * pot + (1 - foldEquity) * called
}

/**
 * How often they must fold for a shove to break even, given your equity when called.
 *
 * Returns 0 when the shove already profits being called. Otherwise a number in (0, 1) — and note that
 * with ANY dead money in the pot such a number always exists, however bad your hand. Shoving 10,000
 * into 100 with no equity breaks even if they fold 99% of the time.
 *
 * That is the whole basis of stealing, and also the trap in it: "they might fold" never justifies a
 * shove. Only "they fold THIS often" does, and this is the number to beat.
 *
 * With no dead money there is nothing to win by making them fold, so the answer is 1: it has to work
 * every time, which means it never does.
 */
export function breakEvenFoldEquity({ risk, pot, equityWhenCalled }) {
  const called = equityWhenCalled * (pot + 2 * risk) - risk
  if (called >= 0) return 0
  if (pot <= 0) return 1
  return called / (called - pot)
}

/**
 * Implied odds: how much more you must expect to win on later streets for a call to break even at your
 * actual equity. Returns 0 when the call is already good on pot odds alone.
 */
export function impliedOddsNeeded({ equity, pot, toCall }) {
  const ev = evCall({ equity, pot, toCall })
  return ev >= 0 ? 0 : -ev / equity
}

/** Stack depth in big blinds — the number that actually governs a tournament decision. */
export const inBB = (stack, bb) => stack / bb

/** A bet as a fraction of the pot, and the equity it lays the caller. */
export function betSizing(bet, pot) {
  return { fraction: bet / pot, callerRequires: requiredEquity(bet, pot + bet), mdf: mdf(bet, pot), alpha: alpha(bet, pot) }
}
