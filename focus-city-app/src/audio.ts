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
  // Wet hiss bed with soft swell — pink noise band-limited to drizzle range
  const buffer = makeNoiseBuffer(6, 'pink')
  const src = c.createBufferSource()
  src.buffer = buffer; src.loop = true
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5800
  const bedG = c.createGain(); bedG.gain.value = 0.42
  src.connect(hp).connect(lp).connect(bedG).connect(masterGain!)
  src.start()
  // Slow density LFO so the rain ebbs and surges
  const lfo = c.createOscillator(), lfoG = c.createGain()
  lfo.frequency.value = 0.07; lfoG.gain.value = 0.18
  lfo.connect(lfoG).connect(bedG.gain); lfo.start()
  // Discrete droplets — pings with random spread, each band-pass'd to give the
  // characteristic hollow "tap" of water hitting a hard surface
  const droplet = () => {
    const buf = makeNoiseBuffer(0.04, 'white')
    const s = c.createBufferSource(); s.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'
    bp.frequency.value = 1800 + Math.random() * 3200; bp.Q.value = 8
    const dg = c.createGain()
    const t0 = c.currentTime
    dg.gain.setValueAtTime(0.0001, t0)
    dg.gain.exponentialRampToValueAtTime(0.18 + Math.random() * 0.12, t0 + 0.002)
    dg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    s.connect(bp).connect(dg).connect(masterGain!); s.start(); s.stop(t0 + 0.06)
  }
  const t = window.setInterval(() => {
    const burst = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < burst; i++) {
      window.setTimeout(droplet, Math.random() * 80)
    }
  }, 130)
  return { stop: () => {
    window.clearInterval(t)
    try { src.stop() } catch { /* already stopped */ }
    try { lfo.stop() } catch { /* already stopped */ }
  } }
}

function procThunder(): ProcHandle {
  const rain = procRain()
  const c = getCtx()
  const strike = () => {
    const t0 = c.currentTime
    // Lightning crack — short bright noise burst before the rumble
    const crackBuf = makeNoiseBuffer(0.4, 'white')
    const crack = c.createBufferSource(); crack.buffer = crackBuf
    const crackBp = c.createBiquadFilter(); crackBp.type = 'bandpass'
    crackBp.frequency.value = 3200; crackBp.Q.value = 0.7
    const crackG = c.createGain()
    crackG.gain.setValueAtTime(0.0001, t0)
    crackG.gain.exponentialRampToValueAtTime(0.45, t0 + 0.01)
    crackG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
    crack.connect(crackBp).connect(crackG).connect(masterGain!)
    crack.start(t0); crack.stop(t0 + 0.4)
    // Deep rumble — slow swell of brown noise with two staggered tails
    const rumbleStart = t0 + 0.05
    const len = 3.2 + Math.random() * 1.5
    const rb = makeNoiseBuffer(len, 'brown')
    const r = c.createBufferSource(); r.buffer = rb
    const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 140
    const rg = c.createGain()
    rg.gain.setValueAtTime(0.0001, rumbleStart)
    rg.gain.exponentialRampToValueAtTime(0.7, rumbleStart + 0.5)
    rg.gain.exponentialRampToValueAtTime(0.18, rumbleStart + len * 0.6)
    rg.gain.exponentialRampToValueAtTime(0.0001, rumbleStart + len)
    r.connect(rlp).connect(rg).connect(masterGain!)
    r.start(rumbleStart); r.stop(rumbleStart + len + 0.1)
  }
  const t = window.setInterval(() => {
    if (Math.random() < 0.22) strike()
  }, 5500)
  return { stop: () => { rain.stop(); window.clearInterval(t) } }
}

function procWind(): ProcHandle {
  const c = getCtx()
  // Body: brown noise through a sweeping bandpass — that's the whoosh
  const buffer = makeNoiseBuffer(8, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'
  bp.frequency.value = 480; bp.Q.value = 0.5
  const g = c.createGain(); g.gain.value = 0.55
  src.connect(bp).connect(g).connect(masterGain!); src.start()
  // Two staggered LFOs — different rates produce irregular gusts instead of
  // a metronome wobble
  const lfoA = c.createOscillator(), lfoAG = c.createGain()
  lfoA.frequency.value = 0.08; lfoAG.gain.value = 320
  lfoA.connect(lfoAG).connect(bp.frequency); lfoA.start()
  const lfoB = c.createOscillator(), lfoBG = c.createGain()
  lfoB.frequency.value = 0.21; lfoBG.gain.value = 0.25
  lfoB.connect(lfoBG).connect(g.gain); lfoB.start()
  // Higher whistle layer — thin filtered noise for treetop hiss
  const whBuf = makeNoiseBuffer(5, 'pink')
  const wh = c.createBufferSource(); wh.buffer = whBuf; wh.loop = true
  const whBp = c.createBiquadFilter(); whBp.type = 'bandpass'
  whBp.frequency.value = 2400; whBp.Q.value = 4
  const whG = c.createGain(); whG.gain.value = 0.05
  wh.connect(whBp).connect(whG).connect(masterGain!); wh.start()
  const whLfo = c.createOscillator(), whLfoG = c.createGain()
  whLfo.frequency.value = 0.13; whLfoG.gain.value = 0.06
  whLfo.connect(whLfoG).connect(whG.gain); whLfo.start()
  return { stop: () => {
    [src, lfoA, lfoB, wh, whLfo].forEach(n => { try { n.stop() } catch { /* stopped */ } })
  } }
}

function procForest(): ProcHandle {
  const c = getCtx()
  // Leaf rustle bed — brown noise through a low-mid bandpass for foliage
  const buffer = makeNoiseBuffer(8, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'
  bp.frequency.value = 1100; bp.Q.value = 0.6
  const g = c.createGain(); g.gain.value = 0.22
  src.connect(bp).connect(g).connect(masterGain!); src.start()
  const lfo = c.createOscillator(), lfoG = c.createGain()
  lfo.frequency.value = 0.18; lfoG.gain.value = 0.08
  lfo.connect(lfoG).connect(g.gain); lfo.start()
  // Bird call generator — multi-syllable warbles, not a single chirp.
  // Picks one of three "species" per call so the forest sounds populated.
  const species = [
    { syllables: 3, base: 2400, range: 900, gap: 0.07, sweep: 1.25 }, // sparrow
    { syllables: 2, base: 1700, range: 600, gap: 0.18, sweep: 0.7 },  // dove-ish
    { syllables: 5, base: 3200, range: 1400, gap: 0.05, sweep: 1.5 }, // warbler
  ]
  const callBird = () => {
    const sp = species[Math.floor(Math.random() * species.length)]
    const t0 = c.currentTime + Math.random() * 0.05
    for (let i = 0; i < sp.syllables; i++) {
      const start = t0 + i * sp.gap
      const o = c.createOscillator(), og = c.createGain()
      o.type = 'sine'
      const base = sp.base + (Math.random() - 0.5) * sp.range
      o.frequency.setValueAtTime(base, start)
      o.frequency.linearRampToValueAtTime(base * sp.sweep, start + sp.gap * 0.7)
      og.gain.setValueAtTime(0.0001, start)
      og.gain.exponentialRampToValueAtTime(0.08, start + 0.01)
      og.gain.exponentialRampToValueAtTime(0.0001, start + sp.gap * 0.95)
      o.connect(og).connect(masterGain!)
      o.start(start); o.stop(start + sp.gap)
    }
  }
  const t = window.setInterval(() => {
    if (Math.random() < 0.35) callBird()
  }, 1100)
  return { stop: () => {
    [src, lfo].forEach(n => { try { n.stop() } catch { /* stopped */ } })
    window.clearInterval(t)
  } }
}

function procFireplace(): ProcHandle {
  const c = getCtx()
  // Fire roar — low brown noise simmering
  const buffer = makeNoiseBuffer(6, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600
  const g = c.createGain(); g.gain.value = 0.4
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  // Slow flicker on the roar
  const lfo = c.createOscillator(), lfoG = c.createGain()
  lfo.frequency.value = 0.4; lfoG.gain.value = 0.1
  lfo.connect(lfoG).connect(g.gain); lfo.start()
  // Crackles — bandpass'd white pops in clusters (not uniform), so it sounds
  // like wood cracking rather than rain.
  const crackle = () => {
    const buf = makeNoiseBuffer(0.03, 'white')
    const s = c.createBufferSource(); s.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'
    bp.frequency.value = 1800 + Math.random() * 4000; bp.Q.value = 6
    const cg = c.createGain()
    const t0 = c.currentTime
    cg.gain.setValueAtTime(0.0001, t0)
    cg.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.2, t0 + 0.002)
    cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04)
    s.connect(bp).connect(cg).connect(masterGain!); s.start(t0); s.stop(t0 + 0.05)
  }
  const t = window.setInterval(() => {
    // Occasional bigger pop, otherwise quiet small cracks
    if (Math.random() < 0.08) {
      const burst = 3 + Math.floor(Math.random() * 5)
      for (let i = 0; i < burst; i++) window.setTimeout(crackle, Math.random() * 180)
    } else if (Math.random() < 0.4) {
      crackle()
    }
  }, 220)
  return { stop: () => {
    [src, lfo].forEach(n => { try { n.stop() } catch { /* stopped */ } })
    window.clearInterval(t)
  } }
}

function procRails(): ProcHandle {
  const c = getCtx()
  // Carriage rumble — low brown noise + slow LFO so it sways
  const buffer = makeNoiseBuffer(8, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260
  const g = c.createGain(); g.gain.value = 0.4
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  const sway = c.createOscillator(), swayG = c.createGain()
  sway.frequency.value = 0.6; swayG.gain.value = 0.1
  sway.connect(swayG).connect(g.gain); sway.start()
  // Wheel pattern — proper "ti-DUM ti-DUM" two-tap clack at ~140 BPM, with the
  // second tap softer & slightly later. Beats per pair = 0.42s.
  const pairSec = 0.42
  const clack = (when: number, accent: boolean) => {
    const buf = makeNoiseBuffer(0.05, 'white')
    const s = c.createBufferSource(); s.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'
    bp.frequency.value = 320; bp.Q.value = 9
    const cg = c.createGain()
    cg.gain.setValueAtTime(0.0001, when)
    cg.gain.exponentialRampToValueAtTime(accent ? 0.32 : 0.18, when + 0.003)
    cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.07)
    s.connect(bp).connect(cg).connect(masterGain!); s.start(when); s.stop(when + 0.08)
  }
  let pairStart = c.currentTime + 0.2
  const ticker = window.setInterval(() => {
    while (pairStart < c.currentTime + 1.5) {
      clack(pairStart, true)
      clack(pairStart + 0.13, false)
      pairStart += pairSec
    }
  }, 250)
  return { stop: () => {
    [src, sway].forEach(n => { try { n.stop() } catch { /* stopped */ } })
    window.clearInterval(ticker)
  } }
}

function procCafe(): ProcHandle {
  const c = getCtx()
  // Murmur bed — pink noise band-pass'd into the human voice formant range,
  // with two LFOs modulating amplitude in opposite directions so the babble
  // never settles into a steady hiss.
  const buffer = makeNoiseBuffer(8, 'pink')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const bp1 = c.createBiquadFilter(); bp1.type = 'bandpass'
  bp1.frequency.value = 720; bp1.Q.value = 0.9
  const g = c.createGain(); g.gain.value = 0.32
  src.connect(bp1).connect(g).connect(masterGain!); src.start()
  // "Syllable" amplitude shaping — fakes speech rhythm by chopping the bed
  const chop = c.createOscillator(), chopG = c.createGain()
  chop.frequency.value = 4.5; chopG.gain.value = 0.18
  chop.connect(chopG).connect(g.gain); chop.start()
  const sweep = c.createOscillator(), sweepG = c.createGain()
  sweep.frequency.value = 0.27; sweepG.gain.value = 220
  sweep.connect(sweepG).connect(bp1.frequency); sweep.start()
  // Cup & saucer clinks — short bandpass pings at metallic frequencies
  const clink = () => {
    const t0 = c.currentTime
    const o = c.createOscillator(), og = c.createGain()
    o.type = 'triangle'; o.frequency.value = 3200 + Math.random() * 1800
    og.gain.setValueAtTime(0.0001, t0)
    og.gain.exponentialRampToValueAtTime(0.09, t0 + 0.003)
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35)
    o.connect(og).connect(masterGain!); o.start(t0); o.stop(t0 + 0.4)
  }
  // Espresso machine hiss — rare brief bursts
  const steam = () => {
    const t0 = c.currentTime
    const buf = makeNoiseBuffer(0.6, 'white')
    const s = c.createBufferSource(); s.buffer = buf
    const sbp = c.createBiquadFilter(); sbp.type = 'bandpass'
    sbp.frequency.value = 4800; sbp.Q.value = 1.5
    const sg = c.createGain()
    sg.gain.setValueAtTime(0.0001, t0)
    sg.gain.exponentialRampToValueAtTime(0.12, t0 + 0.1)
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6)
    s.connect(sbp).connect(sg).connect(masterGain!); s.start(t0); s.stop(t0 + 0.65)
  }
  const t = window.setInterval(() => {
    if (Math.random() < 0.18) clink()
    if (Math.random() < 0.04) steam()
  }, 700)
  return { stop: () => {
    [src, chop, sweep].forEach(n => { try { n.stop() } catch { /* stopped */ } })
    window.clearInterval(t)
  } }
}

function procNight(): ProcHandle {
  const c = getCtx()
  // Distant city rumble bed
  const buffer = makeNoiseBuffer(8, 'brown')
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280
  const g = c.createGain(); g.gain.value = 0.32
  src.connect(lp).connect(g).connect(masterGain!); src.start()
  // Cricket trill — repeated short pulses ~30Hz amplitude modulation, the
  // signature stridulation rhythm. Layered crickets at slightly different
  // pitches and rates to fake a chorus.
  const cricket = (freq: number, rate: number, len: number, vol: number) => {
    const t0 = c.currentTime
    const o = c.createOscillator()
    o.type = 'triangle'; o.frequency.value = freq
    const trill = c.createOscillator()
    trill.type = 'square'; trill.frequency.value = rate
    const trillG = c.createGain(); trillG.gain.value = 0.5
    const og = c.createGain(); og.gain.value = 0
    // Use the trill oscillator to gate the gain
    trill.connect(trillG).connect(og.gain)
    og.gain.setValueAtTime(0.0001, t0)
    og.gain.linearRampToValueAtTime(vol, t0 + 0.05)
    og.gain.linearRampToValueAtTime(0.0001, t0 + len)
    o.connect(og).connect(masterGain!)
    o.start(t0); trill.start(t0)
    o.stop(t0 + len + 0.1); trill.stop(t0 + len + 0.1)
  }
  const t = window.setInterval(() => {
    if (Math.random() < 0.55) {
      cricket(4200 + Math.random() * 600, 28 + Math.random() * 10, 0.8 + Math.random() * 1.2, 0.04)
    }
    if (Math.random() < 0.35) {
      cricket(3600, 22, 1.4, 0.025)
    }
  }, 1100)
  // Distant car whoosh — very rare
  const carInt = window.setInterval(() => {
    if (Math.random() > 0.06) return
    const t0 = c.currentTime
    const buf = makeNoiseBuffer(2, 'pink')
    const s = c.createBufferSource(); s.buffer = buf
    const sp = c.createBiquadFilter(); sp.type = 'bandpass'
    sp.frequency.value = 350; sp.Q.value = 1.2
    const sg = c.createGain()
    sg.gain.setValueAtTime(0.0001, t0)
    sg.gain.exponentialRampToValueAtTime(0.12, t0 + 0.6)
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8)
    s.connect(sp).connect(sg).connect(masterGain!); s.start(t0); s.stop(t0 + 2)
  }, 4000)
  return { stop: () => {
    try { src.stop() } catch { /* stopped */ }
    window.clearInterval(t); window.clearInterval(carInt)
  } }
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
