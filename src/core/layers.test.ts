import { describe, expect, it } from 'vitest'
import {
  displayOrder,
  dropBoundary,
  LAYER_OVERSCAN,
  LAYER_ROW_HEIGHT,
  LAYER_ROW_PITCH,
  layerClick,
  layerListHeight,
  planLayerReorder,
  revealRow,
  reorderIds,
  reorderTargetIndex,
  rowOffset,
  selectionRange,
  siblingGroups,
  virtualWindow,
} from './layers'
import { Document } from './document/document'
import type { RectangleNode } from './document/types'
import { translation } from './math/matrix'

function createRectangle(id: string, parentId: string | null = null): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId,
    children: [],
    transform: translation(0, 0),
    width: 10,
    height: 10,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [],
    cornerRadius: 0,
  }
}

function documentWith(...ids: string[]): Document {
  const scene = new Document()
  for (const id of ids) scene.addNode(createRectangle(id))
  return scene
}

describe('displayOrder', () => {
  it('lists the topmost node first', () => {
    expect(displayOrder(['a', 'b', 'c'])).toEqual(['c', 'b', 'a'])
  })

  it('does not touch the document order', () => {
    const rootChildren = ['a', 'b']
    displayOrder(rootChildren)
    expect(rootChildren).toEqual(['a', 'b'])
  })
})

describe('selectionRange', () => {
  const order = ['d', 'c', 'b', 'a']

  it('selects both ends of the range', () => {
    expect(selectionRange(order, 'd', 'b')).toEqual(['d', 'c', 'b'])
    expect(selectionRange(order, 'b', 'd')).toEqual(['d', 'c', 'b'])
  })

  it('returns the target when the anchor is gone', () => {
    expect(selectionRange(order, 'missing', 'b')).toEqual(['b'])
    expect(selectionRange(order, 'd', 'missing')).toEqual([])
  })
})

describe('layerClick', () => {
  const order = ['c', 'b', 'a']

  it('selects a single node on a plain click', () => {
    expect(layerClick({ order, id: 'a', selection: ['c'], anchor: 'c', toggle: false, range: false }))
      .toEqual({ selection: ['a'], anchor: 'a' })
  })

  it('toggles with a modifier click', () => {
    expect(layerClick({ order, id: 'a', selection: ['c'], anchor: 'c', toggle: true, range: false }))
      .toEqual({ selection: ['c', 'a'], anchor: 'a' })
    expect(layerClick({ order, id: 'c', selection: ['c', 'a'], anchor: 'c', toggle: true, range: false }))
      .toEqual({ selection: ['a'], anchor: 'c' })
  })

  it('selects the range from the anchor on a shift click', () => {
    expect(layerClick({ order, id: 'a', selection: ['c'], anchor: 'c', toggle: false, range: true }))
      .toEqual({ selection: ['c', 'b', 'a'], anchor: 'c' })
  })

  it('falls back to a single selection when there is no anchor', () => {
    expect(layerClick({ order, id: 'b', selection: [], anchor: null, toggle: false, range: true }))
      .toEqual({ selection: ['b'], anchor: 'b' })
  })
})

describe('virtualWindow', () => {
  it('renders only the visible rows plus overscan', () => {
    const window = virtualWindow({ scrollTop: 0, viewportHeight: 340, rowCount: 1000 })
    expect(window.start).toBe(0)
    expect(window.end).toBe(10 + LAYER_OVERSCAN)
  })

  it('follows the scroll offset', () => {
    const window = virtualWindow({ scrollTop: 34 * 100, viewportHeight: 340, rowCount: 1000 })
    expect(window.start).toBe(100 - LAYER_OVERSCAN)
    expect(window.end).toBe(110 + LAYER_OVERSCAN)
  })

  it('clamps to the row count', () => {
    expect(virtualWindow({ scrollTop: 0, viewportHeight: 340, rowCount: 3 })).toEqual({
      start: 0,
      end: 3,
    })
    expect(virtualWindow({ scrollTop: 3400, viewportHeight: 340, rowCount: 0 })).toEqual({
      start: 0,
      end: 0,
    })
  })
})

describe('layerListHeight', () => {
  it('leaves out the trailing gap', () => {
    expect(layerListHeight(0)).toBe(0)
    expect(layerListHeight(3)).toBe(3 * LAYER_ROW_PITCH - 2)
  })
})

describe('revealRow', () => {
  it('scrolls a row above the viewport to the top', () => {
    expect(revealRow(200, 200, 1)).toBe(LAYER_ROW_PITCH)
  })

  it('scrolls a row below the viewport to the bottom', () => {
    const index = 20
    const revealed = revealRow(0, 200, index)
    expect(revealed).toBe(rowOffset(index) + LAYER_ROW_HEIGHT - 200)
  })

  it('keeps a visible row in place', () => {
    expect(revealRow(0, 200, 2)).toBeNull()
  })
})

describe('dropBoundary', () => {
  it('picks the near boundary of the hovered row', () => {
    expect(dropBoundary(10, 5)).toBe(0)
    expect(dropBoundary(30, 5)).toBe(1)
    expect(dropBoundary(500, 5)).toBe(5)
    expect(dropBoundary(-20, 5)).toBe(0)
    expect(dropBoundary(10, 0)).toBe(0)
  })
})

describe('reorderIds', () => {
  it('moves an item to the requested boundary', () => {
    expect(reorderIds(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'a', 'c', 'd'])
    expect(reorderIds(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(reorderIds(['a', 'b', 'c', 'd'], 3, 4)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps the order for an out of range source', () => {
    expect(reorderIds(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})

describe('reorderTargetIndex', () => {
  it('converts a display boundary into a document index', () => {
    const display = ['d', 'c', 'b', 'a']
    expect(reorderTargetIndex(display, 'a', 0)).toBe(3)
    expect(reorderTargetIndex(display, 'd', 4)).toBe(0)
    expect(reorderTargetIndex(display, 'c', 0)).toBe(3)
    expect(reorderTargetIndex(display, 'missing', 0)).toBe(-1)
  })
})

describe('planLayerReorder', () => {
  it('moves a single node one step forward and backward', () => {
    expect(planLayerReorder(['a', 'b', 'c'], ['b'], 'forward')).toEqual([
      { id: 'b', toIndex: 2 },
    ])
    expect(planLayerReorder(['a', 'b', 'c'], ['b'], 'backward')).toEqual([
      { id: 'b', toIndex: 0 },
    ])
  })

  it('does nothing at the ends of the list', () => {
    expect(planLayerReorder(['a', 'b', 'c'], ['c'], 'forward')).toEqual([])
    expect(planLayerReorder(['a', 'b', 'c'], ['a'], 'backward')).toEqual([])
    expect(planLayerReorder(['a', 'b', 'c'], ['c'], 'front')).toEqual([])
    expect(planLayerReorder(['a', 'b', 'c'], ['a'], 'back')).toEqual([])
  })

  it('moves a multi selection as one block', () => {
    expect(planLayerReorder(['a', 'b', 'c'], ['a', 'b'], 'forward')).toEqual([
      { id: 'b', toIndex: 2 },
      { id: 'a', toIndex: 1 },
    ])
    expect(planLayerReorder(['a', 'b', 'c'], ['b', 'c'], 'backward')).toEqual([
      { id: 'b', toIndex: 0 },
      { id: 'c', toIndex: 1 },
    ])
  })

  it('keeps the relative order when moving to the front and back', () => {
    expect(planLayerReorder(['a', 'b', 'c', 'd'], ['a', 'c'], 'front')).toEqual([
      { id: 'a', toIndex: 3 },
      { id: 'c', toIndex: 3 },
    ])
    expect(planLayerReorder(['a', 'b', 'c', 'd'], ['b', 'd'], 'back')).toEqual([
      { id: 'd', toIndex: 0 },
      { id: 'b', toIndex: 0 },
    ])
  })

  it('ignores nodes that are not siblings', () => {
    expect(planLayerReorder(['a', 'b'], ['missing'], 'forward')).toEqual([])
  })
})

describe('siblingGroups', () => {
  it('groups the nodes by their parent', () => {
    const scene = documentWith('a', 'b')
    scene.addNode(createRectangle('child', 'a'))
    const groups = siblingGroups(scene, ['a', 'child'])
    expect(groups).toEqual([
      { siblings: ['a', 'b'], selected: ['a'] },
      { siblings: ['child'], selected: ['child'] },
    ])
  })

  it('skips unknown nodes', () => {
    const scene = documentWith('a')
    expect(siblingGroups(scene, ['missing'])).toEqual([])
  })
})
