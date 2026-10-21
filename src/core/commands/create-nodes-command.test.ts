import { describe, expect, it } from 'vitest'
import { createRectangleNode } from '../document/create-node'
import { Document } from '../document/document'
import { CreateNodesCommand } from './create-nodes-command'

function rectangle(id: string, x: number): ReturnType<typeof createRectangleNode> {
  return createRectangleNode({ id, name: id, x, y: 0, width: 10, height: 10 })
}

describe('CreateNodesCommand', () => {
  it('adds every node in order and undoes them all', () => {
    const document = new Document()
    const command = new CreateNodesCommand(document, [rectangle('a', 0), rectangle('b', 20)])
    expect(command.label).toBe('create 2 nodes')
    command.execute()
    expect(document.getRootChildren()).toEqual(['a', 'b'])
    command.undo()
    expect(document.getRootChildren()).toEqual([])
  })

  it('recreates the nodes after an undo', () => {
    const document = new Document()
    const command = new CreateNodesCommand(document, [rectangle('a', 0), rectangle('b', 20)])
    command.execute()
    command.undo()
    expect(document.getRootChildren()).toEqual([])
    command.execute()
    expect(document.getRootChildren()).toEqual(['a', 'b'])
  })
})
