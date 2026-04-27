import { useState } from 'react'
import { useGame } from '../state'

export function Habits() {
  const { state, dispatch } = useGame()
  const [title, setTitle] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({ type: 'addHabit', title: title.trim() })
    setTitle('')
  }

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <h3 className="panel-title m-0">Habits</h3>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="New daily habit..."
          className="grow bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
        />
        <button type="submit" className="btn-primary text-sm">Add</button>
      </form>
      <ul className="flex flex-col gap-1.5 max-h-64 overflow-auto scroll-thin pr-1">
        {state.habits.length === 0 && <li className="text-xs text-white/40 italic px-1">No habits yet.</li>}
        {state.habits.map(h => (
          <li
            key={h.id}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${h.completedToday ? 'bg-moss/30' : 'bg-white/5'}`}
          >
            <button
              onClick={() => dispatch({ type: 'completeHabit', id: h.id })}
              disabled={h.completedToday}
              className={`w-5 h-5 rounded border grid place-items-center ${
                h.completedToday ? 'bg-moss border-moss text-ink' : 'border-white/30 hover:bg-gold/30'
              }`}
              aria-label="Mark done today"
            >
              {h.completedToday ? '✓' : ''}
            </button>
            <span className="grow truncate">{h.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200" title={`${h.streak}-day streak`}>
              🔥 {h.streak}
            </span>
            <button onClick={() => dispatch({ type: 'deleteHabit', id: h.id })} className="text-white/40 hover:text-brick text-xs">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
