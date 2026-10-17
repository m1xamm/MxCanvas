import type { ToolId } from '../interaction/tools'

export interface AppState {
  tool: ToolId
  zoom: number
}

type Listener<T> = (value: T) => void

export class Store<T> {
  #value: T
  #listeners = new Set<Listener<T>>()

  constructor(initialValue: T) {
    this.#value = initialValue
  }

  get(): T {
    return this.#value
  }

  set(value: T): void {
    if (value === this.#value) return
    this.#value = value
    for (const listener of this.#listeners) listener(value)
  }

  subscribe(listener: Listener<T>): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
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
