import type { BuildingDef, BuildingType } from './types'

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house: { type: 'house', name: 'House', cost: { wood: 20, stone: 5 }, emoji: '🏠', premium: false, unlockLevel: 1, description: 'Shelters citizens.' },
  road: { type: 'road', name: 'Road', cost: { stone: 10 }, emoji: '🛣️', premium: false, unlockLevel: 1, description: 'Connects districts.' },
  garden: { type: 'garden', name: 'Garden', cost: { wood: 10, food: 5 }, emoji: '🌷', premium: false, unlockLevel: 2, description: 'Calms the city.' },
  farm: { type: 'farm', name: 'Farm', cost: { wood: 20, gold: 10 }, emoji: '🌾', premium: false, unlockLevel: 3, description: 'Generates food.' },
  well: { type: 'well', name: 'Well', cost: { stone: 25 }, emoji: '⛲', premium: false, unlockLevel: 3, description: 'Vital water source.' },
  market: { type: 'market', name: 'Market', cost: { wood: 30, gold: 30 }, emoji: '🛒', premium: false, unlockLevel: 5, description: 'Trade hub.' },
  workshop: { type: 'workshop', name: 'Workshop', cost: { wood: 30, stone: 20 }, emoji: '🔨', premium: false, unlockLevel: 5, description: 'Crafts city goods.' },
  mill: { type: 'mill', name: 'Mill', cost: { wood: 40, stone: 10 }, emoji: '🌬️', premium: false, unlockLevel: 5, description: 'Grinds grain.' },
  bridge: { type: 'bridge', name: 'Bridge', cost: { stone: 40, wood: 20 }, emoji: '🌉', premium: false, unlockLevel: 7, description: 'Spans rivers.' },
  wall: { type: 'wall', name: 'Wall', cost: { stone: 50 }, emoji: '🧱', premium: false, unlockLevel: 8, description: 'Defends the city.' },
  tower: { type: 'tower', name: 'Watchtower', cost: { stone: 80, gold: 40 }, emoji: '🗼', premium: false, unlockLevel: 10, description: 'Spots distractions.' },
  townhall: { type: 'townhall', name: 'Town Hall', cost: { wood: 60, stone: 60, gold: 50 }, emoji: '🏛️', premium: false, unlockLevel: 12, description: 'Heart of the city.' },
  library: { type: 'library', name: 'Library', cost: { wood: 50, stone: 30, gold: 20 }, emoji: '📚', premium: true, unlockLevel: 15, description: 'Stores knowledge.' },
  academy: { type: 'academy', name: 'Academy', cost: { wood: 80, stone: 60, gold: 40, knowledge: 5 }, emoji: '🎓', premium: true, unlockLevel: 18, description: 'Teaches focus.' },
  cathedral: { type: 'cathedral', name: 'Cathedral', cost: { stone: 150, gold: 100 }, emoji: '⛪', premium: true, unlockLevel: 20, description: 'Inspires discipline.' },
  castle: { type: 'castle', name: 'Castle', cost: { stone: 200, gold: 150, wood: 100 }, emoji: '🏰', premium: true, unlockLevel: 20, description: 'Symbol of mastery.' },
  observatory: { type: 'observatory', name: 'Observatory', cost: { stone: 100, gold: 80, knowledge: 10 }, emoji: '🔭', premium: true, unlockLevel: 22, description: 'Watches the cosmos.' },
  harbor: { type: 'harbor', name: 'Harbor', cost: { wood: 120, stone: 80, gold: 60 }, emoji: '⚓', premium: true, unlockLevel: 24, description: 'Trade by sea.' },
  clocktower: { type: 'clocktower', name: 'Clocktower', cost: { stone: 120, gold: 90, crystal: 1 }, emoji: '🕰️', premium: true, unlockLevel: 25, description: 'Counts focused hours.' },
  university: { type: 'university', name: 'University', cost: { stone: 120, gold: 100, knowledge: 5 }, emoji: '🏫', premium: true, unlockLevel: 28, description: 'Cultivates wisdom.' },
  monument: { type: 'monument', name: 'Monument', cost: { stone: 150, gold: 120, crystal: 2 }, emoji: '🗿', premium: true, unlockLevel: 30, description: 'Marks great streaks.' },
  wizardtower: { type: 'wizardtower', name: 'Wizard Tower', cost: { stone: 180, gold: 150, crystal: 3, knowledge: 10 }, emoji: '🧙', premium: true, unlockLevel: 35, description: 'Channels arcane focus.' },
}

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS).sort(
  (a, b) => a.unlockLevel - b.unlockLevel,
)

export function tileEmoji(type: string): string {
  if (type === 'empty') return ''
  const def = BUILDINGS[type as BuildingType]
  return def?.emoji ?? '·'
}
