// ICM — what your chips are actually worth in money.
//
// The Malmuth–Harville model: the chance you finish first is your share of the chips, and having
// finished somebody first, the race for second runs the same way among what is left. It is a model, not
// a law — it takes no account of skill, position, or the blinds going up — but it is the standard one,
// and the thing it gets right is the thing that matters: chips you win are worth less than chips you
// lose, and the gap widens as the money gets closer.
//
// Complexity note. Naive enumeration of finishing orders is O(n!), which is why ICM is usually described
// as impractical past a handful of players. It is not, because you only ever have to enumerate as deep
// as there are PRIZES: a nine-handed table paying three is 9 x 8 x 7 = 504 orders, not 362,880. Everyone
// outside the money contributes zero and never needs enumerating.

/**
 * Each player's share of the prize pool, in the same units as `payouts`.
 *
 * @param {number[]} stacks   chips, one per player; zeros are allowed and get nothing
 * @param {number[]} payouts  prize for 1st, 2nd, … Shorter than `stacks` means the rest min-cash nothing.
 */
export function icmEquity(stacks, payouts) {
  const n = stacks.length
  if (!n) return []
  if (!payouts.length) throw new Error('icmEquity needs at least one payout')
  const total = stacks.reduce((a, b) => a + b, 0)
  if (!(total > 0)) throw new Error('icmEquity needs chips in play')

  // A player with no chips has BUSTED — they did not fail to place, they placed last. Treating them as
  // worth nothing is wrong in exactly the spot that matters most: the losing branch of a call, where the
  // whole question is what busting actually costs you.
  const live = [], out = []
  stacks.forEach((s, i) => (s > 0 ? live : out).push(i))
  const eq = new Array(n).fill(0)
  out.forEach((seat, k) => { eq[seat] = payouts[n - out.length + k] || 0 })
  if (!live.length) return eq

  const places = Math.min(payouts.length, live.length)
  const used = new Array(n).fill(false)

  const walk = (place, left, prob) => {
    if (place >= places || prob === 0) return
    for (const i of live) {
      if (used[i]) continue
      const p = prob * (stacks[i] / left)
      eq[i] += p * payouts[place]
      if (place + 1 < places) {
        used[i] = true
        walk(place + 1, left - stacks[i], p)
        used[i] = false
      }
    }
  }
  walk(0, total, 1)
  return eq
}

/**
 * The equity you must have for a CALL to break even in money rather than in chips.
 *
 * `risk` is what you put at stake. Win and you gain it from the opponent; lose and you are down it. The
 * threshold this returns is almost always higher than the pot odds say, and the difference is the whole
 * of bubble play.
 */
export function icmRequiredEquity({ stacks, payouts, hero, risk, pot = 0 }) {
  const now = icmEquity(stacks, payouts)[hero]

  const win = stacks.slice()
  const lose = stacks.slice()
  // winning takes `risk` from the opponents who paid it, plus whatever dead money is already out there
  win[hero] = stacks[hero] + risk + pot
  lose[hero] = Math.max(0, stacks[hero] - risk)

  // the chips have to come from and go to somewhere, or the model is being handed an impossible table
  spread(win, hero, -(risk + pot))
  spread(lose, hero, risk)

  const up = icmEquity(win, payouts)[hero]
  const down = icmEquity(lose, payouts)[hero]
  if (up === down) return 1
  return (now - down) / (up - down)
}

/** Move `delta` chips across everyone except `hero`, in proportion to their stacks. */
function spread(stacks, hero, delta) {
  const others = stacks.reduce((a, s, i) => a + (i === hero ? 0 : s), 0)
  if (others <= 0) return
  for (let i = 0; i < stacks.length; i++) {
    if (i === hero) continue
    stacks[i] = Math.max(0, stacks[i] + delta * (stacks[i] / others))
  }
}

/**
 * How much tighter ICM makes you than chip counting alone, as a ratio.
 *
 * 1.0 means money and chips agree — a flat payout, or a table so far from the money that finishing
 * position hardly matters. Above 1 means you need that much more equity than the pot odds suggest. This
 * is the number people mean by "bubble factor".
 */
export function bubbleFactor({ stacks, payouts, hero, risk, pot = 0 }) {
  const chipEV = risk / (risk + risk + pot)              // break-even equity counting chips only
  const icm = icmRequiredEquity({ stacks, payouts, hero, risk, pot })
  return icm / chipEV
}

/** Convenience: every player's equity alongside their stack, sorted by chips. */
export function icmTable(stacks, payouts, names = []) {
  const eq = icmEquity(stacks, payouts)
  const total = stacks.reduce((a, b) => a + b, 0)
  return stacks.map((s, i) => ({
    seat: i,
    name: names[i] || `Seat ${i + 1}`,
    stack: s,
    chipShare: total ? s / total : 0,
    equity: eq[i],
  })).sort((a, b) => b.stack - a.stack)
}
