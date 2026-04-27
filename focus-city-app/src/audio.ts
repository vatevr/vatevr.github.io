import { Howl } from 'howler'
import type { AmbientTrack } from './types'

// Hybrid ambient engine.
// 1. If a real sample exists at `<base>/ambient/<track>.mp3`, play that with
//    Howler (gapless looping). This gives true Noisli-quality audio.
// 2. If the sample 404s or fails to decode, fall back to procedural Web
//    Audio synthesis — lower quality but works with zero dependencies.
//
// To upgrade any track: drop a CC0/licensed audio loop at
//   focus-city-app/public/ambient/<track>.mp3
// and rebuild. Filename must match the AmbientTrack key.

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let currentSampleHowl: Howl | null = null
let currentProc: { stop: () => void } | null = null
let currentTrack: AmbientTrack = 'none'
let currentVolume = 0.4

const SAMPLE_BASE = `${import.meta.env.BASE_URL}ambient/`

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    masterGain = ctx.createGain()
    masterGain.gain.value = currentVolume
    masterGain.connect(ctx.destination)
  }
  return ctx
}

function makeNoiseBuffer(seconds: number, kind: 'white' | 'pink' | 'brown'): AudioBuffer {
  const c = getCtx()
  const length = c.sampleRate * seconds
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  if (kind === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  } else if (kind === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  } else {
    let last = 0
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  }
  return buffer
}

interface ProcHandle { stop: () => void }

function procRain(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(4, 'pink')
  const src = c.createBufferSource()
  src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200
  const g = c.createGain(); g.gain.value = 0.55
  src.connect(hp).connect(lp).connect(g).connect(masterGain!)
  src.start()
  const t = window.setInterval(() => {
    const o = c.createOscillator(), og = c.createGain()
    o.frequency.value = 800 + Math.random() * 1400; o.type = 'sine'
    og.gain.setValueAtTime(0.0001, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.005)
    og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06)
    o.connect(og).connect(masterGain!); o.start(); o.stop(c.currentTime + 0.07)
  }, 220)
  return { stop: () => { window.clearInterval(t); try { src.stop() } catch {} } }
}

function procThunder(): ProcHandle {
  const rain = procRain()
  const c = getCtx()
  const t = window.setInterval(() => {
    if (Math.random() > 0.18) return
    const buffer = makeNoiseBuffer(2.5, 'brown')
    const src = c.createBufferSource(); src.buffer = buffer
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 2.4)
    src.connect(lp).connect(g).connect(masterGain!); src.start(); src.stop(c.currentTime + 2.5)
  }, 4000)
  return { stop: () => { rain.stop(); window.clearInterval(t) } }
}

function procWind(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(6, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600
  const g = c.createGain(); g.gain.value = 0.4
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  const lfo = c.createOscillator(), lfoG = c.createGain()
  lfo.frequency.value = 0.08; lfoG.gain.value = 400
  lfo.connect(lfoG).connect(lp.frequency); lfo.start()
  return { stop: () => { try { src.stop() } catch {}; try { lfo.stop() } catch {} } }
}

function procForest(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(5, 'pink')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500
  const g = c.createGain(); g.gain.value = 0.25
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  const t = window.setInterval(() => {
    if (Math.random() > 0.35) return
    const o = c.createOscillator(), og = c.createGain()
    o.type = 'sine'
    const base = 1800 + Math.random() * 1600
    o.frequency.setValueAtTime(base, c.currentTime)
    o.frequency.linearRampToValueAtTime(base * 1.4, c.currentTime + 0.12)
    og.gain.setValueAtTime(0.0001, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.02)
    og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18)
    o.connect(og).connect(masterGain!); o.start(); o.stop(c.currentTime + 0.2)
  }, 1400)
  return { stop: () => { try { src.stop() } catch {}; window.clearInterval(t) } }
}

function procFireplace(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(4, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800
  const g = c.createGain(); g.gain.value = 0.45
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  const t = window.setInterval(() => {
    if (Math.random() > 0.4) return
    const buf = makeNoiseBuffer(0.05, 'white')
    const s = c.createBufferSource(); s.buffer = buf
    const cg = c.createGain()
    cg.gain.setValueAtTime(0.0001, c.currentTime)
    cg.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.005)
    cg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05)
    s.connect(cg).connect(masterGain!); s.start(); s.stop(c.currentTime + 0.06)
  }, 200)
  return { stop: () => { try { src.stop() } catch {}; window.clearInterval(t) } }
}

function procRails(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(6, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220
  const g = c.createGain(); g.gain.value = 0.45
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  let i = 0
  const t = window.setInterval(() => {
    const o = c.createOscillator(), og = c.createGain()
    o.type = 'square'; o.frequency.value = i % 2 === 0 ? 90 : 70
    og.gain.setValueAtTime(0.0001, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.07, c.currentTime + 0.005)
    og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.05)
    const fil = c.createBiquadFilter(); fil.type = 'bandpass'; fil.frequency.value = 180
    o.connect(fil).connect(og).connect(masterGain!); o.start(); o.stop(c.currentTime + 0.06); i++
  }, 380)
  return { stop: () => { try { src.stop() } catch {}; window.clearInterval(t) } }
}

function procCafe(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(5, 'pink')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7
  const g = c.createGain(); g.gain.value = 0.4
  src.connect(bp).connect(g).connect(masterGain!); src.start()
  const t = window.setInterval(() => {
    if (Math.random() > 0.18) return
    const o = c.createOscillator(), og = c.createGain()
    o.type = 'triangle'; o.frequency.value = 2400 + Math.random() * 800
    og.gain.setValueAtTime(0.0001, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.005)
    og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25)
    o.connect(og).connect(masterGain!); o.start(); o.stop(c.currentTime + 0.3)
  }, 800)
  return { stop: () => { try { src.stop() } catch {}; window.clearInterval(t) } }
}

function procNight(): ProcHandle {
  const c = getCtx()
  const buffer = makeNoiseBuffer(5, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380
  const g = c.createGain(); g.gain.value = 0.35
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  const t = window.setInterval(() => {
    if (Math.random() > 0.2) return
    const o = c.createOscillator(), og = c.createGain()
    o.type = 'triangle'; o.frequency.value = 4200
    og.gain.setValueAtTime(0.0001, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.04, c.currentTime + 0.01)
    og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06)
    o.connect(og).connect(masterGain!); o.start(); o.stop(c.currentTime + 0.07)
  }, 600)
  return { stop: () => { try { src.stop() } catch {}; window.clearInterval(t) } }
}

function procDrones(): ProcHandle {
  const c = getCtx()
  const freqs = [55, 82.5, 110, 165]
  const oscs: OscillatorNode[] = []
  const gain = c.createGain(); gain.gain.value = 0.25; gain.connect(masterGain!)
  freqs.forEach((f, i) => {
    const o = c.createOscillator()
    o.type = i % 2 === 0 ? 'sine' : 'triangle'; o.frequency.value = f
    const og = c.createGain(); og.gain.value = 0.15
    o.connect(og).connect(gain); o.start(); oscs.push(o)
    const lfo = c.createOscillator(), lfoG = c.createGain()
    lfo.frequency.value = 0.05 + Math.random() * 0.1; lfoG.gain.value = 1.5
    lfo.connect(lfoG).connect(o.frequency); lfo.start(); oscs.push(lfo)
  })
  return { stop: () => oscs.forEach(o => { try { o.stop() } catch {} }) }
}

const PROC: Record<Exclude<AmbientTrack, 'none'>, () => ProcHandle> = {
  rain: procRain, thunder: procThunder, wind: procWind, forest: procForest,
  fireplace: procFireplace, rails: procRails, cafe: procCafe, night: procNight, drones: procDrones,
}

function stopCurrent() {
  if (currentSampleHowl) {
    currentSampleHowl.stop()
    currentSampleHowl.unload()
    currentSampleHowl = null
  }
  if (currentProc) {
    currentProc.stop()
    currentProc = null
  }
}

export function setAmbient(track: AmbientTrack) {
  if (track === currentTrack) return
  stopCurrent()
  currentTrack = track
  if (track === 'none') return
  // Resume audio context for procedural fallback
  const c = getCtx()
  if (c.state === 'suspended') void c.resume()

  // Try the real sample first.
  const url = `${SAMPLE_BASE}${track}.mp3`
  const howl = new Howl({
    src: [url],
    loop: true,
    volume: currentVolume,
    html5: false,
    onloaderror: () => {
      // Fallback to procedural if file missing or undecodable
      if (currentTrack !== track) return
      currentSampleHowl = null
      currentProc = PROC[track]()
    },
    onload: () => {
      if (currentTrack !== track) {
        howl.unload()
        return
      }
      howl.play()
    },
  })
  currentSampleHowl = howl
}

export function setVolume(v: number) {
  currentVolume = Math.max(0, Math.min(1, v))
  if (masterGain) masterGain.gain.value = currentVolume
  if (currentSampleHowl) currentSampleHowl.volume(currentVolume)
}

export function ensureResumed() {
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export const AMBIENT_OPTIONS: { value: AmbientTrack; label: string; emoji: string }[] = [
  { value: 'none', label: 'Silence', emoji: '🤫' },
  { value: 'rain', label: 'Rain', emoji: '🌧️' },
  { value: 'thunder', label: 'Thunderstorm', emoji: '⛈️' },
  { value: 'wind', label: 'Wind', emoji: '🌬️' },
  { value: 'forest', label: 'Forest', emoji: '🌲' },
  { value: 'fireplace', label: 'Fireplace', emoji: '🔥' },
  { value: 'rails', label: 'Train rails', emoji: '🚆' },
  { value: 'cafe', label: 'Cafe', emoji: '☕' },
  { value: 'night', label: 'Night city', emoji: '🌙' },
  { value: 'drones', label: 'Deep drones', emoji: '🎼' },
]
