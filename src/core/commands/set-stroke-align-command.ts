import type { Document } from '../document/document'
import type { NodeId, StrokeAlign } from '../document/types'
import type { Command } from './command'

export class SetStrokeAlignCommand implements Command {
  readonly label = 'set stroke align'
  #document: Document
  #changes: readonly { id: NodeId; from: StrokeAlign }[]
  #align: StrokeAlign

  static forNodes(
    document: Document,
    ids: readonly NodeId[],
    align: StrokeAlign,
  ): SetStrokeAlignCommand | null {
    const changed = ids.some((id) => {
      const node = document.getNode(id)
      return node !== undefined && node.strokeAlign !== align
    })
    return changed ? new SetStrokeAlignCommand(document, ids, align) : null
  }

  constructor(document: Document, ids: readonly NodeId[], align: StrokeAlign) {
    this.#document = document
    this.#align = align
    const changes: { id: NodeId; from: StrokeAlign }[] = []
    for (const id of ids) {
      const node = document.getNode(id)
      if (node && node.strokeAlign !== align) changes.push({ id, from: node.strokeAlign })
    }
    this.#changes = changes
  }

  execute(): void {
    for (const change of this.#changes) this.#document.setNodeStrokeAlign(change.id, this.#align)
  }

  undo(): void {
    for (const change of this.#changes) {
      this.#document.setNodeStrokeAlign(change.id, change.from)
    }
  }
}
