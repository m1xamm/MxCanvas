import { describe, expect, it } from 'vitest'
import { History } from '../history'
import { Document } from '../document/document'
import { createRectangleNode } from '../document/create-node'
import type { Paint, RectangleNode } from '../document/types'
import { SetConstrainProportionsCommand } from './set-constrain-proportions-command'
import { SetCornerRadiusCommand } from './set-corner-radius-command'
import { SetFillsCommand } from './set-fills-command'
import { SetOpacityCommand } from './set-opacity-command'

function scene(...nodes: RectangleNode[]): Document {
  const document = new Document()
  for (const node of nodes) document.addNode(node)
  return document
}

function rectangle(id: string, width = 100, height = 100): RectangleNode {
  return createRectangleNode({ id, name: id, x: 0, y: 0, width, height })
}

function solid(hex: number, opacity = 1, visible = true): Paint {
  return { type: 'solid', color: { r: hex, g: hex, b: hex }, opacity, visible }
}

describe('SetFillsCommand', () => {
  it('replaces the fills and restores them on undo', () => {
    const document = scene(rectangle('a'))
    const command = new SetFillsCommand(document, [{ id: 'a', from: document.getNode('a')!.fills, to: [solid(255)] }])
    command.execute()
    expect(document.getNode('a')?.fills).toEqual([solid(255)])
    command.undo()
    expect(document.getNode('a')?.fills).toHaveLength(1)
    expect(document.getNode('a')?.fills[0]?.color.r).toBe(217)
  })

  it('does not share paint objects with the document', () => {
    const document = scene(rectangle('a'))
    const paints = [solid(10)]
    const command = new SetFillsCommand(document, [{ id: 'a', from: document.getNode('a')!.fills, to: paints }])
    command.execute()
    paints[0]!.color.r = 200
    expect(document.getNode('a')?.fills[0]?.color.r).toBe(10)
  })

  it('merges continuations into one command', () => {
    const document = scene(rectangle('a'))
    const first = new SetFillsCommand(
      document,
      [{ id: 'a', from: document.getNode('a')!.fills, to: [solid(1)] }],
      { mergeable: true },
    )
    const second = new SetFillsCommand(
      document,
      [{ id: 'a', from: [solid(1)], to: [solid(2)] }],
      { mergeable: true },
    )
    expect(first.mergeWith(second)).toBe(true)
    first.execute()
    expect(document.getNode('a')?.fills).toEqual([solid(2)])
    first.undo()
    expect(document.getNode('a')?.fills[0]?.color.r).toBe(217)
  })

  it('rejects merging other targets', () => {
    const document = scene(rectangle('a'), rectangle('b'))
    const first = new SetFillsCommand(document, [{ id: 'a', from: [], to: [solid(1)] }], { mergeable: true })
    const second = new SetFillsCommand(document, [{ id: 'b', from: [], to: [solid(2)] }], { mergeable: true })
    expect(first.mergeWith(second)).toBe(false)
  })

  it('builds changes for a selection', () => {
    const document = scene(rectangle('a'), rectangle('b'))
    const command = SetFillsCommand.forNodes(document, ['a', 'missing'], (node) => [solid(node.width)])
    expect(command).not.toBeNull()
    command?.execute()
    expect(document.getNode('a')?.fills[0]?.color.r).toBe(100)
    expect(SetFillsCommand.forNodes(document, ['missing'], () => [])).toBeNull()
  })
})

describe('SetOpacityCommand', () => {
  it('sets and restores opacity through history', () => {
    const document = scene(rectangle('a'))
    const history = new History()
    history.execute(SetOpacityCommand.forNodes(document, ['a'], 0.4)!)
    expect(document.getNode('a')?.opacity).toBe(0.4)
    history.undo()
    expect(document.getNode('a')?.opacity).toBe(1)
    history.redo()
    expect(document.getNode('a')?.opacity).toBe(0.4)
  })

  it('clamps the value', () => {
    const document = scene(rectangle('a'))
    SetOpacityCommand.forNodes(document, ['a'], 3)!.execute()
    expect(document.getNode('a')?.opacity).toBe(1)
    SetOpacityCommand.forNodes(document, ['a'], -1)!.execute()
    expect(document.getNode('a')?.opacity).toBe(0)
  })

  it('merges only mergeable continuations', () => {
    const document = scene(rectangle('a'))
    const first = SetOpacityCommand.forNodes(document, ['a'], 0.5, { mergeable: true })!
    const second = SetOpacityCommand.forNodes(document, ['a'], 0.7, { mergeable: true })!
    const plain = SetOpacityCommand.forNodes(document, ['a'], 0.9)!
    expect(first.mergeWith(plain)).toBe(false)
    expect(first.mergeWith(second)).toBe(true)
    first.execute()
    expect(document.getNode('a')?.opacity).toBe(0.7)
  })
})

describe('SetCornerRadiusCommand', () => {
  it('clamps the radius to half of the smaller side', () => {
    const document = scene(rectangle('a', 100, 40))
    SetCornerRadiusCommand.forNodes(document, ['a'], 200)!.execute()
    expect(document.getNode('a')?.cornerRadius).toBe(20)
    SetCornerRadiusCommand.forNodes(document, ['a'], -5)!.execute()
    expect(document.getNode('a')?.cornerRadius).toBe(0)
  })

  it('undoes and redoes the radius', () => {
    const document = scene(rectangle('a'))
    const history = new History()
    history.execute(SetCornerRadiusCommand.forNodes(document, ['a'], 8)!)
    expect(document.getNode('a')?.cornerRadius).toBe(8)
    history.undo()
    expect(document.getNode('a')?.cornerRadius).toBe(0)
    history.redo()
    expect(document.getNode('a')?.cornerRadius).toBe(8)
  })

  it('merges continuations', () => {
    const document = scene(rectangle('a'))
    const first = SetCornerRadiusCommand.forNodes(document, ['a'], 4, { mergeable: true })!
    const second = SetCornerRadiusCommand.forNodes(document, ['a'], 12, { mergeable: true })!
    expect(first.mergeWith(second)).toBe(true)
    first.execute()
    expect(document.getNode('a')?.cornerRadius).toBe(12)
  })
})

describe('SetConstrainProportionsCommand', () => {
  it('toggles the flag and restores each node', () => {
    const document = scene(rectangle('a'), rectangle('b'))
    document.setNodeConstrainProportions('b', true)
    const command = new SetConstrainProportionsCommand(document, ['a', 'b'], true)
    command.execute()
    expect(document.getNode('a')?.constrainProportions).toBe(true)
    expect(document.getNode('b')?.constrainProportions).toBe(true)
    command.undo()
    expect(document.getNode('a')?.constrainProportions).toBe(false)
    expect(document.getNode('b')?.constrainProportions).toBe(true)
  })

  it('works through history', () => {
    const document = scene(rectangle('a'))
    const history = new History()
    history.execute(new SetConstrainProportionsCommand(document, ['a'], true))
    expect(document.getNode('a')?.constrainProportions).toBe(true)
    history.undo()
    expect(document.getNode('a')?.constrainProportions).toBe(false)
  })
})
