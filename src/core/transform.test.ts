import { describe, expect, it } from 'vitest'
import { Document } from './document/document'
import type { NodeId, RectangleNode } from './document/types'
import { applyToPoint, multiply, scaling, translation, type Mat2D } from './math/matrix'
import { translateRect } from './math/rect'
import { boxWorldTransform, nodeBox, nodeWorldRect, worldRectToBox } from './transform'

interface RectangleOptions {
  id: string
  parentId?: NodeId | null
  x?: number
  y?: number
  width?: number
  height?: number
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
    visible: true,
    locked: false,
    opacity: 1,
    fills: [],
    cornerRadius: 0,
  }
}

describe('nodeWorldRect', () => {
  it('returns the rect of a root node', () => {
    const scene = new Document()
    const node = createRectangle({ id: 'a', x: 10, y: 20, width: 100, height: 50 })
    scene.addNode(node)
    expect(nodeWorldRect(scene, node)).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })

  it('applies the transforms of ancestors', () => {
    const scene = new Document()
    const parent = createRectangle({ id: 'parent', x: 30, y: 40 })
    const child = createRectangle({
      id: 'child',
      parentId: 'parent',
      x: 5,
      y: 5,
      width: 10,
      height: 10,
    })
    scene.addNode(parent)
    scene.addNode(child)
    expect(nodeWorldRect(scene, child)).toEqual({ x: 35, y: 45, width: 10, height: 10 })
  })
})

describe('nodeBox', () => {
  it('snapshots the transform and the size', () => {
    const node = createRectangle({ id: 'a', x: 10, y: 20, width: 30, height: 40 })
    expect(nodeBox(node)).toEqual({ transform: node.transform, width: 30, height: 40 })
  })
})

describe('worldRectToBox', () => {
  it('places a root node at the world rect', () => {
    const scene = new Document()
    const node = createRectangle({ id: 'a', x: 0, y: 0, width: 100, height: 50 })
    scene.addNode(node)
    const box = worldRectToBox(scene, node, { x: 20, y: 10, width: 100, height: 50 })
    expect(box).toEqual({
      transform: translation(20, 10),
      width: 100,
      height: 50,
    })
  })

  it('keeps the local size when the world rect keeps its size', () => {
    const scene = new Document()
    const node = createRectangle({
      id: 'a',
      transform: multiply(translation(10, 10), scaling(2, 2)),
      width: 50,
      height: 20,
    })
    scene.addNode(node)
    const box = worldRectToBox(scene, node, translateRect(nodeWorldRect(scene, node), { x: 10, y: 5 }))
    expect(box.width).toBeCloseTo(50)
    expect(box.height).toBeCloseTo(20)
    expect(box.transform.e).toBeCloseTo(20)
    expect(box.transform.f).toBeCloseTo(15)
    expect(applyToPoint(box.transform, { x: 0, y: 0 })).toEqual({ x: 20, y: 15 })
  })

  it('converts the world rect into the parent space', () => {
    const scene = new Document()
    const parent = createRectangle({ id: 'parent', x: 100, y: 200 })
    const child = createRectangle({ id: 'child', parentId: 'parent', width: 10, height: 10 })
    scene.addNode(parent)
    scene.addNode(child)
    const box = worldRectToBox(scene, child, { x: 150, y: 250, width: 10, height: 10 })
    expect(box.transform.e).toBe(50)
    expect(box.transform.f).toBe(50)
  })
})

describe('boxWorldTransform', () => {
  it('composes the parent transform with the box', () => {
    const scene = new Document()
    const parent = createRectangle({ id: 'parent', x: 100, y: 200 })
    const child = createRectangle({ id: 'child', parentId: 'parent', width: 10, height: 10 })
    scene.addNode(parent)
    scene.addNode(child)
    const world = boxWorldTransform(scene, child, {
      transform: translation(5, 7),
      width: 10,
      height: 10,
    })
    expect(applyToPoint(world, { x: 0, y: 0 })).toEqual({ x: 105, y: 207 })
  })
})
