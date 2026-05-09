import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  BuildingType, CityTile, FocusSession, Habit, Materials, Priority, Settings, Task, UserState,
} from './types'
import { BUILDINGS } from './buildings'
import {
  EMPTY_MATERIALS, addMaterials, buildingCost, canAfford, focusReward, habitReward, levelFromXp, spend, taskReward,
} from './rewards'

const STORAGE_KEY = 'focus-kingdom:state:v1'
const GRID = 9

export interface ConstructionState {
  tileId: string
  building: BuildingType
  progress: number
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function todayStr(d: Date = new Date()) {
  return d.toISOString().slice(0, 10)
}

function emptyCity(size: number): CityTile[] {
  const tiles: CityTile[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tiles.push({ id: `${x}-${y}`, x, y, type: 'empty', level: 0 })
    }
  }
  return tiles
}

function makeInitialState(): UserState {
  return {
    level: 1,
    xp: 0,
    materials: { ...EMPTY_MATERIALS, wood: 30, stone: 15, gold: 20, food: 10 },
    city: emptyCity(GRID),
    tasks: [
      { id: uid(), title: 'Set your first 25-minute focus', priority: 'medium', completed: false, createdAt: new Date().toISOString() },
    ],
    habits: [
      { id: uid(), title: 'Plan tomorrow', streak: 0, completedToday: false, createdAt: new Date().toISOString() },
    ],
    focusHistory: [],
    settings: {
      musicOn: false,
      volume: 0.4,
      sfxOn: true,
      ambientTrack: 'rain',
      strictMode: false,
      focusMusicOn: false,
      focusMusicTrack: 'landscape',
      focusMusicVolume: 0.35,
    },
    population: 0,
    cityXp: 0,
    gridSize: GRID,
    createdAt: new Date().toISOString(),
  }
}

function load(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return makeInitialState()
    const parsed = JSON.parse(raw) as UserState
    return {
      ...makeInitialState(),
      ...parsed,
      materials: { ...EMPTY_MATERIALS, ...parsed.materials },
      settings: { ...makeInitialState().settings, ...parsed.settings },
    }
  } catch {
    return makeInitialState()
  }
}

type Action =
  | { type: 'completeFocus'; durationMinutes: number; startedAt: string }
  | { type: 'abandonFocus'; durationMinutes: number; startedAt: string; elapsedMinutes: number }
  | { type: 'placeBuilding'; tileId: string; building: BuildingType }
  | { type: 'addTask'; title: string; priority: Priority; description?: string; dueDate?: string }
  | { type: 'completeTask'; id: string }
  | { type: 'deleteTask'; id: string }
  | { type: 'addHabit'; title: string }
  | { type: 'completeHabit'; id: string }
  | { type: 'deleteHabit'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'reset' }
  | { type: 'rolloverIfNeeded' }

function countOfType(city: UserState['city'], type: BuildingType): number {
  let n = 0
  for (const t of city) if (t.type === type) n++
  return n
}

function completedSessionCount(state: UserState): number {
  let n = 0
  for (const s of state.focusHistory) if (s.status === 'completed') n++
  return n
}

function autoPlace(state: UserState, building: BuildingType): UserState {
  const empty = state.city.find(t => t.type === 'empty')
  if (!empty) return state
  const def = BUILDINGS[building]
  if (state.level < def.unlockLevel) return state
  if (completedSessionCount(state) < def.unlockSessions) return state
  const cost = buildingCost(def, countOfType(state.city, building))
  if (!canAfford(state.materials, cost)) return state
  return {
    ...state,
    materials: spend(state.materials, cost),
    city: state.city.map(t =>
      t.id === empty.id ? { ...t, type: building, level: 1, placedAt: new Date().toISOString() } : t,
    ),
  }
}

function applyXp(state: UserState, gainedXp: number): UserState {
  const xp = state.xp + gainedXp
  return { ...state, xp, level: levelFromXp(xp) }
}

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'completeFocus': {
      const reward = focusReward(action.durationMinutes, true)
      const session: FocusSession = {
        id: uid(),
        durationMinutes: action.durationMinutes,
        startedAt: action.startedAt,
        completedAt: new Date().toISOString(),
        status: 'completed',
        rewards: reward.materials,
      }
      let next: UserState = {
        ...state,
        materials: addMaterials(state.materials, reward.materials),
        focusHistory: [session, ...state.focusHistory].slice(0, 200),
        population: state.population + reward.population,
        cityXp: state.cityXp + reward.cityXp,
      }
      next = applyXp(next, reward.xp)
      const completedCount = next.focusHistory.filter(s => s.status === 'completed').length
      if (action.durationMinutes >= 25) next = autoPlace(next, 'house')
      if (completedCount % 3 === 0) next = autoPlace(next, 'road')
      if (action.durationMinutes >= 60) next = autoPlace(next, 'farm')
      if (action.durationMinutes >= 90 && next.level >= 8) next = autoPlace(next, 'tower')
      return next
    }
    case 'abandonFocus': {
      const partial = action.elapsedMinutes >= action.durationMinutes / 2
      const reward = focusReward(action.elapsedMinutes, false)
      const session: FocusSession = {
        id: uid(),
        durationMinutes: action.durationMinutes,
        startedAt: action.startedAt,
        completedAt: new Date().toISOString(),
        status: 'abandoned',
        rewards: { ...EMPTY_MATERIALS },
      }
      let next: UserState = {
        ...state,
        focusHistory: [session, ...state.focusHistory].slice(0, 200),
      }
      if (partial) next = applyXp(next, reward.xp)
      return next
    }
    case 'placeBuilding': {
      const tile = state.city.find(t => t.id === action.tileId)
      if (!tile || tile.type !== 'empty') return state
      const def = BUILDINGS[action.building]
      if (state.level < def.unlockLevel) return state
      if (completedSessionCount(state) < def.unlockSessions) return state
      const cost = buildingCost(def, countOfType(state.city, action.building))
      if (!canAfford(state.materials, cost)) return state
      return {
        ...state,
        materials: spend(state.materials, cost),
        city: state.city.map(t =>
          t.id === action.tileId
            ? { ...t, type: action.building, level: 1, placedAt: new Date().toISOString() }
            : t,
        ),
      }
    }
    case 'addTask': {
      const task: Task = {
        id: uid(),
        title: action.title.trim(),
        description: action.description,
        priority: action.priority,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: action.dueDate,
      }
      if (!task.title) return state
      return { ...state, tasks: [task, ...state.tasks] }
    }
    case 'completeTask': {
      const t = state.tasks.find(t => t.id === action.id)
      if (!t || t.completed) return state
      const r = taskReward(t.priority)
      let next: UserState = {
        ...state,
        materials: addMaterials(state.materials, r.materials),
        tasks: state.tasks.map(x => (x.id === action.id ? { ...x, completed: true } : x)),
      }
      next = applyXp(next, r.xp)
      return next
    }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) }
    case 'addHabit': {
      const h: Habit = {
        id: uid(),
        title: action.title.trim(),
        streak: 0,
        completedToday: false,
        createdAt: new Date().toISOString(),
      }
      if (!h.title) return state
      return { ...state, habits: [h, ...state.habits] }
    }
    case 'completeHabit': {
      const habit = state.habits.find(h => h.id === action.id)
      if (!habit || habit.completedToday) return state
      const today = todayStr()
      const yesterday = todayStr(new Date(Date.now() - 86_400_000))
      const newStreak = habit.lastCompletedDate === yesterday ? habit.streak + 1 : 1
      const r = habitReward(newStreak)
      let next: UserState = {
        ...state,
        materials: addMaterials(state.materials, r.materials),
        habits: state.habits.map(h =>
          h.id === action.id
            ? { ...h, streak: newStreak, completedToday: true, lastCompletedDate: today }
            : h,
        ),
      }
      next = applyXp(next, r.xp)
      return next
    }
    case 'deleteHabit':
      return { ...state, habits: state.habits.filter(h => h.id !== action.id) }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'reset':
      return makeInitialState()
    case 'rolloverIfNeeded': {
      const today = todayStr()
      let changed = false
      const habits = state.habits.map(h => {
        if (h.completedToday && h.lastCompletedDate !== today) {
          changed = true
          return { ...h, completedToday: false }
        }
        if (!h.completedToday && h.lastCompletedDate && h.lastCompletedDate !== today) {
          const daysSince = Math.floor(
            (Date.parse(today) - Date.parse(h.lastCompletedDate)) / 86_400_000,
          )
          if (daysSince > 1 && h.streak !== 0) {
            changed = true
            return { ...h, streak: 0 }
          }
        }
        return h
      })
      return changed ? { ...state, habits } : state
    }
  }
}

interface Ctx {
  state: UserState
  totals: { completedSessions: number; abandonedSessions: number; totalFocusMinutes: number }
  dispatch: React.Dispatch<Action>
  canAfford: (cost: Partial<Materials>) => boolean
  construction: ConstructionState | null
  setConstruction: (c: ConstructionState | null) => void
  nextEmptyTileId: () => string | null
}

const StateContext = createContext<Ctx | null>(null)

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [construction, setConstruction] = useState<ConstructionState | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    dispatch({ type: 'rolloverIfNeeded' })
    const id = setInterval(() => dispatch({ type: 'rolloverIfNeeded' }), 60_000)
    return () => clearInterval(id)
  }, [])

  const totals = useMemo(() => {
    const completed = state.focusHistory.filter(s => s.status === 'completed')
    return {
      completedSessions: completed.length,
      abandonedSessions: state.focusHistory.length - completed.length,
      totalFocusMinutes: completed.reduce((acc, s) => acc + s.durationMinutes, 0),
    }
  }, [state.focusHistory])

  const value: Ctx = {
    state,
    totals,
    dispatch,
    canAfford: cost => canAfford(state.materials, cost),
    construction,
    setConstruction,
    nextEmptyTileId: () => state.city.find(t => t.type === 'empty')?.id ?? null,
  }

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>
}

export function useGame(): Ctx {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useGame must be used within StateProvider')
  return ctx
}

