import type { BuildingDef, BuildingType } from './types'

const EVERYDAY = 1.15
const CIVIC = 1.22
const LANDMARK = 1.35

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house: { type: 'house', name: 'House', cost: { wood: 20, stone: 5 }, costMultiplier: EVERYDAY, emoji: '🏠', premium: false, unlockLevel: 1, unlockSessions: 0, description: 'Shelters citizens.' },
  road: { type: 'road', name: 'Road', cost: { stone: 10 }, costMultiplier: EVERYDAY, emoji: '🛣️', premium: false, unlockLevel: 1, unlockSessions: 0, description: 'Connects districts.' },
  garden: { type: 'garden', name: 'Garden', cost: { wood: 10, food: 5 }, costMultiplier: EVERYDAY, emoji: '🌷', premium: false, unlockLevel: 2, unlockSessions: 0, description: 'Calms the city.' },
  farm: { type: 'farm', name: 'Farm', cost: { wood: 20, gold: 10 }, costMultiplier: EVERYDAY, emoji: '🌾', premium: false, unlockLevel: 3, unlockSessions: 5, description: 'Generates food.' },
  well: { type: 'well', name: 'Well', cost: { stone: 25 }, costMultiplier: EVERYDAY, emoji: '⛲', premium: false, unlockLevel: 3, unlockSessions: 0, description: 'Vital water source.' },
  mill: { type: 'mill', name: 'Mill', cost: { wood: 40, stone: 10 }, costMultiplier: EVERYDAY, emoji: '🌬️', premium: false, unlockLevel: 5, unlockSessions: 5, description: 'Grinds grain.' },
  bridge: { type: 'bridge', name: 'Bridge', cost: { stone: 40, wood: 20 }, costMultiplier: EVERYDAY, emoji: '🌉', premium: false, unlockLevel: 7, unlockSessions: 30, description: 'Spans rivers.' },
  wall: { type: 'wall', name: 'Wall', cost: { stone: 50 }, costMultiplier: EVERYDAY, emoji: '🧱', premium: false, unlockLevel: 8, unlockSessions: 30, description: 'Defends the city.' },
  market: { type: 'market', name: 'Market', cost: { wood: 30, gold: 30 }, costMultiplier: CIVIC, emoji: '🛒', premium: false, unlockLevel: 5, unlockSessions: 15, description: 'Trade hub.' },
  workshop: { type: 'workshop', name: 'Workshop', cost: { wood: 30, stone: 20 }, costMultiplier: CIVIC, emoji: '🔨', premium: false, unlockLevel: 5, unlockSessions: 15, description: 'Crafts city goods.' },
  tower: { type: 'tower', name: 'Watchtower', cost: { stone: 80, gold: 40 }, costMultiplier: CIVIC, emoji: '🗼', premium: false, unlockLevel: 10, unlockSessions: 15, description: 'Spots distractions.' },
  townhall: { type: 'townhall', name: 'Town Hall', cost: { wood: 60, stone: 60, gold: 50 }, costMultiplier: CIVIC, emoji: '🏛️', premium: false, unlockLevel: 12, unlockSessions: 30, description: 'Heart of the city.' },
  library: { type: 'library', name: 'Library', cost: { wood: 50, stone: 30, gold: 20 }, costMultiplier: CIVIC, emoji: '📚', premium: true, unlockLevel: 15, unlockSessions: 15, description: 'Stores knowledge.' },
  academy: { type: 'academy', name: 'Academy', cost: { wood: 80, stone: 60, gold: 40, knowledge: 5 }, costMultiplier: CIVIC, emoji: '🎓', premium: true, unlockLevel: 18, unlockSessions: 30, description: 'Teaches focus.' },
  harbor: { type: 'harbor', name: 'Harbor', cost: { wood: 120, stone: 80, gold: 60 }, costMultiplier: CIVIC, emoji: '⚓', premium: true, unlockLevel: 24, unlockSessions: 30, description: 'Trade by sea.' },
  cathedral: { type: 'cathedral', name: 'Cathedral', cost: { stone: 150, gold: 100 }, costMultiplier: LANDMARK, emoji: '⛪', premium: true, unlockLevel: 20, unlockSessions: 75, description: 'Inspires discipline.' },
  castle: { type: 'castle', name: 'Castle', cost: { stone: 200, gold: 150, wood: 100 }, costMultiplier: LANDMARK, emoji: '🏰', premium: true, unlockLevel: 20, unlockSessions: 75, description: 'Symbol of mastery.' },
  observatory: { type: 'observatory', name: 'Observatory', cost: { stone: 100, gold: 80, knowledge: 10 }, costMultiplier: LANDMARK, emoji: '🔭', premium: true, unlockLevel: 22, unlockSessions: 150, description: 'Watches the cosmos.' },
  clocktower: { type: 'clocktower', name: 'Clocktower', cost: { stone: 120, gold: 90, crystal: 1 }, costMultiplier: LANDMARK, emoji: '🕰️', premium: true, unlockLevel: 25, unlockSessions: 150, description: 'Counts focused hours.' },
  university: { type: 'university', name: 'University', cost: { stone: 120, gold: 100, knowledge: 5 }, costMultiplier: LANDMARK, emoji: '🏫', premium: true, unlockLevel: 28, unlockSessions: 150, description: 'Cultivates wisdom.' },
  monument: { type: 'monument', name: 'Monument', cost: { stone: 150, gold: 120, crystal: 2 }, costMultiplier: LANDMARK, emoji: '🗿', premium: true, unlockLevel: 30, unlockSessions: 150, description: 'Marks great streaks.' },
  wizardtower: { type: 'wizardtower', name: 'Wizard Tower', cost: { stone: 180, gold: 150, crystal: 3, knowledge: 10 }, costMultiplier: LANDMARK, emoji: '🧙', premium: true, unlockLevel: 35, unlockSessions: 150, description: 'Channels arcane focus.' },
}

export const BUILDING_LIST: BuildingDef[] = Object.values(BUILDINGS).sort(
  (a, b) => a.unlockLevel - b.unlockLevel,
)

export function tileEmoji(type: string): string {
  if (type === 'empty') return ''
  const def = BUILDINGS[type as BuildingType]
  return def?.emoji ?? '·'
}
