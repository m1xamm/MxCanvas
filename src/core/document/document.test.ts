import { describe, expect, it, vi } from 'vitest'
import { applyToPoint, translation } from '../math/matrix'
import { Document } from './document'
import type { NodeId, RectangleNode } from './types'

interface RectangleOptions {
  id: string
  parentId?: NodeId | null
  x?: number
  y?: number
  width?: number
  height?: number
}

function createRectangle(options: RectangleOptions): RectangleNode {
  return {
    id: options.id,
    type: 'rectangle',
    name: options.id,
    parentId: options.parentId ?? null,
    children: [],
    transform: translation(options.x ?? 0, options.y ?? 0),
    width: options.width ?? 10,
    height: options.height ?? 10,
    visible: true,
    locked: false,
    opacity: 1,
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    fills: [],
    cornerRadius: 0,
  }
}

describe('Document', () => {
  it('adds root nodes in insertion order', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'a' }))
    document.addNode(createRectangle({ id: 'b' }))
    expect(document.getRootChildren()).toEqual(['a', 'b'])
    expect(document.getNode('a')?.id).toBe('a')
    expect(document.getNode('missing')).toBeUndefined()
  })

  it('inserts a node at an index', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'a' }))
    document.addNode(createRectangle({ id: 'b' }))
    document.addNode(createRectangle({ id: 'c' }), 1)
    expect(document.getRootChildren()).toEqual(['a', 'c', 'b'])
  })

  it('adds child nodes to their parent', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'parent' }))
    document.addNode(createRectangle({ id: 'child', parentId: 'parent' }))
    expect(document.getRootChildren()).toEqual(['parent'])
    expect(document.getNode('parent')?.children).toEqual(['child'])
  })

  it('removes a node together with its descendants', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'parent' }))
    document.addNode(createRectangle({ id: 'child', parentId: 'parent' }))
    document.addNode(createRectangle({ id: 'grandchild', parentId: 'child' }))
    document.addNode(createRectangle({ id: 'sibling' }))
    const listener = vi.fn()
    document.subscribe(listener)

    document.removeNode('parent')

    expect(document.getNode('parent')).toBeUndefined()
    expect(document.getNode('child')).toBeUndefined()
    expect(document.getNode('grandchild')).toBeUndefined()
    expect(document.getRootChildren()).toEqual(['sibling'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('derives world transforms from parent transforms', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'parent', x: 100, y: 50 }))
    document.addNode(createRectangle({ id: 'child', parentId: 'parent', x: 10, y: 5 }))
    document.addNode(createRectangle({ id: 'grandchild', parentId: 'child', x: 1, y: 2 }))

    const world = applyToPoint(document.getWorldTransform('grandchild'), { x: 0, y: 0 })
    expect(world).toEqual({ x: 111, y: 57 })
  })

  it('caches world transforms and invalidates the cache on change', () => {
    const document = new Document()
    document.addNode(createRectangle({ id: 'a', x: 20, y: 30 }))
    document.addNode(createRectangle({ id: 'b', parentId: 'a', x: 5, y: 5 }))

    const first = document.getWorldTransform('b')
    expect(document.getWorldTransform('b')).toBe(first)

    document.addNode(createRectangle({ id: 'c' }))

    const second = document.getWorldTransform('b')
    expect(second).not.toBe(first)
    expect(second).toEqual(first)
  })

  it('tracks the change count', () => {
    const document = new Document()
    expect(document.changeCount).toBe(0)
    document.addNode(createRectangle({ id: 'a' }))
    expect(document.changeCount).toBe(1)
    document.addNode(createRectangle({ id: 'b' }))
    expect(document.changeCount).toBe(2)
    document.removeNode('a')
    expect(document.changeCount).toBe(3)
    document.removeNode('missing')
    expect(document.changeCount).toBe(3)
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const document = new Document()
    const listener = vi.fn()
    const unsubscribe = document.subscribe(listener)

    document.addNode(createRectangle({ id: 'a' }))
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    document.addNode(createRectangle({ id: 'b' }))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
