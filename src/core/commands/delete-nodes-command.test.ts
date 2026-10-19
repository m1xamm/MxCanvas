import { describe, expect, it } from 'vitest'
import { DeleteNodesCommand } from './delete-nodes-command'
import { Document } from '../document/document'
import type { NodeId, RectangleNode } from '../document/types'
import { translation } from '../math/matrix'

function createRectangle(id: string, parentId: NodeId | null = null): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId,
    children: [],
    transform: translation(0, 0),
    width: 100,
    height: 100,
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

describe('DeleteNodesCommand', () => {
  it('removes the nodes and restores them at their root index on undo', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a'))
    scene.addNode(createRectangle('b'))
    scene.addNode(createRectangle('c'))
    const command = new DeleteNodesCommand(scene, ['b'])

    command.execute()
    expect(scene.getNode('b')).toBeUndefined()
    expect(scene.getRootChildren()).toEqual(['a', 'c'])

    command.undo()
    expect(scene.getRootChildren()).toEqual(['a', 'b', 'c'])

    command.execute()
    expect(scene.getRootChildren()).toEqual(['a', 'c'])
  })

  it('restores a removed subtree with its children in order', () => {
    const scene = new Document()
    scene.addNode(createRectangle('parent'))
    scene.addNode(createRectangle('first', 'parent'))
    scene.addNode(createRectangle('second', 'parent'))
    scene.addNode(createRectangle('third'))
    const command = new DeleteNodesCommand(scene, ['parent'])

    command.execute()
    expect(scene.getNode('parent')).toBeUndefined()
    expect(scene.getNode('first')).toBeUndefined()
    expect(scene.getRootChildren()).toEqual(['third'])

    command.undo()
    expect(scene.getRootChildren()).toEqual(['parent', 'third'])
    expect(scene.getNode('parent')?.children).toEqual(['first', 'second'])
    expect(scene.getNode('first')?.parentId).toBe('parent')
  })

  it('skips descendants of the removed nodes', () => {
    const scene = new Document()
    scene.addNode(createRectangle('parent'))
    scene.addNode(createRectangle('child', 'parent'))
    const command = new DeleteNodesCommand(scene, ['parent', 'child'])

    command.execute()
    expect(scene.getNode('parent')).toBeUndefined()
    expect(scene.getNode('child')).toBeUndefined()

    command.undo()
    expect(scene.getRootChildren()).toEqual(['parent'])
    expect(scene.getNode('parent')?.children).toEqual(['child'])
  })

  it('keeps the order of nodes after a child is deleted', () => {
    const scene = new Document()
    scene.addNode(createRectangle('parent'))
    scene.addNode(createRectangle('first', 'parent'))
    scene.addNode(createRectangle('second', 'parent'))
    scene.addNode(createRectangle('third', 'parent'))
    const command = new DeleteNodesCommand(scene, ['second'])

    command.execute()
    expect(scene.getNode('parent')?.children).toEqual(['first', 'third'])

    command.undo()
    expect(scene.getNode('parent')?.children).toEqual(['first', 'second', 'third'])
  })

  it('uses a delete label', () => {
    const scene = new Document()
    expect(new DeleteNodesCommand(scene, []).label).toBe('delete nodes')
  })
})
