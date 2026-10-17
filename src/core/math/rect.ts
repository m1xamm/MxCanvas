import type { Mat2D } from './matrix'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
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
