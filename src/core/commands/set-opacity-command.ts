import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'
import {
  applyNodePropertyChanges,
  mergeNodePropertyChanges,
  type NodePropertyChange,
} from './node-property-change'

export interface SetOpacityCommandOptions {
  mergeable?: boolean
}

export class SetOpacityCommand implements Command {
  readonly label = 'set opacity'
  #document: Document
  #mergeable: boolean
  #changes: NodePropertyChange<number>[]

  constructor(
    document: Document,
    changes: readonly NodePropertyChange<number>[],
    options: SetOpacityCommandOptions = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
    this.#changes = changes.map((change) => ({ ...change }))
  }

  static forNodes(
    document: Document,
    ids: readonly NodeId[],
    opacity: number,
    options: SetOpacityCommandOptions = {},
  ): SetOpacityCommand | null {
    const changes: NodePropertyChange<number>[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      changes.push({ id, from: node.opacity, to: opacity })
    }
    return changes.length === 0 ? null : new SetOpacityCommand(document, changes, options)
  }

  execute(): void {
    this.#apply('to')
  }

  undo(): void {
    this.#apply('from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof SetOpacityCommand) || !next.#mergeable) return false
    if (!mergeNodePropertyChanges(this.#changes, next.#changes)) return false
    this.execute()
    return true
  }

  #apply(side: 'from' | 'to'): void {
    applyNodePropertyChanges(this.#document, this.#changes, side, (document, id, value) => {
      document.setNodeOpacity(id, value)
    })
  }
}
