import { withAlphaColor } from '../core/color'
import { applyToPoint, type Mat2D, type Vec2 } from '../core/math/matrix'
import type { DropShadowEffect, RgbColor, SceneNodeUnion } from '../core/document/types'
import type { NodeBox } from '../core/transform'
import { traceNodeRect } from './node-path'

const BLUR_SIGMA_FACTOR = 0.5
const SILHOUETTE_COLOR = '#ffffff'
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

export class DropShadowPass {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #zoom = 1
  #devicePixelRatio = 1
  #mask: EffectSurface | null = null
  #tint: EffectSurface | null = null

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    this.#canvas = canvas
    this.#context = context
  }

  setScale(zoom: number, devicePixelRatio: number): void {
    this.#zoom = zoom
    this.#devicePixelRatio = devicePixelRatio
  }

  draw(node: SceneNodeUnion, box: NodeBox, transform: Mat2D): void {
    const bounds = this.#bounds(box, transform)
    if (!bounds) return
    const mask = this.#reserveSurface('mask', bounds)
    this.#paintSilhouette(mask, node, box, transform, bounds)
    const worldToDevice = this.#zoom * this.#devicePixelRatio
    for (const effect of node.effects) {
      if (!effect.visible) continue
      const tint = this.#tintSurface(bounds, effect.color)
      this.#paintShadow(node.opacity, bounds, effect, tint, worldToDevice)
    }
  }

  #paintShadow(
    nodeOpacity: number,
    bounds: EffectBounds,
    effect: DropShadowEffect,
    tint: EffectSurface,
    worldToDevice: number,
  ): void {
    const context = this.#context
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = Math.min(1, nodeOpacity * effect.opacity)
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
    context.drawImage(tint.canvas, 0, 0, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
    context.restore()
  }

  #tintSurface(bounds: EffectBounds, color: RgbColor): EffectSurface {
    const mask = this.#mask
    const tint = this.#reserveSurface('tint', bounds)
    if (!mask) return tint
    tint.context.drawImage(mask.canvas, 0, 0, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
    tint.context.globalCompositeOperation = 'source-in'
    tint.context.fillStyle = withAlphaColor(color, 1)
    tint.context.fillRect(0, 0, bounds.width, bounds.height)
    tint.context.globalCompositeOperation = 'source-over'
    return tint
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

  #bounds(box: NodeBox, transform: Mat2D): EffectBounds | null {
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
    const surface = (kind === 'mask' ? this.#mask : this.#tint) ?? createEffectSurface()
    if (kind === 'mask') this.#mask = surface
    else this.#tint = surface
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
}

function createEffectSurface(): EffectSurface {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')
  return { canvas, context }
}
