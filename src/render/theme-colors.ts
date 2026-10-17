const FALLBACK_CANVAS_COLOR = '#1e1e1e'
const FALLBACK_PRIMARY_COLOR = '#0d99ff'

export interface ThemeColors {
  canvas: string
  primary: string
}

export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement)
  return {
    canvas: readToken(styles, '--color-canvas') ?? FALLBACK_CANVAS_COLOR,
    primary: readToken(styles, '--color-primary') ?? FALLBACK_PRIMARY_COLOR,
  }
}

function readToken(styles: CSSStyleDeclaration, token: string): string | null {
  const value = styles.getPropertyValue(token).trim()
  return value === '' ? null : value
}
