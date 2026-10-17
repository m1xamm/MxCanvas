import type { Document } from '../document/document'
import type { SceneNodeUnion } from '../document/types'
import type { Command } from './command'

export class CreateNodeCommand implements Command {
  readonly label: string
  #document: Document
  #node: SceneNodeUnion
  #index: number | null

  constructor(document: Document, node: SceneNodeUnion, index?: number) {
    this.#document = document
    this.#node = node
    this.#index = index ?? null
    this.label = `create ${node.type}`
  }

  execute(): void {
    this.#index = this.#document.addNode(this.#node, this.#index ?? undefined)
  }

  undo(): void {
    this.#document.removeNode(this.#node.id)
  }
}
