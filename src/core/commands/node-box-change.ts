import type { NodeId } from '../document/types'
import type { NodeBox } from '../transform'
import type { Document } from '../document/document'

export interface NodeBoxChange {
  id: NodeId
  from: NodeBox
  to: NodeBox
}

export function applyNodeBoxChanges(
  document: Document,
  changes: readonly NodeBoxChange[],
  side: 'from' | 'to',
): void {
  for (const change of changes) {
    document.setNodeBox(change.id, side === 'from' ? change.from : change.to)
  }
}
