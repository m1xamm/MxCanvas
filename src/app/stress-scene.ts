import { CreateNodesCommand } from '../core/commands/create-nodes-command'
import { createRectangleNode, DEFAULT_STROKE } from '../core/document/create-node'
import type { RectangleNode, RgbColor } from '../core/document/types'
import { cloneEffect, DEFAULT_DROP_SHADOW } from '../core/effects'
import { history, scene } from './editor'

const STRESS_PARAM = 'stress'
const TILE_STEP = 24
const NODE_SIZE = 20
const AREA_ASPECT = 2
const STROKE_EVERY = 3
const SHADOW_EVERY = 20
const SHADOW_OFFSET = 6
const SHADOW_BLUR = 12
const SHADOW_SPREAD = 0
const MAX_COUNT = 20000
const MULTIPLIER = 1103515245
const INCREMENT = 12345
const SEED = 36631

const PALETTE: readonly RgbColor[] = [
  { r: 217, g: 217, b: 217 },
  { r: 255, g: 138, b: 61 },
  { r: 76, g: 175, b: 80 },
  { r: 66, g: 165, b: 245 },
  { r: 236, g: 64, b: 122 },
  { r: 255, g: 202, b: 40 },
  { r: 156, g: 39, b: 176 },
  { r: 38, g: 198, b: 218 },
]

const FILL_OPACITY: readonly number[] = [1, 0.85, 0.7, 0.55]
const CORNERS: readonly number[] = [0, 0, 4, 8, 10]

export function stressNodeCount(search: string): number | null {
  const raw = new URLSearchParams(search).get(STRESS_PARAM)
  if (raw === null) return null
  const count = Number.parseInt(raw, 10)
  if (!Number.isFinite(count) || count <= 0) return null
  return Math.min(count, MAX_COUNT)
}

export function loadStressSceneFromLocation(): void {
  const count = stressNodeCount(window.location.search)
  if (count === null) return
  history.execute(new CreateNodesCommand(scene, createStressNodes(count)))
}

export function createStressNodes(count: number): RectangleNode[] {
  const columns = Math.ceil(Math.sqrt(count * AREA_ASPECT))
  const random = createRandom()
  const nodes: RectangleNode[] = []
  for (let index = 0; index < count; index += 1) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const node = createRectangleNode({
      id: `stress-${index}`,
      name: `Stress ${index + 1}`,
      x: column * TILE_STEP,
      y: row * TILE_STEP,
      width: NODE_SIZE,
      height: NODE_SIZE,
    })
    node.fills = [
      {
        type: 'solid',
        color: PALETTE[Math.floor(random() * PALETTE.length)] ?? PALETTE[0]!,
        opacity: FILL_OPACITY[index % FILL_OPACITY.length] ?? 1,
        visible: true,
      },
    ]
    node.cornerRadius = CORNERS[index % CORNERS.length] ?? 0
    if (index % STROKE_EVERY === 0 && index % SHADOW_EVERY !== 0) {
      node.strokes = [{ ...DEFAULT_STROKE, color: { r: 20, g: 20, b: 20 } }]
      node.strokeWeight = 1 + (index % 3)
    }
    if (index % SHADOW_EVERY === 0) {
      node.effects = [
        {
          ...cloneEffect(DEFAULT_DROP_SHADOW),
          offsetX: SHADOW_OFFSET,
          offsetY: SHADOW_OFFSET,
          blur: SHADOW_BLUR,
          spread: SHADOW_SPREAD,
        },
      ]
    }
    nodes.push(node)
  }
  return nodes
}

function createRandom(): () => number {
  let state = SEED
  return () => {
    state = (state * MULTIPLIER + INCREMENT) >>> 0
    return state / 0x100000000
  }
}
