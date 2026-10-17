const FALLBACK_CANVAS_COLOR = '#1e1e1e'
const FALLBACK_PRIMARY_COLOR = '#0d99ff'
const FALLBACK_ON_SURFACE_COLOR = '#ffffff'
const FALLBACK_ON_PRIMARY_COLOR = '#ffffff'
const FALLBACK_FONT_FAMILY = 'Inter, sans-serif'
const MARQUEE_FILL_ALPHA = 0.1

export interface ThemeColors {
  canvas: string
  primary: string
  onSurface: string
  onPrimary: string
  fontFamily: string
  marqueeFill: string
}

export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement)
  const primary = readToken(styles, '--color-primary') ?? FALLBACK_PRIMARY_COLOR
  return {
    canvas: readToken(styles, '--color-canvas') ?? FALLBACK_CANVAS_COLOR,
    primary,
    onSurface: readToken(styles, '--color-on-surface') ?? FALLBACK_ON_SURFACE_COLOR,
    onPrimary: readToken(styles, '--color-on-primary') ?? FALLBACK_ON_PRIMARY_COLOR,
    fontFamily: readToken(styles, '--font-family') ?? FALLBACK_FONT_FAMILY,
    marqueeFill: withAlpha(primary, MARQUEE_FILL_ALPHA),
  }
}

function readToken(styles: CSSStyleDeclaration, token: string): string | null {
  const value = styles.getPropertyValue(token).trim()
  return value === '' ? null : value
}

function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!match || !match[1]) return color
  const value = Number.parseInt(match[1], 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}
