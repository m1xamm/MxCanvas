import { DEFAULT_FILL } from '../core/document/create-node'
import type { DropShadowEffect, NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
import { canvasGrid } from '../core/canvas-grid'
import { paintToCss, withAlphaColor } from '../core/color'
import { pixelGrid } from '../core/pixel-grid'
import { applyToPoint, multiply, scaling, type Mat2D, type Vec2 } from '../core/math/matrix'
import { transformRect, type Rect } from '../core/math/rect'
import { boxWorldTransform, type NodeBox } from '../core/transform'
import type { SnapGuide } from '../core/snap'
import type { Viewport } from '../core/viewport'
import type { ResizeHandleId } from '../interaction/resize'
import { collectVisibleNodes } from './culling'
import { DropShadowPass } from './drop-shadow-pass'
import { hasFrameObserver, publishFrame } from './frame-observer'
import type { FrameState } from './frame-state'
import { traceNodeRect } from './node-path'
import type { Renderer } from './renderer'
import {
  drawSelectionOverlay,
  HANDLE_HOVER_DURATION_MS,
  handleHoverScale,
} from './selection-overlay'
import { readThemeColors, type ThemeColors } from './theme-colors'

const OUTLINE_SCREEN_PX = 1
const DRAFT_FILL_ALPHA = 0.6
const GUIDE_MARKER_ARM_PX = 4
const MAX_OUTLINED_SELECTION = 500
const STROKE_ALIGN_WIDTH_FACTOR = 2
const STROKE_CLIP_MARGIN_FACTOR = 2
const NO_SNAP_GUIDES: readonly SnapGuide[] = []

export interface Canvas2DRendererOptions {
  scene: SceneReader
  getSelection: () => readonly NodeId[]
  getHoveredId?: () => NodeId | null
  getHoveredHandle?: () => ResizeHandleId | null
  getMarquee?: () => Rect | null
  getPreviews?: () => ReadonlyMap<NodeId, NodeBox>
  getSelectionBounds?: () => Rect | null
  getDraft?: () => Rect | null
  getSnapGuides?: () => readonly SnapGuide[]
  getPointer?: () => Vec2 | null
  isGridVisible?: () => boolean
  isPixelGridVisible?: () => boolean
}

export class Canvas2DRenderer implements Renderer {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #viewport: Viewport
  #scene: SceneReader
  #getSelection: () => readonly NodeId[]
  #getHoveredId: () => NodeId | null
  #getHoveredHandle: () => ResizeHandleId | null
  #getMarquee: () => Rect | null
  #getPreviews: () => ReadonlyMap<NodeId, NodeBox>
  #getSelectionBounds: () => Rect | null
  #getDraft: () => Rect | null
  #getSnapGuides: () => readonly SnapGuide[]
  #getPointer: () => Vec2 | null
  #isGridVisible: () => boolean
  #isPixelGridVisible: () => boolean
  #colors: ThemeColors
  #devicePixelRatio = 1
  #cssWidth = 1
  #cssHeight = 1
  #visibleNodes: SceneNodeUnion[] = []
  #frame: FrameState = {
    time: 0,
    duration: 0,
    drawnNodes: 0,
    selection: [],
    hoveredId: null,
    hoveredHandle: null,
    marquee: null,
    previews: new Map(),
    selectionBounds: null,
    draft: null,
    snapGuides: NO_SNAP_GUIDES,
    pointer: null,
    viewport: { x: 0, y: 0, zoom: 1 },
  }
  #hoveredHandle: ResizeHandleId | null = null
  #hoverStartedAt = 0
  #shadowPass: DropShadowPass
  #deviceTransform: Mat2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  #alpha = 1
  #fillStyle = ''
  #strokeStyle = ''
  #dirty = false
  #frameHandle = 0

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, options: Canvas2DRendererOptions) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Canvas 2D context is unavailable')
    this.#canvas = canvas
    this.#context = context
    this.#shadowPass = new DropShadowPass(canvas, context)
    this.#viewport = viewport
    this.#scene = options.scene
    this.#getSelection = options.getSelection
    this.#getHoveredId = options.getHoveredId ?? (() => null)
    this.#getHoveredHandle = options.getHoveredHandle ?? (() => null)
    this.#getMarquee = options.getMarquee ?? (() => null)
    this.#getPreviews = options.getPreviews ?? (() => new Map())
    this.#getSelectionBounds = options.getSelectionBounds ?? (() => null)
    this.#getDraft = options.getDraft ?? (() => null)
    this.#getSnapGuides = options.getSnapGuides ?? (() => NO_SNAP_GUIDES)
    this.#getPointer = options.getPointer ?? (() => null)
    this.#isGridVisible = options.isGridVisible ?? (() => false)
    this.#isPixelGridVisible = options.isPixelGridVisible ?? (() => false)
    this.#colors = readThemeColors()
  }

  setSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.#cssWidth = cssWidth
    this.#cssHeight = cssHeight
    this.#devicePixelRatio = devicePixelRatio
    const width = Math.max(1, Math.round(cssWidth * devicePixelRatio))
    const height = Math.max(1, Math.round(cssHeight * devicePixelRatio))
    if (this.#canvas.width !== width) this.#canvas.width = width
    if (this.#canvas.height !== height) this.#canvas.height = height
  }

  requestRender(): void {
    if (this.#dirty) return
    this.#dirty = true
    this.#frameHandle = requestAnimationFrame(this.#draw)
  }

  dispose(): void {
    if (this.#dirty) cancelAnimationFrame(this.#frameHandle)
    this.#dirty = false
  }

  #draw = (time: number): void => {
    const startedAt = performance.now()
    const context = this.#context
    this.#dirty = false
    const frame = this.#snapshotFrame(time)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.fillStyle = this.#colors.canvas
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height)
    const deviceViewport = multiply(
      scaling(this.#devicePixelRatio, this.#devicePixelRatio),
      this.#viewport.matrix(),
    )
    this.#shadowPass.setScale(this.#viewport.zoom, this.#devicePixelRatio)
    this.#drawGrid(deviceViewport)
    this.#drawPixelGrid(deviceViewport)
    this.#alpha = context.globalAlpha
    this.#fillStyle = ''
    this.#strokeStyle = ''
    for (const node of collectVisibleNodes(this.#scene, this.#viewportWorldBounds(), this.#visibleNodes)) {
      this.#drawNode(node, deviceViewport)
    }
    frame.drawnNodes = this.#visibleNodes.length
    this.#drawHoverOutline(deviceViewport)
    this.#drawSelectionOutline(deviceViewport)
    this.#drawMarquee()
    this.#drawDraft(deviceViewport)
    this.#drawSnapGuides()
    const hoveredHandle = frame.hoveredHandle
    drawSelectionOverlay({
      context: this.#context,
      viewportMatrix: this.#viewport.matrix(),
      bounds: frame.selectionBounds,
      colors: this.#colors,
      devicePixelRatio: this.#devicePixelRatio,
      hoveredHandle,
      hoverScale: this.#hoverScale(hoveredHandle, time),
    })
    frame.duration = performance.now() - startedAt
    if (hasFrameObserver()) publishFrame(frame, this.#scene)
  }

  #snapshotFrame(time: number): FrameState {
    const frame = this.#frame
    frame.time = time
    frame.selection = this.#getSelection()
    frame.hoveredId = this.#getHoveredId()
    frame.hoveredHandle = this.#getHoveredHandle()
    frame.marquee = this.#getMarquee()
    frame.previews = this.#getPreviews()
    frame.selectionBounds = this.#getSelectionBounds()
    frame.draft = this.#getDraft()
    frame.snapGuides = this.#getSnapGuides()
    frame.pointer = this.#getPointer()
    frame.viewport.x = this.#viewport.pan.x
    frame.viewport.y = this.#viewport.pan.y
    frame.viewport.zoom = this.#viewport.zoom
    return frame
  }

  #hoverScale(handle: ResizeHandleId | null, time: number): number {
    if (handle !== this.#hoveredHandle) {
      this.#hoveredHandle = handle
      this.#hoverStartedAt = time
    }
    if (!handle) return 1
    const elapsed = time - this.#hoverStartedAt
    if (elapsed < HANDLE_HOVER_DURATION_MS) this.requestRender()
    return handleHoverScale(elapsed)
  }

  #drawGrid(deviceViewport: Mat2D): void {
    if (!this.#isGridVisible()) return
    const grid = canvasGrid(this.#viewportWorldBounds(), this.#viewport.zoom)
    if (grid.columns === 0 || grid.rows === 0) return
    const context = this.#context
    const origin = applyToPoint(deviceViewport, { x: grid.firstX, y: grid.firstY })
    const spacing = grid.step * this.#viewport.zoom * this.#devicePixelRatio
    const dotSize = this.#devicePixelRatio
    context.fillStyle = this.#colors.canvasGridDot
    context.globalAlpha = grid.alpha
    context.beginPath()
    for (let row = 0; row < grid.rows; row += 1) {
      const y = Math.round(origin.y + row * spacing)
      for (let column = 0; column < grid.columns; column += 1) {
        context.rect(Math.round(origin.x + column * spacing), y, dotSize, dotSize)
      }
    }
    context.fill()
    context.globalAlpha = 1
  }

  #drawPixelGrid(deviceViewport: Mat2D): void {
    if (!this.#isPixelGridVisible()) return
    const grid = pixelGrid(this.#viewportWorldBounds(), this.#viewport.zoom)
    if (grid.alpha === 0 || grid.columns === 0 || grid.rows === 0) return
    const context = this.#context
    const origin = applyToPoint(deviceViewport, { x: grid.firstX, y: grid.firstY })
    const spacing = this.#viewport.zoom * this.#devicePixelRatio
    context.fillStyle = this.#colors.canvasPixelGrid
    context.globalAlpha = grid.alpha
    context.beginPath()
    for (let column = 0; column < grid.columns; column += 1) {
      context.rect(Math.round(origin.x + column * spacing), 0, 1, this.#canvas.height)
    }
    for (let row = 0; row < grid.rows; row += 1) {
      context.rect(0, Math.round(origin.y + row * spacing), this.#canvas.width, 1)
    }
    context.fill()
    context.globalAlpha = 1
  }

  #drawNode(node: SceneNodeUnion, deviceViewport: Mat2D): void {
    const context = this.#context
    const previews = this.#frame.previews
    const preview = previews.size > 0 ? previews.get(node.id) : undefined
    const box: NodeBox = preview ?? node
    const world = preview
      ? boxWorldTransform(this.#scene, node, preview)
      : this.#scene.getWorldTransform(node.id)
    const transform = this.#composeDeviceTransform(deviceViewport, world)
    const shadow = this.#fastShadow(node)
    if (node.effects.length > 0 && !shadow) {
      this.#shadowPass.draw(node, box, transform)
      this.#alpha = 1
    }
    this.#applyTransform(transform)
    this.#traceNodePath(node, box.width, box.height)
    this.#applyAlpha(node.opacity)
    if (shadow) this.#enableShadow(shadow)
    for (const paint of node.fills) {
      if (!paint.visible) continue
      this.#setFillStyle(paintToCss(paint))
      context.fill()
    }
    this.#drawStrokes(node)
    if (shadow) this.#disableShadow()
    this.#applyAlpha(1)
  }

  #drawStrokes(node: SceneNodeUnion): void {
    if (node.strokeWeight <= 0) return
    let hasPaint = false
    for (const paint of node.strokes) {
      if (paint.visible) {
        hasPaint = true
        break
      }
    }
    if (!hasPaint) return
    const context = this.#context
    if (node.strokeAlign === 'center') {
      context.lineWidth = node.strokeWeight
      for (const paint of node.strokes) {
        if (!paint.visible) continue
        this.#setStrokeStyle(paintToCss(paint))
        context.stroke()
      }
      return
    }
    const lineWidth = node.strokeWeight * STROKE_ALIGN_WIDTH_FACTOR
    context.save()
    this.#traceStrokeClip(node, lineWidth)
    if (node.strokeAlign === 'inside') {
      context.clip()
    } else {
      context.clip('evenodd')
    }
    context.beginPath()
    this.#traceNodePath(node, node.width, node.height)
    context.lineWidth = lineWidth
    for (const paint of node.strokes) {
      if (!paint.visible) continue
      this.#setStrokeStyle(paintToCss(paint))
      context.stroke()
    }
    context.restore()
    this.#strokeStyle = ''
  }

  #traceStrokeClip(node: SceneNodeUnion, lineWidth: number): void {
    const context = this.#context
    context.beginPath()
    if (node.strokeAlign === 'outside') {
      const margin = lineWidth * STROKE_CLIP_MARGIN_FACTOR
      context.rect(-margin, -margin, node.width + margin * 2, node.height + margin * 2)
    }
    this.#traceNodePath(node, node.width, node.height)
  }

  #applyAlpha(value: number): void {
    if (this.#alpha === value) return
    this.#alpha = value
    this.#context.globalAlpha = value
  }

  #setFillStyle(value: string): void {
    if (this.#fillStyle === value) return
    this.#fillStyle = value
    this.#context.fillStyle = value
  }

  #setStrokeStyle(value: string): void {
    if (this.#strokeStyle === value) return
    this.#strokeStyle = value
    this.#context.strokeStyle = value
  }

  #fastShadow(node: SceneNodeUnion): DropShadowEffect | null {
    if (node.effects.length !== 1) return null
    const effect = node.effects[0]
    if (!effect || !effect.visible || effect.spread !== 0) return null
    if (node.strokeWeight > 0 && node.strokes.some((paint) => paint.visible)) return null
    let fillCount = 0
    for (const paint of node.fills) {
      if (paint.visible) fillCount += 1
    }
    return fillCount === 1 ? effect : null
  }

  #enableShadow(effect: DropShadowEffect): void {
    const context = this.#context
    const scale = this.#viewport.zoom * this.#devicePixelRatio
    context.shadowColor = withAlphaColor(effect.color, effect.opacity)
    context.shadowBlur = effect.blur * scale
    context.shadowOffsetX = effect.offsetX * scale
    context.shadowOffsetY = effect.offsetY * scale
  }

  #disableShadow(): void {
    const context = this.#context
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
  }

  #drawHoverOutline(deviceViewport: Mat2D): void {
    if (this.#frame.hoveredHandle) return
    const id = this.#frame.hoveredId
    if (!id || this.#frame.selection.includes(id)) return
    const node = this.#scene.getNode(id)
    if (!node || !node.visible) return
    const context = this.#context
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    this.#applyTransform(multiply(deviceViewport, this.#scene.getWorldTransform(id)))
    this.#traceNodePath(node, node.width, node.height)
    context.stroke()
  }

  #drawSelectionOutline(deviceViewport: Mat2D): void {
    const selection = this.#frame.selection
    if (selection.length > MAX_OUTLINED_SELECTION) return
    const context = this.#context
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    for (const id of selection) {
      const node = this.#scene.getNode(id)
      if (!node || !node.visible) continue
      const preview = this.#frame.previews.get(id)
      const box: NodeBox = preview ?? node
      this.#applyTransform(
        this.#composeDeviceTransform(deviceViewport, this.#nodeWorldTransform(node, preview)),
      )
      this.#traceNodePath(node, box.width, box.height)
      context.stroke()
    }
  }

  #drawMarquee(): void {
    const marquee = this.#frame.marquee
    if (!marquee) return
    const context = this.#context
    const bounds = transformRect(this.#viewport.matrix(), marquee)
    this.#applyScreenTransform()
    context.fillStyle = this.#colors.marqueeFill
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX
    context.strokeRect(
      Math.round(bounds.x) + 0.5,
      Math.round(bounds.y) + 0.5,
      Math.max(Math.round(bounds.width) - 1, 0),
      Math.max(Math.round(bounds.height) - 1, 0),
    )
  }

  #drawDraft(deviceViewport: Mat2D): void {
    const draft = this.#frame.draft
    if (!draft) return
    const context = this.#context
    this.#applyTransform(deviceViewport)
    context.globalAlpha = DRAFT_FILL_ALPHA
    context.fillStyle = paintToCss(DEFAULT_FILL)
    context.beginPath()
    context.rect(draft.x, draft.y, draft.width, draft.height)
    context.fill()
    context.globalAlpha = 1
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    context.stroke()
  }

  #drawSnapGuides(): void {
    const guides = this.#frame.snapGuides
    if (guides.length === 0) return
    const context = this.#context
    const viewport = this.#viewport.matrix()
    this.#applyScreenTransform()
    context.strokeStyle = this.#colors.guide
    context.lineWidth = OUTLINE_SCREEN_PX
    context.beginPath()
    for (const guide of guides) {
      const from = applyToPoint(viewport, guidePoint(guide, guide.from))
      const to = applyToPoint(viewport, guidePoint(guide, guide.to))
      if (guide.axis === 'x') {
        const x = Math.round(from.x) + 0.5
        const startY = Math.round(from.y)
        const endY = Math.round(to.y)
        context.moveTo(x, startY)
        context.lineTo(x, endY)
        traceGuideMarker(context, x, startY)
        traceGuideMarker(context, x, endY)
      } else {
        const y = Math.round(from.y) + 0.5
        const startX = Math.round(from.x)
        const endX = Math.round(to.x)
        context.moveTo(startX, y)
        context.lineTo(endX, y)
        traceGuideMarker(context, startX, y)
        traceGuideMarker(context, endX, y)
      }
    }
    context.stroke()
  }

  #traceNodePath(node: SceneNodeUnion, width: number, height: number): void {
    traceNodeRect(this.#context, node, width, height)
  }

  #nodeWorldTransform(node: SceneNodeUnion, preview: NodeBox | undefined): Mat2D {
    return preview
      ? boxWorldTransform(this.#scene, node, preview)
      : this.#scene.getWorldTransform(node.id)
  }

  #viewportWorldBounds(): Rect {
    const topLeft = this.#viewport.screenToWorld({ x: 0, y: 0 })
    const bottomRight = this.#viewport.screenToWorld({ x: this.#cssWidth, y: this.#cssHeight })
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    }
  }

  #applyTransform(matrix: Mat2D): void {
    this.#context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  }

  #composeDeviceTransform(left: Mat2D, right: Mat2D): Mat2D {
    const out = this.#deviceTransform
    out.a = left.a * right.a + left.c * right.b
    out.b = left.b * right.a + left.d * right.b
    out.c = left.a * right.c + left.c * right.d
    out.d = left.b * right.c + left.d * right.d
    out.e = left.a * right.e + left.c * right.f + left.e
    out.f = left.b * right.e + left.d * right.f + left.f
    return out
  }

  #applyScreenTransform(): void {
    this.#context.setTransform(this.#devicePixelRatio, 0, 0, this.#devicePixelRatio, 0, 0)
  }
}

function guidePoint(guide: SnapGuide, value: number): Vec2 {
  return guide.axis === 'x' ? { x: guide.position, y: value } : { x: value, y: guide.position }
}

function traceGuideMarker(context: CanvasRenderingContext2D, x: number, y: number): void {
  const arm = GUIDE_MARKER_ARM_PX
  context.moveTo(x - arm, y - arm)
  context.lineTo(x + arm, y + arm)
  context.moveTo(x + arm, y - arm)
  context.lineTo(x - arm, y + arm)
}
