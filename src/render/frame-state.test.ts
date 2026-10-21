import { describe, expect, it } from 'vitest'
import { Document } from '../core/document/document'
import type { RectangleNode } from '../core/document/types'
import { translation } from '../core/math/matrix'
import { boxWorldTransform } from '../core/transform'
import { frameInfoOf, selectedBoxesOf, type FrameState } from './frame-state'

function createRectangle(id: string, x: number, y: number, size = 100): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId: null,
    children: [],
    transform: translation(x, y),
    width: size,
    height: size,
    visible: true,
    locked: false,
    opacity: 1,
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    strokeAlign: 'center',
    effects: [],
    fills: [],
    cornerRadius: 0,
  }
}

function state(overrides: Partial<FrameState> = {}): FrameState {
  return {
    time: 16,
    duration: 1,
    drawnNodes: 0,
    selection: [],
    hoveredId: null,
    hoveredHandle: null,
    marquee: null,
    previews: new Map(),
    selectionBounds: null,
    draft: null,
    snapGuides: [],
    pointer: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    ...overrides,
  }
}

describe('frameInfoOf', () => {
  it('uses the same preview box for the overlay bounds and the selected node', () => {
    const scene = new Document()
    const node = createRectangle('a', 0, 0)
    scene.addNode(node)
    const preview = { transform: translation(40, 20), width: 160, height: 80 }
    const bounds = { x: 40, y: 20, width: 160, height: 80 }
    const info = frameInfoOf(
      scene,
      state({ selection: ['a'], previews: new Map([['a', preview]]), selectionBounds: bounds }),
    )
    expect(info.selectionBounds).toEqual(bounds)
    expect(info.selectedBoxes).toEqual([{ id: 'a', rect: bounds }])
  })

  it('resolves the selected box from the node world transform', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 12, 24, 30))
    const boxes = selectedBoxesOf(scene, state({ selection: ['a'] }))
    expect(boxes).toEqual([{ id: 'a', rect: { x: 12, y: 24, width: 30, height: 30 } }])
  })

  it('copies draft, marquee and pointer so later frames cannot mutate the record', () => {
    const scene = new Document()
    const draft = { x: 1, y: 2, width: 3, height: 4 }
    const pointer = { x: 10, y: 20 }
    const viewport = { x: 5, y: 6, zoom: 2 }
    const info = frameInfoOf(scene, state({ draft, pointer, viewport }))
    draft.x = 99
    pointer.x = 99
    viewport.zoom = 99
    expect(info.draft).toEqual({ x: 1, y: 2, width: 3, height: 4 })
    expect(info.pointer).toEqual({ x: 10, y: 20 })
    expect(info.viewport).toEqual({ x: 5, y: 6, zoom: 2 })
  })

  it('skips hidden nodes in the selected boxes', () => {
    const scene = new Document()
    const node = createRectangle('a', 0, 0)
    node.visible = false
    scene.addNode(node)
    const preview = { transform: translation(10, 10), width: 20, height: 20 }
    const boxes = selectedBoxesOf(scene, state({ selection: ['a'], previews: new Map([['a', preview]]) }))
    expect(boxes).toEqual([])
  })

  it('uses the same preview transform as the renderer', () => {
    const scene = new Document()
    const node = createRectangle('a', 0, 0, 20)
    scene.addNode(node)
    const preview = { transform: translation(5, 6), width: 40, height: 50 }
    const boxes = selectedBoxesOf(scene, state({ selection: ['a'], previews: new Map([['a', preview]]) }))
    const world = boxWorldTransform(scene, node, preview)
    expect(boxes[0]?.rect).toEqual({
      x: world.e,
      y: world.f,
      width: preview.width,
      height: preview.height,
    })
  })
})
