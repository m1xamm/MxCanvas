import type { NodeId } from '../core/document/types'
import { layerClick } from '../core/layers'
import { Store } from '../core/store'
import { selectionStore, setSelection } from './selection'

export interface LayerClickModifiers {
  toggle: boolean
  range: boolean
}

export const layerAnchorStore = new Store<NodeId | null>(null)
export const hoveredLayerStore = new Store<NodeId | null>(null)

export function selectLayer(
  id: NodeId,
  order: readonly NodeId[],
  modifiers: LayerClickModifiers,
): void {
  const result = layerClick({
    order,
    id,
    selection: selectionStore.get(),
    anchor: layerAnchorStore.get(),
    toggle: modifiers.toggle,
    range: modifiers.range,
  })
  layerAnchorStore.set(result.anchor)
  setSelection(result.selection)
}

export function clearLayerSelection(): void {
  setSelection([])
}

export function setHoveredLayer(id: NodeId | null): void {
  hoveredLayerStore.set(id)
}
