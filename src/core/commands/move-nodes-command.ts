import type { NodeId } from '../document/types'
import type { Vec2 } from '../math/matrix'
import { translateRect } from '../math/rect'
import { nodeBox, nodeWorldRect, worldRectToBox } from '../transform'
import type { Document } from '../document/document'
import type { Command } from './command'
import { applyNodeBoxChanges, type NodeBoxChange } from './node-box-change'

export class MoveNodesCommand implements Command {
  readonly label = 'move nodes'
  #document: Document
  #changes: NodeBoxChange[]

  constructor(document: Document, ids: readonly NodeId[], delta: Vec2) {
    this.#document = document
    this.#changes = []
    for (const id of topLevelIds(document, ids)) {
      const node = document.getNode(id)
      if (!node) continue
      this.#changes.push({
        id,
        from: nodeBox(node),
        to: worldRectToBox(document, node, translateRect(nodeWorldRect(document, node), delta)),
      })
    }
  }

  execute(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'to')
  }

  undo(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'from')
  }
}

function topLevelIds(document: Document, ids: readonly NodeId[]): readonly NodeId[] {
  const wanted = new Set(ids)
  return ids.filter((id) => !hasMovedAncestor(document, id, wanted))
}

function hasMovedAncestor(document: Document, id: NodeId, wanted: ReadonlySet<NodeId>): boolean {
  let parentId = document.getNode(id)?.parentId ?? null
  while (parentId !== null) {
    const parent = document.getNode(parentId)
    if (!parent) return false
    if (wanted.has(parentId)) return true
    parentId = parent.parentId
  }
  return false
}
