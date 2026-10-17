import type { NodeId } from '../core/document/types'
import { Store } from '../core/store'

export const selectionStore = new Store<readonly NodeId[]>([])

export function setSelection(ids: readonly NodeId[]): void {
  if (sameIds(selectionStore.get(), ids)) return
  selectionStore.set([...ids])
}

export function pruneSelection(exists: (id: NodeId) => boolean): void {
  const current = selectionStore.get()
  const kept = current.filter(exists)
  if (kept.length === current.length) return
  setSelection(kept)
}

export function selectionOnPress(selection: readonly NodeId[], id: NodeId): readonly NodeId[] {
  return selection.includes(id) ? selection : [id]
}

export function toggleSelection(selection: readonly NodeId[], id: NodeId): readonly NodeId[] {
  return selection.includes(id) ? selection.filter((current) => current !== id) : [...selection, id]
}

export function unionSelection(
  selection: readonly NodeId[],
  ids: readonly NodeId[],
): readonly NodeId[] {
  const merged = [...selection]
  for (const id of ids) {
    if (!merged.includes(id)) merged.push(id)
  }
  return merged
}

function sameIds(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}
