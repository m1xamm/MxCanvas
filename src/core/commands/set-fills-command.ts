import type { Document } from '../document/document'
import type { NodeId, Paint, SceneNodeUnion } from '../document/types'
import { clonePaints } from '../color'
import type { Command } from './command'
import { applyNodePropertyChanges, mergeNodePropertyChanges, type NodePropertyChange } from './node-property-change'

export class SetFillsCommand implements Command {
  readonly label = 'set fills'
  #document: Document
  #mergeable: boolean
  #changes: NodePropertyChange<Paint[]>[]

  constructor(
    document: Document,
    changes: readonly NodePropertyChange<Paint[]>[],
    options: { mergeable?: boolean } = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
    this.#changes = changes.map((change) => ({
      id: change.id,
      from: clonePaints(change.from),
      to: clonePaints(change.to),
    }))
  }

  static forNodes(
    document: Document,
    ids: readonly NodeId[],
    fills: (node: SceneNodeUnion) => Paint[],
    options: { mergeable?: boolean } = {},
  ): SetFillsCommand | null {
    const changes: NodePropertyChange<Paint[]>[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      changes.push({ id, from: node.fills, to: fills(node) })
    }
    return changes.length === 0 ? null : new SetFillsCommand(document, changes, options)
  }

  execute(): void {
    this.#apply('to')
  }

  undo(): void {
    this.#apply('from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof SetFillsCommand) || !next.#mergeable) return false
    if (!mergeNodePropertyChanges(this.#changes, next.#changes)) return false
    this.execute()
    return true
  }

  #apply(side: 'from' | 'to'): void {
    applyNodePropertyChanges(this.#document, this.#changes, side, (document, id, value) => {
      document.setNodeFills(id, value)
    })
  }
}
