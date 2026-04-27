import { useGame } from '../state'

export function Stats() {
  const { state, totals } = useGame()
  const recent = state.focusHistory.slice(0, 8)
  const days: Record<string, number> = {}
  state.focusHistory.forEach(s => {
    if (s.status !== 'completed' || !s.completedAt) return
    const d = s.completedAt.slice(0, 10)
    days[d] = (days[d] ?? 0) + s.durationMinutes
  })
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const max = Math.max(60, ...last7.map(d => days[d] ?? 0))

  return (
    <div className="panel p-4 flex flex-col gap-3">
      <h3 className="panel-title m-0">Stats</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Sessions" value={totals.completedSessions} />
        <Stat label="Focused" value={`${totals.totalFocusMinutes}m`} />
        <Stat label="Buildings" value={state.city.filter(t => t.type !== 'empty').length} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Last 7 days</div>
        <div className="flex items-end gap-1 h-20">
          {last7.map(d => {
            const v = days[d] ?? 0
            const h = Math.max(2, (v / max) * 100)
            return (
              <div key={d} className="grow flex flex-col items-center gap-1" title={`${d}: ${v}m`}>
                <div className="w-full bg-gradient-to-t from-gold/40 to-gold rounded-sm" style={{ height: `${h}%` }} />
                <span className="text-[9px] text-white/40">{d.slice(5)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Recent</div>
        <ul className="space-y-1 text-xs">
          {recent.length === 0 && <li className="text-white/40">No sessions yet.</li>}
          {recent.map(s => (
            <li key={s.id} className="flex justify-between text-white/70">
              <span>{s.status === 'completed' ? '✓' : '✕'} {s.durationMinutes}m</span>
              <span className="text-white/40">
                {s.completedAt ? new Date(s.completedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 rounded p-2">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  )
}
