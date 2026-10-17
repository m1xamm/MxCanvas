import type { NodeId, SceneReader } from '../core/document/types'
import type { Vec2 } from '../core/math/matrix'
import { normalizeRect, type Rect } from '../core/math/rect'
import type { Viewport } from '../core/viewport'
import { isDrag } from './gesture'
import { collectNodesInRect, hitTest } from './hit-testing'
import { selectionOnPress, toggleSelection, unionSelection } from './selection'
export interface SelectionPointerInput {
  pointerId: number
  screen: Vec2
  shiftKey: boolean
  altKey: boolean
}

export interface SelectionToolOptions {
  scene: SceneReader
  viewport: Viewport
  getSelection: () => readonly NodeId[]
  onSelectionChange: (ids: readonly NodeId[]) => void
  onOverlayChange: () => void
}

interface MarqueeGesture {
  kind: 'marquee'
  pointerId: number
  start: Vec2
  rect: Rect
  baseSelection: readonly NodeId[]
}

type Gesture = MarqueeGesture

export class SelectionTool {
  #scene: SceneReader
  #viewport: Viewport
  #options: SelectionToolOptions
  #hoveredId: NodeId | null = null
  #gesture: Gesture | null = null

  constructor(options: SelectionToolOptions) {
    this.#scene = options.scene
    this.#viewport = options.viewport
    this.#options = options
  }

  get hoveredId(): NodeId | null {
    return this.#hoveredId
  }

  get marquee(): Rect | null {
    return this.#gesture ? this.#gesture.rect : null
  }

  pointerDown(input: SelectionPointerInput): void {
    this.#setHoveredId(null)
    const world = this.#viewport.screenToWorld(input.screen)
    const hit = hitTest(this.#scene, world)
    if (hit) {
      const selection = this.#options.getSelection()
      const next = input.shiftKey
        ? toggleSelection(selection, hit.id)
        : selectionOnPress(selection, hit.id)
      this.#options.onSelectionChange(next)
      return
    }
    if (!input.shiftKey) this.#options.onSelectionChange([])
    this.#gesture = {
      kind: 'marquee',
      pointerId: input.pointerId,
      start: world,
      rect: { x: world.x, y: world.y, width: 0, height: 0 },
      baseSelection: this.#options.getSelection(),
    }
    this.#options.onOverlayChange()
  }

  pointerMove(input: SelectionPointerInput): boolean {
    if (!this.#gesture) {
      this.#updateHover(input.screen)
      return false
    }
    if (input.pointerId !== this.#gesture.pointerId) return false
    const world = this.#viewport.screenToWorld(input.screen)
    const gesture = this.#gesture
    gesture.rect = normalizeRect({
      x: gesture.start.x,
      y: gesture.start.y,
      width: world.x - gesture.start.x,
      height: world.y - gesture.start.y,
    })
    this.#options.onOverlayChange()
    return true
  }

  pointerUp(input: SelectionPointerInput): boolean {
    const gesture = this.#gesture
    if (!gesture || input.pointerId !== gesture.pointerId) return false
    this.#gesture = null
    const world = this.#viewport.screenToWorld(input.screen)
    if (isDrag(gesture.start, world)) {
      const found = collectNodesInRect(this.#scene, gesture.rect)
      this.#options.onSelectionChange(
        gesture.baseSelection.length > 0
          ? unionSelection(gesture.baseSelection, found)
          : found,
      )
    }
    this.#options.onOverlayChange()
    return true
  }

  cancel(): boolean {
    if (!this.#gesture) return false
    this.#gesture = null
    this.#options.onOverlayChange()
    return true
  }

  clearHover(): void {
    this.#setHoveredId(null)
  }

  cursorAt(): string {
    return 'default'
  }

  #updateHover(screen: Vec2): void {
    const hit = hitTest(this.#scene, this.#viewport.screenToWorld(screen))
    this.#setHoveredId(hit ? hit.id : null)
  }

  #setHoveredId(id: NodeId | null): void {
    if (this.#hoveredId === id) return
    this.#hoveredId = id
    this.#options.onOverlayChange()
  }
}
