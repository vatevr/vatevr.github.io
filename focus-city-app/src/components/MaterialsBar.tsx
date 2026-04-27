import { useGame } from '../state'
import { xpForNextLevel } from '../rewards'

const ICONS: Record<string, string> = {
  wood: '🪵', stone: '🪨', gold: '🪙', food: '🍞', knowledge: '📖', crystal: '💎',
}

export function MaterialsBar() {
  const { state, totals } = useGame()
  const next = xpForNextLevel(state.level)
  const xpInLevel = state.xp - next.current
  const xpSpan = next.needed - next.current
  const progress = Math.min(1, xpInLevel / xpSpan)

  return (
    <div className="panel px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-display text-base">Lvl {state.level}</span>
        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gold" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {Object.entries(state.materials).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-white/85" title={k}>
            <span>{ICONS[k]}</span>
            <span className="tabular-nums">{v}</span>
          </span>
        ))}
      </div>
      <div className="ml-auto text-xs text-white/50 hidden md:block">
        {totals.completedSessions} sessions · {totals.totalFocusMinutes} min focused
      </div>
    </div>
  )
}
