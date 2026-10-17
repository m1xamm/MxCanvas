export const CLICK_MOVEMENT_THRESHOLD_PX = 3

export function isDrag(start: { x: number; y: number }, current: { x: number; y: number }): boolean {
  return (
    Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y)) >=
    CLICK_MOVEMENT_THRESHOLD_PX
  )
}
