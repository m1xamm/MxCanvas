import type { Command } from './command'
import type { Document } from '../document/document'
import { applyNodeBoxChanges, type NodeBoxChange } from './node-box-change'

export class ResizeNodesCommand implements Command {
  readonly label = 'resize nodes'
  #document: Document
  #changes: readonly NodeBoxChange[]

  constructor(document: Document, changes: readonly NodeBoxChange[]) {
    this.#document = document
    this.#changes = changes
  }

  execute(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'to')
  }

  undo(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'from')
  }
}
