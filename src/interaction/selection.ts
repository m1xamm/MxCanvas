import type { NodeId } from '../core/document/types'
import { Store } from '../core/store'

export const selectionStore = new Store<readonly NodeId[]>([])

export function setSelection(ids: readonly NodeId[]): void {
  if (sameIds(selectionStore.get(), ids)) return
  selectionStore.set([...ids])
}

function sameIds(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}
