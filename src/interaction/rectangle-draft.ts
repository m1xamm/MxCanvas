import type { Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'

export const CLICK_MOVEMENT_THRESHOLD_PX = 3
export const CLICK_RECTANGLE_SIZE = 100

export interface RectangleDragModifiers {
  square: boolean
  fromCenter: boolean
}

export function rectangleFromDrag(
  start: Vec2,
  end: Vec2,
  modifiers: RectangleDragModifiers,
): Rect {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  if (isClick(deltaX, deltaY)) {
    return { x: start.x, y: start.y, width: CLICK_RECTANGLE_SIZE, height: CLICK_RECTANGLE_SIZE }
  }
  const side = Math.max(Math.abs(deltaX), Math.abs(deltaY))
  const halfWidth = modifiers.square ? side : Math.abs(deltaX)
  const halfHeight = modifiers.square ? side : Math.abs(deltaY)
  if (modifiers.fromCenter) {
    return {
      x: start.x - halfWidth,
      y: start.y - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    }
  }
  return {
    x: deltaX < 0 ? start.x - halfWidth : start.x,
    y: deltaY < 0 ? start.y - halfHeight : start.y,
    width: halfWidth,
    height: halfHeight,
  }
}

function isClick(deltaX: number, deltaY: number): boolean {
  return (
    Math.abs(deltaX) < CLICK_MOVEMENT_THRESHOLD_PX && Math.abs(deltaY) < CLICK_MOVEMENT_THRESHOLD_PX
  )
}
