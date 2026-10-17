import type { NodeId } from '../document/types'
import type { Vec2 } from '../math/matrix'
import { translateRect } from '../math/rect'
import { nodeBox, nodeWorldRect, worldRectToBox } from '../transform'
import type { Document } from '../document/document'
import type { Command } from './command'
import { applyNodeBoxChanges, type NodeBoxChange } from './node-box-change'
import { topLevelIds } from './subtree'

export interface MoveNodesCommandOptions {
  mergeable?: boolean
}

export class MoveNodesCommand implements Command {
  readonly label = 'move nodes'
  #document: Document
  #changes: NodeBoxChange[]
  #mergeable: boolean

  constructor(
    document: Document,
    ids: readonly NodeId[],
    delta: Vec2,
    options: MoveNodesCommandOptions = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
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

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof MoveNodesCommand) || !next.#mergeable) return false
    if (!this.#coversSameTargets(next)) return false
    for (const change of this.#changes) {
      const target = next.#changeFor(change.id)
      if (target) change.to = target.to
    }
    this.execute()
    return true
  }

  #coversSameTargets(next: MoveNodesCommand): boolean {
    if (this.#changes.length !== next.#changes.length) return false
    return next.#changes.every((change) => this.#changeFor(change.id) !== undefined)
  }

  #changeFor(id: NodeId): NodeBoxChange | undefined {
    return this.#changes.find((change) => change.id === id)
  }
}
