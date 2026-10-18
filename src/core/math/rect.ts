import type { Mat2D, Vec2 } from './matrix'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

export function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

export function translateRect(rect: Rect, delta: Vec2): Rect {
  return { x: rect.x + delta.x, y: rect.y + delta.y, width: rect.width, height: rect.height }
}

export function boundsOfRects(rects: readonly Rect[]): Rect | null {
  const first = rects[0]
  if (!first) return null
  let minX = first.x
  let minY = first.y
  let maxX = first.x + first.width
  let maxY = first.y + first.height
  for (const rect of rects) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function transformRect(matrix: Mat2D, rect: Rect): Rect {
  const x1 = matrix.a * rect.x + matrix.c * rect.y + matrix.e
  const y1 = matrix.b * rect.x + matrix.d * rect.y + matrix.f
  const x2 = matrix.a * (rect.x + rect.width) + matrix.c * rect.y + matrix.e
  const y2 = matrix.b * (rect.x + rect.width) + matrix.d * rect.y + matrix.f
  const x3 = matrix.a * (rect.x + rect.width) + matrix.c * (rect.y + rect.height) + matrix.e
  const y3 = matrix.b * (rect.x + rect.width) + matrix.d * (rect.y + rect.height) + matrix.f
  const x4 = matrix.a * rect.x + matrix.c * (rect.y + rect.height) + matrix.e
  const y4 = matrix.b * rect.x + matrix.d * (rect.y + rect.height) + matrix.f
  const minX = Math.min(x1, x2, x3, x4)
  const maxX = Math.max(x1, x2, x3, x4)
  const minY = Math.min(y1, y2, y3, y4)
  const maxY = Math.max(y1, y2, y3, y4)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function mapRectWithBounds(rect: Rect, from: Rect, to: Rect): Rect {
  const scaleX = from.width === 0 ? 1 : to.width / from.width
  const scaleY = from.height === 0 ? 1 : to.height / from.height
  return normalizeRect({
    x: to.x + (rect.x - from.x) * scaleX,
    y: to.y + (rect.y - from.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  })
}
