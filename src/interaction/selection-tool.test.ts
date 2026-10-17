import { describe, expect, it, vi } from 'vitest'
import { Document } from '../core/document/document'
import type { NodeId, RectangleNode } from '../core/document/types'
import { translation } from '../core/math/matrix'
import { Viewport } from '../core/viewport'
import { SelectionTool, type SelectionPointerInput } from './selection-tool'

function createRectangle(id: string, x: number, y: number, size = 100): RectangleNode {
  return {
    id,
    type: 'rectangle',
    name: id,
    parentId: null,
    children: [],
    transform: translation(x, y),
    width: size,
    height: size,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [],
    cornerRadius: 0,
  }
}

function pointer(x: number, y: number, modifiers: { shiftKey?: boolean } = {}): SelectionPointerInput {
  return {
    pointerId: 1,
    screen: { x, y },
    shiftKey: modifiers.shiftKey ?? false,
    altKey: false,
  }
}

function setup() {
  const scene = new Document()
  const viewport = new Viewport()
  let selection: readonly NodeId[] = []
  const onSelectionChange = vi.fn<(ids: readonly NodeId[]) => void>((ids) => {
    selection = ids
  })
  const onOverlayChange = vi.fn<() => void>()
  const tool = new SelectionTool({
    scene,
    viewport,
    getSelection: () => selection,
    onSelectionChange,
    onOverlayChange,
  })
  return {
    scene,
    viewport,
    tool,
    onSelectionChange,
    onOverlayChange,
    getSelection: () => selection,
  }
}

describe('SelectionTool', () => {
  it('selects the top-most node on click', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 20, 20))
    tool.pointerDown(pointer(50, 50))
    expect(getSelection()).toEqual(['b'])
  })

  it('replaces the selection on click and keeps a multi-selection press', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 200, 0))
    tool.pointerDown(pointer(50, 50))
    expect(getSelection()).toEqual(['a'])
    tool.pointerDown(pointer(250, 50, { shiftKey: true }))
    expect(getSelection()).toEqual(['a', 'b'])
    const multi = getSelection()
    tool.pointerDown(pointer(50, 50))
    expect(getSelection()).toBe(multi)
  })

  it('clears the selection on a click over empty canvas', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(400, 400))
    expect(getSelection()).toEqual([])
  })

  it('toggles a node in and out with shift+click', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50, { shiftKey: true }))
    expect(getSelection()).toEqual(['a'])
    tool.pointerDown(pointer(50, 50, { shiftKey: true }))
    expect(getSelection()).toEqual([])
  })

  it('selects every node intersecting the marquee', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 300, 300))
    tool.pointerDown(pointer(500, 500))
    expect(tool.marquee).toEqual({ x: 500, y: 500, width: 0, height: 0 })
    tool.pointerMove(pointer(50, 50))
    expect(tool.marquee).toEqual({ x: 50, y: 50, width: 450, height: 450 })
    tool.pointerUp(pointer(50, 50))
    expect(getSelection()).toEqual(['a', 'b'])
    expect(tool.marquee).toBeNull()
  })

  it('adds the marquee result to the selection with shift held', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 300, 300))
    tool.pointerDown(pointer(50, 50))
    expect(getSelection()).toEqual(['a'])
    tool.pointerDown(pointer(500, 500, { shiftKey: true }))
    tool.pointerMove(pointer(250, 250, { shiftKey: true }))
    tool.pointerUp(pointer(250, 250, { shiftKey: true }))
    expect(getSelection()).toEqual(['a', 'b'])
  })

  it('keeps the selection when the marquee drag stays under the click threshold', () => {
    const { scene, tool, getSelection, onSelectionChange } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerDown(pointer(400, 400))
    onSelectionChange.mockClear()
    tool.pointerMove(pointer(401, 402))
    tool.pointerUp(pointer(401, 402))
    expect(onSelectionChange).not.toHaveBeenCalled()
    expect(getSelection()).toEqual([])
  })

  it('reports the hovered node and clears it on demand', () => {
    const { scene, tool, onOverlayChange } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerMove(pointer(50, 50))
    expect(tool.hoveredId).toBe('a')
    onOverlayChange.mockClear()
    tool.pointerMove(pointer(60, 60))
    expect(onOverlayChange).not.toHaveBeenCalled()
    tool.pointerMove(pointer(400, 400))
    expect(tool.hoveredId).toBeNull()
    tool.pointerMove(pointer(50, 50))
    tool.clearHover()
    expect(tool.hoveredId).toBeNull()
  })

  it('cancels an active marquee', () => {
    const { scene, tool, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(500, 500))
    expect(tool.cancel()).toBe(true)
    expect(tool.marquee).toBeNull()
    expect(tool.cancel()).toBe(false)
    expect(tool.pointerUp(pointer(100, 100))).toBe(false)
    expect(getSelection()).toEqual([])
  })
})
