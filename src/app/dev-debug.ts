import type { FrameInfo } from '../render/frame-state'
import { frameInfoOf } from '../render/frame-state'
import { setFrameObserver } from '../render/frame-observer'
import { selectionStore } from '../interaction/selection'
import type { NodeId, SceneNodeUnion } from '../core/document/types'
import { history, scene } from './editor'

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

interface DevNodeSummary {
  id: NodeId
  name: string
  x: number
  y: number
  width: number
  height: number
  cornerRadius: number
  visible: boolean
  locked: boolean
  fills: number
  strokes: number
  strokeWeight: number
  strokeAlign: string
  effects: number
}

interface DevDebugApi {
  frames: DevFrame[]
  clear: () => void
  last: () => DevFrame | null
  selection: () => readonly string[]
  history: () => DevHistoryDepth
  nodes: () => DevNodeSummary[]
  setBoxRecording: (enabled: boolean) => void
}

const frames: DevFrame[] = []
let frameIndex = 0
let recordBoxes = true

setFrameObserver((state, scene) => {
  frameIndex += 1
  frames.push({
    ...frameInfoOf(scene, state, { selectedBoxes: recordBoxes }),
    frame: frameIndex,
    undoDepth: history.undoDepth,
    redoDepth: history.redoDepth,
  })
  if (frames.length > MAX_FRAMES) frames.splice(0, frames.length - MAX_FRAMES)
})

function nodeSummaries(): DevNodeSummary[] {
  const summaries: DevNodeSummary[] = []
  const visit = (node: SceneNodeUnion) => {
    summaries.push({
      id: node.id,
      name: node.name,
      x: node.transform.e,
      y: node.transform.f,
      width: node.width,
      height: node.height,
      cornerRadius: node.cornerRadius,
      visible: node.visible,
      locked: node.locked,
      fills: node.fills.length,
      strokes: node.strokes.length,
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,
      effects: node.effects.length,
    })
    for (const childId of node.children) {
      const child = scene.getNode(childId)
      if (child) visit(child)
    }
  }
  for (const rootId of scene.getRootChildren()) {
    const node = scene.getNode(rootId)
    if (node) visit(node)
  }
  return summaries
}

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
  nodes: nodeSummaries,
  setBoxRecording(enabled: boolean) {
    recordBoxes = enabled
  },
}

declare global {
  interface Window {
    __mxDebug: DevDebugApi
  }
}

window.__mxDebug = api
