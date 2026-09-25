// The weak-spot report: where you are actually losing, read off the per-topic accuracy that every drill
// in the app records.
//
// Three kinds of topic key end up in progress, and the whole job of this module is turning them back
// into English:
//
//   basics/the-cards.rank        a lesson drill      `<dir>/<slug>.<kind>`
//   preflop.rfi.BTN              the range trainer
//   pushfold.hu.sb.6-10bb        the push/fold trainer
//
// TWO HONESTIES, both of which cost a line of code and are the reason this is worth having at all:
//
//   1. A topic needs a MINIMUM number of attempts before it can be ranked. Without that the report just
//      says "you are worst at whatever you have drilled least", which is true of everyone always and
//      tells you nothing. Every row therefore shows its sample size next to its percentage.
//   2. When nothing has cleared the bar the report does NOT go quiet — it says what is closest and how
//      many more attempts it needs. "Not enough data" is a dead end; "four more spots and this can be
//      rated" is a next action.

import { progress } from './progress.js'
import { allLessons } from './curriculum.js'

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const POSITIONS = {
  UTG: 'under the gun', UTG1: 'under the gun + 1', MP: 'middle position', MP1: 'middle position + 1',
  LJ: 'the lojack', HJ: 'the hijack', CO: 'the cutoff', BTN: 'the button', SB: 'the small blind', BB: 'the big blind',
}
const KINDS = { rank: 'ranking hands', showdown: 'reading a showdown', legal: 'the rules', action: 'judgement', choice: 'recall' }

/**
 * A dotted topic key, turned into something a person can act on.
 * @returns {{area:string, label:string, href:string}}
 */
export function describeTopic(topic, curriculum) {
  if (topic.startsWith('preflop.rfi.')) {
    const pos = topic.slice('preflop.rfi.'.length)
    return { area: 'Ranges', label: `Opening from ${POSITIONS[pos] || pos}`, href: '#/tools/ranges' }
  }
  if (topic.startsWith('pushfold.hu.')) {
    const [, , seat, band] = topic.split('.')
    const what = seat === 'sb' ? 'Shoving' : 'Calling a shove'
    return { area: 'Push/fold', label: `${what} at ${String(band).replace('bb', '').replace('-', '–')} big blinds`, href: '#/tools/pushfold' }
  }
  // a lesson drill: `<dir>/<slug>.<kind>`
  const cut = topic.lastIndexOf('.')
  const path = cut > 0 ? topic.slice(0, cut) : topic
  const kind = cut > 0 ? topic.slice(cut + 1) : ''
  const [dir, slug] = path.split('/')
  const lesson = curriculum && allLessons(curriculum).find(l => l.dir === dir && l.slug === slug)
  return {
    area: lesson ? lesson.group || lesson.part : 'Lessons',
    label: `${lesson ? lesson.title : path}${KINDS[kind] ? ` — ${KINDS[kind]}` : ''}`,
    href: slug ? `#/lesson/${dir}/${slug}` : '#/',
  }
}

/**
 * The report, as HTML. Returns '' when there is nothing recorded at all — a reader who has not drilled
 * anything should see the course, not an empty widget telling them so.
 */
export function weakSpotReport(curriculum, { min = 8, limit = 4 } = {}) {
  const topics = progress.state.topics || {}
  const all = Object.entries(topics).map(([topic, t]) => ({ topic, seen: t.seen, ok: t.ok, pct: t.ok / t.seen }))
  if (!all.length) return ''

  const rated = all.filter(r => r.seen >= min).sort((a, b) => a.pct - b.pct).slice(0, limit)

  if (!rated.length) {
    // Nothing is rankable yet. Name the closest one and the number of attempts it still needs, which is
    // an instruction rather than an apology.
    const near = all.sort((a, b) => b.seen - a.seen)[0]
    const d = describeTopic(near.topic, curriculum)
    const left = min - near.seen
    return `<section class="card report">
      <span class="eyebrow">Weak spots</span>
      <p class="small">Nothing has enough attempts to rank yet — a topic needs ${min} before a percentage means anything.
      <b>${esc(d.label)}</b> is closest, ${left} more to go.</p>
      <div class="part-foot"><span class="meta">${all.length} topic${all.length === 1 ? '' : 's'} started</span><a class="btn" href="${d.href}">Keep going</a></div>
    </section>`
  }

  const rows = rated.map(r => {
    const d = describeTopic(r.topic, curriculum)
    const pct = Math.round(100 * r.pct)
    return `<li class="wrow">
      <a href="${d.href}">
        <span class="wlabel">${esc(d.label)}</span>
        <span class="warea">${esc(d.area)}</span>
        <span class="wbar"><i style="width:${pct}%"></i></span>
        <span class="wpct">${pct}%</span>
        <span class="wn">${r.ok}/${r.seen}</span>
      </a></li>`
  }).join('')

  return `<section class="card report">
    <span class="eyebrow">Weak spots</span>
    <p class="small">Your lowest accuracy, worst first, across every drill and trainer. Only topics with at least ${min} attempts are ranked — the count beside each one is how much it is based on.</p>
    <ul class="wlist">${rows}</ul>
  </section>`
}
