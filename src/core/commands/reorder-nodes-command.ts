import type { Document } from '../document/document'
import type { NodeId } from '../document/types'
import type { Command } from './command'

export interface ReorderMove {
  id: NodeId
  toIndex: number
}

interface RecordedMove {
  id: NodeId
  from: number
  to: number
}

export class ReorderNodesCommand implements Command {
  readonly label = 'reorder nodes'
  #document: Document
  #moves: readonly RecordedMove[]

  constructor(document: Document, moves: readonly ReorderMove[]) {
    this.#document = document
    this.#moves = recordMoves(document, moves)
  }

  execute(): void {
    for (const move of this.#moves) this.#document.moveNodeToIndex(move.id, move.to)
  }

  undo(): void {
    for (let index = this.#moves.length - 1; index >= 0; index -= 1) {
      const move = this.#moves[index]
      if (move) this.#document.moveNodeToIndex(move.id, move.from)
    }
  }
}

function recordMoves(document: Document, moves: readonly ReorderMove[]): RecordedMove[] {
  const working = new Map<string, NodeId[]>()
  const recorded: RecordedMove[] = []
  for (const move of moves) {
    const node = document.getNode(move.id)
    if (!node) continue
    const key = node.parentId ?? ''
    let siblings = working.get(key)
    if (!siblings) {
      siblings = [...document.getSiblingIds(move.id)]
      working.set(key, siblings)
    }
    const from = siblings.indexOf(move.id)
    if (from === -1) continue
    const to = clampIndex(move.toIndex, siblings.length - 1)
    if (from === to) continue
    siblings.splice(from, 1)
    siblings.splice(to, 0, move.id)
    recorded.push({ id: move.id, from, to })
  }
  return recorded
}

function clampIndex(index: number, lastIndex: number): number {
  return Math.min(Math.max(index, 0), Math.max(lastIndex, 0))
}
