import { applyToPoint, multiply, scaling, translation, type Mat2D, type Vec2 } from './math/matrix'

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 256

export interface ViewportInit {
  pan?: Vec2
  zoom?: number
}

export class Viewport {
  #panX: number
  #panY: number
  #zoom: number
  #listeners = new Set<() => void>()

  constructor(init: ViewportInit = {}) {
    this.#panX = init.pan?.x ?? 0
    this.#panY = init.pan?.y ?? 0
    this.#zoom = clampZoom(init.zoom ?? 1)
  }

  get zoom(): number {
    return this.#zoom
  }

  get pan(): Vec2 {
    return { x: this.#panX, y: this.#panY }
  }

  matrix(): Mat2D {
    return multiply(translation(this.#panX, this.#panY), scaling(this.#zoom, this.#zoom))
  }

  screenToWorld(point: Vec2): Vec2 {
    return {
      x: (point.x - this.#panX) / this.#zoom,
      y: (point.y - this.#panY) / this.#zoom,
    }
  }

  worldToScreen(point: Vec2): Vec2 {
    return applyToPoint(this.matrix(), point)
  }

  panBy(delta: Vec2): void {
    if (delta.x === 0 && delta.y === 0) return
    this.#panX += delta.x
    this.#panY += delta.y
    this.#notify()
  }

  zoomAt(anchor: Vec2, factor: number): void {
    const zoom = clampZoom(this.#zoom * factor)
    if (zoom === this.#zoom) return
    const world = this.screenToWorld(anchor)
    this.#zoom = zoom
    this.#panX = anchor.x - world.x * zoom
    this.#panY = anchor.y - world.y * zoom
    this.#notify()
  }

  setView(pan: Vec2, zoom: number): void {
    const nextZoom = clampZoom(zoom)
    if (this.#panX === pan.x && this.#panY === pan.y && this.#zoom === nextZoom) return
    this.#panX = pan.x
    this.#panY = pan.y
    this.#zoom = nextZoom
    this.#notify()
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}
