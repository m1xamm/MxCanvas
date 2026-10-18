import { describe, expect, it } from 'vitest'
import { RenameNodeCommand } from './rename-node-command'
import { Document } from '../document/document'
import type { RectangleNode } from '../document/types'
import { translation } from '../math/matrix'

function createRectangle(id: string, name: string): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name,
    parentId: null,
    children: [],
    transform: translation(0, 0),
    width: 100,
    height: 100,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [],
    cornerRadius: 0,
  }
}

describe('RenameNodeCommand', () => {
  it('renames the node and restores the old name on undo', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 'Rectangle 1'))
    const command = new RenameNodeCommand(scene, 'a', 'Header')

    command.execute()
    expect(scene.getNode('a')?.name).toBe('Header')

    command.undo()
    expect(scene.getNode('a')?.name).toBe('Rectangle 1')

    command.execute()
    expect(scene.getNode('a')?.name).toBe('Header')
  })

  it('uses a rename label', () => {
    const scene = new Document()
    expect(new RenameNodeCommand(scene, 'a', 'x').label).toBe('rename node')
  })

  it('ignores a missing node', () => {
    const scene = new Document()
    const command = new RenameNodeCommand(scene, 'missing', 'x')
    command.execute()
    command.undo()
    expect(scene.getNode('missing')).toBeUndefined()
  })
})
