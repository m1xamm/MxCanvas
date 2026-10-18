import type { Mat2D } from '../core/math/matrix'
import { transformRect, type Rect } from '../core/math/rect'
import {
  handlePoint,
  RESIZE_HANDLE_IDS,
  RESIZE_HANDLE_SIZE_PX,
  type ResizeHandleId,
} from '../interaction/resize'
import type { ThemeColors } from './theme-colors'

const BORDER_SCREEN_PX = 1
const HANDLE_BORDER_PX = 1.5
const LABEL_FONT_SIZE_PX = 12
const LABEL_PADDING_X_PX = 6
const LABEL_PADDING_Y_PX = 3
const LABEL_GAP_PX = 8
const LABEL_RADIUS_PX = 4

export const HANDLE_HOVER_DURATION_MS = 120
export const HANDLE_HOVER_MAX_SCALE = 1.25

const LABEL_APPEAR_DURATION_MS = 160
const LABEL_APPEAR_MIN_SCALE = 0.92

export function handleHoverScale(elapsedMs: number): number {
  if (elapsedMs >= HANDLE_HOVER_DURATION_MS) return HANDLE_HOVER_MAX_SCALE
  const progress = Math.max(elapsedMs, 0) / HANDLE_HOVER_DURATION_MS
  return 1 + (HANDLE_HOVER_MAX_SCALE - 1) * progress
}

export function labelAppearScale(elapsedMs: number): number {
  if (elapsedMs >= LABEL_APPEAR_DURATION_MS) return 1
  const progress = Math.max(elapsedMs, 0) / LABEL_APPEAR_DURATION_MS
  const eased = progress * progress * (3 - 2 * progress)
  return LABEL_APPEAR_MIN_SCALE + (1 - LABEL_APPEAR_MIN_SCALE) * eased
}

export function labelAnimationDone(elapsedMs: number): boolean {
  return elapsedMs >= LABEL_APPEAR_DURATION_MS
}

export interface SelectionOverlayInput {
  context: CanvasRenderingContext2D
  viewportMatrix: Mat2D
  bounds: Rect | null
  colors: ThemeColors
  devicePixelRatio: number
  hoveredHandle?: ResizeHandleId | null
  hoverScale?: number
  labelScale?: number
}

export function drawSelectionOverlay(input: SelectionOverlayInput): void {
  const { context, bounds, colors } = input
  if (!bounds) return
  const screen = transformRect(input.viewportMatrix, bounds)
  context.setTransform(input.devicePixelRatio, 0, 0, input.devicePixelRatio, 0, 0)
  context.lineWidth = BORDER_SCREEN_PX
  context.strokeStyle = colors.primary
  strokePixelRect(context, screen)
  drawHandles(context, screen, colors, input.hoveredHandle ?? null, input.hoverScale ?? 1)
  drawSizeLabel(context, screen, bounds, colors, input.labelScale ?? 1)
}

function drawHandles(
  context: CanvasRenderingContext2D,
  bounds: Rect,
  colors: ThemeColors,
  hoveredHandle: ResizeHandleId | null,
  hoverScale: number,
): void {
  const radius = RESIZE_HANDLE_SIZE_PX / 2
  context.fillStyle = colors.onSurface
  context.strokeStyle = colors.primary
  context.lineWidth = HANDLE_BORDER_PX
  for (const handle of RESIZE_HANDLE_IDS) {
    const center = handlePoint(bounds, handle)
    const scale = handle === hoveredHandle ? hoverScale : 1
    context.beginPath()
    context.arc(center.x, center.y, radius * scale, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
}

function drawSizeLabel(
  context: CanvasRenderingContext2D,
  screen: Rect,
  bounds: Rect,
  colors: ThemeColors,
  scale: number,
): void {
  const text = `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`
  context.font = `${LABEL_FONT_SIZE_PX}px ${colors.fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const width = context.measureText(text).width + LABEL_PADDING_X_PX * 2
  const height = LABEL_FONT_SIZE_PX + LABEL_PADDING_Y_PX * 2
  const x = Math.round(screen.x + screen.width / 2 - width / 2)
  const y = Math.round(screen.y + screen.height + LABEL_GAP_PX)
  const centerX = x + width / 2
  const centerY = y + height / 2
  context.save()
  context.translate(centerX, centerY)
  context.scale(scale, scale)
  context.translate(-centerX, -centerY)
  context.fillStyle = colors.primary
  context.beginPath()
  context.roundRect(x, y, width, height, LABEL_RADIUS_PX)
  context.fill()
  context.fillStyle = colors.onPrimary
  context.fillText(text, centerX, centerY)
  context.restore()
}

function strokePixelRect(context: CanvasRenderingContext2D, rect: Rect): void {
  context.strokeRect(
    Math.round(rect.x) + 0.5,
    Math.round(rect.y) + 0.5,
    Math.max(Math.round(rect.width) - 1, 0),
    Math.max(Math.round(rect.height) - 1, 0),
  )
}
