import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import { Document } from '../core/document/document'
import type { NodeId, RectangleNode } from '../core/document/types'
import type { LayerOrderMode } from '../core/layers'
import { translation, type Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
import { Viewport } from '../core/viewport'
import { CanvasController } from './canvas-controller'
import type { SelectionSnap } from './selection-tool'
import type { ToolId } from './tools'

type EventHandler = (event: unknown) => void

interface FakeEventTarget {
  addEventListener: (type: string, handler: EventHandler) => void
  removeEventListener: (type: string, handler: EventHandler) => void
  dispatch: (type: string, event: unknown) => void
}

function createEventTarget(): FakeEventTarget {
  const listeners = new Map<string, Set<EventHandler>>()
  return {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) ?? new Set<EventHandler>()
      handlers.add(handler)
      listeners.set(type, handlers)
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler)
    },
    dispatch(type, event) {
      for (const handler of listeners.get(type) ?? []) handler(event)
    },
  }
}

class FakeHTMLElement {
  isContentEditable = false
  tagName = ''
}

function createFakeCanvas() {
  return {
    ...createEventTarget(),
    style: { cursor: '' },
    clientWidth: 800,
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 100, top: 50 }) as DOMRect,
    setPointerCapture: () => undefined,
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
  }
}

function createWheelEvent(init: {
  clientX: number
  clientY: number
  deltaY: number
  deltaX?: number
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}) {
  return {
    clientX: init.clientX,
    clientY: init.clientY,
    deltaX: init.deltaX ?? 0,
    deltaY: init.deltaY,
    deltaMode: 0,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    preventDefault: vi.fn(),
  }
}

function createKeyEvent(init: {
  code: string
  key?: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  repeat?: boolean
  target?: EventTarget | null
}) {
  return {
    code: init.code,
    key: init.key ?? '',
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
    repeat: init.repeat ?? false,
    target: init.target ?? null,
    preventDefault: vi.fn(),
  }
}

function createPointerEvent(init: {
  button: number
  pointerId: number
  clientX: number
  clientY: number
  shiftKey?: boolean
  altKey?: boolean
  type?: string
}) {
  return {
    ...init,
    type: init.type ?? 'pointerup',
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    preventDefault: vi.fn(),
  }
}

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
    strokeAlign: 'center',
    effects: [],
    fills: [],
    cornerRadius: 0,
  }
}

function setup(
  initialTool: ToolId = 'move',
  scene: Document = new Document(),
  options: { getViewportArea?: () => Rect; snap?: SelectionSnap } = {},
) {
  const fakeWindow = createEventTarget()
  vi.stubGlobal('window', fakeWindow)
  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  const canvas = createFakeCanvas()
  const viewport = new Viewport()
  const onToolChange = vi.fn<(tool: ToolId) => void>()
  const onMoveSelection = vi.fn<(delta: Vec2) => void>()
  const onNudgeSelection = vi.fn<(delta: Vec2) => void>()
  const onResizeSelection = vi.fn<(changes: readonly NodeBoxChange[]) => void>()
  const onDeleteSelection = vi.fn<() => void>()
  const onCreateRectangle = vi.fn<(bounds: Rect) => void>()
  const onDraftChange = vi.fn<() => void>()
  const onOverlayChange = vi.fn<() => void>()
  const onUndo = vi.fn<() => void>()
  const onRedo = vi.fn<() => void>()
  const onToggleSelectionVisible = vi.fn<() => void>()
  const onToggleSelectionLocked = vi.fn<() => void>()
  const onTogglePixelGrid = vi.fn<() => void>()
  const onReorderSelection = vi.fn<(mode: LayerOrderMode) => void>()
  const onTogglePixelSnap = vi.fn<() => void>()
  let selection: readonly NodeId[] = []
  const onSelectionChange = vi.fn<(ids: readonly NodeId[]) => void>((ids) => {
    selection = ids
  })
  const controller = new CanvasController(canvas as unknown as HTMLCanvasElement, viewport, {
    initialTool,
    scene,
    getSelection: () => selection,
    onToolChange,
    onSelectionChange,
    onMoveSelection,
    onNudgeSelection,
    onResizeSelection,
    onDeleteSelection,
    onCreateRectangle,
    onDraftChange,
    onOverlayChange,
    onUndo,
    onRedo,
    onToggleSelectionVisible,
    onToggleSelectionLocked,
    onTogglePixelGrid,
    onTogglePixelSnap,
    onReorderSelection,
    getViewportArea: options.getViewportArea,
    snap: options.snap,
  })
  return {
    fakeWindow,
    canvas,
    viewport,
    scene,
    onToolChange,
    onSelectionChange,
    onMoveSelection,
    onNudgeSelection,
    onResizeSelection,
    onDeleteSelection,
    onCreateRectangle,
    onDraftChange,
    onOverlayChange,
    onUndo,
    onRedo,
    onToggleSelectionVisible,
    onToggleSelectionLocked,
    onTogglePixelGrid,
    onReorderSelection,
    getSelection: () => selection,
    controller,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CanvasController', () => {
  it('zooms anchored at the cursor on ctrl+wheel', () => {
    const { canvas, viewport, controller } = setup()
    const cursor = { x: 200, y: 200 }
    const worldBefore = viewport.screenToWorld(cursor)
    canvas.dispatch('wheel', createWheelEvent({ clientX: 300, clientY: 250, deltaY: -100, ctrlKey: true }))
    expect(viewport.zoom).toBeCloseTo(Math.exp(0.25), 9)
    const worldAfter = viewport.screenToWorld(cursor)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 9)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 9)
    controller.dispose()
  })

  it('pans on plain wheel and prevents the default scroll', () => {
    const { canvas, viewport, controller } = setup()
    const event = createWheelEvent({ clientX: 300, clientY: 250, deltaY: 120 })
    canvas.dispatch('wheel', event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(viewport.pan).toEqual({ x: 0, y: -120 })
    expect(viewport.zoom).toBe(1)
    controller.dispose()
  })

  it('pans horizontally on shift+wheel', () => {
    const { canvas, viewport, controller } = setup()
    canvas.dispatch('wheel', createWheelEvent({ clientX: 300, clientY: 250, deltaY: 120, shiftKey: true }))
    expect(viewport.pan).toEqual({ x: -120, y: 0 })
    controller.dispose()
  })

  it('switches tools with the V and H hotkeys', () => {
    const { fakeWindow, canvas, onToolChange, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyH' }))
    expect(onToolChange).toHaveBeenCalledWith('hand')
    expect(canvas.style.cursor).toBe('grab')
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyV' }))
    expect(onToolChange).toHaveBeenCalledWith('move')
    expect(canvas.style.cursor).toBe('default')
    controller.dispose()
  })

  it('switches tools on the Russian layout via physical key codes', () => {
    const { fakeWindow, canvas, onToolChange, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyH', key: 'р' }))
    expect(onToolChange).toHaveBeenCalledWith('hand')
    expect(canvas.style.cursor).toBe('grab')
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyV', key: 'м' }))
    expect(onToolChange).toHaveBeenCalledWith('move')
    expect(canvas.style.cursor).toBe('default')
    controller.dispose()
  })

  it('resets zoom to 100 percent on shift+0', () => {
    const { fakeWindow, viewport, controller } = setup()
    viewport.zoomAt({ x: 400, y: 300 }, 2.5)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit0', shiftKey: true }))
    expect(viewport.zoom).toBe(1)
    controller.dispose()
  })

  it('zooms in and out with ctrl+equal and ctrl+minus', () => {
    const { fakeWindow, viewport, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Equal', ctrlKey: true }))
    expect(viewport.zoom).toBe(2)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Minus', ctrlKey: true }))
    expect(viewport.zoom).toBe(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Minus', metaKey: true }))
    expect(viewport.zoom).toBe(0.5)
    controller.dispose()
  })

  it('zooms to fit on shift+1', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { fakeWindow, viewport, controller } = setup('move', scene)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit1', shiftKey: true }))
    expect(viewport.zoom).toBeCloseTo(4.72, 5)
    expect(viewport.pan.x).toBeCloseTo(164, 5)
    expect(viewport.pan.y).toBeCloseTo(64, 5)
    controller.dispose()
  })

  it('falls back to 100 percent on zoom to fit with an empty document', () => {
    const { fakeWindow, viewport, controller } = setup()
    viewport.setView({ x: 0, y: 0 }, 3)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit1', shiftKey: true }))
    expect(viewport.zoom).toBe(1)
    controller.dispose()
  })

  it('zooms to the selection on shift+2', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { fakeWindow, canvas, viewport, controller } = setup('move', scene)
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 1, clientX: 150, clientY: 100 }))
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit2', shiftKey: true }))
    expect(viewport.zoom).toBeCloseTo(4.72, 5)
    controller.dispose()
  })

  it('ignores zoom to selection without a selection', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { fakeWindow, viewport, controller } = setup('move', scene)
    viewport.setView({ x: 0, y: 0 }, 2)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit2', shiftKey: true }))
    expect(viewport.zoom).toBe(2)
    controller.dispose()
  })

  it('fits the content into the area between the sidebars', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { fakeWindow, viewport, controller } = setup('move', scene, {
      getViewportArea: () => ({ x: 240, y: 0, width: 320, height: 600 }),
    })
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Digit1', shiftKey: true }))
    expect(viewport.zoom).toBeCloseTo(1.92, 5)
    expect(viewport.pan.x).toBeCloseTo(304, 5)
    expect(viewport.pan.y).toBeCloseTo(204, 5)
    controller.dispose()
  })

  it('shows the grab cursor while space is held', () => {
    const { fakeWindow, canvas, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Space' }))
    expect(canvas.style.cursor).toBe('grab')
    fakeWindow.dispatch('keyup', createKeyEvent({ code: 'Space' }))
    expect(canvas.style.cursor).toBe('default')
    controller.dispose()
  })

  it('pans while dragging with space held', () => {
    const { fakeWindow, canvas, viewport, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Space' }))
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 1, clientX: 200, clientY: 150 }))
    expect(canvas.style.cursor).toBe('grabbing')
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 1, clientX: 240, clientY: 180 }))
    expect(viewport.pan).toEqual({ x: 40, y: 30 })
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 1, clientX: 240, clientY: 180 }))
    expect(canvas.style.cursor).toBe('grab')
    controller.dispose()
  })

  it('pans while dragging with the middle mouse button', () => {
    const { canvas, viewport, controller } = setup()
    canvas.dispatch('pointerdown', createPointerEvent({ button: 1, pointerId: 2, clientX: 300, clientY: 300 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 1, pointerId: 2, clientX: 275, clientY: 310 }))
    expect(viewport.pan).toEqual({ x: -25, y: 10 })
    controller.dispose()
  })

  it('pans while dragging with the hand tool', () => {
    const { canvas, viewport, controller } = setup('hand')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 3, clientX: 300, clientY: 300 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 3, clientX: 330, clientY: 260 }))
    expect(viewport.pan).toEqual({ x: 30, y: -40 })
    controller.dispose()
  })

  it('does not pan on plain left-drag with the move tool', () => {
    const { canvas, viewport, controller } = setup()
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 4, clientX: 300, clientY: 300 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 4, clientX: 350, clientY: 350 }))
    expect(viewport.pan).toEqual({ x: 0, y: 0 })
    controller.dispose()
  })

  it('ignores hotkeys from editable targets', () => {
    const { fakeWindow, onToolChange, controller } = setup()
    const input = new FakeHTMLElement()
    input.tagName = 'INPUT'
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyH', target: input as unknown as EventTarget }))
    expect(onToolChange).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('switches to the rectangle tool with the R hotkey', () => {
    const { fakeWindow, canvas, onToolChange, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyR' }))
    expect(onToolChange).toHaveBeenCalledWith('rectangle')
    expect(canvas.style.cursor).toBe('crosshair')
    controller.dispose()
  })

  it('creates a rectangle from a drag with the rectangle tool', () => {
    const { canvas, onCreateRectangle, controller } = setup('rectangle')
    expect(canvas.style.cursor).toBe('crosshair')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 5, clientX: 120, clientY: 80 }))
    expect(controller.draft).toBeNull()
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 5, clientX: 220, clientY: 180 }))
    expect(controller.draft).toEqual({ x: 20, y: 30, width: 100, height: 100 })
    expect(onCreateRectangle).not.toHaveBeenCalled()
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 5, clientX: 220, clientY: 180 }))
    expect(controller.draft).toBeNull()
    expect(onCreateRectangle).toHaveBeenCalledWith({ x: 20, y: 30, width: 100, height: 100 })
    controller.dispose()
  })

  it('shows nothing on pointer down and no click rectangle during a drag', () => {
    const { canvas, onDraftChange, onCreateRectangle, controller } = setup('rectangle')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 20, clientX: 300, clientY: 250 }))
    expect(controller.draft).toBeNull()
    expect(onDraftChange).not.toHaveBeenCalled()
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 20, clientX: 302, clientY: 250 }))
    expect(controller.draft).toBeNull()
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 20, clientX: 303, clientY: 250 }))
    expect(controller.draft).toEqual({ x: 200, y: 200, width: 3, height: 0 })
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 20, clientX: 304, clientY: 250 }))
    expect(onCreateRectangle).toHaveBeenCalledWith({ x: 200, y: 200, width: 4, height: 0 })
    controller.dispose()
  })

  it('measures the drag threshold in screen pixels', () => {
    const { canvas, viewport, controller } = setup('rectangle')
    viewport.setView({ x: 0, y: 0 }, 2)
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 21, clientX: 300, clientY: 250 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 21, clientX: 302, clientY: 250 }))
    expect(controller.draft).toBeNull()
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 21, clientX: 303, clientY: 250 }))
    expect(controller.draft).toEqual({ x: 100, y: 100, width: 1.5, height: 0 })
    controller.dispose()
  })

  it('does not snap on the first active draft frame', () => {
    const snap = vi.fn<SelectionSnap>((rect, _mode, _edges, disabled) =>
      disabled
        ? { rect, guides: [] }
        : {
            rect: { ...rect, x: rect.x - 20, width: rect.width + 20 },
            guides: [],
          },
    )
    const { canvas, controller } = setup('rectangle', new Document(), { snap })
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 22, clientX: 300, clientY: 250 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 22, clientX: 303, clientY: 253 }))
    expect(controller.draft).toEqual({ x: 200, y: 200, width: 3, height: 3 })
    expect(snap).toHaveBeenCalledWith(
      { x: 200, y: 200, width: 3, height: 3 },
      'resize',
      { left: false, right: true, top: false, bottom: true },
      true,
    )
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 22, clientX: 304, clientY: 254 }))
    expect(snap).toHaveBeenCalled()
    expect(controller.draft).toEqual({ x: 180, y: 200, width: 24, height: 4 })
    controller.dispose()
  })

  it('starts the draft exactly at the press point when the threshold is crossed', () => {
    const { canvas, controller } = setup('rectangle')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 23, clientX: 300, clientY: 250 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 23, clientX: 303, clientY: 252 }))
    expect(controller.draft).toEqual({ x: 200, y: 200, width: 3, height: 2 })
    controller.dispose()
  })

  it('applies shift and alt while drawing a rectangle', () => {
    const { canvas, controller } = setup('rectangle')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 6, clientX: 300, clientY: 250 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 6, clientX: 200, clientY: 200, shiftKey: true }))
    expect(controller.draft).toEqual({ x: 100, y: 100, width: 100, height: 100 })
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 6, clientX: 200, clientY: 200, altKey: true }))
    expect(controller.draft).toEqual({ x: 100, y: 150, width: 200, height: 100 })
    controller.dispose()
  })

  it('creates a 100x100 rectangle on a click', () => {
    const { canvas, onCreateRectangle, controller } = setup('rectangle')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 7, clientX: 300, clientY: 250 }))
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 7, clientX: 301, clientY: 251 }))
    expect(onCreateRectangle).toHaveBeenCalledWith({ x: 200, y: 200, width: 100, height: 100 })
    controller.dispose()
  })

  it('cancels the rectangle draft on escape', () => {
    const { fakeWindow, canvas, onCreateRectangle, controller } = setup('rectangle')
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 8, clientX: 120, clientY: 80 }))
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 8, clientX: 220, clientY: 180 }))
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Escape' }))
    expect(controller.draft).toBeNull()
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 8, clientX: 220, clientY: 180 }))
    expect(onCreateRectangle).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('calls undo and redo from the history shortcuts', () => {
    const { fakeWindow, onUndo, onRedo, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyZ', ctrlKey: true }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyZ', ctrlKey: true, shiftKey: true }))
    expect(onRedo).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyY', ctrlKey: true }))
    expect(onRedo).toHaveBeenCalledTimes(2)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyZ', metaKey: true }))
    expect(onUndo).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('ignores history shortcuts inside editable targets', () => {
    const { fakeWindow, onUndo, controller } = setup()
    const input = new FakeHTMLElement()
    input.tagName = 'INPUT'
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyZ', ctrlKey: true, target: input as unknown as EventTarget }))
    expect(onUndo).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('toggles the visibility and the lock of the selection on ctrl+shift shortcuts', () => {
    const { fakeWindow, onToggleSelectionVisible, onToggleSelectionLocked, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyH', ctrlKey: true, shiftKey: true }))
    expect(onToggleSelectionVisible).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyL', ctrlKey: true, shiftKey: true }))
    expect(onToggleSelectionLocked).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyH', ctrlKey: true }))
    expect(onToggleSelectionVisible).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('toggles the pixel grid on ctrl+quote', () => {
    const { fakeWindow, onTogglePixelGrid, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Quote', ctrlKey: true }))
    expect(onTogglePixelGrid).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Quote' }))
    expect(onTogglePixelGrid).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('reorders the selection with the bracket shortcuts', () => {
    const { fakeWindow, onReorderSelection, controller } = setup()
    const modes: LayerOrderMode[] = []
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'BracketRight', ctrlKey: true }))
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'BracketRight', ctrlKey: true, shiftKey: true }))
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'BracketLeft', ctrlKey: true }))
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'BracketLeft', ctrlKey: true, shiftKey: true }))
    for (const call of onReorderSelection.mock.calls) modes.push(call[0])
    expect(modes).toEqual(['forward', 'front', 'backward', 'back'])
    controller.dispose()
  })

  it('selects the node under the cursor and clears on empty canvas', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { canvas, getSelection, controller } = setup('move', scene)
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 1, clientX: 150, clientY: 100 }))
    expect(getSelection()).toEqual(['a'])
    canvas.dispatch('pointerdown', createPointerEvent({ button: 0, pointerId: 1, clientX: 400, clientY: 400 }))
    expect(getSelection()).toEqual([])
    controller.dispose()
  })

  it('toggles the selection with shift+click', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 200, 0))
    const { canvas, getSelection, controller } = setup('move', scene)
    const click = (clientX: number, shiftKey = false) =>
      createPointerEvent({ button: 0, pointerId: 1, clientX, clientY: 100, shiftKey })
    canvas.dispatch('pointerdown', click(150))
    expect(getSelection()).toEqual(['a'])
    canvas.dispatch('pointerdown', click(350, true))
    expect(getSelection()).toEqual(['a', 'b'])
    canvas.dispatch('pointerdown', click(350, true))
    expect(getSelection()).toEqual(['a'])
    controller.dispose()
  })

  it('selects all nodes on ctrl+a and clears the selection on escape', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    scene.addNode(createRectangle('b', 200, 0))
    const { fakeWindow, getSelection, controller } = setup('move', scene)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'KeyA', ctrlKey: true }))
    expect(getSelection()).toEqual(['a', 'b'])
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Escape' }))
    expect(getSelection()).toEqual([])
    controller.dispose()
  })

  it('tracks the hovered node while moving over the canvas', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { canvas, controller } = setup('move', scene)
    const move = (clientX: number) =>
      createPointerEvent({ button: 0, pointerId: 1, clientX, clientY: 100 })
    canvas.dispatch('pointermove', move(150))
    expect(controller.hoveredId).toBe('a')
    canvas.dispatch('pointermove', move(400))
    expect(controller.hoveredId).toBeNull()
    controller.dispose()
  })

  it('nudges the selection by one pixel with arrow keys', () => {
    const { fakeWindow, onNudgeSelection, controller } = setup()
    const nudge = (code: string) => fakeWindow.dispatch('keydown', createKeyEvent({ code }))
    nudge('ArrowLeft')
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: -1, y: 0 })
    nudge('ArrowRight')
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: 1, y: 0 })
    nudge('ArrowUp')
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: 0, y: -1 })
    nudge('ArrowDown')
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: 0, y: 1 })
    expect(onNudgeSelection).toHaveBeenCalledTimes(4)
    controller.dispose()
  })

  it('nudges by ten pixels with shift+arrows', () => {
    const { fakeWindow, onNudgeSelection, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'ArrowRight', shiftKey: true }))
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: 10, y: 0 })
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'ArrowDown', shiftKey: true }))
    expect(onNudgeSelection).toHaveBeenLastCalledWith({ x: 0, y: 10 })
    controller.dispose()
  })

  it('ignores arrow keys inside editable targets', () => {
    const { fakeWindow, onNudgeSelection, controller } = setup()
    const input = new FakeHTMLElement()
    input.tagName = 'INPUT'
    fakeWindow.dispatch(
      'keydown',
      createKeyEvent({ code: 'ArrowRight', target: input as unknown as EventTarget }),
    )
    expect(onNudgeSelection).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('deletes the selection with the delete and backspace keys', () => {
    const { fakeWindow, onDeleteSelection, controller } = setup()
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Delete' }))
    expect(onDeleteSelection).toHaveBeenCalledTimes(1)
    fakeWindow.dispatch('keydown', createKeyEvent({ code: 'Backspace' }))
    expect(onDeleteSelection).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('ignores the delete keys inside editable targets', () => {
    const { fakeWindow, onDeleteSelection, controller } = setup()
    const input = new FakeHTMLElement()
    input.tagName = 'INPUT'
    fakeWindow.dispatch(
      'keydown',
      createKeyEvent({ code: 'Backspace', target: input as unknown as EventTarget }),
    )
    expect(onDeleteSelection).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('resizes the selection when dragging a handle', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { canvas, onResizeSelection, controller } = setup('move', scene)
    const at = (clientX: number, clientY: number) =>
      createPointerEvent({ button: 0, pointerId: 1, clientX, clientY })
    canvas.dispatch('pointerdown', at(150, 100))
    canvas.dispatch('pointerup', at(150, 100))
    canvas.dispatch('pointermove', at(200, 150))
    expect(canvas.style.cursor).toBe('nwse-resize')
    canvas.dispatch('pointerdown', at(200, 150))
    canvas.dispatch('pointermove', at(250, 200))
    canvas.dispatch('pointerup', at(250, 200))
    expect(onResizeSelection).toHaveBeenCalledTimes(1)
    expect(onResizeSelection.mock.calls[0]?.[0]?.[0]?.to.width).toBe(150)
    expect(onResizeSelection.mock.calls[0]?.[0]?.[0]?.to.height).toBe(150)
    controller.dispose()
  })

  it('tracks the hovered resize handle for the overlay', () => {
    const scene = new Document()
    scene.addNode(createRectangle('a', 0, 0))
    const { canvas, controller } = setup('move', scene)
    const at = (clientX: number, clientY: number) =>
      createPointerEvent({ button: 0, pointerId: 1, clientX, clientY })
    canvas.dispatch('pointerdown', at(150, 100))
    canvas.dispatch('pointerup', at(150, 100))
    canvas.dispatch('pointermove', at(200, 150))
    expect(controller.hoveredHandle).toBe('se')
    expect(canvas.style.cursor).toBe('nwse-resize')
    canvas.dispatch('pointermove', at(400, 400))
    expect(controller.hoveredHandle).toBeNull()
    expect(canvas.style.cursor).toBe('default')
    controller.dispose()
  })
})
