import type { MusicTrack } from './types'

// Procedural ambient music engine. Renders a slow chord progression with a
// twinkling melody on top — Brian-Eno-ish pad music designed for deep work.
// Each track has its own scale + tempo + timbre so they feel distinct.

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let active: { stop: () => void } | null = null
let activeTrack: MusicTrack | null = null
let volume = 0.35

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    bus = ctx.createGain()
    bus.gain.value = volume
    bus.connect(ctx.destination)
  }
  return ctx
}

interface TrackConfig {
  bpm: number
  rootHz: number
  chords: number[][]
  scale: number[]
  padType: OscillatorType
  leadType: OscillatorType
  brightness: number
}

const TRACKS: Record<MusicTrack, TrackConfig> = {
  // FocusTraveller / Landscape — open major-key vista, slow, airy
  landscape: {
    bpm: 60,
    rootHz: 220,
    chords: [
      [0, 4, 7, 11],
      [9, 12, 16, 19],
      [5, 9, 12, 16],
      [7, 11, 14, 17],
    ],
    scale: [0, 2, 4, 7, 9, 11, 12, 14],
    padType: 'sine',
    leadType: 'triangle',
    brightness: 2400,
  },
  // Wanderer — minor pensive, slightly faster, woody
  wanderer: {
    bpm: 72,
    rootHz: 196,
    chords: [
      [0, 3, 7, 10],
      [5, 8, 12, 15],
      [-2, 2, 5, 8],
      [3, 7, 10, 14],
    ],
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    padType: 'triangle',
    leadType: 'sine',
    brightness: 1800,
  },
  // Embers — warm slow, low drones, sparse
  embers: {
    bpm: 48,
    rootHz: 165,
    chords: [
      [0, 7, 12, 19],
      [-5, 2, 7, 14],
      [3, 10, 15, 22],
      [-2, 5, 12, 17],
    ],
    scale: [0, 3, 5, 7, 10, 12, 15],
    padType: 'sawtooth',
    leadType: 'sine',
    brightness: 1300,
  },
}

function midiToHz(root: number, semis: number): number {
  return root * Math.pow(2, semis / 12)
}

function startTrack(track: MusicTrack): { stop: () => void } {
  const c = getCtx()
  const cfg = TRACKS[track]
  const beatSec = 60 / cfg.bpm
  const padBus = c.createGain()
  padBus.gain.value = 0.7
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cfg.brightness
  lp.Q.value = 0.4
  padBus.connect(lp).connect(bus!)

  const leadBus = c.createGain()
  leadBus.gain.value = 0.0
  const leadHp = c.createBiquadFilter()
  leadHp.type = 'highpass'
  leadHp.frequency.value = 400
  leadBus.connect(leadHp).connect(bus!)
  // Slow swell on the lead so it fades in after a bar
  leadBus.gain.linearRampToValueAtTime(0.35, c.currentTime + beatSec * 8)

  const oscs: { stop(when: number): void; disconnect(): void }[] = []
  let chordIdx = 0
  let nextBeat = c.currentTime + 0.05
  let melodyStep = 0

  function scheduleChord(when: number, durSec: number) {
    const semis = cfg.chords[chordIdx % cfg.chords.length]
    semis.forEach((s, i) => {
      const o = c.createOscillator()
      o.type = cfg.padType
      o.frequency.value = midiToHz(cfg.rootHz, s)
      const g = c.createGain()
      g.gain.value = 0
      g.gain.setValueAtTime(0, when)
      g.gain.linearRampToValueAtTime(0.18 / (i + 1), when + durSec * 0.25)
      g.gain.linearRampToValueAtTime(0.0001, when + durSec * 0.95)
      // Slow detune wobble for life
      const lfo = c.createOscillator()
      const lfoG = c.createGain()
      lfo.frequency.value = 0.08 + i * 0.04
      lfoG.gain.value = 1.5
      lfo.connect(lfoG).connect(o.frequency)
      lfo.start(when)
      lfo.stop(when + durSec + 0.1)
      o.connect(g).connect(padBus)
      o.start(when)
      o.stop(when + durSec + 0.1)
      oscs.push(o, lfo)
    })
    chordIdx++
  }

  function scheduleNote(when: number) {
    const chord = cfg.chords[(chordIdx - 1 + cfg.chords.length) % cfg.chords.length]
    const root = chord[0]
    // Pick a scale degree biased toward the chord tones
    const candidates = [...cfg.scale, ...chord.map(s => s - root)]
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    const semis = root + pick + 12
    const o = c.createOscillator()
    o.type = cfg.leadType
    o.frequency.value = midiToHz(cfg.rootHz, semis)
    const g = c.createGain()
    const dur = beatSec * (Math.random() < 0.3 ? 4 : 2)
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(0.22, when + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    o.connect(g).connect(leadBus)
    o.start(when)
    o.stop(when + dur + 0.05)
    oscs.push(o)
  }

  let stopped = false
  const tick = () => {
    if (stopped) return
    const horizon = c.currentTime + 4
    while (nextBeat < horizon) {
      // Chord every 8 beats
      if (melodyStep % 8 === 0) {
        scheduleChord(nextBeat, beatSec * 8)
      }
      // Sparse melody — note on roughly every 2 beats with skip probability
      if (melodyStep % 2 === 0 && Math.random() < 0.55) {
        scheduleNote(nextBeat)
      }
      nextBeat += beatSec
      melodyStep++
    }
  }
  tick()
  const interval = window.setInterval(tick, 1500)

  return {
    stop: () => {
      stopped = true
      window.clearInterval(interval)
      const fadeEnd = c.currentTime + 0.4
      try {
        padBus.gain.cancelScheduledValues(c.currentTime)
        padBus.gain.linearRampToValueAtTime(0, fadeEnd)
        leadBus.gain.cancelScheduledValues(c.currentTime)
        leadBus.gain.linearRampToValueAtTime(0, fadeEnd)
      } catch {
        // ignore
      }
      window.setTimeout(() => {
        oscs.forEach(o => {
          try { o.stop(0) } catch {
            // already stopped
          }
        })
      }, 500)
    },
  }
}

export function setMusic(track: MusicTrack | null) {
  if (track === activeTrack) return
  if (active) {
    active.stop()
    active = null
  }
  activeTrack = track
  if (!track) return
  const c = getCtx()
  if (c.state === 'suspended') void c.resume()
  active = startTrack(track)
}

export function setMusicVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  if (bus) bus.gain.value = volume
}

export function ensureMusicResumed() {
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export const MUSIC_OPTIONS: { value: MusicTrack; label: string; subtitle: string }[] = [
  { value: 'landscape', label: 'FocusTraveller', subtitle: 'Landscape' },
  { value: 'wanderer', label: 'FocusTraveller', subtitle: 'Wanderer' },
  { value: 'embers', label: 'FocusTraveller', subtitle: 'Embers' },
]
