import type { BuildingDef, Materials, Priority } from './types'

export const EMPTY_MATERIALS: Materials = {
  wood: 0, stone: 0, gold: 0, food: 0, knowledge: 0, crystal: 0,
}

export function addMaterials(a: Materials, b: Partial<Materials>): Materials {
  const out: Materials = { ...a }
  for (const k of Object.keys(b) as (keyof Materials)[]) {
    out[k] = (out[k] ?? 0) + (b[k] ?? 0)
  }
  return out
}

export function canAfford(have: Materials, cost: Partial<Materials>): boolean {
  for (const k of Object.keys(cost) as (keyof Materials)[]) {
    if ((have[k] ?? 0) < (cost[k] ?? 0)) return false
  }
  return true
}

export function spend(have: Materials, cost: Partial<Materials>): Materials {
  const out: Materials = { ...have }
  for (const k of Object.keys(cost) as (keyof Materials)[]) {
    out[k] = (out[k] ?? 0) - (cost[k] ?? 0)
  }
  return out
}

export function buildingCost(def: BuildingDef, count: number): Partial<Materials> {
  const factor = Math.pow(def.costMultiplier, Math.max(0, count))
  const out: Partial<Materials> = {}
  for (const k of Object.keys(def.cost) as (keyof Materials)[]) {
    const base = def.cost[k] ?? 0
    if (base > 0) out[k] = Math.ceil(base * factor)
  }
  return out
}

export function focusReward(durationMinutes: number, completed: boolean): {
  materials: Materials; xp: number; cityXp: number; population: number
} {
  if (!completed) {
    return { materials: { ...EMPTY_MATERIALS }, xp: Math.floor(durationMinutes / 4), cityXp: 0, population: 0 }
  }
  const m = durationMinutes
  return {
    materials: {
      ...EMPTY_MATERIALS,
      wood: Math.round(m * 0.6),
      stone: Math.round(m * 0.4),
      gold: Math.round(m * 0.5),
      knowledge: m >= 60 ? Math.floor(m / 60) : 0,
      crystal: m >= 90 ? 1 : 0,
    },
    xp: Math.round(m * 1.2),
    cityXp: Math.round(m * 0.8),
    population: m >= 25 ? 1 : 0,
  }
}

export function taskReward(priority: Priority): { materials: Partial<Materials>; xp: number } {
  switch (priority) {
    case 'low': return { materials: { gold: 5 }, xp: 5 }
    case 'medium': return { materials: { gold: 10, wood: 5 }, xp: 10 }
    case 'high': return { materials: { gold: 20, stone: 10 }, xp: 20 }
    case 'critical': return { materials: { gold: 30, crystal: Math.random() < 0.25 ? 1 : 0 }, xp: 35 }
  }
}

export function habitReward(streak: number): { materials: Partial<Materials>; xp: number } {
  let bonus = 1
  if (streak >= 30) bonus = 1.5
  else if (streak >= 7) bonus = 1.25
  else if (streak >= 3) bonus = 1.1
  return {
    materials: {
      food: Math.round(8 * bonus),
      knowledge: Math.round(2 * bonus),
      gold: Math.round(5 * bonus),
    },
    xp: Math.round(8 * bonus),
  }
}

export function levelFromXp(xp: number): number {
  let level = 1, needed = 100, acc = 0
  while (xp >= acc + needed) {
    acc += needed
    level++
    needed = level * 100
  }
  return level
}

export function xpForNextLevel(level: number): { current: number; needed: number } {
  let needed = 100, acc = 0
  for (let i = 1; i < level; i++) {
    acc += needed
    needed = (i + 1) * 100
  }
  return { current: acc, needed: acc + needed }
}
