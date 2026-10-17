import type { Vec2 } from './math/matrix'
import type { Rect } from './math/rect'
import { MAX_ZOOM, MIN_ZOOM } from './viewport'

export const FIT_PADDING_PX = 64

const MIN_FIT_SIZE = 1

export interface ViewportFit {
  zoom: number
  pan: Vec2
}

export function fitBounds(bounds: Rect, area: Rect, paddingPx = FIT_PADDING_PX): ViewportFit | null {
  const availableWidth = area.width - paddingPx * 2
  const availableHeight = area.height - paddingPx * 2
  if (availableWidth <= 0 || availableHeight <= 0) return null
  const width = Math.max(bounds.width, MIN_FIT_SIZE)
  const height = Math.max(bounds.height, MIN_FIT_SIZE)
  const zoom = clampZoom(Math.min(availableWidth / width, availableHeight / height))
  const centerX = area.x + area.width / 2
  const centerY = area.y + area.height / 2
  return {
    zoom,
    pan: {
      x: centerX - (bounds.x + bounds.width / 2) * zoom,
      y: centerY - (bounds.y + bounds.height / 2) * zoom,
    },
  }
}

function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)
}
