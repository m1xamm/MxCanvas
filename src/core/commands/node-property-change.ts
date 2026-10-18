import type { Document } from '../document/document'
import type { NodeId } from '../document/types'

export interface NodePropertyChange<T> {
  id: NodeId
  from: T
  to: T
}

export function applyNodePropertyChanges<T>(
  document: Document,
  changes: readonly NodePropertyChange<T>[],
  side: 'from' | 'to',
  apply: (document: Document, id: NodeId, value: T) => void,
): void {
  for (const change of changes) apply(document, change.id, side === 'from' ? change.from : change.to)
}

export function mergeNodePropertyChanges<T>(
  current: NodePropertyChange<T>[],
  next: readonly NodePropertyChange<T>[],
): boolean {
  if (current.length !== next.length) return false
  for (const change of next) {
    const target = current.find((candidate) => candidate.id === change.id)
    if (!target) return false
    target.to = change.to
  }
  return true
}
