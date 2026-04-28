import { useGame } from '../state'

export function Settings() {
  const { state, dispatch } = useGame()
  const s = state.settings

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <h3 className="panel-title m-0">Settings</h3>
      <label className="flex items-center justify-between text-sm">
        <span>Strict mode (leaving tab cancels session)</span>
        <input
          type="checkbox" checked={s.strictMode}
          onChange={e => dispatch({ type: 'updateSettings', patch: { strictMode: e.target.checked } })}
          className="accent-gold"
        />
      </label>
      <label className="flex items-center justify-between text-sm">
        <span>Sound effects</span>
        <input
          type="checkbox" checked={s.sfxOn}
          onChange={e => dispatch({ type: 'updateSettings', patch: { sfxOn: e.target.checked } })}
          className="accent-gold"
        />
      </label>
      <button
        onClick={() => {
          if (confirm('Reset everything? Your city, materials, tasks, and habits will be wiped.')) {
            dispatch({ type: 'reset' })
          }
        }}
        className="btn-ghost text-brick text-sm self-start"
      >
        Reset progress
      </button>
      <p className="text-[11px] text-white/40">
        Progress saved in this browser ({state.focusHistory.length} sessions logged).
      </p>
    </div>
  )
}
