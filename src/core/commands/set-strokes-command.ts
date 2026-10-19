import type { Document } from '../document/document'
import { clonePaints } from '../color'
import type { NodeId, Paint, SceneNodeUnion } from '../document/types'
import type { Command } from './command'
import { applyNodePropertyChanges, mergeNodePropertyChanges, type NodePropertyChange } from './node-property-change'

export interface SetStrokesCommandOptions {
  mergeable?: boolean
}

export class SetStrokesCommand implements Command {
  readonly label = 'set strokes'
  #document: Document
  #mergeable: boolean
  #changes: NodePropertyChange<Paint[]>[]

  constructor(
    document: Document,
    changes: readonly NodePropertyChange<Paint[]>[],
    options: SetStrokesCommandOptions = {},
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
    strokes: (node: SceneNodeUnion) => Paint[],
    options: SetStrokesCommandOptions = {},
  ): SetStrokesCommand | null {
    const changes: NodePropertyChange<Paint[]>[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      changes.push({ id, from: node.strokes, to: strokes(node) })
    }
    return changes.length === 0 ? null : new SetStrokesCommand(document, changes, options)
  }

  execute(): void {
    this.#apply('to')
  }

  undo(): void {
    this.#apply('from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof SetStrokesCommand) || !next.#mergeable) return false
    if (!mergeNodePropertyChanges(this.#changes, next.#changes)) return false
    this.execute()
    return true
  }

  #apply(side: 'from' | 'to'): void {
    applyNodePropertyChanges(this.#document, this.#changes, side, (document, id, value) => {
      document.setNodeStrokes(id, value)
    })
  }
}
