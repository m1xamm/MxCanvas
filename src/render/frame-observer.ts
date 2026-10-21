import type { FrameInfo } from './frame-state'

type FrameObserver = (info: FrameInfo) => void

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

export function publishFrame(info: FrameInfo): void {
  if (!import.meta.env.DEV) return
  host.__mxFrameObserver?.(info)
}
