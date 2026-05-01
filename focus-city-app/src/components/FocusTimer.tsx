import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../state'
import { focusReward } from '../rewards'
import type { BuildingType } from '../types'

const PRESETS = [
  { label: 'Quick', minutes: 25 },
  { label: 'Deep', minutes: 45 },
  { label: 'Builder', minutes: 60 },
  { label: 'Monk', minutes: 90 },
]

type Mode = 'targeted' | 'open'
type Phase = 'idle' | 'running' | 'paused' | 'completed'

const SESSION_STORAGE_KEY = 'focus-city.session'

type StoredSession = {
  mode: Mode
  phase: 'running' | 'paused'
  duration: number
  startMs: number
  pauseStartMs: number | null
  startedAtIso: string
  constructionTileId: string | null
  constructionBuilding: BuildingType
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    if (!s || (s.phase !== 'running' && s.phase !== 'paused')) return null
    if (typeof s.startMs !== 'number' || typeof s.duration !== 'number') return null
    return s
  } catch { return null }
}

function writeStoredSession(s: StoredSession) {
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s)) } catch {}
}

function clearStoredSession() {
  try { localStorage.removeItem(SESSION_STORAGE_KEY) } catch {}
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function chime() {
  try {
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 660
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2)
    o.start(); o.stop(ctx.currentTime + 1.2)
  } catch {}
}

function buildingForSession(durationMinutes: number, level: number): BuildingType {
  if (durationMinutes >= 90 && level >= 8) return 'tower'
  if (durationMinutes >= 60) return 'farm'
  if (durationMinutes >= 45) return 'workshop'
  return 'house'
}

export function FocusTimer() {
  const { state, dispatch, setConstruction, nextEmptyTileId } = useGame()
  const [mode, setMode] = useState<Mode>('targeted')
  const [duration, setDuration] = useState(25)
  const [custom, setCustom] = useState(25)
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(25 * 60)
  const startedAtRef = useRef<string | null>(null)
  const tickRef = useRef<number | null>(null)
  const startMsRef = useRef<number | null>(null)
  const pauseStartMsRef = useRef<number | null>(null)
  const constructionTileRef = useRef<string | null>(null)
  const constructionBuildingRef = useRef<BuildingType>('house')

  useEffect(() => {
    const s = readStoredSession()
    if (!s) return
    setMode(s.mode)
    setDuration(s.duration)
    startedAtRef.current = s.startedAtIso
    startMsRef.current = s.startMs
    pauseStartMsRef.current = s.pauseStartMs
    constructionTileRef.current = s.constructionTileId
    constructionBuildingRef.current = s.constructionBuilding

    const reference = s.phase === 'paused' && s.pauseStartMs != null ? s.pauseStartMs : Date.now()
    const elapsed = Math.max(0, Math.floor((reference - s.startMs) / 1000))
    if (s.mode === 'targeted') {
      const totalSec = s.duration * 60
      const remaining = Math.max(0, totalSec - elapsed)
      setSeconds(remaining)
      if (s.constructionTileId) {
        const progress = Math.max(0, Math.min(1, 1 - remaining / totalSec))
        setConstruction({ tileId: s.constructionTileId, building: s.constructionBuilding, progress })
      }
    } else {
      setSeconds(elapsed)
      if (s.constructionTileId) {
        const elapsedMin = elapsed / 60
        const progress = Math.min(1, elapsedMin / 60)
        setConstruction({ tileId: s.constructionTileId, building: s.constructionBuilding, progress })
      }
    }
    setPhase(s.phase)
  // mount-only rehydration; ignore deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'running') return

    const tick = () => {
      const startMs = startMsRef.current
      if (startMs == null) return
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000))

      if (mode === 'targeted') {
        const totalSec = duration * 60
        const remaining = Math.max(0, totalSec - elapsedSec)
        setSeconds(remaining)
        if (constructionTileRef.current) {
          const progress = Math.max(0, Math.min(1, 1 - remaining / totalSec))
          setConstruction({
            tileId: constructionTileRef.current,
            building: constructionBuildingRef.current,
            progress,
          })
        }
        if (remaining <= 0) {
          if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
          setPhase('completed')
          dispatch({
            type: 'completeFocus',
            durationMinutes: duration,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
          })
          setConstruction(null)
          constructionTileRef.current = null
          clearStoredSession()
          if (state.settings.sfxOn) chime()
        }
      } else {
        setSeconds(elapsedSec)
        if (constructionTileRef.current) {
          const elapsedMin = elapsedSec / 60
          let b: BuildingType = 'house'
          if (elapsedMin >= 60) b = 'farm'
          if (elapsedMin >= 90 && state.level >= 8) b = 'tower'
          const buildingChanged = constructionBuildingRef.current !== b
          constructionBuildingRef.current = b
          const progress = Math.min(1, elapsedMin / 60)
          setConstruction({ tileId: constructionTileRef.current, building: b, progress })
          if (buildingChanged && startMsRef.current != null && startedAtRef.current != null) {
            writeStoredSession({
              mode: 'open', phase: 'running', duration,
              startMs: startMsRef.current, pauseStartMs: null,
              startedAtIso: startedAtRef.current,
              constructionTileId: constructionTileRef.current,
              constructionBuilding: b,
            })
          }
        }
      }
    }

    tick()
    tickRef.current = window.setInterval(tick, 1000)
    const onVisibility = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [phase, mode, duration, dispatch, state.settings.sfxOn, state.level, setConstruction])

  useEffect(() => {
    if (!state.settings.strictMode || phase !== 'running' || mode !== 'targeted') return
    const onBlur = () => handleAbandon()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  })

  function setTargeted(m: number) {
    if (phase === 'running' || phase === 'paused') return
    setMode('targeted'); setDuration(m); setSeconds(m * 60); setPhase('idle')
  }

  function switchToOpen() {
    if (phase === 'running' || phase === 'paused') return
    setMode('open'); setSeconds(0); setPhase('idle')
  }

  function start() {
    setSeconds(mode === 'targeted' ? duration * 60 : 0)
    const startedAtIso = new Date().toISOString()
    const startMs = Date.now()
    startedAtRef.current = startedAtIso
    startMsRef.current = startMs
    pauseStartMsRef.current = null
    const tileId = nextEmptyTileId()
    let b: BuildingType = 'house'
    if (tileId) {
      b = mode === 'targeted' ? buildingForSession(duration, state.level) : 'house'
      constructionTileRef.current = tileId
      constructionBuildingRef.current = b
      setConstruction({ tileId, building: b, progress: 0 })
    } else {
      constructionTileRef.current = null
    }
    writeStoredSession({
      mode, phase: 'running', duration,
      startMs, pauseStartMs: null, startedAtIso,
      constructionTileId: tileId,
      constructionBuilding: b,
    })
    setPhase('running')
  }

  function pause() {
    const pausedAt = Date.now()
    pauseStartMsRef.current = pausedAt
    if (startMsRef.current != null && startedAtRef.current != null) {
      writeStoredSession({
        mode, phase: 'paused', duration,
        startMs: startMsRef.current, pauseStartMs: pausedAt,
        startedAtIso: startedAtRef.current,
        constructionTileId: constructionTileRef.current,
        constructionBuilding: constructionBuildingRef.current,
      })
    }
    setPhase('paused')
  }
  function resume() {
    if (pauseStartMsRef.current != null && startMsRef.current != null) {
      startMsRef.current += Date.now() - pauseStartMsRef.current
    }
    pauseStartMsRef.current = null
    if (startMsRef.current != null && startedAtRef.current != null) {
      writeStoredSession({
        mode, phase: 'running', duration,
        startMs: startMsRef.current, pauseStartMs: null,
        startedAtIso: startedAtRef.current,
        constructionTileId: constructionTileRef.current,
        constructionBuilding: constructionBuildingRef.current,
      })
    }
    setPhase('running')
  }

  function handleAbandon() {
    const elapsedMinutes = Math.round((duration * 60 - seconds) / 60)
    dispatch({
      type: 'abandonFocus',
      durationMinutes: duration,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      elapsedMinutes,
    })
    setConstruction(null); constructionTileRef.current = null
    startMsRef.current = null; pauseStartMsRef.current = null
    clearStoredSession()
    setPhase('idle'); setSeconds(duration * 60)
  }

  function handleStopOpen() {
    const elapsedMinutes = Math.floor(seconds / 60)
    if (elapsedMinutes < 1) {
      setConstruction(null); constructionTileRef.current = null
      startMsRef.current = null; pauseStartMsRef.current = null
      clearStoredSession()
      setPhase('idle'); setSeconds(0)
      return
    }
    dispatch({
      type: 'completeFocus',
      durationMinutes: elapsedMinutes,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
    })
    setConstruction(null); constructionTileRef.current = null
    clearStoredSession()
    if (state.settings.sfxOn) chime()
    setPhase('completed')
  }

  function dismiss() {
    startMsRef.current = null; pauseStartMsRef.current = null
    clearStoredSession()
    setPhase('idle')
    setSeconds(mode === 'targeted' ? duration * 60 : 0)
  }

  const progress = mode === 'targeted' ? 1 - seconds / (duration * 60) : (seconds % 60) / 60
  const elapsedForOpen = Math.floor(seconds / 60)
  const liveReward = useMemo(
    () => (mode === 'open' ? focusReward(elapsedForOpen, true) : focusReward(duration, true)),
    [mode, elapsedForOpen, duration],
  )

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Focus</h2>
        <span className="text-xs uppercase tracking-widest text-white/40">
          {mode === 'open' ? `open · ${phase}` : phase}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.minutes}
            onClick={() => setTargeted(p.minutes)}
            disabled={phase === 'running' || phase === 'paused'}
            className={`btn ${
              mode === 'targeted' && duration === p.minutes
                ? 'bg-gold/90 text-ink'
                : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
            }`}
          >
            {p.minutes}m
            <span className="ml-1 text-[10px] opacity-70">{p.label}</span>
          </button>
        ))}
        <button
          onClick={switchToOpen}
          disabled={phase === 'running' || phase === 'paused'}
          className={`btn ${
            mode === 'open' ? 'bg-moss text-ink'
              : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
          }`}
          title="Focus as you go — no target"
        >
          ∞ <span className="ml-1 text-[10px] opacity-80">Open</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-white/60">Custom</label>
        <input
          type="number" min={5} max={180} value={custom}
          onChange={e => setCustom(Math.max(5, Math.min(180, Number(e.target.value) || 5)))}
          disabled={phase === 'running' || phase === 'paused'}
          className="w-16 bg-white/10 border border-white/10 rounded px-2 py-1 text-white"
        />
        <button onClick={() => setTargeted(custom)} disabled={phase === 'running' || phase === 'paused'} className="btn-ghost">
          Set
        </button>
      </div>

      <div className="relative">
        <div className="aspect-square rounded-full border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent grid place-items-center relative overflow-hidden">
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="46" fill="none"
              stroke={mode === 'open' ? '#5a7a3b' : '#d4a93a'} strokeWidth="3"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={(1 - progress) * 2 * Math.PI * 46}
              transform="rotate(-90 50 50)" strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="text-center z-10">
            <div className="font-display text-5xl tabular-nums">{fmt(seconds)}</div>
            <div className="text-xs text-white/40 mt-1">
              {mode === 'targeted' ? `${duration} min target`
                : phase === 'idle' ? 'Open session — focus as you go' : 'Stop when ready'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {phase === 'idle' && (
          <button onClick={start} className="btn-primary col-span-2">
            {mode === 'open' ? 'Start open focus' : 'Start focus'}
          </button>
        )}
        {phase === 'running' && (
          <>
            <button onClick={pause} className="btn-ghost">Pause</button>
            {mode === 'open'
              ? <button onClick={handleStopOpen} className="btn-primary">Stop & build</button>
              : <button onClick={handleAbandon} className="btn-ghost text-brick">Abandon</button>}
          </>
        )}
        {phase === 'paused' && (
          <>
            <button onClick={resume} className="btn-primary">Resume</button>
            {mode === 'open'
              ? <button onClick={handleStopOpen} className="btn-ghost">Stop & build</button>
              : <button onClick={handleAbandon} className="btn-ghost text-brick">Abandon</button>}
          </>
        )}
        {phase === 'completed' && (
          <button onClick={dismiss} className="btn-primary col-span-2">Continue</button>
        )}
      </div>

      <div className="text-xs text-white/50">
        {mode === 'open' ? (
          phase === 'running' || phase === 'paused' ? (
            elapsedForOpen >= 1 ? (
              <>
                If you stop now: {liveReward.materials.wood} wood · {liveReward.materials.stone} stone ·{' '}
                {liveReward.materials.gold} gold · {liveReward.xp} XP
                {liveReward.materials.knowledge ? ` · ${liveReward.materials.knowledge} knowledge` : ''}
                {liveReward.materials.crystal ? ` · ${liveReward.materials.crystal} crystal` : ''}
              </>
            ) : <>Reward unlocks after the first minute.</>
          ) : <>Open session — building grows from however long you focus.</>
        ) : (
          <>
            Reward at {duration} min: {liveReward.materials.wood} wood · {liveReward.materials.stone} stone ·{' '}
            {liveReward.materials.gold} gold · {liveReward.xp} XP
            {liveReward.materials.knowledge ? ` · ${liveReward.materials.knowledge} knowledge` : ''}
            {liveReward.materials.crystal ? ` · ${liveReward.materials.crystal} crystal` : ''}
          </>
        )}
      </div>
    </div>
  )
}
