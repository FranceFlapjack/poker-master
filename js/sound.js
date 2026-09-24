// Synthesised board sounds via the Web Audio API — no files, zero latency.
// A stone on a wooden board is a short, bright clack; a capture is a small rattle of stones.
// Keys are prefixed `go-master.` (Chess Master shares the github.io origin).

const KEY = 'go-master.muted'

class SoundKit {
  constructor() {
    this.ctx = null
    this.noise = null
    this.muted = safeGet(KEY) === '1'
    this.listeners = new Set()
  }
  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.ctx = new AC()
      const len = Math.floor(this.ctx.sampleRate * 0.06)
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }
  // call once on first user gesture so iOS/Safari unlocks audio
  unlock() { try { this._ctx() } catch (_) {} }
  toggle() {
    this.muted = !this.muted
    safeSet(KEY, this.muted ? '1' : '0')
    this.listeners.forEach(fn => fn(this.muted))
    if (!this.muted) this.play('stone')
    return this.muted
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  play(name) {
    if (this.muted) return
    try {
      const ctx = this._ctx()
      const t = ctx.currentTime + 0.005
      ;(RECIPES[name] || RECIPES.stone)(ctx, t, this.noise)
    } catch (_) { /* audio not available */ }
  }
}

function safeGet(k) { try { return localStorage.getItem(k) } catch (_) { return null } }
function safeSet(k, v) { try { localStorage.setItem(k, v) } catch (_) {} }

// --- primitives ---
/** a stone landing: a fast pitch drop plus a burst of filtered noise (the slate/shell click) */
function clack(ctx, t, noise, { freq = 420, dur = 0.07, gain = 0.5, click = 0.5 } = {}) {
  const out = ctx.createGain()
  out.gain.setValueAtTime(gain, t)
  out.gain.exponentialRampToValueAtTime(0.001, t + dur)
  out.connect(ctx.destination)
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 2.2, t)
  osc.frequency.exponentialRampToValueAtTime(freq, t + dur * 0.5)
  osc.connect(out); osc.start(t); osc.stop(t + dur)
  if (click > 0 && noise) {
    const n = ctx.createBufferSource(); n.buffer = noise
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.8
    const g = ctx.createGain(); g.gain.setValueAtTime(click * gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
    n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(t); n.stop(t + 0.04)
  }
}
function ping(ctx, t, { freq = 880, to = null, dur = 0.18, gain = 0.18, type = 'sine' } = {}) {
  const out = ctx.createGain()
  out.gain.setValueAtTime(0.0001, t)
  out.gain.linearRampToValueAtTime(gain, t + 0.008)
  out.gain.exponentialRampToValueAtTime(0.001, t + dur)
  out.connect(ctx.destination)
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  osc.connect(out); osc.start(t); osc.stop(t + dur)
}

const RECIPES = {
  stone:   (c, t, n) => clack(c, t, n, { freq: 420 }),
  capture: (c, t, n) => { clack(c, t, n, { freq: 420 }); clack(c, t + 0.09, n, { freq: 560, gain: 0.3, dur: 0.05 }); clack(c, t + 0.15, n, { freq: 500, gain: 0.22, dur: 0.05 }); clack(c, t + 0.2, n, { freq: 620, gain: 0.16, dur: 0.05 }) },
  pass:    (c, t) => ping(c, t, { freq: 520, dur: 0.12, gain: 0.06 }),
  illegal: (c, t) => ping(c, t, { freq: 120, to: 95, dur: 0.14, gain: 0.08, type: 'square' }),
  success: (c, t) => { ping(c, t, { freq: 660, dur: 0.22, gain: 0.12 }); ping(c, t + 0.11, { freq: 830, dur: 0.3, gain: 0.12 }); ping(c, t + 0.22, { freq: 990, dur: 0.4, gain: 0.1 }) },
  fail:    (c, t) => ping(c, t, { freq: 420, to: 300, dur: 0.28, gain: 0.1, type: 'triangle' }),
  tick:    (c, t) => ping(c, t, { freq: 1500, dur: 0.05, gain: 0.05 }),
}

export const sound = new SoundKit()
