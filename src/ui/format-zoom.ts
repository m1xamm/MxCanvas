const PERCENT = 100

export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * PERCENT)}%`
}
