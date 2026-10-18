import { Store } from '../core/store'

const CANVAS_GRID_STORAGE_KEY = 'mxcanvas.canvasGrid'
const CANVAS_GRID_DEFAULT = true

export const canvasGridStore = new Store<boolean>(readStoredCanvasGrid())

export function isCanvasGridVisible(): boolean {
  return canvasGridStore.get()
}

export function setCanvasGridVisible(visible: boolean): void {
  if (canvasGridStore.get() === visible) return
  canvasGridStore.set(visible)
  storeCanvasGrid(visible)
}

export function subscribeCanvasGrid(listener: () => void): () => void {
  return canvasGridStore.subscribe(() => listener())
}

function readStoredCanvasGrid(): boolean {
  if (typeof localStorage === 'undefined') return CANVAS_GRID_DEFAULT
  const stored = localStorage.getItem(CANVAS_GRID_STORAGE_KEY)
  if (stored === 'on') return true
  if (stored === 'off') return false
  return CANVAS_GRID_DEFAULT
}

function storeCanvasGrid(visible: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CANVAS_GRID_STORAGE_KEY, visible ? 'on' : 'off')
}
