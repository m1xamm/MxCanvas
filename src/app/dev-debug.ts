import type { FrameInfo } from '../render/frame-state'
import { setFrameObserver } from '../render/frame-observer'
import { selectionStore } from '../interaction/selection'
import { history } from './editor'

const MAX_FRAMES = 4000

interface DevFrame extends FrameInfo {
  frame: number
  undoDepth: number
  redoDepth: number
}

interface DevHistoryDepth {
  undo: number
  redo: number
}

interface DevDebugApi {
  frames: DevFrame[]
  clear: () => void
  last: () => DevFrame | null
  selection: () => readonly string[]
  history: () => DevHistoryDepth
}

const frames: DevFrame[] = []
let frameIndex = 0

setFrameObserver((info) => {
  frameIndex += 1
  frames.push({
    ...info,
    frame: frameIndex,
    undoDepth: history.undoDepth,
    redoDepth: history.redoDepth,
  })
  if (frames.length > MAX_FRAMES) frames.splice(0, frames.length - MAX_FRAMES)
})

const api: DevDebugApi = {
  frames,
  clear() {
    frames.length = 0
    frameIndex = 0
  },
  last() {
    return frames.length > 0 ? frames[frames.length - 1]! : null
  },
  selection() {
    return selectionStore.get()
  },
  history() {
    return { undo: history.undoDepth, redo: history.redoDepth }
  },
}

declare global {
  interface Window {
    __mxDebug: DevDebugApi
  }
}

window.__mxDebug = api
