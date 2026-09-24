// 12-week activity grid: one cell per day, shaded by the number of hands played that day.
import { progress, dayKey, addDays } from './progress.js'

const WEEKS = 12
const level = n => n <= 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 40 ? 3 : 4
const fmt = d => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const plural = n => `${n} hand${n === 1 ? '' : 's'}`

export function mountActivity(el) {
  const render = () => {
    const now = new Date(); now.setHours(12, 0, 0, 0)
    // grid ends on today's column; columns are weeks, rows Mon..Sun
    const dow = (now.getDay() + 6) % 7 // Mon=0
    const start = addDays(now, -(WEEKS * 7 - 1) - dow)
    const cells = []
    let d = start
    const total = WEEKS * 7 + dow
    for (let i = 0; i < total; i++) {
      const k = dayKey(d), n = progress.handsOn(k)
      const isFuture = d > now
      cells.push(`<i class="l${isFuture ? 0 : level(n)}${k === dayKey(now) ? ' today' : ''}" title="${fmt(d)} · ${plural(n)}"${isFuture ? ' style="visibility:hidden"' : ''}></i>`)
      d = addDays(d, 1)
    }
    const todayN = progress.handsOn(dayKey(now))
    el.innerHTML = `
      <div class="activity">
        <div class="activity-grid" role="img" aria-label="Hands played over the last ${WEEKS} weeks">${cells.join('')}</div>
        <div class="activity-stats">
          <span><b>${todayN}</b> today</span>
          <span><b>${progress.totalHands}</b> hands</span>
        </div>
      </div>`
  }
  render()
  return progress.onChange(render)
}
