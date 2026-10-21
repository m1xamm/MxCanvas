import { multiply, type Mat2D } from '../math/matrix'
import { clonePaint } from '../color'
import { cloneEffects } from '../effects'
import type { Effect, NodeId, Paint, SceneNodeUnion, StrokeAlign } from './types'
import type { NodeBox } from '../transform'

export const MAX_STROKE_WEIGHT = 1000

export class Document {
  #nodes = new Map<NodeId, SceneNodeUnion>()
  #rootChildren: NodeId[] = []
  #worldTransforms = new Map<NodeId, Mat2D>()
  #changeCount = 0
  #listeners = new Set<() => void>()

  get changeCount(): number {
    return this.#changeCount
  }

  getRootChildren(): readonly NodeId[] {
    return this.#rootChildren
  }

  getSiblingIds(id: NodeId): readonly NodeId[] {
    return this.#siblingIds(id)
  }

  getNode(id: NodeId): SceneNodeUnion | undefined {
    return this.#nodes.get(id)
  }

  addNode(node: SceneNodeUnion, index?: number): number {
    const siblings =
      node.parentId === null ? this.#rootChildren : this.#childrenOf(node.parentId)
    const at = clampIndex(index ?? siblings.length, siblings.length)
    siblings.splice(at, 0, node.id)
    this.#nodes.set(node.id, node)
    this.#markChanged()
    return at
  }

  removeNode(id: NodeId): void {
    if (!this.#removeSubtree(id)) return
    this.#markChanged()
  }

  replaceAll(nodes: readonly SceneNodeUnion[]): void {
    this.#nodes = new Map(nodes.map((node) => [node.id, node]))
    this.#rootChildren = nodes
      .filter((node) => node.parentId === null)
      .map((node) => node.id)
    this.#markChanged()
  }

  setNodeBox(id: NodeId, box: NodeBox): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.transform = box.transform
    node.width = box.width
    node.height = box.height
    this.#markChanged()
  }

  setNodeName(id: NodeId, name: string): void {
    const node = this.#nodes.get(id)
    if (!node || node.name === name) return
    node.name = name
    this.#markChanged()
  }

  setNodeVisible(id: NodeId, visible: boolean): void {
    const node = this.#nodes.get(id)
    if (!node || node.visible === visible) return
    node.visible = visible
    this.#markChanged()
  }

  setNodeLocked(id: NodeId, locked: boolean): void {
    const node = this.#nodes.get(id)
    if (!node || node.locked === locked) return
    node.locked = locked
    this.#markChanged()
  }

  setNodeFills(id: NodeId, fills: readonly Paint[]): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.fills = fills.map(clonePaint)
    this.#markChanged()
  }

  setNodeStrokes(id: NodeId, strokes: readonly Paint[]): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.strokes = strokes.map(clonePaint)
    this.#markChanged()
  }

  setNodeStrokeWeight(id: NodeId, weight: number): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.strokeWeight = clampStrokeWeight(weight)
    this.#markChanged()
  }

  setNodeStrokeAlign(id: NodeId, align: StrokeAlign): void {
    const node = this.#nodes.get(id)
    if (!node || node.strokeAlign === align) return
    node.strokeAlign = align
    this.#markChanged()
  }

  setNodeEffects(id: NodeId, effects: readonly Effect[]): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.effects = cloneEffects(effects)
    this.#markChanged()
  }

  setNodeOpacity(id: NodeId, opacity: number): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.opacity = clampUnit(opacity)
    this.#markChanged()
  }

  setNodeCornerRadius(id: NodeId, radius: number): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.cornerRadius = clampRadius(radius, node.width, node.height)
    this.#markChanged()
  }

  setNodeConstrainProportions(id: NodeId, value: boolean): void {
    const node = this.#nodes.get(id)
    if (!node || node.constrainProportions === value) return
    node.constrainProportions = value
    this.#markChanged()
  }

  moveNodeToIndex(id: NodeId, index: number): void {
    const siblings = this.#siblingIds(id)
    const from = siblings.indexOf(id)
    if (from === -1) return
    const to = clampIndex(index, siblings.length - 1)
    if (from === to) return
    siblings.splice(from, 1)
    siblings.splice(to, 0, id)
    this.#markChanged()
  }

  #siblingIds(id: NodeId): NodeId[] {
    const node = this.#nodes.get(id)
    if (!node) return []
    if (node.parentId === null) return this.#rootChildren
    return this.#nodes.get(node.parentId)?.children ?? []
  }

  getWorldTransform(id: NodeId): Mat2D {
    const cached = this.#worldTransforms.get(id)
    if (cached) return cached
    const node = this.#nodes.get(id)
    if (!node) throw new Error(`Unknown node: ${id}`)
    const world =
      node.parentId === null
        ? node.transform
        : multiply(this.getWorldTransform(node.parentId), node.transform)
    this.#worldTransforms.set(id, world)
    return world
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #childrenOf(parentId: NodeId): NodeId[] {
    const parent = this.#nodes.get(parentId)
    if (!parent) throw new Error(`Unknown parent node: ${parentId}`)
    return parent.children
  }

  #removeSubtree(id: NodeId): boolean {
    const node = this.#nodes.get(id)
    if (!node) return false
    for (const childId of [...node.children]) this.#removeSubtree(childId)
    node.children.length = 0
    const siblings =
      node.parentId === null ? this.#rootChildren : this.#nodes.get(node.parentId)?.children
    if (siblings) {
      const index = siblings.indexOf(id)
      if (index >= 0) siblings.splice(index, 1)
    }
    this.#nodes.delete(id)
    return true
  }

  #markChanged(): void {
    this.#worldTransforms.clear()
    this.#changeCount += 1
    for (const listener of this.#listeners) listener()
  }
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length)
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function clampRadius(radius: number, width: number, height: number): number {
  if (!Number.isFinite(radius)) return 0
  return Math.min(Math.max(0, radius), Math.min(width, height) / 2)
}

function clampStrokeWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0
  return Math.min(Math.max(0, weight), MAX_STROKE_WEIGHT)
}
