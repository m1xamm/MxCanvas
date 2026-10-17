import type { NodeId, SceneReader } from '../core/document/types'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import type { Vec2 } from '../core/math/matrix'
import { boundsOfRects, normalizeRect, translateRect, transformRect, type Rect } from '../core/math/rect'
import { nodeBox, nodeWorldRect, worldRectToBox, type NodeBox } from '../core/transform'
import type { Viewport } from '../core/viewport'
import { isDrag, moveDelta } from './gesture'
import { collectNodesInRect, hitTest } from './hit-testing'
import {
  handleAtPoint,
  handleCursor,
  mapRectWithBounds,
  resizeBounds,
  type ResizeHandleId,
} from './resize'
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
  onMoveSelection: (delta: Vec2) => void
  onResizeSelection: (changes: readonly NodeBoxChange[]) => void
  onOverlayChange: () => void
}

interface NodeRect {
  id: NodeId
  rect: Rect
}

interface MarqueeGesture {
  kind: 'marquee'
  pointerId: number
  start: Vec2
  rect: Rect
  baseSelection: readonly NodeId[]
}

interface MoveGesture {
  kind: 'move'
  pointerId: number
  startWorld: Vec2
  startScreen: Vec2
  startBounds: Rect | null
  origins: readonly NodeRect[]
  delta: Vec2
  moved: boolean
}

interface ResizeGesture {
  kind: 'resize'
  pointerId: number
  handle: ResizeHandleId
  startScreen: Vec2
  startBounds: Rect
  rawBounds: Rect
  origins: readonly NodeRect[]
  moved: boolean
}

type Gesture = MarqueeGesture | MoveGesture | ResizeGesture

const NO_PREVIEWS: ReadonlyMap<NodeId, NodeBox> = new Map<NodeId, NodeBox>()

export class SelectionTool {
  #scene: SceneReader
  #viewport: Viewport
  #options: SelectionToolOptions
  #hoveredId: NodeId | null = null
  #hoveredHandle: ResizeHandleId | null = null
  #gesture: Gesture | null = null
  #previews: ReadonlyMap<NodeId, NodeBox> = NO_PREVIEWS
  #previewBounds: Rect | null = null

  constructor(options: SelectionToolOptions) {
    this.#scene = options.scene
    this.#viewport = options.viewport
    this.#options = options
  }

  get hoveredId(): NodeId | null {
    return this.#hoveredId
  }

  get hoveredHandle(): ResizeHandleId | null {
    return this.#hoveredHandle
  }

  get marquee(): Rect | null {
    return this.#gesture?.kind === 'marquee' ? this.#gesture.rect : null
  }

  get previews(): ReadonlyMap<NodeId, NodeBox> {
    return this.#previews
  }

  get selectionBounds(): Rect | null {
    return this.#previewBounds ?? this.#selectedRect()
  }

  pointerDown(input: SelectionPointerInput): void {
    this.#setHoveredId(null)
    this.#setHoveredHandle(null)
    const selection = this.#options.getSelection()
    const bounds = this.#selectedRect()
    const handle = bounds ? handleAtPoint(this.#screenRect(bounds), input.screen) : null
    if (bounds && handle) {
      this.#gesture = {
        kind: 'resize',
        pointerId: input.pointerId,
        handle,
        startScreen: input.screen,
        startBounds: bounds,
        rawBounds: bounds,
        origins: this.#nodeRects(selection),
        moved: false,
      }
      return
    }
    const world = this.#viewport.screenToWorld(input.screen)
    const hit = hitTest(this.#scene, world)
    if (!hit) {
      if (!input.shiftKey) this.#options.onSelectionChange([])
      this.#gesture = {
        kind: 'marquee',
        pointerId: input.pointerId,
        start: world,
        rect: { x: world.x, y: world.y, width: 0, height: 0 },
        baseSelection: selection,
      }
      this.#options.onOverlayChange()
      return
    }
    const next = input.shiftKey
      ? toggleSelection(selection, hit.id)
      : selectionOnPress(selection, hit.id)
    this.#options.onSelectionChange(next)
    const origins = this.#nodeRects(next)
    this.#gesture = {
      kind: 'move',
      pointerId: input.pointerId,
      startWorld: world,
      startScreen: input.screen,
      startBounds: boundsOfRects(origins.map((origin) => origin.rect)),
      origins,
      delta: { x: 0, y: 0 },
      moved: false,
    }
  }

  pointerMove(input: SelectionPointerInput): boolean {
    const gesture = this.#gesture
    if (!gesture) {
      this.#updateHover(input.screen)
      return false
    }
    if (input.pointerId !== gesture.pointerId) return false
    const world = this.#viewport.screenToWorld(input.screen)
    if (gesture.kind === 'move') {
      this.#updateMove(gesture, world, input)
      return true
    }
    if (gesture.kind === 'resize') {
      this.#updateResize(gesture, world, input)
      return true
    }
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
    this.#clearPreview()
    if (gesture.kind === 'move') {
      this.#finishMove(gesture)
    } else if (gesture.kind === 'resize') {
      this.#finishResize(gesture)
    } else {
      this.#finishMarquee(gesture, input)
    }
    this.#updateHover(input.screen)
    this.#options.onOverlayChange()
    return true
  }

  cancel(): boolean {
    if (!this.#gesture) return false
    this.#gesture = null
    this.#clearPreview()
    this.#setHoveredHandle(null)
    this.#options.onOverlayChange()
    return true
  }

  clearHover(): void {
    this.#setHoveredId(null)
    this.#setHoveredHandle(null)
  }

  cursorAt(): string {
    const gesture = this.#gesture
    if (gesture?.kind === 'resize') return handleCursor(gesture.handle)
    return this.#hoveredHandle ? handleCursor(this.#hoveredHandle) : 'default'
  }

  #updateMove(gesture: MoveGesture, world: Vec2, input: { screen: Vec2; shiftKey: boolean }): void {
    if (!gesture.moved && !isDrag(gesture.startScreen, input.screen)) return
    gesture.moved = true
    gesture.delta = moveDelta(gesture.startWorld, world, input.shiftKey)
    this.#previews = previewsFor(this.#scene, gesture.origins, gesture.delta)
    this.#previewBounds = gesture.startBounds
      ? translateRect(gesture.startBounds, gesture.delta)
      : null
    this.#options.onOverlayChange()
  }

  #updateResize(gesture: ResizeGesture, world: Vec2, input: SelectionPointerInput): void {
    if (!gesture.moved && !isDrag(gesture.startScreen, input.screen)) return
    gesture.moved = true
    gesture.rawBounds = resizeBounds({
      bounds: gesture.startBounds,
      handle: gesture.handle,
      pointer: world,
      proportional: input.shiftKey,
      fromCenter: input.altKey,
    })
    this.#previews = resizedBoxesFor(
      this.#scene,
      gesture.origins,
      gesture.startBounds,
      gesture.rawBounds,
    )
    this.#previewBounds = normalizeRect(gesture.rawBounds)
    this.#options.onOverlayChange()
  }

  #finishMove(gesture: MoveGesture): void {
    if (!gesture.moved) return
    if (gesture.delta.x === 0 && gesture.delta.y === 0) return
    this.#options.onMoveSelection(gesture.delta)
  }

  #finishResize(gesture: ResizeGesture): void {
    if (!gesture.moved) return
    const changes: NodeBoxChange[] = []
    const boxes = resizedBoxesFor(this.#scene, gesture.origins, gesture.startBounds, gesture.rawBounds)
    for (const [id, to] of boxes) {
      const node = this.#scene.getNode(id)
      if (!node) continue
      changes.push({ id, from: nodeBox(node), to })
    }
    if (changes.length > 0) this.#options.onResizeSelection(changes)
  }

  #finishMarquee(gesture: MarqueeGesture, input: SelectionPointerInput): void {
    const world = this.#viewport.screenToWorld(input.screen)
    if (!isDrag(gesture.start, world)) return
    const found = collectNodesInRect(this.#scene, gesture.rect)
    this.#options.onSelectionChange(
      gesture.baseSelection.length > 0 ? unionSelection(gesture.baseSelection, found) : found,
    )
  }

  #nodeRects(ids: readonly NodeId[]): NodeRect[] {
    const rects: NodeRect[] = []
    for (const id of ids) {
      const node = this.#scene.getNode(id)
      if (!node) continue
      rects.push({ id, rect: nodeWorldRect(this.#scene, node) })
    }
    return rects
  }

  #selectedRect(): Rect | null {
    return boundsOfRects(this.#nodeRects(this.#options.getSelection()).map((entry) => entry.rect))
  }

  #screenRect(bounds: Rect): Rect {
    return transformRect(this.#viewport.matrix(), bounds)
  }

  #clearPreview(): void {
    this.#previews = NO_PREVIEWS
    this.#previewBounds = null
  }

  #updateHover(screen: Vec2): void {
    const hit = hitTest(this.#scene, this.#viewport.screenToWorld(screen))
    this.#setHoveredId(hit ? hit.id : null)
    const bounds = this.#selectedRect()
    this.#setHoveredHandle(bounds ? handleAtPoint(this.#screenRect(bounds), screen) : null)
  }

  #setHoveredId(id: NodeId | null): void {
    if (this.#hoveredId === id) return
    this.#hoveredId = id
    this.#options.onOverlayChange()
  }

  #setHoveredHandle(handle: ResizeHandleId | null): void {
    if (this.#hoveredHandle === handle) return
    this.#hoveredHandle = handle
    this.#options.onOverlayChange()
  }
}

function previewsFor(
  scene: SceneReader,
  origins: readonly NodeRect[],
  delta: Vec2,
): ReadonlyMap<NodeId, NodeBox> {
  const previews = new Map<NodeId, NodeBox>()
  for (const origin of origins) {
    const node = scene.getNode(origin.id)
    if (!node) continue
    previews.set(origin.id, worldRectToBox(scene, node, translateRect(origin.rect, delta)))
  }
  return previews
}

function resizedBoxesFor(
  scene: SceneReader,
  origins: readonly NodeRect[],
  from: Rect,
  to: Rect,
): Map<NodeId, NodeBox> {
  const boxes = new Map<NodeId, NodeBox>()
  for (const origin of origins) {
    const node = scene.getNode(origin.id)
    if (!node) continue
    boxes.set(origin.id, worldRectToBox(scene, node, mapRectWithBounds(origin.rect, from, to)))
  }
  return boxes
}
