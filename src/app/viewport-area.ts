import type { Rect } from '../core/math/rect'

const FALLBACK_SIDEBAR_WIDTH = 240
const PANEL_WIDTH_TOKEN = '--panel-width'

export function readViewportArea(width: number, height: number): Rect {
  const sidebarWidth = readSidebarWidth()
  const freeWidth = width - sidebarWidth * 2
  if (freeWidth <= 0) return { x: 0, y: 0, width, height }
  return { x: sidebarWidth, y: 0, width: freeWidth, height }
}

function readSidebarWidth(): number {
  if (typeof document === 'undefined') return FALLBACK_SIDEBAR_WIDTH
  const styles = getComputedStyle(document.documentElement)
  const parsed = Number.parseFloat(styles.getPropertyValue(PANEL_WIDTH_TOKEN).trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_SIDEBAR_WIDTH
}
