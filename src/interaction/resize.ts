import type { Vec2 } from '../core/math/matrix'
import { normalizeRect, type Rect } from '../core/math/rect'

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLE_SIZE_PX = 10
export const MIN_RESIZE_SIZE = 1

const MIDDLE = 0.5

interface HandleAnchor {
  x: number
  y: number
}

const HANDLE_ANCHORS: Readonly<Record<ResizeHandleId, HandleAnchor>> = {
  nw: { x: 0, y: 0 },
  ne: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  sw: { x: 0, y: 1 },
  n: { x: MIDDLE, y: 0 },
  e: { x: 1, y: MIDDLE },
  s: { x: MIDDLE, y: 1 },
  w: { x: 0, y: MIDDLE },
}

const HANDLE_CURSORS: Readonly<Record<ResizeHandleId, string>> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

export const RESIZE_HANDLE_IDS: readonly ResizeHandleId[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']

export function handlePoint(bounds: Rect, handle: ResizeHandleId): Vec2 {
  const anchor = HANDLE_ANCHORS[handle]
  return {
    x: bounds.x + bounds.width * anchor.x,
    y: bounds.y + bounds.height * anchor.y,
  }
}

export function handleAtPoint(
  bounds: Rect,
  point: Vec2,
  sizePx = RESIZE_HANDLE_SIZE_PX,
): ResizeHandleId | null {
  const half = sizePx / 2
  for (const handle of RESIZE_HANDLE_IDS) {
    const center = handlePoint(bounds, handle)
    if (Math.abs(point.x - center.x) <= half && Math.abs(point.y - center.y) <= half) {
      return handle
    }
  }
  return null
}

export function handleCursor(handle: ResizeHandleId): string {
  return HANDLE_CURSORS[handle]
}

export interface ResizeBoundsInput {
  bounds: Rect
  handle: ResizeHandleId
  pointer: Vec2
  proportional: boolean
  fromCenter: boolean
}

export function resizeBounds(input: ResizeBoundsInput): Rect {
  const { bounds, handle, pointer, proportional, fromCenter } = input
  const anchor = HANDLE_ANCHORS[handle]
  let scaleX = axisScale(bounds.x, bounds.width, anchor.x, pointer.x, fromCenter)
  let scaleY = axisScale(bounds.y, bounds.height, anchor.y, pointer.y, fromCenter)
  if (proportional) {
    const uniform = Math.abs(scaleX) >= Math.abs(scaleY) ? scaleX : scaleY
    scaleX = uniform
    scaleY = uniform
  }
  const originX = fixedCoordinate(bounds.x, bounds.width, anchor.x, fromCenter)
  const originY = fixedCoordinate(bounds.y, bounds.height, anchor.y, fromCenter)
  return {
    x: originX + (bounds.x - originX) * scaleX,
    y: originY + (bounds.y - originY) * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  }
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

function axisScale(
  start: number,
  size: number,
  anchor: number,
  pointer: number,
  fromCenter: boolean,
): number {
  if (anchor === MIDDLE || size === 0) return 1
  if (fromCenter) return clampSize(2 * (pointer - (start + size / 2))) / size
  const rawSize = anchor === 0 ? start + size - pointer : pointer - start
  return clampSize(rawSize) / size
}

function clampSize(size: number): number {
  if (Math.abs(size) >= MIN_RESIZE_SIZE) return size
  return size < 0 ? -MIN_RESIZE_SIZE : MIN_RESIZE_SIZE
}

function fixedCoordinate(start: number, size: number, anchor: number, fromCenter: boolean): number {
  if (fromCenter || anchor === MIDDLE) return start + size / 2
  return anchor === 0 ? start + size : start
}
