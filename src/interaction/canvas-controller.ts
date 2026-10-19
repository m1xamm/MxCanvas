import type { NodeId, SceneReader } from '../core/document/types'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import { type LayerOrderMode } from '../core/layers'
import type { Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
import { ALL_SNAP_EDGES, type SnapGuide } from '../core/snap'
import { sceneBounds, type NodeBox } from '../core/transform'
import type { Viewport } from '../core/viewport'
import { fitBounds } from '../core/viewport-fit'
import { collectSelectableIds } from './hit-testing'
import { rectangleDraft, type RectangleDragModifiers, type RectangleDraftSnap } from './rectangle-draft'
import type { ResizeHandleId } from './resize'
import { SelectionTool, type SelectionPointerInput, type SelectionSnap } from './selection-tool'
import { TOOL_HOTKEYS, type ToolId } from './tools'
import { normalizeWheelDelta, wheelPanDelta, wheelZoomFactor } from './wheel'

const SPACE_KEY_CODE = 'Space'
const ZOOM_RESET_KEY_CODE = 'Digit0'
const ZOOM_FIT_KEY_CODE = 'Digit1'
const ZOOM_SELECTION_KEY_CODE = 'Digit2'
const ZOOM_IN_KEY_CODE = 'Equal'
const ZOOM_OUT_KEY_CODE = 'Minus'
const ESCAPE_KEY_CODE = 'Escape'
const SELECT_ALL_KEY_CODE = 'KeyA'
const UNDO_KEY_CODE = 'KeyZ'
const REDO_ALTERNATE_KEY_CODE = 'KeyY'
const TOGGLE_VISIBLE_KEY_CODE = 'KeyH'
const TOGGLE_LOCKED_KEY_CODE = 'KeyL'
const TOGGLE_PIXEL_GRID_KEY_CODE = 'Quote'
const BRING_FORWARD_KEY_CODE = 'BracketRight'
const SEND_BACKWARD_KEY_CODE = 'BracketLeft'
const ZOOM_RESET_TARGET = 1
const ZOOM_STEP = 2
const NUDGE_STEP_PX = 1
const NUDGE_LARGE_STEP_PX = 10
const MIDDLE_MOUSE_BUTTON = 1
const PRIMARY_MOUSE_BUTTON = 0

const NUDGE_DELTAS: ReadonlyMap<string, Vec2> = new Map([
  ['ArrowLeft', { x: -1, y: 0 }],
  ['ArrowRight', { x: 1, y: 0 }],
  ['ArrowUp', { x: 0, y: -1 }],
  ['ArrowDown', { x: 0, y: 1 }],
])

const DELETE_KEY_CODES = new Set(['Delete', 'Backspace'])

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export interface CanvasControllerOptions {
  initialTool: ToolId
  scene: SceneReader
  getSelection: () => readonly NodeId[]
  onToolChange: (tool: ToolId) => void
  onSelectionChange: (ids: readonly NodeId[]) => void
  onMoveSelection: (delta: Vec2) => void
  onNudgeSelection: (delta: Vec2) => void
  onResizeSelection: (changes: readonly NodeBoxChange[]) => void
  onDeleteSelection: () => void
  onCreateRectangle: (bounds: Rect) => void
  onDraftChange: () => void
  onOverlayChange: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleSelectionVisible: () => void
  onToggleSelectionLocked: () => void
  onTogglePixelGrid: () => void
  onTogglePixelSnap: () => void
  onReorderSelection: (mode: LayerOrderMode) => void
  snap?: SelectionSnap
  getViewportArea?: () => Rect
  isInputBlocked?: () => boolean
}

const NO_GUIDES: readonly SnapGuide[] = []

export class CanvasController {
  #canvas: HTMLCanvasElement
  #viewport: Viewport
  #options: CanvasControllerOptions
  #selectionTool: SelectionTool
  #tool: ToolId
  #spaceDown = false
  #panning = false
  #panPointerId: number | null = null
  #lastScreen: Vec2 = { x: 0, y: 0 }
  #pointer: Vec2 = { x: 0, y: 0 }
  #draft: Rect | null = null
  #draftGuides: readonly SnapGuide[] = NO_GUIDES
  #draftSnap: RectangleDraftSnap | null
  #draftPointerId: number | null = null
  #draftStart: Vec2 = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, options: CanvasControllerOptions) {
    this.#canvas = canvas
    this.#viewport = viewport
    this.#options = options
    this.#tool = options.initialTool
    const snap = options.snap
    this.#draftSnap = snap ? (rect, disabled) => snap(rect, 'resize', ALL_SNAP_EDGES, disabled) : null
    this.#selectionTool = new SelectionTool({
      scene: options.scene,
      viewport,
      getSelection: options.getSelection,
      onSelectionChange: options.onSelectionChange,
      onMoveSelection: options.onMoveSelection,
      onResizeSelection: options.onResizeSelection,
      onOverlayChange: options.onOverlayChange,
      snap: options.snap,
    })
    canvas.addEventListener('wheel', this.#onWheel, { passive: false })
    canvas.addEventListener('pointerdown', this.#onPointerDown)
    canvas.addEventListener('pointermove', this.#onPointerMove)
    canvas.addEventListener('pointerup', this.#onPointerUp)
    canvas.addEventListener('pointercancel', this.#onPointerUp)
    canvas.addEventListener('pointerleave', this.#onPointerLeave)
    canvas.addEventListener('mousedown', this.#onMouseDown)
    window.addEventListener('keydown', this.#onKeyDown)
    window.addEventListener('keyup', this.#onKeyUp)
    window.addEventListener('blur', this.#onBlur)
    this.#updateCursor()
  }

  get draft(): Rect | null {
    return this.#draft
  }

  get snapGuides(): readonly SnapGuide[] {
    return this.#draftGuides.length > 0 ? this.#draftGuides : this.#selectionTool.snapGuides
  }

  get isTransforming(): boolean {
    return this.#selectionTool.isTransforming
  }

  get hoveredId(): NodeId | null {
    return this.#selectionTool.hoveredId
  }

  get marquee(): Rect | null {
    return this.#selectionTool.marquee
  }

  get previews(): ReadonlyMap<NodeId, NodeBox> {
    return this.#selectionTool.previews
  }

  get hoveredHandle(): ResizeHandleId | null {
    return this.#selectionTool.hoveredHandle
  }

  get selectionBounds(): Rect | null {
    return this.#selectionTool.selectionBounds
  }

  setTool(tool: ToolId): void {
    if (this.#tool === tool) return
    this.#tool = tool
    this.#cancelDraft()
    this.#selectionTool.cancel()
    if (tool !== 'move') this.#selectionTool.clearHover()
    this.#updateCursor()
  }

  zoomIn(): void {
    this.#viewport.zoomAt(this.#viewportCenter(), ZOOM_STEP)
  }

  zoomOut(): void {
    this.#viewport.zoomAt(this.#viewportCenter(), 1 / ZOOM_STEP)
  }

  zoomReset(): void {
    this.#viewport.zoomAt(this.#viewportCenter(), ZOOM_RESET_TARGET / this.#viewport.zoom)
  }

  zoomToFit(): void {
    const bounds = sceneBounds(this.#options.scene)
    if (!bounds) {
      this.zoomReset()
      return
    }
    this.#applyFit(bounds)
  }

  zoomToSelection(): void {
    const bounds = this.#selectionTool.selectionBounds
    if (!bounds) return
    this.#applyFit(bounds)
  }

  dispose(): void {
    const canvas = this.#canvas
    canvas.removeEventListener('wheel', this.#onWheel)
    canvas.removeEventListener('pointerdown', this.#onPointerDown)
    canvas.removeEventListener('pointermove', this.#onPointerMove)
    canvas.removeEventListener('pointerup', this.#onPointerUp)
    canvas.removeEventListener('pointercancel', this.#onPointerUp)
    canvas.removeEventListener('pointerleave', this.#onPointerLeave)
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
    this.#pointer = this.#toCanvasPoint(event)
    const panTriggered =
      event.button === MIDDLE_MOUSE_BUTTON ||
      (event.button === PRIMARY_MOUSE_BUTTON && (this.#tool === 'hand' || this.#spaceDown))
    if (panTriggered) {
      event.preventDefault()
      this.#panning = true
      this.#panPointerId = event.pointerId
      this.#lastScreen = this.#pointer
      this.#canvas.setPointerCapture(event.pointerId)
      this.#updateCursor()
      return
    }
    if (event.button !== PRIMARY_MOUSE_BUTTON) return
    if (this.#tool === 'rectangle') {
      event.preventDefault()
      this.#draftPointerId = event.pointerId
      this.#draftStart = this.#viewport.screenToWorld(this.#pointer)
      this.#updateDraft(this.#draftStart, dragModifiers(event), event.ctrlKey)
      this.#canvas.setPointerCapture(event.pointerId)
      this.#options.onDraftChange()
      return
    }
    if (this.#tool === 'move') {
      event.preventDefault()
      this.#canvas.setPointerCapture(event.pointerId)
      this.#selectionTool.pointerDown(selectionPointer(event, this.#pointer))
      this.#updateCursor()
    }
  }

  #onPointerMove = (event: PointerEvent): void => {
    this.#pointer = this.#toCanvasPoint(event)
    if (this.#panning && event.pointerId === this.#panPointerId) {
      this.#viewport.panBy({
        x: this.#pointer.x - this.#lastScreen.x,
        y: this.#pointer.y - this.#lastScreen.y,
      })
      this.#lastScreen = this.#pointer
      return
    }
    if (this.#draftPointerId !== null && event.pointerId === this.#draftPointerId) {
      const world = this.#viewport.screenToWorld(this.#pointer)
      this.#updateDraft(world, dragModifiers(event), event.ctrlKey)
      this.#options.onDraftChange()
      return
    }
    if (this.#tool !== 'move') return
    this.#selectionTool.pointerMove(selectionPointer(event, this.#pointer))
    this.#updateCursor()
  }

  #onPointerUp = (event: PointerEvent): void => {
    if (this.#panning && event.pointerId === this.#panPointerId) {
      this.#panning = false
      this.#panPointerId = null
      this.#releasePointerCapture(event.pointerId)
      this.#updateCursor()
      return
    }
    if (this.#draftPointerId !== null && event.pointerId === this.#draftPointerId) {
      const draft = this.#draft
      const cancelled = event.type === 'pointercancel'
      this.#draftPointerId = null
      this.#draft = null
      this.#draftGuides = NO_GUIDES
      this.#releasePointerCapture(event.pointerId)
      if (draft && !cancelled) this.#options.onCreateRectangle(draft)
      this.#options.onDraftChange()
      this.#updateCursor()
      return
    }
    this.#pointer = this.#toCanvasPoint(event)
    const handled =
      event.type === 'pointercancel'
        ? this.#selectionTool.cancel()
        : this.#selectionTool.pointerUp(selectionPointer(event, this.#pointer))
    if (!handled) return
    this.#releasePointerCapture(event.pointerId)
    this.#updateCursor()
  }

  #onPointerLeave = (): void => {
    this.#selectionTool.clearHover()
  }

  #onMouseDown = (event: MouseEvent): void => {
    if (event.button === MIDDLE_MOUSE_BUTTON) event.preventDefault()
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return
    if (this.#options.isInputBlocked?.()) return
    if (event.code === ESCAPE_KEY_CODE) {
      event.preventDefault()
      this.#handleEscape()
      return
    }
    if (event.code === SPACE_KEY_CODE) {
      event.preventDefault()
      if (event.repeat) return
      this.#spaceDown = true
      this.#updateCursor()
      return
    }
    if (event.ctrlKey || event.metaKey) {
      if (!event.altKey) this.#handleModifierShortcut(event)
      return
    }
    if (DELETE_KEY_CODES.has(event.code)) {
      event.preventDefault()
      this.#options.onDeleteSelection()
      return
    }
    if (event.altKey) return
    if (event.shiftKey && this.#handleShiftShortcut(event)) return
    const nudge = NUDGE_DELTAS.get(event.code)
    if (nudge) {
      event.preventDefault()
      const step = event.shiftKey ? NUDGE_LARGE_STEP_PX : NUDGE_STEP_PX
      this.#options.onNudgeSelection({ x: nudge.x * step, y: nudge.y * step })
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
    this.#cancelDraft()
    this.#selectionTool.cancel()
    this.#updateCursor()
  }

  #handleEscape(): void {
    if (this.#draftPointerId !== null) {
      this.#cancelDraft()
      return
    }
    if (this.#selectionTool.cancel()) return
    this.#options.onSelectionChange([])
  }

  #handleModifierShortcut(event: KeyboardEvent): void {
    if (event.code === SELECT_ALL_KEY_CODE) {
      if (event.shiftKey) return
      event.preventDefault()
      this.#options.onSelectionChange(collectSelectableIds(this.#options.scene))
      return
    }
    if (event.code === ZOOM_IN_KEY_CODE) {
      event.preventDefault()
      this.zoomIn()
      return
    }
    if (event.code === ZOOM_OUT_KEY_CODE) {
      event.preventDefault()
      this.zoomOut()
      return
    }
    if (event.code === TOGGLE_VISIBLE_KEY_CODE) {
      if (!event.shiftKey) return
      event.preventDefault()
      this.#options.onToggleSelectionVisible()
      return
    }
    if (event.code === TOGGLE_LOCKED_KEY_CODE) {
      if (!event.shiftKey) return
      event.preventDefault()
      this.#options.onToggleSelectionLocked()
      return
    }
    if (event.code === TOGGLE_PIXEL_GRID_KEY_CODE) {
      event.preventDefault()
      if (event.shiftKey) {
        this.#options.onTogglePixelSnap()
      } else {
        this.#options.onTogglePixelGrid()
      }
      return
    }
    if (event.code === BRING_FORWARD_KEY_CODE) {
      event.preventDefault()
      this.#options.onReorderSelection(event.shiftKey ? 'front' : 'forward')
      return
    }
    if (event.code === SEND_BACKWARD_KEY_CODE) {
      event.preventDefault()
      this.#options.onReorderSelection(event.shiftKey ? 'back' : 'backward')
      return
    }
    this.#handleHistoryShortcut(event)
  }

  #handleShiftShortcut(event: KeyboardEvent): boolean {
    if (event.code === ZOOM_RESET_KEY_CODE) {
      event.preventDefault()
      this.zoomReset()
      return true
    }
    if (event.code === ZOOM_FIT_KEY_CODE) {
      event.preventDefault()
      this.zoomToFit()
      return true
    }
    if (event.code === ZOOM_SELECTION_KEY_CODE) {
      event.preventDefault()
      this.zoomToSelection()
      return true
    }
    return false
  }

  #handleHistoryShortcut(event: KeyboardEvent): void {
    if (event.code === UNDO_KEY_CODE) {
      event.preventDefault()
      if (event.shiftKey) {
        this.#options.onRedo()
      } else {
        this.#options.onUndo()
      }
      return
    }
    if (event.code === REDO_ALTERNATE_KEY_CODE) {
      event.preventDefault()
      this.#options.onRedo()
    }
  }

  #selectTool(tool: ToolId): void {
    this.setTool(tool)
    this.#options.onToolChange(tool)
  }

  #cancelDraft(): void {
    if (this.#draftPointerId === null) return
    const pointerId = this.#draftPointerId
    this.#draftPointerId = null
    this.#draft = null
    this.#draftGuides = NO_GUIDES
    this.#releasePointerCapture(pointerId)
    this.#options.onDraftChange()
  }

  #updateDraft(end: Vec2, modifiers: RectangleDragModifiers, disabled: boolean): void {
    const draft = rectangleDraft({
      start: this.#draftStart,
      end,
      modifiers,
      snap: this.#draftSnap,
      snapDisabled: disabled,
    })
    this.#draft = draft.rect
    this.#draftGuides = draft.guides
  }

  #releasePointerCapture(pointerId: number): void {
    if (this.#canvas.hasPointerCapture(pointerId)) {
      this.#canvas.releasePointerCapture(pointerId)
    }
  }

  #applyFit(bounds: Rect): void {
    const fit = fitBounds(bounds, this.#viewportArea())
    if (!fit) return
    this.#viewport.setView(fit.pan, fit.zoom)
  }

  #viewportArea(): Rect {
    const area = this.#options.getViewportArea?.()
    if (area) return area
    return { x: 0, y: 0, width: this.#canvas.clientWidth, height: this.#canvas.clientHeight }
  }

  #updateCursor(): void {
    const panReady = this.#tool === 'hand' || this.#spaceDown
    if (panReady) {
      this.#canvas.style.cursor = this.#panning ? 'grabbing' : 'grab'
      return
    }
    if (this.#tool === 'rectangle') {
      this.#canvas.style.cursor = 'crosshair'
      return
    }
    this.#canvas.style.cursor =
      this.#tool === 'move' ? this.#selectionTool.cursorAt() : 'default'
  }

  #viewportCenter(): Vec2 {
    return { x: this.#canvas.clientWidth / 2, y: this.#canvas.clientHeight / 2 }
  }

  #toCanvasPoint(event: { clientX: number; clientY: number }): Vec2 {
    const rect = this.#canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
}

function selectionPointer(
  event: { pointerId: number; shiftKey: boolean; altKey: boolean; ctrlKey: boolean },
  screen: Vec2,
): SelectionPointerInput {
  return {
    pointerId: event.pointerId,
    screen,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
  }
}

function dragModifiers(event: { shiftKey: boolean; altKey: boolean }): RectangleDragModifiers {
  return { square: event.shiftKey, fromCenter: event.altKey }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.isContentEditable || EDITABLE_TAGS.has(target.tagName))
  )
}
