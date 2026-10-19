import type { Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
import { type SnapGuide, type SnapResult } from '../core/snap'
import { CLICK_MOVEMENT_THRESHOLD_PX } from './gesture'

export const CLICK_RECTANGLE_SIZE = 100

export interface RectangleDragModifiers {
  square: boolean
  fromCenter: boolean
}

export interface RectangleDraftInput {
  start: Vec2
  end: Vec2
  modifiers: RectangleDragModifiers
  snap: RectangleDraftSnap | null
  snapDisabled: boolean
}

export type RectangleDraftSnap = (rect: Rect, disabled: boolean) => SnapResult

export interface RectangleDraft {
  rect: Rect
  guides: readonly SnapGuide[]
}

const NO_GUIDES: readonly SnapGuide[] = []

export function rectangleDraft(input: RectangleDraftInput): RectangleDraft {
  const raw = rectangleFromDrag(input.start, input.end, input.modifiers)
  if (!input.snap) return { rect: raw, guides: NO_GUIDES }
  const snapped = input.snap(raw, input.snapDisabled)
  return { rect: applyConstraints(snapped.rect, input.start, input.modifiers), guides: snapped.guides }
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

function applyConstraints(rect: Rect, start: Vec2, modifiers: RectangleDragModifiers): Rect {
  if (!modifiers.square && !modifiers.fromCenter) return rect
  const growsLeft = Math.abs(rect.x - start.x) > Math.abs(rect.x + rect.width - start.x)
  const growsUp = Math.abs(rect.y - start.y) > Math.abs(rect.y + rect.height - start.y)
  const size = Math.max(Math.round(rect.width), Math.round(rect.height))
  const width = modifiers.square ? size : Math.round(rect.width)
  const height = modifiers.square ? size : Math.round(rect.height)
  if (modifiers.fromCenter) {
    return {
      x: start.x - width / 2,
      y: start.y - height / 2,
      width,
      height,
    }
  }
  const anchorX = growsLeft ? rect.x + rect.width : rect.x
  const anchorY = growsUp ? rect.y + rect.height : rect.y
  return {
    x: growsLeft ? anchorX - width : anchorX,
    y: growsUp ? anchorY - height : anchorY,
    width,
    height,
  }
}

function isClick(deltaX: number, deltaY: number): boolean {
  return (
    Math.abs(deltaX) < CLICK_MOVEMENT_THRESHOLD_PX && Math.abs(deltaY) < CLICK_MOVEMENT_THRESHOLD_PX
  )
}
