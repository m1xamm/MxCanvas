import { Store } from '../core/store'
import {
  defaultGroupTools,
  groupOfTool,
  type ToolGroupId,
  type ToolId,
} from '../interaction/tools'

export interface AppState {
  tool: ToolId
  zoom: number
  lastToolByGroup: Record<ToolGroupId, ToolId>
}

export const appStore = new Store<AppState>({
  tool: 'move',
  zoom: 1,
  lastToolByGroup: defaultGroupTools(),
})

export function setTool(tool: ToolId): void {
  const state = appStore.get()
  const group = groupOfTool(tool)
  if (state.tool === tool && state.lastToolByGroup[group] === tool) return
  appStore.set({
    ...state,
    tool,
    lastToolByGroup: { ...state.lastToolByGroup, [group]: tool },
  })
}

export function setZoom(zoom: number): void {
  const state = appStore.get()
  if (state.zoom === zoom) return
  appStore.set({ ...state, zoom })
}
