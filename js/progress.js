// Local progress store: lessons done, drills solved, hands played per day (the activity grid), points per day.
// Everything lives in one localStorage key. The Master apps share the github.io origin, so keys are prefixed
// `poker-master.` and nothing is ever adopted from another prefix.
//
// Two of the owner's standing rules are baked in here:
//   - the activity grid shades by VOLUME (hands played), not points, and there is no streak;
//   - no progress export/import (removed from Chess Master 2026-09-13), so this exposes no such methods.
//
// Drills additionally record accuracy per TOPIC, which is what the weak-spot report reads
// ("42% on BB defense vs BTN at 25bb"). A topic is a dotted key, e.g. `preflop.bbdef.btn.25bb`.

const KEY = 'poker-master.progress.v1'
export const POINTS = { lesson: 10, drillFirst: 5, drillLater: 2, hand: 3, win: 10 }

const empty = () => ({ v: 1, lessons: {}, drills: {}, topics: {}, plays: [], days: {}, hands: {}, total: 0, beginner: true, lastLesson: null })

class Progress {
  constructor() {
    this.state = load()
    this.listeners = new Set()
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.state)) } catch (_) {} ; this.listeners.forEach(fn => fn(this.state)) }

  // --- points & days ---
  addPoints(n, day = today()) {
    this.state.days[day] = (this.state.days[day] || 0) + n
    this.state.total += n
    this._save()
  }
  pointsOn(day) { return this.state.days[day] || 0 }

  // --- hands: every hand the reader plays out, counted per day (what the grid shows) ---
  recordHand(day = today()) {
    if (!this.state.hands) this.state.hands = {}
    this.state.hands[day] = (this.state.hands[day] || 0) + 1
    this._save()
  }
  handsOn(day) { return (this.state.hands && this.state.hands[day]) || 0 }
  get totalHands() { return Object.values(this.state.hands || {}).reduce((s, n) => s + n, 0) }

  // --- lessons ---
  isLessonDone(id) { return !!this.state.lessons[id] }
  completeLesson(id) {
    if (this.state.lessons[id]) return false
    this.state.lessons[id] = { done: Date.now() }
    this.addPoints(POINTS.lesson)
    return true
  }
  setLastLesson(id) { if (this.state.lastLesson !== id) { this.state.lastLesson = id; this._save() } }

  // --- drills ---
  // `id` is unique per drill (`<lessonId>#<n>` in lessons, `<trainer>#<spotHash>` in trainers).
  // `topic` is optional but is what makes the weak-spot report possible — always pass it from a trainer.
  isDrillDone(id) { return !!this.state.drills[id] }
  drillsFor(lessonId) { return Object.keys(this.state.drills).filter(k => k.startsWith(lessonId + '#')).length }
  recordDrill(id, { firstAttempt = true, topic = null, correct = true } = {}) {
    if (topic) this._tally(topic, correct)
    if (this.state.drills[id]) return false
    if (!correct) return false
    this.state.drills[id] = { solved: Date.now(), first: !!firstAttempt }
    this.addPoints(firstAttempt ? POINTS.drillFirst : POINTS.drillLater)
    return true
  }

  // Every attempt counts toward accuracy, including repeats — a trainer you keep failing should keep
  // showing as weak even after the first correct answer.
  _tally(topic, correct) {
    if (!this.state.topics) this.state.topics = {}
    const t = this.state.topics[topic] || (this.state.topics[topic] = { seen: 0, ok: 0 })
    t.seen++
    if (correct) t.ok++
    this._save()
  }
  accuracy(topic) {
    const t = this.state.topics && this.state.topics[topic]
    return t && t.seen ? t.ok / t.seen : null
  }
  /** Weakest topics first. `min` guards against a 0/1 topic outranking a genuine 40%-of-50 leak. */
  weakSpots({ min = 8, limit = 5 } = {}) {
    return Object.entries(this.state.topics || {})
      .filter(([, t]) => t.seen >= min)
      .map(([topic, t]) => ({ topic, seen: t.seen, ok: t.ok, pct: t.ok / t.seen }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, limit)
  }

  recordPlay({ level, result }) {
    this.state.plays.push({ t: Date.now(), level, result })
    this.addPoints(POINTS[result] || 0)
  }

  // --- settings ---
  // Beginner mode is the app's two-audience switch: it controls jargon, density, and whether raw EV shows.
  // It defaults ON, because the first reader of this app is someone learning the game.
  get beginner() { return !!this.state.beginner }
  set beginner(v) { this.state.beginner = !!v; this._save() }

  reset() { this.state = empty(); this._save() }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return Object.assign(empty(), JSON.parse(raw))
  } catch (_) {}
  return empty()
}
export function dayKey(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${dd}` }
export function today() { return dayKey(new Date()) }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export const progress = new Progress()
