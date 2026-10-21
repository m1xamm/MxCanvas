import { describe, expect, it } from 'vitest'
import { ReorderNodesCommand } from './reorder-nodes-command'
import { Document } from '../document/document'
import type { RectangleNode } from '../document/types'
import { translation } from '../math/matrix'

function createRectangle(id: string, parentId: string | null = null): RectangleNode {
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
    strokeAlign: 'center',
    effects: [],
    fills: [],
    cornerRadius: 0,
  }
}

function documentWith(...ids: string[]): Document {
  const scene = new Document()
  for (const id of ids) scene.addNode(createRectangle(id))
  return scene
}

describe('ReorderNodesCommand', () => {
  it('moves a node to a new index and restores it on undo', () => {
    const scene = documentWith('a', 'b', 'c')
    const command = new ReorderNodesCommand(scene, [{ id: 'a', toIndex: 2 }])

    command.execute()
    expect(scene.getRootChildren()).toEqual(['b', 'c', 'a'])

    command.undo()
    expect(scene.getRootChildren()).toEqual(['a', 'b', 'c'])

    command.execute()
    expect(scene.getRootChildren()).toEqual(['b', 'c', 'a'])
  })

  it('applies several moves as one step', () => {
    const scene = documentWith('a', 'b', 'c')
    const command = new ReorderNodesCommand(scene, [
      { id: 'b', toIndex: 2 },
      { id: 'a', toIndex: 1 },
    ])

    command.execute()
    expect(scene.getRootChildren()).toEqual(['c', 'a', 'b'])

    command.undo()
    expect(scene.getRootChildren()).toEqual(['a', 'b', 'c'])
  })

  it('reorders children inside their parent', () => {
    const scene = new Document()
    scene.addNode(createRectangle('parent'))
    scene.addNode(createRectangle('first', 'parent'))
    scene.addNode(createRectangle('second', 'parent'))
    scene.addNode(createRectangle('third', 'parent'))
    const command = new ReorderNodesCommand(scene, [{ id: 'first', toIndex: 2 }])

    command.execute()
    expect(scene.getNode('parent')?.children).toEqual(['second', 'third', 'first'])
    expect(scene.getRootChildren()).toEqual(['parent'])

    command.undo()
    expect(scene.getNode('parent')?.children).toEqual(['first', 'second', 'third'])
  })

  it('clamps the target index and skips no-op moves', () => {
    const scene = documentWith('a', 'b')
    new ReorderNodesCommand(scene, [{ id: 'a', toIndex: 9 }]).execute()
    expect(scene.getRootChildren()).toEqual(['b', 'a'])

    const noop = new ReorderNodesCommand(scene, [{ id: 'b', toIndex: 0 }])
    noop.execute()
    expect(scene.getRootChildren()).toEqual(['b', 'a'])
    noop.undo()
    expect(scene.getRootChildren()).toEqual(['b', 'a'])
  })

  it('uses a reorder label', () => {
    const scene = documentWith('a')
    expect(new ReorderNodesCommand(scene, []).label).toBe('reorder nodes')
  })
})
