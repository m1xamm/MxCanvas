import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'
import {
  applyNodePropertyChanges,
  mergeNodePropertyChanges,
  type NodePropertyChange,
} from './node-property-change'

export interface SetCornerRadiusCommandOptions {
  mergeable?: boolean
}

export class SetCornerRadiusCommand implements Command {
  readonly label = 'set corner radius'
  #document: Document
  #mergeable: boolean
  #changes: NodePropertyChange<number>[]

  constructor(
    document: Document,
    changes: readonly NodePropertyChange<number>[],
    options: SetCornerRadiusCommandOptions = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
    this.#changes = changes.map((change) => ({ ...change }))
  }

  static forNodes(
    document: Document,
    ids: readonly NodeId[],
    radius: number,
    options: SetCornerRadiusCommandOptions = {},
  ): SetCornerRadiusCommand | null {
    const changes: NodePropertyChange<number>[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      changes.push({ id, from: node.cornerRadius, to: radius })
    }
    return changes.length === 0 ? null : new SetCornerRadiusCommand(document, changes, options)
  }

  execute(): void {
    this.#apply('to')
  }

  undo(): void {
    this.#apply('from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof SetCornerRadiusCommand) || !next.#mergeable) {
      return false
    }
    if (!mergeNodePropertyChanges(this.#changes, next.#changes)) return false
    this.execute()
    return true
  }

  #apply(side: 'from' | 'to'): void {
    applyNodePropertyChanges(this.#document, this.#changes, side, (document, id, value) => {
      document.setNodeCornerRadius(id, value)
    })
  }
}
