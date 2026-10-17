import { describe, expect, it, vi } from 'vitest'
import { CreateNodeCommand } from './commands/create-node-command'
import { Document } from './document/document'
import type { NodeId, RectangleNode } from './document/types'
import { History } from './history'
import { translation } from './math/matrix'

function createRectangle(id: string, parentId: NodeId | null = null): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId,
    children: [],
    transform: translation(0, 0),
    width: 10,
    height: 10,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [],
    cornerRadius: 0,
  }
}

describe('History', () => {
  it('executes a command and enables undo', () => {
    const document = new Document()
    const history = new History()

    history.execute(new CreateNodeCommand(document, createRectangle('a')))

    expect(document.getRootChildren()).toEqual(['a'])
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('undoes and redoes a created node', () => {
    const document = new Document()
    const history = new History()
    history.execute(new CreateNodeCommand(document, createRectangle('a')))

    history.undo()
    expect(document.getRootChildren()).toEqual([])
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)

    history.redo()
    expect(document.getRootChildren()).toEqual(['a'])
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('clears the redo stack when a new command runs', () => {
    const document = new Document()
    const history = new History()
    history.execute(new CreateNodeCommand(document, createRectangle('a')))
    history.undo()

    history.execute(new CreateNodeCommand(document, createRectangle('b')))

    expect(history.canRedo).toBe(false)
    history.redo()
    expect(document.getRootChildren()).toEqual(['b'])
  })

  it('does nothing when the stacks are empty', () => {
    const history = new History()
    history.undo()
    history.redo()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })

  it('restores the insertion index on redo', () => {
    const document = new Document()
    const history = new History()
    history.execute(new CreateNodeCommand(document, createRectangle('a')))
    history.execute(new CreateNodeCommand(document, createRectangle('b')))
    history.execute(new CreateNodeCommand(document, createRectangle('c'), 0))
    expect(document.getRootChildren()).toEqual(['c', 'a', 'b'])

    history.undo()
    expect(document.getRootChildren()).toEqual(['a', 'b'])

    history.redo()
    expect(document.getRootChildren()).toEqual(['c', 'a', 'b'])
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const document = new Document()
    const history = new History()
    const listener = vi.fn()
    const unsubscribe = history.subscribe(listener)

    const command = new CreateNodeCommand(document, createRectangle('a'))
    history.execute(command)
    history.undo()
    history.redo()
    expect(listener).toHaveBeenCalledTimes(3)

    unsubscribe()
    history.undo()
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
