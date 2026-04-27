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
  const constructionTileRef = useRef<string | null>(null)
  const constructionBuildingRef = useRef<BuildingType>('house')

  useEffect(() => {
    if (phase !== 'running') return
    tickRef.current = window.setInterval(() => {
      setSeconds(prev => {
        if (mode === 'targeted') {
          const next = prev - 1
          if (constructionTileRef.current) {
            const progress = 1 - next / (duration * 60)
            setConstruction({
              tileId: constructionTileRef.current,
              building: constructionBuildingRef.current,
              progress: Math.max(0, Math.min(1, progress)),
            })
          }
          if (prev <= 1) {
            window.clearInterval(tickRef.current!); tickRef.current = null
            setPhase('completed')
            dispatch({
              type: 'completeFocus',
              durationMinutes: duration,
              startedAt: startedAtRef.current ?? new Date().toISOString(),
            })
            setConstruction(null)
            constructionTileRef.current = null
            if (state.settings.sfxOn) chime()
            return 0
          }
          return next
        }
        const next = prev + 1
        if (constructionTileRef.current) {
          const elapsedMin = next / 60
          let b: BuildingType = 'house'
          if (elapsedMin >= 60) b = 'farm'
          if (elapsedMin >= 90 && state.level >= 8) b = 'tower'
          constructionBuildingRef.current = b
          const progress = Math.min(1, elapsedMin / 60)
          setConstruction({ tileId: constructionTileRef.current, building: b, progress })
        }
        return next
      })
    }, 1000)
    return () => {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null }
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
    startedAtRef.current = new Date().toISOString()
    const tileId = nextEmptyTileId()
    if (tileId) {
      const b = mode === 'targeted' ? buildingForSession(duration, state.level) : 'house'
      constructionTileRef.current = tileId
      constructionBuildingRef.current = b
      setConstruction({ tileId, building: b, progress: 0 })
    } else {
      constructionTileRef.current = null
    }
    setPhase('running')
  }

  function pause() { setPhase('paused') }
  function resume() { setPhase('running') }

  function handleAbandon() {
    const elapsedMinutes = Math.round((duration * 60 - seconds) / 60)
    dispatch({
      type: 'abandonFocus',
      durationMinutes: duration,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
      elapsedMinutes,
    })
    setConstruction(null); constructionTileRef.current = null
    setPhase('idle'); setSeconds(duration * 60)
  }

  function handleStopOpen() {
    const elapsedMinutes = Math.floor(seconds / 60)
    if (elapsedMinutes < 1) {
      setConstruction(null); constructionTileRef.current = null
      setPhase('idle'); setSeconds(0)
      return
    }
    dispatch({
      type: 'completeFocus',
      durationMinutes: elapsedMinutes,
      startedAt: startedAtRef.current ?? new Date().toISOString(),
    })
    setConstruction(null); constructionTileRef.current = null
    if (state.settings.sfxOn) chime()
    setPhase('completed')
  }

  function dismiss() {
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
