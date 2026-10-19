import { describe, expect, it, vi } from 'vitest'
import { CreateNodeCommand } from './commands/create-node-command'
import { MoveNodesCommand } from './commands/move-nodes-command'
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
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    effects: [],
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

describe('History merge window', () => {
  function sceneWithRectangle(): Document {
    const document = new Document()
    document.addNode(createRectangle('a'))
    return document
  }

  it('merges nudges run inside the merge window into one command', () => {
    const document = sceneWithRectangle()
    let now = 1000
    const history = new History({ now: () => now })
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }, { mergeable: true }))
    now = 1400
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }, { mergeable: true }))
    now = 1800
    history.execute(new MoveNodesCommand(document, ['a'], { x: 0, y: 1 }, { mergeable: true }))

    expect(document.getNode('a')?.transform.e).toBe(2)
    expect(document.getNode('a')?.transform.f).toBe(1)

    history.undo()
    expect(document.getNode('a')?.transform.e).toBe(0)
    expect(document.getNode('a')?.transform.f).toBe(0)
    expect(history.canUndo).toBe(false)
  })

  it('keeps nudges apart when the merge window has passed', () => {
    const document = sceneWithRectangle()
    let now = 1000
    const history = new History({ now: () => now })
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }, { mergeable: true }))
    now = 1600
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }, { mergeable: true }))

    expect(document.getNode('a')?.transform.e).toBe(2)
    history.undo()
    expect(document.getNode('a')?.transform.e).toBe(1)
    expect(history.canUndo).toBe(true)
  })

  it('keeps drags as separate undo steps', () => {
    const document = sceneWithRectangle()
    const history = new History({ now: () => 1000 })
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }))
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }))

    expect(document.getNode('a')?.transform.e).toBe(2)
    history.undo()
    expect(document.getNode('a')?.transform.e).toBe(1)
    history.undo()
    expect(document.getNode('a')?.transform.e).toBe(0)
  })

  it('starts a fresh nudge chain after an undo', () => {
    const document = sceneWithRectangle()
    let now = 1000
    const history = new History({ now: () => now })
    history.execute(new MoveNodesCommand(document, ['a'], { x: 1, y: 0 }, { mergeable: true }))
    history.undo()
    now = 1100
    history.execute(new MoveNodesCommand(document, ['a'], { x: 2, y: 0 }, { mergeable: true }))

    expect(document.getNode('a')?.transform.e).toBe(2)
    history.undo()
    expect(document.getNode('a')?.transform.e).toBe(0)
    expect(history.canUndo).toBe(false)
  })
})
