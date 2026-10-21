import type { Document } from '../document/document'
import type { SceneNodeUnion } from '../document/types'
import type { Command } from './command'

export class CreateNodesCommand implements Command {
  readonly label: string
  #document: Document
  #nodes: readonly SceneNodeUnion[]

  constructor(document: Document, nodes: readonly SceneNodeUnion[]) {
    this.#document = document
    this.#nodes = nodes
    this.label = `create ${nodes.length} nodes`
  }

  execute(): void {
    for (const node of this.#nodes) this.#document.addNode(node)
  }

  undo(): void {
    for (const node of this.#nodes) this.#document.removeNode(node.id)
  }
}
