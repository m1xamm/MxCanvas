export type PopupSide = 'below' | 'above'
export type PopupAlign = 'start' | 'center' | 'end'

export interface RectLike {
  x: number
  y: number
  width: number
  height: number
}

export interface SizeLike {
  width: number
  height: number
}

export interface PopupPlacementInput {
  anchor: RectLike
  popup: SizeLike
  viewport: SizeLike
  side: PopupSide
  align: PopupAlign
  gap: number
  margin: number
}

export interface PopupPlacement {
  left: number
  top: number
  originX: number
  originY: number
  side: PopupSide
}

export function computePopupPlacement(input: PopupPlacementInput): PopupPlacement {
  const vertical = resolveVertical(input)
  const left = clamp(
    horizontalPosition(input),
    input.margin,
    Math.max(input.margin, input.viewport.width - input.margin - input.popup.width),
  )
  const anchorCenterX = input.anchor.x + input.anchor.width / 2
  return {
    left: Math.round(left),
    top: Math.round(vertical.top),
    originX: Math.round(clamp(anchorCenterX - left, 0, input.popup.width)),
    originY: Math.round(vertical.side === 'below' ? 0 : input.popup.height),
    side: vertical.side,
  }
}

function resolveVertical(input: PopupPlacementInput): { top: number; side: PopupSide } {
  const { anchor, popup, viewport, gap, margin } = input
  const below = anchor.y + anchor.height + gap
  const above = anchor.y - gap - popup.height
  const fitsBelow = viewport.height - margin - below >= popup.height
  const fitsAbove = anchor.y - gap - margin >= popup.height
  const side =
    input.side === 'below'
      ? fitsBelow || !fitsAbove
        ? 'below'
        : 'above'
      : fitsAbove || !fitsBelow
        ? 'above'
        : 'below'
  const top = side === 'below' ? below : above
  return {
    top: clamp(top, margin, Math.max(margin, viewport.height - margin - popup.height)),
    side,
  }
}

function horizontalPosition(input: PopupPlacementInput): number {
  const { anchor, popup, align } = input
  if (align === 'center') return anchor.x + (anchor.width - popup.width) / 2
  if (align === 'end') return anchor.x + anchor.width - popup.width
  return anchor.x
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
