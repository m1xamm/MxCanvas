import { describe, expect, it, vi } from 'vitest'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import { Document } from '../core/document/document'
import type { NodeId, RectangleNode } from '../core/document/types'
import { translation, type Vec2 } from '../core/math/matrix'
import type { SnapGuide } from '../core/snap'
import { Viewport } from '../core/viewport'
import { SelectionTool, type SelectionPointerInput, type SelectionSnap } from './selection-tool'

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
    constrainProportions: false,
    strokes: [],
    strokeWeight: 0,
    effects: [],
    fills: [],
    cornerRadius: 0,
  }
}

function pointer(
  x: number,
  y: number,
  modifiers: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean } = {},
): SelectionPointerInput {
  return {
    pointerId: 1,
    screen: { x, y },
    shiftKey: modifiers.shiftKey ?? false,
    altKey: modifiers.altKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
  }
}

function setup(snap?: SelectionSnap) {
  const scene = new Document()
  const viewport = new Viewport()
  let selection: readonly NodeId[] = []
  const onSelectionChange = vi.fn<(ids: readonly NodeId[]) => void>((ids) => {
    selection = ids
  })
  const onMoveSelection = vi.fn<(delta: Vec2) => void>()
  const onResizeSelection = vi.fn<(changes: readonly NodeBoxChange[]) => void>()
  const onOverlayChange = vi.fn<() => void>()
  const tool = new SelectionTool({
    scene,
    viewport,
    getSelection: () => selection,
    onSelectionChange,
    onMoveSelection,
    onResizeSelection,
    onOverlayChange,
    snap,
  })
  return {
    scene,
    viewport,
    tool,
    onSelectionChange,
    onMoveSelection,
    onResizeSelection,
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

describe('SelectionTool move', () => {
  it('commits a single move on pointerup with the drag delta', () => {
    const { scene, tool, onMoveSelection, onSelectionChange } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    onSelectionChange.mockClear()
    tool.pointerMove(pointer(80, 70))
    expect(onMoveSelection).not.toHaveBeenCalled()
    tool.pointerUp(pointer(80, 70))
    expect(onMoveSelection).toHaveBeenCalledTimes(1)
    expect(onMoveSelection).toHaveBeenCalledWith({ x: 30, y: 20 })
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('previews the moved nodes and reports the preview bounds while dragging', () => {
    const { scene, tool } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    expect(tool.previews.size).toBe(0)
    tool.pointerMove(pointer(90, 60))
    expect(tool.previews.get('a')).toEqual({
      transform: translation(40, 10),
      width: 100,
      height: 100,
    })
    expect(tool.selectionBounds).toEqual({ x: 40, y: 10, width: 100, height: 100 })
    tool.pointerUp(pointer(90, 60))
    expect(tool.previews.size).toBe(0)
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('treats a drag under the click threshold as a click', () => {
    const { scene, tool, onMoveSelection, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(51, 52))
    tool.pointerUp(pointer(51, 52))
    expect(onMoveSelection).not.toHaveBeenCalled()
    expect(getSelection()).toEqual(['a'])
  })

  it('previews every sub-threshold move without committing it', () => {
    const { scene, tool, onMoveSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(51, 52))
    expect(tool.previews.get('a')).toEqual({
      transform: translation(1, 2),
      width: 100,
      height: 100,
    })
    expect(tool.selectionBounds).toEqual({ x: 1, y: 2, width: 100, height: 100 })
    tool.pointerUp(pointer(51, 52))
    expect(onMoveSelection).not.toHaveBeenCalled()
  })

  it('holds snapping until the drag threshold is crossed', () => {
    const guides: SnapGuide[] = [{ axis: 'x', position: 0, from: 0, to: 100 }]
    const snap = vi.fn<SelectionSnap>((rect) => ({ rect, guides }))
    const { scene, tool } = setup(snap)
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(51, 52))
    expect(snap).not.toHaveBeenCalled()
    expect(tool.snapGuides).toEqual([])
    tool.pointerMove(pointer(80, 70))
    expect(snap).toHaveBeenCalled()
    expect(tool.snapGuides).toEqual(guides)
    tool.pointerUp(pointer(80, 70))
    expect(tool.snapGuides).toEqual([])
    tool.pointerDown(pointer(50, 50))
    expect(tool.snapGuides).toEqual([])
  })

  it('locks the movement to the dominant axis with shift', () => {
    const { scene, tool, onMoveSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(90, 60, { shiftKey: true }))
    tool.pointerUp(pointer(90, 60, { shiftKey: true }))
    expect(onMoveSelection).toHaveBeenCalledWith({ x: 40, y: 0 })
  })

  it('selects an unselected node on press and moves it afterwards', () => {
    const { scene, tool, onMoveSelection, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 300, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(350, 50))
    expect(getSelection()).toEqual(['b'])
    tool.pointerMove(pointer(370, 40))
    tool.pointerUp(pointer(370, 40))
    expect(onMoveSelection).toHaveBeenCalledWith({ x: 20, y: -10 })
    expect(tool.previews.size).toBe(0)
  })

  it('moves the whole selection when pressing an already selected node', () => {
    const { scene, tool, onMoveSelection, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 300, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(350, 50, { shiftKey: true }))
    tool.pointerUp(pointer(350, 50, { shiftKey: true }))
    expect(getSelection()).toEqual(['a', 'b'])
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(60, 70))
    expect(tool.selectionBounds).toEqual({ x: 10, y: 20, width: 400, height: 100 })
    tool.pointerUp(pointer(60, 70))
    expect(onMoveSelection).toHaveBeenCalledWith({ x: 10, y: 20 })
  })

  it('drops the preview when the move is cancelled', () => {
    const { scene, tool, onMoveSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove(pointer(90, 60))
    expect(tool.cancel()).toBe(true)
    expect(tool.previews.size).toBe(0)
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(onMoveSelection).not.toHaveBeenCalled()
  })

  it('ignores pointer events of another pointer id', () => {
    const { scene, tool, onMoveSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerMove({ ...pointer(90, 60), pointerId: 2 })
    tool.pointerUp({ ...pointer(90, 60), pointerId: 2 })
    expect(onMoveSelection).not.toHaveBeenCalled()
  })
})

describe('SelectionTool resize', () => {
  it('starts resizing from a handle press and commits one change on pointerup', () => {
    const { scene, tool, onSelectionChange, onResizeSelection, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    expect(getSelection()).toEqual(['a'])
    onSelectionChange.mockClear()
    tool.pointerDown(pointer(100, 100))
    expect(onSelectionChange).not.toHaveBeenCalled()
    expect(tool.previews.size).toBe(0)
    tool.pointerMove(pointer(150, 140))
    expect(tool.previews.get('a')).toEqual({
      transform: translation(0, 0),
      width: 150,
      height: 140,
    })
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 150, height: 140 })
    tool.pointerUp(pointer(150, 140))
    expect(onResizeSelection).toHaveBeenCalledTimes(1)
    expect(onResizeSelection.mock.calls[0]?.[0]).toEqual([
      {
        id: 'a',
        from: { transform: translation(0, 0), width: 100, height: 100 },
        to: { transform: translation(0, 0), width: 150, height: 140 },
      },
    ])
    expect(tool.previews.size).toBe(0)
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('keeps the aspect ratio when shift is held', () => {
    const { scene, tool, onResizeSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(100, 100))
    tool.pointerMove(pointer(150, 200, { shiftKey: true }))
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    tool.pointerUp(pointer(150, 200, { shiftKey: true }))
    expect(onResizeSelection.mock.calls[0]?.[0]?.[0]?.to.width).toBe(200)
    expect(onResizeSelection.mock.calls[0]?.[0]?.[0]?.to.height).toBe(200)
  })

  it('mirrors the node when the dragged edge crosses the opposite one', () => {
    const { scene, tool, onResizeSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(100, 50))
    tool.pointerMove(pointer(-50, 50))
    expect(tool.selectionBounds).toEqual({ x: -50, y: 0, width: 50, height: 100 })
    expect(tool.previews.get('a')).toEqual({
      transform: translation(-50, 0),
      width: 50,
      height: 100,
    })
    tool.pointerUp(pointer(-50, 50))
    expect(onResizeSelection.mock.calls[0]?.[0]?.[0]?.to).toEqual({
      transform: translation(-50, 0),
      width: 50,
      height: 100,
    })
  })

  it('scales the whole selection proportionally inside the bounds', () => {
    const { scene, tool, onResizeSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 200, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(250, 50, { shiftKey: true }))
    tool.pointerUp(pointer(250, 50, { shiftKey: true }))
    tool.pointerDown(pointer(300, 100))
    tool.pointerMove(pointer(600, 200))
    expect(tool.previews.get('a')).toEqual({
      transform: translation(0, 0),
      width: 200,
      height: 200,
    })
    expect(tool.previews.get('b')).toEqual({
      transform: translation(400, 0),
      width: 200,
      height: 200,
    })
    tool.pointerUp(pointer(600, 200))
    const changes = onResizeSelection.mock.calls[0]?.[0]
    expect(changes?.length).toBe(2)
    expect(changes?.[1]?.id).toBe('b')
    expect(changes?.[1]?.to).toEqual({
      transform: translation(400, 0),
      width: 200,
      height: 200,
    })
  })

  it('scales from the center when alt is held', () => {
    const { scene, tool } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(100, 100))
    tool.pointerMove(pointer(150, 150, { altKey: true }))
    expect(tool.selectionBounds).toEqual({ x: -50, y: -50, width: 200, height: 200 })
  })

  it('treats a handle drag under the click threshold as a click', () => {
    const { scene, tool, onResizeSelection, getSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(100, 100))
    tool.pointerMove(pointer(101, 101))
    expect(tool.previews.get('a')).toEqual({
      transform: translation(0, 0),
      width: 101,
      height: 101,
    })
    tool.pointerUp(pointer(101, 101))
    expect(onResizeSelection).not.toHaveBeenCalled()
    expect(getSelection()).toEqual(['a'])
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('drops the resize preview when the gesture is cancelled', () => {
    const { scene, tool, onResizeSelection } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerDown(pointer(100, 100))
    tool.pointerMove(pointer(150, 140))
    expect(tool.cancel()).toBe(true)
    expect(tool.previews.size).toBe(0)
    expect(tool.selectionBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 })
    expect(onResizeSelection).not.toHaveBeenCalled()
  })

  it('reports resize cursors over the handles and the default cursor elsewhere', () => {
    const { scene, tool } = setup()
    scene.addNode(createRectangle('a', 0, 0))
    expect(tool.cursorAt()).toBe('default')
    tool.pointerDown(pointer(50, 50))
    tool.pointerUp(pointer(50, 50))
    tool.pointerMove(pointer(100, 100))
    expect(tool.hoveredHandle).toBe('se')
    expect(tool.cursorAt()).toBe('nwse-resize')
    tool.pointerMove(pointer(50, 0))
    expect(tool.cursorAt()).toBe('ns-resize')
    tool.pointerMove(pointer(0, 50))
    expect(tool.cursorAt()).toBe('ew-resize')
    tool.pointerMove(pointer(50, 50))
    expect(tool.hoveredHandle).toBeNull()
    expect(tool.cursorAt()).toBe('default')
    tool.pointerDown(pointer(100, 100))
    tool.pointerMove(pointer(150, 150))
    expect(tool.cursorAt()).toBe('nwse-resize')
  })
})
