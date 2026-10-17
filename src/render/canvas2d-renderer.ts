import { DEFAULT_RECTANGLE_FILL } from '../core/document/create-node'
import type { NodeId, SceneNodeUnion, SceneReader, SolidPaint } from '../core/document/types'
import { multiply, scaling, type Mat2D } from '../core/math/matrix'
import { transformRect, type Rect } from '../core/math/rect'
import { boxWorldTransform, type NodeBox } from '../core/transform'
import type { Viewport } from '../core/viewport'
import { collectVisibleNodes } from './culling'
import type { Renderer } from './renderer'
import { readThemeColors, type ThemeColors } from './theme-colors'

const OUTLINE_SCREEN_PX = 1
const MAX_CORNER_RADIUS_FACTOR = 0.5
const DRAFT_FILL_ALPHA = 0.6

export interface Canvas2DRendererOptions {
  scene: SceneReader
  getSelection: () => readonly NodeId[]
  getHoveredId?: () => NodeId | null
  getMarquee?: () => Rect | null
  getPreviews?: () => ReadonlyMap<NodeId, NodeBox>
  getDraft?: () => Rect | null
}

export class Canvas2DRenderer implements Renderer {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #viewport: Viewport
  #scene: SceneReader
  #getSelection: () => readonly NodeId[]
  #getHoveredId: () => NodeId | null
  #getMarquee: () => Rect | null
  #getPreviews: () => ReadonlyMap<NodeId, NodeBox>
  #getDraft: () => Rect | null
  #colors: ThemeColors
  #devicePixelRatio = 1
  #cssWidth = 1
  #cssHeight = 1
  #visibleNodes: SceneNodeUnion[] = []
  #previews: ReadonlyMap<NodeId, NodeBox> = new Map()
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
    this.#getMarquee = options.getMarquee ?? (() => null)
    this.#getPreviews = options.getPreviews ?? (() => new Map())
    this.#getDraft = options.getDraft ?? (() => null)
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

  #draw = (): void => {
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
    for (const node of collectVisibleNodes(this.#scene, this.#viewportWorldBounds(), this.#visibleNodes)) {
      this.#drawNode(node, deviceViewport)
    }
    this.#drawHoverOutline(deviceViewport)
    this.#drawSelectionOutline(deviceViewport)
    this.#drawMarquee()
    this.#drawDraft(deviceViewport)
  }

  #drawNode(node: SceneNodeUnion, deviceViewport: Mat2D): void {
    const context = this.#context
    const preview = this.#previews.get(node.id)
    const box: NodeBox = preview ?? node
    const paint = node.fills[0]
    this.#applyTransform(multiply(deviceViewport, this.#nodeWorldTransform(node, preview)))
    context.globalAlpha = node.opacity
    context.fillStyle = paint ? paintToCss(paint) : 'transparent'
    this.#traceNodePath(node, box.width, box.height)
    context.fill()
    context.globalAlpha = 1
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
    context.fillStyle = paintToCss(DEFAULT_RECTANGLE_FILL)
    context.beginPath()
    context.rect(draft.x, draft.y, draft.width, draft.height)
    context.fill()
    context.globalAlpha = 1
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    context.stroke()
  }

  #traceNodePath(node: SceneNodeUnion, width: number, height: number): void {
    const context = this.#context
    const maxRadius = Math.min(width, height) * MAX_CORNER_RADIUS_FACTOR
    const radius = Math.max(0, Math.min(node.cornerRadius, maxRadius))
    context.beginPath()
    context.roundRect(0, 0, width, height, radius)
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

function paintToCss(paint: SolidPaint): string {
  const { r, g, b } = paint.color
  return `rgba(${r}, ${g}, ${b}, ${paint.opacity})`
}
