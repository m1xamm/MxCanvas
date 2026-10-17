import type { Vec2 } from '../core/math/matrix'

export const CLICK_MOVEMENT_THRESHOLD_PX = 3

export function isDrag(start: Vec2, current: Vec2): boolean {
  return (
    Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y)) >=
    CLICK_MOVEMENT_THRESHOLD_PX
  )
}

export function moveDelta(start: Vec2, current: Vec2, axisLock: boolean): Vec2 {
  const delta = { x: current.x - start.x, y: current.y - start.y }
  if (!axisLock) return delta
  return Math.abs(delta.x) >= Math.abs(delta.y) ? { x: delta.x, y: 0 } : { x: 0, y: delta.y }
}
