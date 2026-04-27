import { useState } from 'react'
import { useGame } from '../state'
import type { Priority } from '../types'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/40' },
  { value: 'medium', label: 'Med', color: 'bg-emerald-500/40' },
  { value: 'high', label: 'High', color: 'bg-amber-500/40' },
  { value: 'critical', label: 'Crit', color: 'bg-rose-500/40' },
]

export function Tasks() {
  const { state, dispatch } = useGame()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    dispatch({ type: 'addTask', title: title.trim(), priority })
    setTitle('')
  }

  const open = state.tasks.filter(t => !t.completed)
  const done = state.tasks.filter(t => t.completed)

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <h3 className="panel-title m-0">Tasks</h3>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="New task..."
          className="grow bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
        />
        <select
          value={priority} onChange={e => setPriority(e.target.value as Priority)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm"
        >
          {PRIORITIES.map(p => (
            <option key={p.value} value={p.value} className="bg-ink">{p.label}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm">Add</button>
      </form>
      <ul className="flex flex-col gap-1.5 max-h-64 overflow-auto scroll-thin pr-1">
        {open.length === 0 && <li className="text-xs text-white/40 italic px-1">All caught up.</li>}
        {open.map(t => {
          const p = PRIORITIES.find(x => x.value === t.priority)!
          return (
            <li key={t.id} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5 text-sm">
              <button
                onClick={() => dispatch({ type: 'completeTask', id: t.id })}
                className="w-5 h-5 rounded border border-white/30 hover:bg-gold/30 grid place-items-center"
                aria-label="Complete"
              />
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${p.color}`}>{p.label}</span>
              <span className="grow truncate">{t.title}</span>
              <button onClick={() => dispatch({ type: 'deleteTask', id: t.id })} className="text-white/40 hover:text-brick text-xs">✕</button>
            </li>
          )
        })}
        {done.length > 0 && <li className="text-[10px] uppercase tracking-widest text-white/30 mt-2 px-1">Done ({done.length})</li>}
        {done.slice(0, 5).map(t => (
          <li key={t.id} className="flex items-center gap-2 text-xs text-white/40 line-through px-2">
            <span className="grow truncate">{t.title}</span>
            <button onClick={() => dispatch({ type: 'deleteTask', id: t.id })} className="text-white/30 hover:text-brick">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
