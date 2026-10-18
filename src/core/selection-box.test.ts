import { describe, expect, it } from 'vitest'
import { Document } from './document/document'
import { createRectangleNode } from './document/create-node'
import { MIN_NODE_SIZE, selectionBoxChanges, selectionRect, targetRect } from './selection-box'

function scene(): Document {
  const document = new Document()
  document.addNode(createRectangleNode({ id: 'a', name: 'a', x: 10, y: 20, width: 100, height: 50 }))
  document.addNode(createRectangleNode({ id: 'b', name: 'b', x: 160, y: 40, width: 40, height: 60 }))
  return document
}

const BOX = { x: 10, y: 20, width: 100, height: 50 }

describe('selectionRect', () => {
  it('returns the node rect for a single selection', () => {
    expect(selectionRect(scene(), ['a'])).toEqual(BOX)
  })

  it('returns the bounding box for a multiple selection', () => {
    expect(selectionRect(scene(), ['a', 'b'])).toEqual({ x: 10, y: 20, width: 190, height: 80 })
  })

  it('ignores missing nodes', () => {
    expect(selectionRect(scene(), ['missing'])).toBeNull()
    expect(selectionRect(scene(), ['a', 'missing'])).toEqual(BOX)
  })
})

describe('targetRect', () => {
  it('moves the box for x and y', () => {
    expect(targetRect(BOX, 'x', -5, false)).toEqual({ ...BOX, x: -5 })
    expect(targetRect(BOX, 'y', 0, false)).toEqual({ ...BOX, y: 0 })
  })

  it('resizes width and height with a minimum of one pixel', () => {
    expect(targetRect(BOX, 'width', 200, false)).toEqual({ ...BOX, width: 200 })
    expect(targetRect(BOX, 'height', 0, false)).toEqual({ ...BOX, height: MIN_NODE_SIZE })
    expect(targetRect(BOX, 'width', -20, false)).toEqual({ ...BOX, width: MIN_NODE_SIZE })
  })

  it('keeps the ratio when proportions are constrained', () => {
    expect(targetRect(BOX, 'width', 200, true)).toEqual({ ...BOX, width: 200, height: 100 })
    expect(targetRect(BOX, 'height', 100, true)).toEqual({ ...BOX, width: 200, height: 100 })
  })
})

describe('selectionBoxChanges', () => {
  it('maps every selected node into the target box', () => {
    const document = scene()
    const changes = selectionBoxChanges(document, ['a', 'b'], { x: 0, y: 0, width: 380, height: 160 })
    expect(changes).toHaveLength(2)
    expect(changes[0]?.to.width).toBe(200)
    expect(changes[0]?.to.transform.e).toBe(0)
    expect(changes[1]?.to.width).toBe(80)
    expect(changes[1]?.to.transform.e).toBe(300)
    expect(changes[1]?.to.transform.f).toBe(40)
  })

  it('returns nothing without a selection', () => {
    expect(selectionBoxChanges(scene(), [], BOX)).toEqual([])
  })
})
