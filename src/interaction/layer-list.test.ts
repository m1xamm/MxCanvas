import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLayerSelection,
  hoveredLayerStore,
  layerAnchorStore,
  selectLayer,
  setHoveredLayer,
} from './layer-list'
import { selectionStore, setSelection } from './selection'

const ORDER = ['c', 'b', 'a']

beforeEach(() => {
  setSelection([])
  layerAnchorStore.set(null)
})

describe('selectLayer', () => {
  it('selects one node and remembers the anchor', () => {
    selectLayer('b', ORDER, { toggle: false, range: false })
    expect(selectionStore.get()).toEqual(['b'])
    expect(layerAnchorStore.get()).toBe('b')
  })

  it('extends the range from the remembered anchor on a shift click', () => {
    selectLayer('c', ORDER, { toggle: false, range: false })
    selectLayer('a', ORDER, { toggle: false, range: true })
    expect(selectionStore.get()).toEqual(['c', 'b', 'a'])
    expect(layerAnchorStore.get()).toBe('c')
  })

  it('toggles with a modifier click', () => {
    selectLayer('c', ORDER, { toggle: false, range: false })
    selectLayer('a', ORDER, { toggle: true, range: false })
    expect(selectionStore.get()).toEqual(['c', 'a'])
    selectLayer('c', ORDER, { toggle: true, range: false })
    expect(selectionStore.get()).toEqual(['a'])
  })

  it('clears the selection on empty list space', () => {
    selectLayer('c', ORDER, { toggle: false, range: false })
    clearLayerSelection()
    expect(selectionStore.get()).toEqual([])
  })
})

describe('setHoveredLayer', () => {
  it('tracks the hovered row', () => {
    setHoveredLayer('a')
    expect(hoveredLayerStore.get()).toBe('a')
    setHoveredLayer(null)
    expect(hoveredLayerStore.get()).toBeNull()
  })
})
