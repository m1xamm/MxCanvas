import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'

export class SetConstrainProportionsCommand implements Command {
  readonly label = 'set constrain proportions'
  #document: Document
  #ids: NodeId[] = []
  #previous: boolean[] = []
  #value: boolean

  constructor(document: Document, ids: readonly NodeId[], value: boolean) {
    this.#document = document
    this.#value = value
    this.#ids = []
    this.#previous = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (!node) continue
      this.#ids.push(id)
      this.#previous.push(node.constrainProportions)
    }
  }

  execute(): void {
    for (const id of this.#ids) this.#document.setNodeConstrainProportions(id, this.#value)
  }

  undo(): void {
    this.#ids.forEach((id, index) => {
      this.#document.setNodeConstrainProportions(id, this.#previous[index] ?? false)
    })
  }
}
