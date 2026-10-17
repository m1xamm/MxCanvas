import { multiply, scaling } from '../core/math/matrix'
import type { Viewport } from '../core/viewport'
import type { Renderer } from './renderer'
import { readThemeColors, type ThemeColors } from './theme-colors'

const TEMPORARY_TEST_RECT = { x: 200, y: 160, width: 420, height: 280 }
const TEMPORARY_TEST_STROKE_COLOR = 'rgba(255, 255, 255, 0.4)'
const TEMPORARY_TEST_STROKE_DEVICE_PX = 2

export class Canvas2DRenderer implements Renderer {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #viewport: Viewport
  #colors: ThemeColors
  #devicePixelRatio = 1
  #dirty = false
  #frameHandle = 0

  constructor(canvas: HTMLCanvasElement, viewport: Viewport) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')
    this.#canvas = canvas
    this.#context = context
    this.#viewport = viewport
    this.#colors = readThemeColors()
  }

  setSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
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
    this.#dirty = false
    const context = this.#context
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.fillStyle = this.#colors.canvas
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height)
    const deviceScale = this.#devicePixelRatio
    const transform = multiply(scaling(deviceScale, deviceScale), this.#viewport.matrix())
    context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f)
    this.#drawTemporaryTestRect()
  }

  #drawTemporaryTestRect(): void {
    const context = this.#context
    const rect = TEMPORARY_TEST_RECT
    context.fillStyle = this.#colors.primary
    context.fillRect(rect.x, rect.y, rect.width, rect.height)
    context.lineWidth =
      TEMPORARY_TEST_STROKE_DEVICE_PX / (this.#devicePixelRatio * this.#viewport.zoom)
    context.strokeStyle = TEMPORARY_TEST_STROKE_COLOR
    context.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }
}
