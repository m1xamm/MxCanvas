import type { Command } from './command'
import type { Document } from '../document/document'
import { applyNodeBoxChanges, type NodeBoxChange } from './node-box-change'

export interface ResizeNodesCommandOptions {
  mergeable?: boolean
}

export class ResizeNodesCommand implements Command {
  readonly label = 'resize nodes'
  #document: Document
  #mergeable: boolean
  #changes: NodeBoxChange[]

  constructor(
    document: Document,
    changes: readonly NodeBoxChange[],
    options: ResizeNodesCommandOptions = {},
  ) {
    this.#document = document
    this.#mergeable = options.mergeable ?? false
    this.#changes = changes.map((change) => ({ ...change }))
  }

  execute(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'to')
  }

  undo(): void {
    applyNodeBoxChanges(this.#document, this.#changes, 'from')
  }

  mergeWith(next: Command): boolean {
    if (!this.#mergeable || !(next instanceof ResizeNodesCommand) || !next.#mergeable) return false
    if (this.#changes.length !== next.#changes.length) return false
    for (const change of next.#changes) {
      const target = this.#changes.find((candidate) => candidate.id === change.id)
      if (!target) return false
      target.to = change.to
    }
    this.execute()
    return true
  }
}
