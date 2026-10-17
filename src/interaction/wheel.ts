import type { Vec2 } from '../core/math/matrix'

const ZOOM_WHEEL_SENSITIVITY = 0.0025
const DELTA_MODE_LINE = 1
const LINE_HEIGHT_PX = 16

export interface WheelInput {
  deltaX: number
  deltaY: number
  deltaMode: number
  shiftKey: boolean
}

export function normalizeWheelDelta(delta: number, deltaMode: number): number {
  return deltaMode === DELTA_MODE_LINE ? delta * LINE_HEIGHT_PX : delta
}

export function wheelZoomFactor(deltaY: number): number {
  return Math.exp(-deltaY * ZOOM_WHEEL_SENSITIVITY)
}

export function wheelPanDelta(input: WheelInput): Vec2 {
  const deltaX = normalizeWheelDelta(input.deltaX, input.deltaMode)
  const deltaY = normalizeWheelDelta(input.deltaY, input.deltaMode)
  if (input.shiftKey) {
    return { x: -(deltaX !== 0 ? deltaX : deltaY), y: 0 }
  }
  return { x: -deltaX, y: -deltaY }
}
