import type { Rect } from './math/rect'

export const PIXEL_GRID_MIN_ZOOM = 4
export const PIXEL_GRID_FULL_ZOOM = 8

const INDEX_EPSILON = 1e-9

export interface PixelGrid {
  alpha: number
  firstX: number
  firstY: number
  columns: number
  rows: number
}

export function pixelGridAlpha(zoom: number): number {
  if (!(zoom > PIXEL_GRID_MIN_ZOOM)) return 0
  if (zoom >= PIXEL_GRID_FULL_ZOOM) return 1
  const progress = (zoom - PIXEL_GRID_MIN_ZOOM) / (PIXEL_GRID_FULL_ZOOM - PIXEL_GRID_MIN_ZOOM)
  return progress * progress * (3 - 2 * progress)
}

export function pixelGrid(bounds: Rect, zoom: number): PixelGrid {
  const alpha = pixelGridAlpha(zoom)
  const firstX = firstLine(bounds.x)
  const firstY = firstLine(bounds.y)
  return {
    alpha,
    firstX,
    firstY,
    columns: alpha === 0 ? 0 : lineCount(firstX, bounds.x + bounds.width),
    rows: alpha === 0 ? 0 : lineCount(firstY, bounds.y + bounds.height),
  }
}

function firstLine(min: number): number {
  const value = Math.ceil(min - INDEX_EPSILON)
  return value === 0 ? 0 : value
}

function lineCount(first: number, max: number): number {
  if (!(max >= first)) return 0
  return Math.floor(max - first + INDEX_EPSILON) + 1
}
