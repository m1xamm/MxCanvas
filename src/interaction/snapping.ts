import type { NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
import { rectsIntersect, type Rect } from '../core/math/rect'
import {
  computeSnap,
  type SnapEdgeMask,
  type SnapGuide,
  type SnapMode,
  type SnapResult,
} from '../core/snap'
import type { Viewport } from '../core/viewport'

export const SNAP_TOLERANCE_PX = 6
export const MAX_SNAP_TARGETS = 256

export interface SnapSettings {
  pixelSnap: boolean
  objectSnap: boolean
}

export interface SnapContextOptions {
  scene: SceneReader
  viewport: Viewport
  getSettings: () => SnapSettings
  getExcludedIds: () => readonly NodeId[]
  getViewportSize: () => { width: number; height: number }
}

const NO_GUIDES: readonly SnapGuide[] = []
const NO_TARGETS: readonly Rect[] = []

interface SnapSearch {
  viewport: Rect
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export class SnapContext {
  #scene: SceneReader
  #viewport: Viewport
  #options: SnapContextOptions
  #targets: Rect[] = []
  #pool: Rect[] = []
  #excluded: Set<NodeId> = new Set<NodeId>()
  #search: SnapSearch = {
    viewport: { x: 0, y: 0, width: 0, height: 0 },
    xMin: 0,
    xMax: -1,
    yMin: 0,
    yMax: -1,
  }

  constructor(options: SnapContextOptions) {
    this.#scene = options.scene
    this.#viewport = options.viewport
    this.#options = options
  }

  snap(rect: Rect, mode: SnapMode, edges: SnapEdgeMask, disabled: boolean): SnapResult {
    const settings = this.#options.getSettings()
    if (disabled || (!settings.pixelSnap && !settings.objectSnap)) {
      return { rect, guides: NO_GUIDES }
    }
    return computeSnap({
      rect,
      targets: settings.objectSnap ? this.#collectTargets(rect) : NO_TARGETS,
      tolerance: SNAP_TOLERANCE_PX / this.#viewport.zoom,
      objectSnap: settings.objectSnap,
      pixelSnap: settings.pixelSnap,
      mode,
      edges,
    })
  }

  #collectTargets(rect: Rect): readonly Rect[] {
    this.#fillExcluded()
    this.#writeSearch(rect)
    const targets = this.#targets
    targets.length = 0
    for (const rootId of this.#scene.getRootChildren()) {
      this.#collectNode(rootId, targets)
    }
    return targets
  }

  #collectNode(id: NodeId, targets: Rect[]): void {
    if (targets.length >= MAX_SNAP_TARGETS) return
    const node = this.#scene.getNode(id)
    if (!node || !node.visible) return
    for (const childId of node.children) this.#collectNode(childId, targets)
    if (targets.length >= MAX_SNAP_TARGETS) return
    if (this.#isExcluded(node)) return
    const target = this.#poolRect(targets.length)
    writeWorldRect(this.#scene, node, target)
    if (this.#isNear(target)) targets.push(target)
  }

  #isNear(target: Rect): boolean {
    const search = this.#search
    if (!rectsIntersect(target, search.viewport)) return false
    const nearX = target.x < search.xMax && target.x + target.width > search.xMin
    const nearY = target.y < search.yMax && target.y + target.height > search.yMin
    return nearX || nearY
  }

  #poolRect(index: number): Rect {
    const existing = this.#pool[index]
    if (existing) return existing
    const created: Rect = { x: 0, y: 0, width: 0, height: 0 }
    this.#pool[index] = created
    return created
  }

  #fillExcluded(): void {
    this.#excluded.clear()
    for (const id of this.#options.getExcludedIds()) this.#excluded.add(id)
  }

  #isExcluded(node: SceneNodeUnion): boolean {
    let current: SceneNodeUnion | undefined = node
    while (current) {
      if (this.#excluded.has(current.id)) return true
      current = current.parentId ? this.#scene.getNode(current.parentId) : undefined
    }
    return false
  }

  #writeSearch(rect: Rect): void {
    const search = this.#search
    const viewport = this.#options.getViewportSize()
    const tolerance = SNAP_TOLERANCE_PX / this.#viewport.zoom
    const topLeft = this.#viewport.screenToWorld({ x: 0, y: 0 })
    const bottomRight = this.#viewport.screenToWorld({ x: viewport.width, y: viewport.height })
    const target = search.viewport
    target.x = Math.min(topLeft.x, bottomRight.x)
    target.y = Math.min(topLeft.y, bottomRight.y)
    target.width = Math.abs(bottomRight.x - topLeft.x)
    target.height = Math.abs(bottomRight.y - topLeft.y)
    search.xMin = Math.max(rect.x - tolerance, target.x)
    search.xMax = Math.min(rect.x + rect.width + tolerance, target.x + target.width)
    search.yMin = Math.max(rect.y - tolerance, target.y)
    search.yMax = Math.min(rect.y + rect.height + tolerance, target.y + target.height)
  }
}

function writeWorldRect(scene: SceneReader, node: SceneNodeUnion, out: Rect): void {
  const { a, b, c, d, e, f } = scene.getWorldTransform(node.id)
  const rightX = a * node.width
  const rightY = b * node.width
  const bottomX = c * node.height
  const bottomY = d * node.height
  const farX = rightX + bottomX
  const farY = rightY + bottomY
  const minX = Math.min(e, e + rightX, e + bottomX, e + farX)
  const maxX = Math.max(e, e + rightX, e + bottomX, e + farX)
  const minY = Math.min(f, f + rightY, f + bottomY, f + farY)
  const maxY = Math.max(f, f + rightY, f + bottomY, f + farY)
  out.x = minX
  out.y = minY
  out.width = maxX - minX
  out.height = maxY - minY
}
