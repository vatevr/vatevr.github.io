import { useState } from 'react'
import { useGame } from '../state'
import { BUILDING_LIST, BUILDINGS, tileEmoji } from '../buildings'
import type { BuildingType } from '../types'

export function CityView() {
  const { state, dispatch, canAfford, construction } = useGame()
  const [selectedTile, setSelectedTile] = useState<string | null>(null)
  const [picker, setPicker] = useState<BuildingType>('house')
  const cellsPerRow = state.gridSize

  return (
    <div className="panel p-5 flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Your city</h2>
        <div className="text-xs text-white/50">
          Pop {state.population} · City XP {state.cityXp}
        </div>
      </div>

      <div className="relative grow grid place-items-center overflow-auto py-4">
        <div
          className="iso-stage"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cellsPerRow}, 56px)`,
            gridTemplateRows: `repeat(${cellsPerRow}, 56px)`,
            gap: 2,
            transform: 'rotateX(55deg) rotateZ(-45deg) scale(0.95)',
            transformStyle: 'preserve-3d',
            perspective: '1200px',
          }}
        >
          {state.city.map(tile => {
            const def = tile.type !== 'empty' ? BUILDINGS[tile.type] : null
            const selected = selectedTile === tile.id
            const empty = tile.type === 'empty'
            const isConstruction = construction && construction.tileId === tile.id && empty
            return (
              <button
                key={tile.id}
                onClick={() => setSelectedTile(tile.id)}
                className={[
                  'relative w-14 h-14 rounded-sm grid place-items-center transition-all overflow-hidden',
                  empty && !isConstruction
                    ? 'bg-emerald-900/30 border border-emerald-500/10 hover:bg-emerald-700/40'
                    : isConstruction
                      ? 'bg-amber-900/40 border border-amber-400/30 shadow-md shadow-black/40 ring-1 ring-amber-300/30 animate-pulse-soft'
                      : 'bg-amber-200/20 border border-amber-300/30 shadow-md shadow-black/40',
                  selected ? 'ring-2 ring-gold ring-offset-1 ring-offset-transparent' : '',
                ].join(' ')}
                title={
                  isConstruction
                    ? `Building ${BUILDINGS[construction.building].name} — ${Math.round(construction.progress * 100)}%`
                    : def ? def.name : 'Empty land'
                }
              >
                {isConstruction ? (
                  <ConstructionTile
                    building={construction.building}
                    progress={construction.progress}
                  />
                ) : (
                  <span
                    className="text-xl"
                    style={{ transform: 'rotateZ(45deg) rotateX(-55deg)', display: 'block' }}
                  >
                    {tileEmoji(tile.type) || (empty ? '·' : '')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="panel-title m-0">Build</h3>
          {selectedTile && (
            <button onClick={() => setSelectedTile(null)} className="btn-ghost text-xs">
              Clear selection
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto scroll-thin pr-1">
          {BUILDING_LIST.map(b => {
            const locked = state.level < b.unlockLevel
            const afford = canAfford(b.cost)
            const active = picker === b.type
            return (
              <button
                key={b.type}
                disabled={locked}
                onClick={() => setPicker(b.type)}
                className={[
                  'btn text-xs',
                  active ? 'bg-gold/90 text-ink' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10',
                  locked ? '!opacity-40 !cursor-not-allowed' : '',
                  !afford && !locked ? 'ring-1 ring-brick/40' : '',
                ].join(' ')}
                title={`${b.name} — ${costLabel(b)} ${locked ? `(unlocks at lvl ${b.unlockLevel})` : ''}`}
              >
                <span>{b.emoji}</span>
                <span>{b.name}</span>
              </button>
            )
          })}
        </div>
        {selectedTile ? (
          <BuildAction
            tileId={selectedTile}
            building={picker}
            onPlaced={() => setSelectedTile(null)}
          />
        ) : (
          <p className="text-xs text-white/40 mt-2">Select a tile, then a building.</p>
        )}
      </div>
    </div>
  )

  function BuildAction({
    tileId, building, onPlaced,
  }: { tileId: string; building: BuildingType; onPlaced: () => void }) {
    const tile = state.city.find(t => t.id === tileId)
    const def = BUILDINGS[building]
    const occupied = tile && tile.type !== 'empty'
    const locked = state.level < def.unlockLevel
    const affordable = canAfford(def.cost)
    const disabled = !!occupied || locked || !affordable
    let reason = ''
    if (occupied) reason = 'Tile is occupied'
    else if (locked) reason = `Unlocks at level ${def.unlockLevel}`
    else if (!affordable) reason = 'Not enough materials'

    return (
      <div className="mt-2 flex items-center justify-between gap-2 bg-white/5 rounded p-2">
        <div className="text-xs">
          <div className="font-semibold">{def.emoji} {def.name}</div>
          <div className="text-white/50">{costLabel(def)}</div>
        </div>
        <button
          disabled={disabled}
          onClick={() => { dispatch({ type: 'placeBuilding', tileId, building }); onPlaced() }}
          className="btn-primary text-xs"
        >
          {disabled ? reason || 'Locked' : 'Build'}
        </button>
      </div>
    )
  }
}

function costLabel(b: { cost: Partial<Record<string, number>> }) {
  return Object.entries(b.cost).map(([k, v]) => `${v} ${k}`).join(' · ')
}

function ConstructionTile({
  building, progress,
}: { building: BuildingType; progress: number }) {
  const def = BUILDINGS[building]
  const pct = Math.max(0, Math.min(1, progress))
  const clipPct = (1 - pct) * 100
  return (
    <div
      className="relative w-full h-full grid place-items-center"
      style={{ transform: 'rotateZ(45deg) rotateX(-55deg)' }}
    >
      <span className="absolute inset-0 grid place-items-center text-base opacity-60" aria-hidden>🚧</span>
      <span
        className="relative text-xl"
        style={{
          clipPath: `inset(${clipPct}% 0 0 0)`,
          WebkitClipPath: `inset(${clipPct}% 0 0 0)`,
          filter: pct < 1 ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : undefined,
          transition: 'clip-path 0.6s ease-out',
        }}
        title={def.name}
      >
        {def.emoji}
      </span>
      {pct < 1 && pct > 0 && (
        <span className="absolute -top-0.5 -right-0.5 text-[10px] animate-bounce" aria-hidden>🔨</span>
      )}
      <span className="absolute left-0 right-0 bottom-0 h-1 bg-black/30" aria-hidden>
        <span
          className="block h-full bg-amber-400 transition-[width] duration-700 ease-linear"
          style={{ width: `${pct * 100}%` }}
        />
      </span>
    </div>
  )
}
