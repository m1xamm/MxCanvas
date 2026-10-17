import type { Vec2 } from '../core/math/matrix'
import type { Viewport } from '../core/viewport'
import { TOOL_HOTKEYS, type ToolId } from './tools'
import { normalizeWheelDelta, wheelPanDelta, wheelZoomFactor } from './wheel'

const SPACE_KEY_CODE = 'Space'
const ZOOM_RESET_KEY_CODE = 'Digit0'
const ZOOM_RESET_TARGET = 1
const MIDDLE_MOUSE_BUTTON = 1
const PRIMARY_MOUSE_BUTTON = 0

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export interface CanvasControllerOptions {
  initialTool: ToolId
  onToolChange: (tool: ToolId) => void
}

export class CanvasController {
  #canvas: HTMLCanvasElement
  #viewport: Viewport
  #options: CanvasControllerOptions
  #tool: ToolId
  #spaceDown = false
  #panning = false
  #panPointerId: number | null = null
  #lastScreen: Vec2 = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, options: CanvasControllerOptions) {
    this.#canvas = canvas
    this.#viewport = viewport
    this.#options = options
    this.#tool = options.initialTool
    canvas.addEventListener('wheel', this.#onWheel, { passive: false })
    canvas.addEventListener('pointerdown', this.#onPointerDown)
    canvas.addEventListener('pointermove', this.#onPointerMove)
    canvas.addEventListener('pointerup', this.#onPointerUp)
    canvas.addEventListener('pointercancel', this.#onPointerUp)
    canvas.addEventListener('mousedown', this.#onMouseDown)
    window.addEventListener('keydown', this.#onKeyDown)
    window.addEventListener('keyup', this.#onKeyUp)
    window.addEventListener('blur', this.#onBlur)
    this.#updateCursor()
  }

  setTool(tool: ToolId): void {
    if (this.#tool === tool) return
    this.#tool = tool
    this.#updateCursor()
  }

  dispose(): void {
    const canvas = this.#canvas
    canvas.removeEventListener('wheel', this.#onWheel)
    canvas.removeEventListener('pointerdown', this.#onPointerDown)
    canvas.removeEventListener('pointermove', this.#onPointerMove)
    canvas.removeEventListener('pointerup', this.#onPointerUp)
    canvas.removeEventListener('pointercancel', this.#onPointerUp)
    canvas.removeEventListener('mousedown', this.#onMouseDown)
    window.removeEventListener('keydown', this.#onKeyDown)
    window.removeEventListener('keyup', this.#onKeyUp)
    window.removeEventListener('blur', this.#onBlur)
    canvas.style.cursor = ''
  }

  #onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode)
      this.#viewport.zoomAt(this.#toCanvasPoint(event), wheelZoomFactor(deltaY))
      return
    }
    this.#viewport.panBy(wheelPanDelta(event))
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (this.#panning) return
    const panTriggered =
      event.button === MIDDLE_MOUSE_BUTTON ||
      (event.button === PRIMARY_MOUSE_BUTTON && (this.#tool === 'hand' || this.#spaceDown))
    if (!panTriggered) return
    event.preventDefault()
    this.#panning = true
    this.#panPointerId = event.pointerId
    this.#lastScreen = this.#toCanvasPoint(event)
    this.#canvas.setPointerCapture(event.pointerId)
    this.#updateCursor()
  }

  #onPointerMove = (event: PointerEvent): void => {
    if (!this.#panning || event.pointerId !== this.#panPointerId) return
    const point = this.#toCanvasPoint(event)
    this.#viewport.panBy({ x: point.x - this.#lastScreen.x, y: point.y - this.#lastScreen.y })
    this.#lastScreen = point
  }

  #onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#panPointerId) return
    this.#panning = false
    this.#panPointerId = null
    if (this.#canvas.hasPointerCapture(event.pointerId)) {
      this.#canvas.releasePointerCapture(event.pointerId)
    }
    this.#updateCursor()
  }

  #onMouseDown = (event: MouseEvent): void => {
    if (event.button === MIDDLE_MOUSE_BUTTON) event.preventDefault()
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return
    if (event.code === SPACE_KEY_CODE) {
      event.preventDefault()
      if (event.repeat) return
      this.#spaceDown = true
      this.#updateCursor()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.shiftKey && event.code === ZOOM_RESET_KEY_CODE) {
      event.preventDefault()
      this.#resetZoom()
      return
    }
    const tool = TOOL_HOTKEYS.get(event.code)
    if (tool) {
      event.preventDefault()
      this.#selectTool(tool)
    }
  }

  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== SPACE_KEY_CODE) return
    this.#spaceDown = false
    this.#updateCursor()
  }

  #onBlur = (): void => {
    this.#spaceDown = false
    this.#updateCursor()
  }

  #selectTool(tool: ToolId): void {
    this.setTool(tool)
    this.#options.onToolChange(tool)
  }

  #resetZoom(): void {
    this.#viewport.zoomAt(this.#viewportCenter(), ZOOM_RESET_TARGET / this.#viewport.zoom)
  }

  #updateCursor(): void {
    const panReady = this.#tool === 'hand' || this.#spaceDown
    this.#canvas.style.cursor = panReady ? (this.#panning ? 'grabbing' : 'grab') : 'default'
  }

  #viewportCenter(): Vec2 {
    return { x: this.#canvas.clientWidth / 2, y: this.#canvas.clientHeight / 2 }
  }

  #toCanvasPoint(event: { clientX: number; clientY: number }): Vec2 {
    const rect = this.#canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || EDITABLE_TAGS.has(target.tagName))
  )
}
