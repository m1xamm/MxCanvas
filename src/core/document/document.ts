import { multiply, type Mat2D } from '../math/matrix'
import type { NodeId, SceneNodeUnion } from './types'
import type { NodeBox } from '../transform'

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

  setNodeBox(id: NodeId, box: NodeBox): void {
    const node = this.#nodes.get(id)
    if (!node) return
    node.transform = box.transform
    node.width = box.width
    node.height = box.height
    this.#markChanged()
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
