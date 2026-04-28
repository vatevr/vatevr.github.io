import { useEffect } from 'react'
import { useGame } from '../state'
import { AMBIENT_OPTIONS, ensureResumed, setAmbient, setVolume } from '../audio'
import { MUSIC_OPTIONS, ensureMusicResumed, setMusic, setMusicVolume } from '../music'
import type { MusicTrack } from '../types'

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

  useEffect(() => {
    setMusicVolume(settings.focusMusicOn ? settings.focusMusicVolume : 0)
  }, [settings.focusMusicVolume, settings.focusMusicOn])

  useEffect(() => {
    if (settings.focusMusicOn) setMusic(settings.focusMusicTrack)
    else setMusic(null)
  }, [settings.focusMusicOn, settings.focusMusicTrack])

  function pick(track: typeof settings.ambientTrack) {
    ensureResumed()
    dispatch({
      type: 'updateSettings',
      patch: { ambientTrack: track, musicOn: track !== 'none' ? true : settings.musicOn },
    })
  }

  function pickMusic(track: MusicTrack) {
    ensureMusicResumed()
    dispatch({
      type: 'updateSettings',
      patch: { focusMusicTrack: track, focusMusicOn: true },
    })
  }

  function toggleMusic() {
    ensureMusicResumed()
    dispatch({ type: 'updateSettings', patch: { focusMusicOn: !settings.focusMusicOn } })
  }

  const currentMusic = MUSIC_OPTIONS.find(m => m.value === settings.focusMusicTrack) ?? MUSIC_OPTIONS[0]

  return (
    <div className="panel p-3 flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="panel-title m-0">Focus music</h3>
            <span className="text-[11px] text-white/40">
              {currentMusic.label} · <em>{currentMusic.subtitle}</em>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMusic}
              role="switch"
              aria-checked={settings.focusMusicOn}
              aria-label="Toggle focus music"
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.focusMusicOn ? 'bg-gold/90' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.focusMusicOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={settings.focusMusicVolume}
              onChange={e => dispatch({ type: 'updateSettings', patch: { focusMusicVolume: Number(e.target.value) } })}
              className="w-24 accent-gold" aria-label="Music volume"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MUSIC_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => pickMusic(o.value)}
              className={`btn text-xs ${
                settings.focusMusicTrack === o.value && settings.focusMusicOn
                  ? 'bg-gold/80 text-ink'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
              title={`${o.label} — ${o.subtitle}`}
            >
              <span>🎵</span>
              <span>{o.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
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
    </div>
  )
}
