import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'

export class SetNodeVisibleCommand implements Command {
  readonly label = 'set node visible'
  #document: Document
  #ids: readonly NodeId[]
  #visible: boolean

  constructor(document: Document, ids: readonly NodeId[], visible: boolean) {
    this.#document = document
    this.#ids = [...ids]
    this.#visible = visible
  }

  execute(): void {
    for (const id of this.#ids) this.#document.setNodeVisible(id, this.#visible)
  }

  undo(): void {
    for (const id of this.#ids) this.#document.setNodeVisible(id, !this.#visible)
  }
}
