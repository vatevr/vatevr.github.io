import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { useGame } from '../state'
import { BUILDING_LIST, BUILDINGS } from '../buildings'
import { buildingCost } from '../rewards'
import type { BuildingDef, BuildingType, CityTile, Materials } from '../types'
import { BuildingMesh } from './BuildingMesh'

const TILE = 1
const GAP = 0.05

export function CityView() {
  const { state, dispatch, canAfford, construction, totals } = useGame()
  const [selectedTile, setSelectedTile] = useState<string | null>(null)
  const [picker, setPicker] = useState<BuildingType>('house')
  const grid = state.gridSize
  const span = grid * (TILE + GAP)
  const sessionsDone = totals.completedSessions

  function countOf(type: BuildingType): number {
    let n = 0
    for (const t of state.city) if (t.type === type) n++
    return n
  }
  function nextCost(b: BuildingDef): Partial<Materials> {
    return buildingCost(b, countOf(b.type))
  }

  return (
    <div className="panel p-5 flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">Your city</h2>
        <div className="text-xs text-white/50">
          Pop {state.population} · City XP {state.cityXp}
        </div>
      </div>

      <div className="relative grow min-h-[320px] rounded-md overflow-hidden bg-gradient-to-b from-[#9fc4e8] to-[#cfe1f3]">
        <Canvas dpr={[1, 2]} shadows>
          <OrthographicCamera
            makeDefault
            position={[span * 1.1, span * 0.85, span * 1.1]}
            zoom={Math.min(36, 260 / grid)}
            near={-100}
            far={200}
          />
          <CameraRig />
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[span, span * 1.6, span * 0.6]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <Suspense fallback={null}>
            <CityScene
              tiles={state.city}
              grid={grid}
              selectedTile={selectedTile}
              constructionTileId={construction?.tileId ?? null}
              constructionBuilding={construction?.building ?? null}
              constructionProgress={construction?.progress ?? 0}
              onPick={id => setSelectedTile(id)}
            />
          </Suspense>
        </Canvas>
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
            const levelLocked = state.level < b.unlockLevel
            const sessionLocked = sessionsDone < b.unlockSessions
            const locked = levelLocked || sessionLocked
            const cost = nextCost(b)
            const afford = canAfford(cost)
            const active = picker === b.type
            const lockTip = sessionLocked
              ? `(${b.unlockSessions - sessionsDone} more sessions)`
              : levelLocked
                ? `(unlocks at lvl ${b.unlockLevel})`
                : ''
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
                title={`${b.name} — ${costLabel({ cost })} ${lockTip}`}
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
    const levelLocked = state.level < def.unlockLevel
    const sessionLocked = sessionsDone < def.unlockSessions
    const owned = countOf(building)
    const cost = nextCost(def)
    const affordable = canAfford(cost)
    const disabled = !!occupied || levelLocked || sessionLocked || !affordable
    let reason = ''
    if (occupied) reason = 'Tile is occupied'
    else if (levelLocked) reason = `Unlocks at level ${def.unlockLevel}`
    else if (sessionLocked) reason = `${def.unlockSessions - sessionsDone} more sessions`
    else if (!affordable) reason = 'Not enough materials'

    return (
      <div className="mt-2 flex items-center justify-between gap-2 bg-white/5 rounded p-2">
        <div className="text-xs">
          <div className="font-semibold">
            {def.emoji} {def.name}
            {owned > 0 && <span className="ml-2 text-white/40">×{owned}</span>}
          </div>
          <div className="text-white/50">{costLabel({ cost })}</div>
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

function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

interface SceneProps {
  tiles: CityTile[]
  grid: number
  selectedTile: string | null
  constructionTileId: string | null
  constructionBuilding: BuildingType | null
  constructionProgress: number
  onPick: (id: string) => void
}

function CityScene({
  tiles, grid, selectedTile, constructionTileId, constructionBuilding, constructionProgress, onPick,
}: SceneProps) {
  const half = (grid - 1) / 2
  const baseSize = grid * (TILE + GAP)

  return (
    <group>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[baseSize + 0.4, 0.12, baseSize + 0.4]} />
        <meshStandardMaterial color="#5C4533" />
      </mesh>
      <mesh position={[0, 0.001, 0]} receiveShadow>
        <boxGeometry args={[baseSize, 0.02, baseSize]} />
        <meshStandardMaterial color="#7CB76A" />
      </mesh>

      {tiles.map(tile => {
        const px = (tile.x - half) * (TILE + GAP)
        const pz = (tile.y - half) * (TILE + GAP)
        const isConstruction = constructionTileId === tile.id && tile.type === 'empty'
        const selected = selectedTile === tile.id
        const empty = tile.type === 'empty' && !isConstruction

        return (
          <group key={tile.id} position={[px, 0, pz]}>
            <mesh
              position={[0, 0.011, 0]}
              onClick={e => { e.stopPropagation(); onPick(tile.id) }}
              onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = '' }}
              receiveShadow
            >
              <boxGeometry args={[TILE * 0.96, 0.02, TILE * 0.96]} />
              <meshStandardMaterial
                color={selected ? '#ffe28a' : empty ? '#8FCB78' : '#7CB76A'}
                transparent={empty}
                opacity={empty ? 0.65 : 1}
              />
            </mesh>

            {tile.type !== 'empty' && (
              <BuildingMesh type={tile.type} selected={selected} seed={tile.id} />
            )}

            {isConstruction && constructionBuilding && (
              <BuildingMesh
                type={constructionBuilding}
                selected={selected}
                progress={constructionProgress}
                seed={tile.id}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

function costLabel(b: { cost: Partial<Record<string, number>> }) {
  return Object.entries(b.cost).map(([k, v]) => `${v} ${k}`).join(' · ')
}
