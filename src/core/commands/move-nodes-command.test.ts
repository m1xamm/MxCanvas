import { describe, expect, it } from 'vitest'
import { Document } from '../document/document'
import type { NodeId, RectangleNode } from '../document/types'
import { multiply, scaling, translation, type Mat2D } from '../math/matrix'
import { nodeWorldRect } from '../transform'
import { MoveNodesCommand } from './move-nodes-command'

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
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    fills: [],
    cornerRadius: 0,
  }
}

describe('MoveNodesCommand', () => {
  it('carries children along without moving them twice', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 10, y: 10 }))
    scene.addNode(createRectangle({ id: 'b', parentId: 'a', x: 5, y: 5 }))

    new MoveNodesCommand(scene, ['a', 'b'], { x: 20, y: 30 }).execute()

    expect(scene.getNode('a')?.transform.e).toBe(30)
    expect(scene.getNode('a')?.transform.f).toBe(40)
    expect(scene.getNode('b')?.transform.e).toBe(5)
    expect(scene.getNode('b')?.transform.f).toBe(5)
    const child = scene.getNode('b')
    expect(child && nodeWorldRect(scene, child)).toEqual({ x: 35, y: 45, width: 100, height: 100 })
  })

  it('moves a child on its own when the parent is not selected', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 10, y: 10 }))
    scene.addNode(createRectangle({ id: 'b', parentId: 'a', x: 5, y: 5 }))

    new MoveNodesCommand(scene, ['b'], { x: 20, y: 30 }).execute()

    expect(scene.getNode('a')?.transform.e).toBe(10)
    expect(scene.getNode('b')?.transform.e).toBe(25)
    expect(scene.getNode('b')?.transform.f).toBe(35)
  })

  it('keeps the node size while moving', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0, width: 40, height: 20 }))
    new MoveNodesCommand(scene, ['a'], { x: 5, y: 5 }).execute()
    expect(scene.getNode('a')?.width).toBe(40)
    expect(scene.getNode('a')?.height).toBe(20)
  })

  it('moves a scaled node by the world delta', () => {
    const scene = new Document()
    const node = createRectangle({
      id: 'a',
      transform: multiply(translation(10, 10), scaling(2, 2)),
      width: 50,
      height: 20,
    })
    scene.addNode(node)

    new MoveNodesCommand(scene, ['a'], { x: 20, y: 30 }).execute()

    const moved = scene.getNode('a')
    expect(moved && nodeWorldRect(scene, moved)).toEqual({ x: 30, y: 40, width: 100, height: 40 })
    expect(moved?.width).toBe(50)
  })

  it('skips ids that are not in the document', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0 }))
    const command = new MoveNodesCommand(scene, ['a', 'missing'], { x: 10, y: 0 })
    expect(() => command.execute()).not.toThrow()
    expect(scene.getNode('a')?.transform.e).toBe(10)
  })

  it('restores the original positions on undo and moves again on redo', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 10, y: 10 }))
    scene.addNode(createRectangle({ id: 'b', x: 50, y: 60 }))
    const command = new MoveNodesCommand(scene, ['a', 'b'], { x: -5, y: 15 })

    command.execute()
    expect(scene.getNode('a')?.transform.e).toBe(5)
    expect(scene.getNode('b')?.transform.f).toBe(75)

    command.undo()
    expect(scene.getNode('a')?.transform.e).toBe(10)
    expect(scene.getNode('a')?.transform.f).toBe(10)
    expect(scene.getNode('b')?.transform.e).toBe(50)
    expect(scene.getNode('b')?.transform.f).toBe(60)

    command.execute()
    expect(scene.getNode('a')?.transform.e).toBe(5)
    expect(scene.getNode('b')?.transform.f).toBe(75)
  })

  it('uses a move label', () => {
    const scene = new Document()
    expect(new MoveNodesCommand(scene, [], { x: 1, y: 1 }).label).toBe('move nodes')
  })

  it('absorbs a mergeable move of the same nodes', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 10, y: 10 }))
    const first = new MoveNodesCommand(scene, ['a'], { x: 5, y: 0 }, { mergeable: true })
    first.execute()
    const second = new MoveNodesCommand(scene, ['a'], { x: 5, y: 0 }, { mergeable: true })

    expect(first.mergeWith(second)).toBe(true)
    expect(scene.getNode('a')?.transform.e).toBe(20)

    first.undo()
    expect(scene.getNode('a')?.transform.e).toBe(10)
  })

  it('rejects merges that touch other nodes', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0 }))
    scene.addNode(createRectangle({ id: 'b', x: 0, y: 0 }))
    const first = new MoveNodesCommand(scene, ['a'], { x: 5, y: 0 }, { mergeable: true })
    const second = new MoveNodesCommand(scene, ['b'], { x: 5, y: 0 }, { mergeable: true })

    expect(first.mergeWith(second)).toBe(false)
  })

  it('rejects drag moves that are not mergeable', () => {
    const scene = new Document()
    scene.addNode(createRectangle({ id: 'a', x: 0, y: 0 }))
    const drag = new MoveNodesCommand(scene, ['a'], { x: 5, y: 0 })
    const nudge = new MoveNodesCommand(scene, ['a'], { x: 5, y: 0 }, { mergeable: true })

    expect(drag.mergeWith(nudge)).toBe(false)
    expect(nudge.mergeWith(drag)).toBe(false)
  })
})
