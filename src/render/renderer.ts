export interface Renderer {
  setSize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void
  requestRender(): void
  dispose(): void
}
