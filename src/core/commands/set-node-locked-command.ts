import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'

export class SetNodeLockedCommand implements Command {
  readonly label = 'set node locked'
  #document: Document
  #ids: readonly NodeId[]
  #locked: boolean

  constructor(document: Document, ids: readonly NodeId[], locked: boolean) {
    this.#document = document
    this.#ids = [...ids]
    this.#locked = locked
  }

  execute(): void {
    for (const id of this.#ids) this.#document.setNodeLocked(id, this.#locked)
  }

  undo(): void {
    for (const id of this.#ids) this.#document.setNodeLocked(id, !this.#locked)
  }
}
