import { describe, expect, it } from 'vitest'
import { Document } from '../core/document/document'
import type { NodeId, RectangleNode } from '../core/document/types'
import { multiply, translation, type Mat2D } from '../core/math/matrix'
import { collectNodesInRect, collectSelectableIds, hitTest } from './hit-testing'

interface RectangleOptions {
  id: string
  parentId?: NodeId | null
  x?: number
  y?: number
  width?: number
  height?: number
  visible?: boolean
  locked?: boolean
  transform?: Mat2D
}

function createRectangle(options: RectangleOptions): RectangleNode {
  return {
    id: options.id,
    type: 'rectangle',
    name: options.id,
    parentId: options.parentId ?? null,
    children: [],
    transform: options.transform ?? translation(options.x ?? 0, options.y ?? 0),
    width: options.width ?? 100,
    height: options.height ?? 100,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    opacity: 1,
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    effects: [],
    fills: [],
    cornerRadius: 0,
  }
}

describe('hitTest', () => {
  it('finds a node under the world point', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 20, y: 30 }))
    expect(hitTest(scene, { x: 50, y: 60 })?.id).toBe('a')
    expect(hitTest(scene, { x: 10, y: 10 })).toBeNull()
  })

  it('returns the top-most node of overlapping siblings', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'bottom', x: 0, y: 0 }))
    scene.addNode(createRectangle({ id: 'top', x: 10, y: 10 }))
    expect(hitTest(scene, { x: 50, y: 50 })?.id).toBe('top')
    expect(hitTest(scene, { x: 5, y: 5 })?.id).toBe('bottom')
  })

  it('tests children before their parent', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'parent', x: 0, y: 0, width: 200, height: 200 }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'parent', x: 10, y: 10 }))
    expect(hitTest(scene, { x: 20, y: 20 })?.id).toBe('child')
    expect(hitTest(scene, { x: 150, y: 150 })?.id).toBe('parent')
  })

  it('applies the world transforms of ancestors', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'parent', x: 100, y: 50 }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'parent', x: 10, y: 10 }))
    expect(hitTest(scene, { x: 115, y: 65 })?.id).toBe('child')
    expect(hitTest(scene, { x: 15, y: 15 })).toBeNull()
  })

  it('applies the scaled transform of a node', () => {
    const scene = new Document()
    scene.addNode(
      createRectangle({
        id: 'scaled',
        transform: multiply(translation(10, 10), { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0 }),
      }),
    )
    expect(hitTest(scene, { x: 30, y: 30 })?.id).toBe('scaled')
    expect(hitTest(scene, { x: 70, y: 30 })).toBeNull()
  })

  it('skips invisible nodes together with their children', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'hidden', visible: false }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'hidden', x: 10, y: 10 }))
    scene.addNode(createRectangle({ id: 'visible', x: 20, y: 20, width: 10, height: 10 }))
    expect(hitTest(scene, { x: 50, y: 50 })).toBeNull()
    expect(hitTest(scene, { x: 15, y: 15 })).toBeNull()
    expect(hitTest(scene, { x: 25, y: 25 })?.id).toBe('visible')
  })

  it('skips locked nodes but keeps their children selectable', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'locked', locked: true }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'locked', x: 10, y: 10 }))
    expect(hitTest(scene, { x: 5, y: 5 })).toBeNull()
    expect(hitTest(scene, { x: 15, y: 15 })?.id).toBe('child')
  })

  it('counts points on the node edges as a hit', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 10, y: 10, width: 100, height: 50 }))
    expect(hitTest(scene, { x: 10, y: 10 })?.id).toBe('a')
    expect(hitTest(scene, { x: 110, y: 60 })?.id).toBe('a')
    expect(hitTest(scene, { x: 110.1, y: 60 })).toBeNull()
    expect(hitTest(scene, { x: 111, y: 60 })).toBeNull()
  })
})

describe('collectNodesInRect', () => {
  it('collects nodes intersecting the rect in tree order', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0 }))
    scene.addNode(createRectangle({ id: 'parent', x: 150, y: 0, width: 200, height: 200 }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'parent', x: 10, y: 10 }))
    scene.addNode(createRectangle({ id: 'far', x: 900, y: 900 }))
    expect(collectNodesInRect(scene, { x: 0, y: 0, width: 400, height: 400 })).toEqual([
      'a',
      'parent',
      'child',
    ])
  })

  it('skips invisible and locked nodes', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'hidden', visible: false }))
    scene.addNode(createRectangle({ id: 'locked', locked: true }))
    scene.addNode(createRectangle({ id: 'hiddenChild', parentId: 'hidden' }))
    expect(collectNodesInRect(scene, { x: -100, y: -100, width: 500, height: 500 })).toEqual([])
  })

  it('selects nodes partially covered by the rect and ignores touching ones', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'partial', x: 90, y: 0 }))
    scene.addNode(createRectangle({ id: 'touching', x: 200, y: 0 }))
    expect(collectNodesInRect(scene, { x: 0, y: 0, width: 200, height: 100 })).toEqual(['partial'])
  })
})

describe('collectSelectableIds', () => {
  it('collects every visible unlocked node', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0 }))
    scene.addNode(createRectangle({ id: 'parent', x: 200, y: 0 }))
    scene.addNode(createRectangle({ id: 'child', parentId: 'parent' }))
    scene.addNode(createRectangle({ id: 'hidden', visible: false }))
    scene.addNode(createRectangle({ id: 'locked', locked: true }))
    expect(collectSelectableIds(scene)).toEqual(['a', 'parent', 'child'])
  })
})
