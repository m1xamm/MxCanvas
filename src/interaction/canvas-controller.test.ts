import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Rect } from '../core/math/rect'
import { Viewport } from '../core/viewport'
import { CanvasController } from './canvas-controller'
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
}) {
  return {
    ...init,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    preventDefault: vi.fn(),
  }
}

function setup(initialTool: ToolId = 'move') {
  const fakeWindow = createEventTarget()
  vi.stubGlobal('window', fakeWindow)
  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  const canvas = createFakeCanvas()
  const viewport = new Viewport()
  const onToolChange = vi.fn<(tool: ToolId) => void>()
  const onCreateRectangle = vi.fn<(bounds: Rect) => void>()
  const onDraftChange = vi.fn<() => void>()
  const controller = new CanvasController(
    canvas as unknown as HTMLCanvasElement,
    viewport,
    { initialTool, onToolChange, onCreateRectangle, onDraftChange },
  )
  return {
    fakeWindow,
    canvas,
    viewport,
    onToolChange,
    onCreateRectangle,
    onDraftChange,
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
    expect(controller.draft).toEqual({ x: 20, y: 30, width: 100, height: 100 })
    canvas.dispatch('pointermove', createPointerEvent({ button: 0, pointerId: 5, clientX: 220, clientY: 180 }))
    expect(controller.draft).toEqual({ x: 20, y: 30, width: 100, height: 100 })
    expect(onCreateRectangle).not.toHaveBeenCalled()
    canvas.dispatch('pointerup', createPointerEvent({ button: 0, pointerId: 5, clientX: 220, clientY: 180 }))
    expect(controller.draft).toBeNull()
    expect(onCreateRectangle).toHaveBeenCalledWith({ x: 20, y: 30, width: 100, height: 100 })
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
})
