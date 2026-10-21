import { describe, expect, it } from 'vitest'
import { SetNodeVisibleCommand } from './set-node-visible-command'
import { Document } from '../document/document'
import type { RectangleNode } from '../document/types'
import { translation } from '../math/matrix'

function createRectangle(id: string): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId: null,
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

describe('SetNodeVisibleCommand', () => {
  it('hides the nodes and shows them again on undo', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a'))
    scene.addNode(createRectangle('b'))
    const command = new SetNodeVisibleCommand(scene, ['a', 'b'], false)

    command.execute()
    expect(scene.getNode('a')?.visible).toBe(false)
    expect(scene.getNode('b')?.visible).toBe(false)

    command.undo()
    expect(scene.getNode('a')?.visible).toBe(true)

    command.execute()
    expect(scene.getNode('b')?.visible).toBe(false)
  })

  it('shows hidden nodes again', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a'))
    scene.setNodeVisible('a', false)
    const command = new SetNodeVisibleCommand(scene, ['a'], true)
    command.execute()
    expect(scene.getNode('a')?.visible).toBe(true)
    command.undo()
    expect(scene.getNode('a')?.visible).toBe(false)
  })

  it('uses a visible label', () => {
    const scene = new Document()
    expect(new SetNodeVisibleCommand(scene, [], false).label).toBe('set node visible')
  })
})
