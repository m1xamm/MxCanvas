import { describe, expect, it } from 'vitest'
import { Document } from '../document/document'
import type { RectangleNode } from '../document/types'
import { translation } from '../math/matrix'
import { nodeBox } from '../transform'
import { ResizeNodesCommand } from './resize-nodes-command'

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

describe('ResizeNodesCommand', () => {
  it('applies the new boxes on execute and restores them on undo', () => {
    const scene = new Document()
    const node = createRectangle('a', 0, 0)
    scene.addNode(node)
    const command = new ResizeNodesCommand(scene, [
      {
        id: 'a',
        from: nodeBox(node),
        to: { transform: translation(10, 20), width: 200, height: 50 },
      },
    ])

    command.execute()
    expect(scene.getNode('a')?.width).toBe(200)
    expect(scene.getNode('a')?.height).toBe(50)
    expect(scene.getNode('a')?.transform).toEqual(translation(10, 20))

    command.undo()
    expect(scene.getNode('a')?.width).toBe(100)
    expect(scene.getNode('a')?.height).toBe(100)
    expect(scene.getNode('a')?.transform).toEqual(translation(0, 0))

    command.execute()
    expect(scene.getNode('a')?.width).toBe(200)
  })

  it('resizes every node of a multi-selection', () => {
    const scene = new Document()
    const a = createRectangle('a', 0, 0)
    const b = createRectangle('b', 200, 0)
    scene.addNode(a)
    scene.addNode(b)
    const command = new ResizeNodesCommand(scene, [
      { id: 'a', from: nodeBox(a), to: { transform: translation(0, 0), width: 200, height: 200 } },
      {
        id: 'b',
        from: nodeBox(b),
        to: { transform: translation(400, 0), width: 200, height: 200 },
      },
    ])

    command.execute()
    expect(scene.getNode('a')?.width).toBe(200)
    expect(scene.getNode('b')?.transform).toEqual(translation(400, 0))

    command.undo()
    expect(scene.getNode('a')?.width).toBe(100)
    expect(scene.getNode('b')?.transform).toEqual(translation(200, 0))
  })

  it('uses a resize label', () => {
    const scene = new Document()
    expect(new ResizeNodesCommand(scene, []).label).toBe('resize nodes')
  })
})
