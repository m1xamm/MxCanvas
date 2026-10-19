import { Store } from '../core/store'

const CANVAS_GRID_STORAGE_KEY = 'mxcanvas.canvasGrid'
const CANVAS_GRID_DEFAULT = true
const PIXEL_GRID_STORAGE_KEY = 'mxcanvas.pixelGrid'
const PIXEL_GRID_DEFAULT = true
const PIXEL_SNAP_STORAGE_KEY = 'mxcanvas.pixelSnap'
const PIXEL_SNAP_DEFAULT = true
const OBJECT_SNAP_STORAGE_KEY = 'mxcanvas.objectSnap'
const OBJECT_SNAP_DEFAULT = true

export const canvasGridStore = new Store<boolean>(readStoredCanvasGrid())
export const pixelGridStore = new Store<boolean>(readStoredPixelGrid())
export const pixelSnapStore = new Store<boolean>(readStoredPixelSnap())
export const objectSnapStore = new Store<boolean>(readStoredObjectSnap())

export function isCanvasGridVisible(): boolean {
  return canvasGridStore.get()
}

export function setCanvasGridVisible(visible: boolean): void {
  if (canvasGridStore.get() === visible) return
  canvasGridStore.set(visible)
  storeFlag(CANVAS_GRID_STORAGE_KEY, visible)
}

export function subscribeCanvasGrid(listener: () => void): () => void {
  return canvasGridStore.subscribe(() => listener())
}

export function isPixelGridVisible(): boolean {
  return pixelGridStore.get()
}

export function setPixelGridVisible(visible: boolean): void {
  if (pixelGridStore.get() === visible) return
  pixelGridStore.set(visible)
  storeFlag(PIXEL_GRID_STORAGE_KEY, visible)
}

export function togglePixelGridVisible(): void {
  setPixelGridVisible(!pixelGridStore.get())
}

export function subscribePixelGrid(listener: () => void): () => void {
  return pixelGridStore.subscribe(() => listener())
}

export function isPixelSnapEnabled(): boolean {
  return pixelSnapStore.get()
}

export function setPixelSnapEnabled(enabled: boolean): void {
  if (pixelSnapStore.get() === enabled) return
  pixelSnapStore.set(enabled)
  storeFlag(PIXEL_SNAP_STORAGE_KEY, enabled)
}

export function togglePixelSnap(): void {
  setPixelSnapEnabled(!pixelSnapStore.get())
}

export function isObjectSnapEnabled(): boolean {
  return objectSnapStore.get()
}

export function setObjectSnapEnabled(enabled: boolean): void {
  if (objectSnapStore.get() === enabled) return
  objectSnapStore.set(enabled)
  storeFlag(OBJECT_SNAP_STORAGE_KEY, enabled)
}

function readStoredCanvasGrid(): boolean {
  return readStoredFlag(CANVAS_GRID_STORAGE_KEY, CANVAS_GRID_DEFAULT)
}

function readStoredPixelGrid(): boolean {
  return readStoredFlag(PIXEL_GRID_STORAGE_KEY, PIXEL_GRID_DEFAULT)
}

function readStoredPixelSnap(): boolean {
  return readStoredFlag(PIXEL_SNAP_STORAGE_KEY, PIXEL_SNAP_DEFAULT)
}

function readStoredObjectSnap(): boolean {
  return readStoredFlag(OBJECT_SNAP_STORAGE_KEY, OBJECT_SNAP_DEFAULT)
}

function readStoredFlag(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback
  const stored = localStorage.getItem(key)
  if (stored === 'on') return true
  if (stored === 'off') return false
  return fallback
}

function storeFlag(key: string, visible: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, visible ? 'on' : 'off')
}
