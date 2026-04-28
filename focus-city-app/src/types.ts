export type MaterialKey = 'wood' | 'stone' | 'gold' | 'food' | 'knowledge' | 'crystal'

export type Materials = Record<MaterialKey, number>

export type BuildingType =
  | 'house'
  | 'road'
  | 'farm'
  | 'well'
  | 'market'
  | 'workshop'
  | 'library'
  | 'tower'
  | 'wall'
  | 'bridge'
  | 'mill'
  | 'townhall'
  | 'garden'
  | 'academy'
  | 'cathedral'
  | 'observatory'
  | 'castle'
  | 'harbor'
  | 'clocktower'
  | 'university'
  | 'monument'
  | 'wizardtower'

export type TileType = 'empty' | BuildingType

export interface CityTile {
  id: string
  x: number
  y: number
  type: TileType
  level: number
  placedAt?: string
}

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  completed: boolean
  createdAt: string
  dueDate?: string
}

export interface Habit {
  id: string
  title: string
  streak: number
  completedToday: boolean
  lastCompletedDate?: string
  createdAt: string
}

export type FocusStatus = 'completed' | 'abandoned'

export interface FocusSession {
  id: string
  durationMinutes: number
  startedAt: string
  completedAt?: string
  status: FocusStatus
  rewards: Materials
}

export type AmbientTrack =
  | 'none'
  | 'rain'
  | 'thunder'
  | 'wind'
  | 'forest'
  | 'fireplace'
  | 'rails'
  | 'cafe'
  | 'night'
  | 'drones'

export type MusicTrack = 'landscape' | 'wanderer' | 'embers'

export interface Settings {
  musicOn: boolean
  volume: number
  sfxOn: boolean
  ambientTrack: AmbientTrack
  strictMode: boolean
  focusMusicOn: boolean
  focusMusicTrack: MusicTrack
  focusMusicVolume: number
}

export interface UserState {
  level: number
  xp: number
  materials: Materials
  city: CityTile[]
  tasks: Task[]
  habits: Habit[]
  focusHistory: FocusSession[]
  settings: Settings
  population: number
  cityXp: number
  gridSize: number
  createdAt: string
}

export interface BuildingDef {
  type: BuildingType
  name: string
  cost: Partial<Materials>
  emoji: string
  premium: boolean
  unlockLevel: number
  description: string
}
