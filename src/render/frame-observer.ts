import type { SceneReader } from '../core/document/types'
import type { FrameState } from './frame-state'

type FrameObserver = (state: FrameState, scene: SceneReader) => void

interface FrameObserverHost {
  __mxFrameObserver?: FrameObserver
}

const host = globalThis as FrameObserverHost

export function setFrameObserver(observer: FrameObserver | null): void {
  host.__mxFrameObserver = observer ?? undefined
}

export function hasFrameObserver(): boolean {
  return host.__mxFrameObserver !== undefined
}

export function publishFrame(state: FrameState, scene: SceneReader): void {
  if (!import.meta.env.DEV) return
  host.__mxFrameObserver?.(state, scene)
}
