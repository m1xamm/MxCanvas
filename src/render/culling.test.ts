import { describe, expect, it } from 'vitest'
import { createRectangleNode } from '../core/document/create-node'
import { Document } from '../core/document/document'
import type { SceneNodeUnion } from '../core/document/types'
import { collectVisibleNodes } from './culling'

function addRectangle(document: Document, id: string, x: number, y: number): void {
  document.addNode(createRectangleNode({ id, name: id, x, y, width: 100, height: 100 }))
}

const BOUNDS = { x: 0, y: 0, width: 200, height: 200 }

describe('collectVisibleNodes', () => {
  it('collects intersecting nodes in tree order', () => {
    const document = new Document()
    addRectangle(document, 'a', 0, 0)
    addRectangle(document, 'b', 500, 500)
    addRectangle(document, 'c', 50, 50)

    const visible = collectVisibleNodes(document, BOUNDS, [])
    expect(visible.map((node) => node.id)).toEqual(['a', 'c'])
  })

  it('keeps partially visible nodes', () => {
    const document = new Document()
    addRectangle(document, 'a', -50, -50)

    const visible = collectVisibleNodes(document, BOUNDS, [])
    expect(visible.map((node) => node.id)).toEqual(['a'])
  })

  it('uses world transforms of nested nodes', () => {
    const document = new Document()
    document.addNode(createRectangleNode({ id: 'parent', name: 'parent', x: 0, y: 0, width: 10, height: 10 }))
    document.addNode(
      createRectangleNode({ id: 'child', name: 'child', x: 150, y: 150, width: 10, height: 10, parentId: 'parent' }),
    )
    document.addNode(createRectangleNode({ id: 'farParent', name: 'farParent', x: 1000, y: 1000, width: 10, height: 10 }))
    document.addNode(
      createRectangleNode({ id: 'farChild', name: 'farChild', x: 10, y: 10, width: 10, height: 10, parentId: 'farParent' }),
    )

    const visible = collectVisibleNodes(document, BOUNDS, [])
    expect(visible.map((node) => node.id)).toEqual(['parent', 'child'])
  })

  it('skips hidden nodes together with their children', () => {
    const document = new Document()
    const hiddenParent = createRectangleNode({ id: 'hidden', name: 'hidden', x: 0, y: 0, width: 100, height: 100 })
    hiddenParent.visible = false
    document.addNode(hiddenParent)
    document.addNode(
      createRectangleNode({ id: 'hiddenChild', name: 'hiddenChild', x: 0, y: 0, width: 10, height: 10, parentId: 'hidden' }),
    )
    const hiddenChild = document.getNode('hiddenChild')
    if (hiddenChild) hiddenChild.visible = false
    document.addNode(createRectangleNode({ id: 'visible', name: 'visible', x: 0, y: 0, width: 10, height: 10 }))

    const visible = collectVisibleNodes(document, BOUNDS, [])
    expect(visible.map((node) => node.id)).toEqual(['visible'])
  })

  it('clears the previous output', () => {
    const document = new Document()
    addRectangle(document, 'a', 0, 0)

    const out: SceneNodeUnion[] = []
    collectVisibleNodes(document, BOUNDS, out)
    collectVisibleNodes(document, { x: 1000, y: 1000, width: 10, height: 10 }, out)
    expect(out).toEqual([])
  })
})
