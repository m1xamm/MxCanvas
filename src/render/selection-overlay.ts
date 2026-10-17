import type { Mat2D } from '../core/math/matrix'
import { transformRect, type Rect } from '../core/math/rect'
import { handlePoint, RESIZE_HANDLE_IDS, RESIZE_HANDLE_SIZE_PX } from '../interaction/resize'
import type { ThemeColors } from './theme-colors'

const BORDER_SCREEN_PX = 1
const LABEL_FONT_SIZE_PX = 12
const LABEL_PADDING_X_PX = 6
const LABEL_PADDING_Y_PX = 3
const LABEL_GAP_PX = 8
const LABEL_RADIUS_PX = 4

export interface SelectionOverlayInput {
  context: CanvasRenderingContext2D
  viewportMatrix: Mat2D
  bounds: Rect | null
  colors: ThemeColors
  devicePixelRatio: number
}

export function drawSelectionOverlay(input: SelectionOverlayInput): void {
  const { context, bounds, colors } = input
  if (!bounds) return
  const screen = transformRect(input.viewportMatrix, bounds)
  context.setTransform(input.devicePixelRatio, 0, 0, input.devicePixelRatio, 0, 0)
  context.lineWidth = BORDER_SCREEN_PX
  context.strokeStyle = colors.primary
  strokePixelRect(context, screen)
  drawHandles(context, screen, colors)
  drawSizeLabel(context, screen, bounds, colors)
}

function drawHandles(
  context: CanvasRenderingContext2D,
  bounds: Rect,
  colors: ThemeColors,
): void {
  const half = RESIZE_HANDLE_SIZE_PX / 2
  context.fillStyle = colors.onSurface
  context.strokeStyle = colors.primary
  for (const handle of RESIZE_HANDLE_IDS) {
    const center = handlePoint(bounds, handle)
    const x = Math.round(center.x - half)
    const y = Math.round(center.y - half)
    context.fillRect(x, y, RESIZE_HANDLE_SIZE_PX, RESIZE_HANDLE_SIZE_PX)
    context.strokeRect(
      x + 0.5,
      y + 0.5,
      RESIZE_HANDLE_SIZE_PX - 1,
      RESIZE_HANDLE_SIZE_PX - 1,
    )
  }
}

function drawSizeLabel(
  context: CanvasRenderingContext2D,
  screen: Rect,
  bounds: Rect,
  colors: ThemeColors,
): void {
  const text = `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`
  context.font = `${LABEL_FONT_SIZE_PX}px ${colors.fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const width = context.measureText(text).width + LABEL_PADDING_X_PX * 2
  const height = LABEL_FONT_SIZE_PX + LABEL_PADDING_Y_PX * 2
  const x = Math.round(screen.x + screen.width / 2 - width / 2)
  const y = Math.round(screen.y + screen.height + LABEL_GAP_PX)
  context.fillStyle = colors.primary
  context.beginPath()
  context.roundRect(x, y, width, height, LABEL_RADIUS_PX)
  context.fill()
  context.fillStyle = colors.onPrimary
  context.fillText(text, x + width / 2, y + height / 2)
}

function strokePixelRect(context: CanvasRenderingContext2D, rect: Rect): void {
  context.strokeRect(
    Math.round(rect.x) + 0.5,
    Math.round(rect.y) + 0.5,
    Math.max(Math.round(rect.width) - 1, 0),
    Math.max(Math.round(rect.height) - 1, 0),
  )
}
