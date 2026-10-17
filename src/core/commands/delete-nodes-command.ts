import type { Command } from './command'
import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import { collectSubtrees, type SubtreeEntry } from './subtree'

export class DeleteNodesCommand implements Command {
  readonly label = 'delete nodes'
  #document: Document
  #removed: readonly SubtreeEntry[]

  constructor(document: Document, ids: readonly NodeId[]) {
    this.#document = document
    this.#removed = collectSubtrees(document, ids)
  }

  execute(): void {
    for (const entry of this.#removed) {
      if (entry.parentId !== null && !this.#document.getNode(entry.parentId)) continue
      this.#document.removeNode(entry.node.id)
    }
  }

  undo(): void {
    for (const entry of this.#removed) {
      this.#document.addNode(entry.node, entry.index)
    }
  }
}
