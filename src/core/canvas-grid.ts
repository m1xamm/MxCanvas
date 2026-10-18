import type { Rect } from './math/rect'

export const GRID_BASE_STEP = 8
export const GRID_MIN_SCREEN_SPACING = 20
export const GRID_MIN_ALPHA = 0.35
export const GRID_MAX_ALPHA = 1

const INDEX_EPSILON = 1e-9

export interface CanvasGrid {
  step: number
  alpha: number
  firstX: number
  firstY: number
  columns: number
  rows: number
}

export function gridStep(zoom: number): number {
  if (!(zoom > 0)) return GRID_BASE_STEP
  const exponent = Math.ceil(
    Math.log2(GRID_MIN_SCREEN_SPACING / (GRID_BASE_STEP * zoom)) - INDEX_EPSILON,
  )
  return GRID_BASE_STEP * 2 ** exponent
}

export function gridScreenSpacing(zoom: number): number {
  return gridStep(zoom) * zoom
}

export function gridAlpha(zoom: number): number {
  const octave = clamp01(Math.log2(gridScreenSpacing(zoom) / GRID_MIN_SCREEN_SPACING))
  const triangle = 1 - Math.abs(2 * octave - 1)
  const eased = triangle * triangle * (3 - 2 * triangle)
  return GRID_MIN_ALPHA + (GRID_MAX_ALPHA - GRID_MIN_ALPHA) * eased
}

export function canvasGrid(bounds: Rect, zoom: number): CanvasGrid {
  const step = gridStep(zoom)
  const firstX = firstDotOffset(bounds.x, step)
  const firstY = firstDotOffset(bounds.y, step)
  return {
    step,
    alpha: gridAlpha(zoom),
    firstX,
    firstY,
    columns: dotCount(firstX, bounds.x + bounds.width, step),
    rows: dotCount(firstY, bounds.y + bounds.height, step),
  }
}

export function firstDotOffset(min: number, step: number): number {
  if (!(step > 0)) return min
  const offset = Math.ceil(min / step - INDEX_EPSILON) * step
  return offset === 0 ? 0 : offset
}

export function dotCount(first: number, max: number, step: number): number {
  if (!(step > 0) || !(max >= first)) return 0
  return Math.floor((max - first) / step + INDEX_EPSILON) + 1
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
