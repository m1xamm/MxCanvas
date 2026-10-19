const FALLBACK_FONT_FAMILY = 'Inter, sans-serif'
const MARQUEE_FILL_ALPHA = 0.1

export interface ThemeColors {
  canvas: string
  canvasGridDot: string
  canvasPixelGrid: string
  primary: string
  onSurface: string
  onPrimary: string
  guide: string
  fontFamily: string
  marqueeFill: string
}

export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement)
  const primary = readToken(styles, '--color-primary')
  return {
    canvas: readToken(styles, '--color-canvas'),
    canvasGridDot: readToken(styles, '--color-canvas-grid-dot'),
    canvasPixelGrid: readToken(styles, '--color-canvas-pixel-grid'),
    primary,
    onSurface: readToken(styles, '--color-on-surface'),
    onPrimary: readToken(styles, '--color-on-primary'),
    guide: readToken(styles, '--color-guide'),
    fontFamily: readToken(styles, '--font-family') || FALLBACK_FONT_FAMILY,
    marqueeFill: withAlpha(primary, MARQUEE_FILL_ALPHA),
  }
}

export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!match || !match[1]) return color
  const value = Number.parseInt(match[1], 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

function readToken(styles: CSSStyleDeclaration, token: string): string {
  return styles.getPropertyValue(token).trim()
}
