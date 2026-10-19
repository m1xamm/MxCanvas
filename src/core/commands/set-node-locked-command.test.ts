import { describe, expect, it } from 'vitest'
import { SetNodeLockedCommand } from './set-node-locked-command'
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
    fills: [],
    cornerRadius: 0,
  }
}

describe('SetNodeLockedCommand', () => {
  it('locks the nodes and unlocks them on undo', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a'))
    scene.addNode(createRectangle('b'))
    const command = new SetNodeLockedCommand(scene, ['a', 'b'], true)

    command.execute()
    expect(scene.getNode('a')?.locked).toBe(true)
    expect(scene.getNode('b')?.locked).toBe(true)

    command.undo()
    expect(scene.getNode('a')?.locked).toBe(false)
    expect(scene.getNode('b')?.locked).toBe(false)

    command.execute()
    expect(scene.getNode('a')?.locked).toBe(true)
  })

  it('uses a locked label', () => {
    const scene = new Document()
    expect(new SetNodeLockedCommand(scene, [], true).label).toBe('set node locked')
  })
})
