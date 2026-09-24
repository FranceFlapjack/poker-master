// The Master series: the sibling apps (Chess Master, Go Master, …) and the bubble on the logo that switches
// between them. The registry below is the whole configuration and is IDENTICAL in every app of the series:
// adding a Master means adding one entry here and copying the file to the other apps. Nothing is fetched from
// a sibling site, so the bubble cannot break when the other app is down, offline, or on another local port.
// Links: on GitHub Pages the apps are siblings (`/chess-master/`, `/go-master/`), so `path` is relative to
// this app's folder; on localhost each app has its own port, so `dev` is used instead.
// Progress is not shared: each app keeps its own storage prefix; this only navigates.
// The bubble lists the OTHER apps (never the one you are in) and ends with a silhouette for the next Master, not yet named.

const LOGO_CHESS = `<svg viewBox="-4 -4 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="1" y="1" width="30" height="30"/><rect x="1" y="1" width="15" height="15" fill="currentColor" stroke="none"/><rect x="16" y="16" width="15" height="15" fill="currentColor" stroke="none"/><g transform="translate(23.5 8.5)" fill="currentColor" stroke="none"><circle cx="0" cy="-3.6" r="2.9"/><path d="M-2.1 -1.2 H2.1 L3.6 3.4 H-3.6 Z"/><rect x="-5" y="3.4" width="10" height="2.2" rx="0.6"/></g><g transform="translate(23.5 23.5)" fill="#fff" stroke="none"><circle cx="0" cy="-3.6" r="2.9"/><path d="M-2.1 -1.2 H2.1 L3.6 3.4 H-3.6 Z"/><rect x="-5" y="3.4" width="10" height="2.2" rx="0.6"/></g></svg>`
const LOGO_NEXT = `<svg viewBox="-4 -4 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="2.5 2.5"><rect x="1" y="1" width="30" height="30"/><path d="M16 1V31M1 16H31"/></svg>`
const LOGO_GO = `<svg viewBox="-6 -6 44 44" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M1 1 H31 M1 16 H31 M1 31 H31 M1 1 V31 M16 1 V31 M31 1 V31"/><circle cx="16" cy="16" r="5" fill="currentColor" stroke="none"/><circle cx="31" cy="1" r="5" fill="#fff"/></svg>`
const LOGO_POKER = `<svg viewBox="-4 -4 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="2" y="6" width="16" height="24" transform="rotate(-16 10 18)"/><rect x="13" y="4" width="17" height="25" fill="#fff"/><path d="M21.5 9 L26 16.5 L21.5 24 L17 16.5 Z" fill="currentColor" stroke="none"/></svg>`

export const FAMILY = [
  { id: 'chess', name: 'Chess Master', accent: '#0f4c3a', path: '../chess-master/', dev: 'http://localhost:8000/', logo: LOGO_CHESS },
  { id: 'go',    name: 'Go Master',    accent: '#6f0b10', path: '../go-master/',    dev: 'http://localhost:8001/', logo: LOGO_GO },
  { id: 'poker', name: 'Poker Master', accent: '#0f2d57', path: '../poker-master/', dev: 'http://localhost:8002/', logo: LOGO_POKER },
]

const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
export const hrefOf = app => (isLocal() ? app.dev : app.path)

/** Turn every `.brand` of the page into a switcher: the logo opens the bubble (hover, click, Enter); the name stays the link home. */
export function mountFamily(selfId) {
  document.querySelectorAll('.brand').forEach(brand => mountOne(brand, selfId))
}

function mountOne(brand, selfId) {
  const logo = brand.querySelector('.logo-btn')
  if (!logo) return
  const bubble = document.createElement('div')
  bubble.className = 'family'
  bubble.setAttribute('role', 'menu')
  bubble.setAttribute('aria-label', 'The Master series')
  bubble.hidden = true
  bubble.innerHTML = `<div class="family-title">The Master series</div>` + FAMILY.filter(app => app.id !== selfId).map(app =>
    `<a class="family-item" role="menuitem" href="${hrefOf(app)}" style="--app-accent:${app.accent}"><span class="family-tile">${app.logo}</span><span class="family-name">${app.name}</span></a>`
  ).join('') + `<div class="family-item next" role="menuitem" aria-disabled="true"><span class="family-tile">${LOGO_NEXT}</span><span class="family-name">Coming soon</span></div>`
  const wrap = document.createElement('span'); wrap.className = 'logo-wrap'
  logo.replaceWith(wrap); wrap.append(logo, bubble)
  logo.setAttribute('aria-haspopup', 'menu'); logo.setAttribute('aria-expanded', 'false')

  let openTimer = 0, closeTimer = 0, isOpen = false
  const items = () => [...bubble.querySelectorAll('.family-item:not(.next)')]
  function open() {
    clearTimeout(closeTimer); if (isOpen) return
    isOpen = true; bubble.hidden = false; logo.setAttribute('aria-expanded', 'true')
    setTimeout(() => bubble.classList.add('open'), 16)   // a timer, not rAF, so it opens in hidden tabs too (see CLAUDE.md)
    document.addEventListener('pointerdown', onOutside, true)
    document.addEventListener('keydown', onKey)
  }
  function close({ focus = false } = {}) {
    clearTimeout(openTimer); if (!isOpen) return
    isOpen = false; bubble.classList.remove('open'); logo.setAttribute('aria-expanded', 'false')
    setTimeout(() => { if (!isOpen) bubble.hidden = true }, animMs())
    document.removeEventListener('pointerdown', onOutside, true)
    document.removeEventListener('keydown', onKey)
    if (focus) logo.focus()
  }
  function onOutside(e) { if (!brand.contains(e.target)) close() }
  function onKey(e) {
    const list = items(), i = list.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); close({ focus: true }) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0]).focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (list[i - 1] || list[list.length - 1]).focus() }
  }
  // hover: a short delay in, a grace period out so the pointer can travel from the logo down into the bubble
  const hoverIn = () => { clearTimeout(closeTimer); openTimer = setTimeout(open, 150) }
  const hoverOut = () => { clearTimeout(openTimer); closeTimer = setTimeout(close, 300) }
  for (const el of [logo, bubble]) {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hoverIn() })
    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hoverOut() })
  }
  // click / tap / Enter toggles (phones have no hover)
  logo.addEventListener('click', () => { clearTimeout(openTimer); isOpen ? close() : (open(), items()[0]?.focus({ preventScroll: true })) })
}

const animMs = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bubble-anim')) || 0
