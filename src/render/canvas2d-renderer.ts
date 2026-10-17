import { DEFAULT_RECTANGLE_FILL } from '../core/document/create-node'
import type { NodeId, SceneNodeUnion, SceneReader, SolidPaint } from '../core/document/types'
import { multiply, scaling, type Mat2D } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
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
  getDraft?: () => Rect | null
}

export class Canvas2DRenderer implements Renderer {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #viewport: Viewport
  #scene: SceneReader
  #getSelection: () => readonly NodeId[]
  #getDraft: () => Rect | null
  #colors: ThemeColors
  #devicePixelRatio = 1
  #cssWidth = 1
  #cssHeight = 1
  #visibleNodes: SceneNodeUnion[] = []
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
    this.#drawSelectionOutline(deviceViewport)
    this.#drawDraft(deviceViewport)
  }

  #drawNode(node: SceneNodeUnion, deviceViewport: Mat2D): void {
    const context = this.#context
    const paint = node.fills[0]
    this.#applyTransform(multiply(deviceViewport, this.#scene.getWorldTransform(node.id)))
    context.globalAlpha = node.opacity
    context.fillStyle = paint ? paintToCss(paint) : 'transparent'
    this.#traceNodePath(node)
    context.fill()
    context.globalAlpha = 1
  }

  #drawSelectionOutline(deviceViewport: Mat2D): void {
    const context = this.#context
    context.strokeStyle = this.#colors.primary
    context.lineWidth = OUTLINE_SCREEN_PX / this.#viewport.zoom
    for (const id of this.#getSelection()) {
      const node = this.#scene.getNode(id)
      if (!node || !node.visible) continue
      this.#applyTransform(multiply(deviceViewport, this.#scene.getWorldTransform(id)))
      this.#traceNodePath(node)
      context.stroke()
    }
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

  #traceNodePath(node: SceneNodeUnion): void {
    const context = this.#context
    const maxRadius = Math.min(node.width, node.height) * MAX_CORNER_RADIUS_FACTOR
    const radius = Math.max(0, Math.min(node.cornerRadius, maxRadius))
    context.beginPath()
    context.roundRect(0, 0, node.width, node.height, radius)
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
}

function paintToCss(paint: SolidPaint): string {
  const { r, g, b } = paint.color
  return `rgba(${r}, ${g}, ${b}, ${paint.opacity})`
}
