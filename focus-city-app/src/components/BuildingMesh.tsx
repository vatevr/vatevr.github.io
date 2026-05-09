import { useMemo } from 'react'
import { useFBX } from '@react-three/drei'
import { Box3, Vector3, Color, MeshStandardMaterial, Mesh } from 'three'
import type { Object3D } from 'three'
import type { BuildingType } from '../types'

const MEDIEVAL_BASE = `${import.meta.env.BASE_URL}models/medieval`
const TARGET_FOOTPRINT = 1.05
const TINT_STRENGTH = 0.55

type ModelMapping = {
  file: string
  scale?: number
  rotationY?: number
  yOffset?: number
  tint?: string
}

const HOUSE_VARIANTS = ['House_1.fbx', 'House_2.fbx', 'House_3.fbx', 'House_4.fbx']

const MODEL_MAP: Partial<Record<BuildingType, ModelMapping>> = {
  house: { file: 'House_1.fbx' },
  road: { file: 'Path_Straight.fbx' },
  garden: { file: 'Gazebo.fbx', scale: 0.85 },
  farm: { file: 'Hay.fbx', scale: 0.95 },
  well: { file: 'Well.fbx', scale: 0.8 },
  market: { file: 'MarketStand_1.fbx' },
  workshop: { file: 'Blacksmith.fbx' },
  mill: { file: 'Mill.fbx' },
  bridge: { file: 'Path_Straight.fbx' },
  wall: { file: 'Fence.fbx' },
  tower: { file: 'Bell_Tower.fbx', scale: 0.9 },
  townhall: { file: 'Inn.fbx' },
  library: { file: 'House_2.fbx', tint: '#B49872' },
  academy: { file: 'House_3.fbx', tint: '#E8DBA8' },
  cathedral: { file: 'Bell_Tower.fbx', scale: 1.2, tint: '#EAE3D2' },
  castle: { file: 'Inn.fbx', scale: 1.15, tint: '#A8A8B0' },
  observatory: { file: 'Bell_Tower.fbx', scale: 0.95, rotationY: Math.PI / 4, tint: '#9FC4E8' },
  harbor: { file: 'Sawmill.fbx', tint: '#7BA0B8' },
  clocktower: { file: 'Bell_Tower.fbx', tint: '#D9B25C' },
  university: { file: 'Inn.fbx', scale: 1.05, tint: '#F5E6BD' },
  monument: { file: 'Bell.fbx', scale: 0.7, tint: '#E0B441' },
  wizardtower: { file: 'Bell_Tower.fbx', scale: 1.1, tint: '#9F7AD4' },
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return h
}

function resolveMapping(type: BuildingType, seed?: string): ModelMapping | undefined {
  if (type === 'house' && seed) {
    const h = hashSeed(seed)
    const idx = ((h % HOUSE_VARIANTS.length) + HOUSE_VARIANTS.length) % HOUSE_VARIANTS.length
    return { file: HOUSE_VARIANTS[idx] }
  }
  return MODEL_MAP[type]
}

interface Props {
  type: BuildingType
  selected?: boolean
  progress?: number
  seed?: string
}

export function BuildingMesh({ type, selected, progress = 1, seed }: Props) {
  const mapping = resolveMapping(type, seed)
  const scale = Math.max(0.05, Math.min(1, progress))

  if (mapping) {
    return (
      <group scale={[1, scale, 1]} rotation={[0, mapping.rotationY ?? 0, 0]}>
        <FbxBuilding
          file={mapping.file}
          modelScale={mapping.scale ?? 1}
          yOffset={mapping.yOffset ?? 0}
          tint={mapping.tint}
          selected={selected}
        />
      </group>
    )
  }

  return (
    <group scale={[1, scale, 1]}>
      <FallbackBox type={type} selected={selected} progress={progress} />
    </group>
  )
}

interface FbxProps {
  file: string
  modelScale: number
  yOffset: number
  tint?: string
  selected?: boolean
}

function FbxBuilding({ file, modelScale, yOffset, tint, selected }: FbxProps) {
  const fbx = useFBX(`${MEDIEVAL_BASE}/${file}`)

  const prepared = useMemo<Object3D>(() => {
    const cloned = fbx.clone(true)

    const box = new Box3().setFromObject(cloned)
    const size = new Vector3()
    box.getSize(size)
    const maxXZ = Math.max(size.x, size.z)
    const norm = maxXZ > 0 ? TARGET_FOOTPRINT / maxXZ : 1
    cloned.scale.multiplyScalar(norm * modelScale)

    const grounded = new Box3().setFromObject(cloned)
    cloned.position.y -= grounded.min.y - yOffset

    const tintColor = tint ? new Color(tint) : null

    cloned.traverse(obj => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[]
      const cloneMat = (m: MeshStandardMaterial) => {
        const c = m.clone()
        if (tintColor && 'color' in c) {
          c.color.lerp(tintColor, TINT_STRENGTH)
        }
        if (selected && 'emissive' in c) {
          c.emissive.set('#ffd76a')
          c.emissiveIntensity = 0.3
        }
        return c
      }
      if (Array.isArray(mat)) {
        mesh.material = mat.map(m => cloneMat(m as MeshStandardMaterial))
      } else if (mat) {
        mesh.material = cloneMat(mat as MeshStandardMaterial)
      }
    })

    return cloned
  }, [fbx, modelScale, yOffset, tint, selected])

  return <primitive object={prepared} />
}

type Profile = {
  width: number
  depth: number
  height: number
  body: string
  accent: string
  roof?: string
  trim?: 'stripes' | 'flat' | 'tower' | 'dome' | 'spire' | 'slab'
}

const CREAM = '#F1E6CE'
const BLUE = '#2E5A8E'
const STONE = '#A9A29A'
const GOLD = '#D9B25C'

const FALLBACK_PROFILES: Partial<Record<BuildingType, Profile>> = {
  // every type is mapped above; this stays for future additions
  house: { width: 0.7, depth: 0.7, height: 0.6, body: CREAM, accent: BLUE, roof: '#B5483A', trim: 'flat' },
  tower: { width: 0.5, depth: 0.5, height: 1.1, body: STONE, accent: BLUE, trim: 'tower' },
  monument: { width: 0.4, depth: 0.4, height: 1.15, body: GOLD, accent: '#8C6A2C', trim: 'spire' },
}

function FallbackBox({ type, selected, progress = 1 }: Props) {
  const p = FALLBACK_PROFILES[type] ?? FALLBACK_PROFILES.house!
  const opacity = progress < 1 ? 0.6 + progress * 0.4 : 1
  const emissive = selected ? '#ffd76a' : '#000000'
  const emissiveIntensity = selected ? 0.35 : 0

  return (
    <group>
      <mesh position={[0, p.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[p.width, p.height, p.depth]} />
        <meshStandardMaterial
          color={p.body}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          transparent={progress < 1}
          opacity={opacity}
        />
      </mesh>
      {p.roof && (
        <mesh position={[0, p.height + 0.04, 0]}>
          <boxGeometry args={[p.width + 0.05, 0.08, p.depth + 0.05]} />
          <meshStandardMaterial color={p.roof} />
        </mesh>
      )}
    </group>
  )
}
