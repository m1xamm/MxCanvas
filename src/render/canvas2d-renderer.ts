import { DEFAULT_FILL } from '../core/document/create-node'
import type { NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
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
import type { Renderer } from './renderer'
import {
  drawSelectionOverlay,
  HANDLE_HOVER_DURATION_MS,
  handleHoverScale,
} from './selection-overlay'
import { readThemeColors, type ThemeColors } from './theme-colors'

const OUTLINE_SCREEN_PX = 1
const MAX_CORNER_RADIUS_FACTOR = 0.5
const DRAFT_FILL_ALPHA = 0.6
const GUIDE_MARKER_ARM_PX = 4
const BLUR_SIGMA_FACTOR = 0.5
const SILHOUETTE_COLOR = '#ffffff'
const NO_SNAP_GUIDES: readonly SnapGuide[] = []
const BOX_CORNER_UNITS: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

interface EffectSurface {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
}

interface EffectBounds {
  x: number
  y: number
  width: number
  height: number
}

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
  #isGridVisible: () => boolean
  #isPixelGridVisible: () => boolean
  #colors: ThemeColors
  #devicePixelRatio = 1
  #cssWidth = 1
  #cssHeight = 1
  #visibleNodes: SceneNodeUnion[] = []
  #previews: ReadonlyMap<NodeId, NodeBox> = new Map()
  #hoveredHandle: ResizeHandleId | null = null
  #hoverStartedAt = 0
  #maskSurface: EffectSurface | null = null
  #tintSurface: EffectSurface | null = null
  #dirty = false
  #frameHandle = 0

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, options: Canvas2DRendererOptions) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')
    this.#canvas = canvas
    this.#context = context
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
    const context = this.#context
    this.#dirty = false
    this.#previews = this.#getPreviews()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.fillStyle = this.#colors.canvas
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height)
    const deviceViewport = multiply(
      scaling(this.#devicePixelRatio, this.#devicePixelRatio),
      this.#viewport.matrix(),
    )
    this.#drawGrid(deviceViewport)
    this.#drawPixelGrid(deviceViewport)
    for (const node of collectVisibleNodes(this.#scene, this.#viewportWorldBounds(), this.#visibleNodes)) {
      this.#drawNode(node, deviceViewport)
    }
    this.#drawHoverOutline(deviceViewport)
    this.#drawSelectionOutline(deviceViewport)
    this.#drawMarquee()
    this.#drawDraft(deviceViewport)
    this.#drawSnapGuides()
    const hoveredHandle = this.#getHoveredHandle()
    drawSelectionOverlay({
      context: this.#context,
      viewportMatrix: this.#viewport.matrix(),
      bounds: this.#getSelectionBounds(),
      colors: this.#colors,
      devicePixelRatio: this.#devicePixelRatio,
      hoveredHandle,
      hoverScale: this.#hoverScale(hoveredHandle, time),
    })
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
    const preview = this.#previews.get(node.id)
    const box: NodeBox = preview ?? node
    const transform = multiply(deviceViewport, this.#nodeWorldTransform(node, preview))
    if (node.effects.length > 0) this.#drawDropShadows(node, box, transform)
    this.#applyTransform(transform)
    this.#traceNodePath(node, box.width, box.height)
    context.globalAlpha = node.opacity
    for (const paint of node.fills) {
      if (!paint.visible) continue
      context.fillStyle = paintToCss(paint)
      context.fill()
    }
    if (node.strokeWeight > 0) {
      context.lineWidth = node.strokeWeight
      for (const paint of node.strokes) {
        if (!paint.visible) continue
        context.strokeStyle = paintToCss(paint)
        context.stroke()
      }
    }
    context.globalAlpha = 1
  }

  #drawDropShadows(node: SceneNodeUnion, box: NodeBox, transform: Mat2D): void {
    const bounds = this.#effectBounds(box, transform)
    if (!bounds) return
    const mask = this.#reserveSurface('mask', bounds)
    this.#paintSilhouette(mask, node, box, transform, bounds)
    const worldToDevice = this.#viewport.zoom * this.#devicePixelRatio
    for (const effect of node.effects) {
      if (!effect.visible) continue
      const tint = this.#reserveSurface('tint', bounds)
      tint.context.drawImage(
        mask.canvas,
        0,
        0,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height,
      )
      tint.context.globalCompositeOperation = 'source-in'
      tint.context.fillStyle = withAlphaColor(effect.color, 1)
      tint.context.fillRect(0, 0, bounds.width, bounds.height)
      tint.context.globalCompositeOperation = 'source-over'

      const context = this.#context
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.globalAlpha = node.opacity * effect.opacity
      if (effect.blur > 0) {
        context.filter = `blur(${effect.blur * worldToDevice * BLUR_SIGMA_FACTOR}px)`
      }
      context.translate(
        bounds.x + bounds.width / 2 + effect.offsetX * worldToDevice,
        bounds.y + bounds.height / 2 + effect.offsetY * worldToDevice,
      )
      if (effect.spread !== 0) {
        context.scale(
          (bounds.width + effect.spread * 2 * worldToDevice) / bounds.width,
          (bounds.height + effect.spread * 2 * worldToDevice) / bounds.height,
        )
      }
      context.translate(-bounds.width / 2, -bounds.height / 2)
      context.drawImage(
        tint.canvas,
        0,
        0,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height,
      )
      context.restore()
    }
  }

  #paintSilhouette(
    surface: EffectSurface,
    node: SceneNodeUnion,
    box: NodeBox,
    transform: Mat2D,
    bounds: EffectBounds,
  ): void {
    const context = surface.context
    context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e - bounds.x, transform.f - bounds.y)
    context.fillStyle = SILHOUETTE_COLOR
    context.strokeStyle = SILHOUETTE_COLOR
    traceNodeRect(context, node, box.width, box.height)
    context.fill()
    if (node.strokeWeight > 0) {
      context.lineWidth = node.strokeWeight
      context.stroke()
    }
  }

  #effectBounds(box: NodeBox, transform: Mat2D): EffectBounds | null {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const corner of BOX_CORNER_UNITS) {
      const point = applyToPoint(transform, { x: corner.x * box.width, y: corner.y * box.height })
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
    const left = Math.max(Math.floor(minX), 0)
    const top = Math.max(Math.floor(minY), 0)
    const width = Math.min(Math.ceil(maxX), this.#canvas.width) - left
    const height = Math.min(Math.ceil(maxY), this.#canvas.height) - top
    if (width < 1 || height < 1) return null
    return { x: left, y: top, width, height }
  }

  #reserveSurface(kind: 'mask' | 'tint', bounds: EffectBounds): EffectSurface {
    const surface = (kind === 'mask' ? this.#maskSurface : this.#tintSurface) ?? createEffectSurface()
    if (kind === 'mask') this.#maskSurface = surface
    else this.#tintSurface = surface
    const { canvas, context } = surface
    if (canvas.width < bounds.width) canvas.width = bounds.width
    if (canvas.height < bounds.height) canvas.height = bounds.height
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.filter = 'none'
    context.clearRect(0, 0, canvas.width, canvas.height)
    return surface
  }

  #drawHoverOutline(deviceViewport: Mat2D): void {
    const id = this.#getHoveredId()
    if (!id || this.#getSelection().includes(id)) return
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
    const context = this.#context
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    for (const id of this.#getSelection()) {
      const node = this.#scene.getNode(id)
      if (!node || !node.visible) continue
      const preview = this.#previews.get(id)
      const box: NodeBox = preview ?? node
      this.#applyTransform(multiply(deviceViewport, this.#nodeWorldTransform(node, preview)))
      this.#traceNodePath(node, box.width, box.height)
      context.stroke()
    }
  }

  #drawMarquee(): void {
    const marquee = this.#getMarquee()
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
    const draft = this.#getDraft()
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
    const guides = this.#getSnapGuides()
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

  #applyScreenTransform(): void {
    this.#context.setTransform(this.#devicePixelRatio, 0, 0, this.#devicePixelRatio, 0, 0)
  }
}

function guidePoint(guide: SnapGuide, value: number): Vec2 {
  return guide.axis === 'x' ? { x: guide.position, y: value } : { x: value, y: guide.position }
}

function createEffectSurface(): EffectSurface {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')
  return { canvas, context }
}

function traceNodeRect(
  context: CanvasRenderingContext2D,
  node: SceneNodeUnion,
  width: number,
  height: number,
): void {
  const maxRadius = Math.min(width, height) * MAX_CORNER_RADIUS_FACTOR
  const radius = Math.max(0, Math.min(node.cornerRadius, maxRadius))
  context.beginPath()
  context.roundRect(0, 0, width, height, radius)
}

function traceGuideMarker(context: CanvasRenderingContext2D, x: number, y: number): void {
  const arm = GUIDE_MARKER_ARM_PX
  context.moveTo(x - arm, y - arm)
  context.lineTo(x + arm, y + arm)
  context.moveTo(x + arm, y - arm)
  context.lineTo(x - arm, y + arm)
}
