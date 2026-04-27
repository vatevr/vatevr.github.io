import { useEffect } from 'react'
import { useGame } from '../state'
import { AMBIENT_OPTIONS, ensureResumed, setAmbient, setVolume } from '../audio'

export function AmbientControls() {
  const { state, dispatch } = useGame()
  const { settings } = state

  useEffect(() => {
    setVolume(settings.musicOn ? settings.volume : 0)
  }, [settings.volume, settings.musicOn])

  useEffect(() => {
    if (settings.musicOn) setAmbient(settings.ambientTrack)
    else setAmbient('none')
  }, [settings.musicOn, settings.ambientTrack])

  function pick(track: typeof settings.ambientTrack) {
    ensureResumed()
    dispatch({
      type: 'updateSettings',
      patch: { ambientTrack: track, musicOn: track !== 'none' ? true : settings.musicOn },
    })
  }

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title m-0">Weather & ambience</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              ensureResumed()
              dispatch({ type: 'updateSettings', patch: { musicOn: !settings.musicOn } })
            }}
            className={`btn ${
              settings.musicOn ? 'bg-gold/90 text-ink' : 'bg-white/5 text-white/70 border border-white/10'
            }`}
          >
            {settings.musicOn ? '🔊 On' : '🔈 Off'}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={settings.volume}
            onChange={e => dispatch({ type: 'updateSettings', patch: { volume: Number(e.target.value) } })}
            className="w-24 accent-gold" aria-label="Volume"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AMBIENT_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => pick(o.value)}
            className={`btn text-xs ${
              settings.ambientTrack === o.value && (o.value === 'none' || settings.musicOn)
                ? 'bg-moss/80 text-ink'
                : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
            }`}
            title={o.label}
          >
            <span>{o.emoji}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-2">
        Drop your own loops at <code className="bg-white/10 px-1 rounded">public/ambient/&lt;name&gt;.mp3</code> for studio quality. Falls back to live synth otherwise.
      </p>
    </div>
  )
}
