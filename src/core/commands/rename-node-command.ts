import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'

export class RenameNodeCommand implements Command {
  readonly label = 'rename node'
  #document: Document
  #id: NodeId
  #from: string
  #to: string

  constructor(document: Document, id: NodeId, name: string) {
    this.#document = document
    this.#id = id
    this.#from = document.getNode(id)?.name ?? name
    this.#to = name
  }

  execute(): void {
    this.#document.setNodeName(this.#id, this.#to)
  }

  undo(): void {
    this.#document.setNodeName(this.#id, this.#from)
  }
}
