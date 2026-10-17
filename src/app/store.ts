import { Store } from '../core/store'
import type { ToolId } from '../interaction/tools'

export interface AppState {
  tool: ToolId
  zoom: number
}

export const appStore = new Store<AppState>({ tool: 'move', zoom: 1 })

export function setTool(tool: ToolId): void {
  const state = appStore.get()
  if (state.tool === tool) return
  appStore.set({ ...state, tool })
}

export function setZoom(zoom: number): void {
  const state = appStore.get()
  if (state.zoom === zoom) return
  appStore.set({ ...state, zoom })
}
