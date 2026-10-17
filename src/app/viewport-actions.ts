export interface ViewportActions {
  zoomIn(): void
  zoomOut(): void
  zoomReset(): void
  zoomToFit(): void
  zoomToSelection(): void
}

let current: ViewportActions | null = null

export function setViewportActions(actions: ViewportActions | null): void {
  current = actions
}

export function viewportActions(): ViewportActions | null {
  return current
}
