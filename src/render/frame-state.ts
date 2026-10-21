import type { NodeId, SceneReader } from '../core/document/types'
import type { Vec2 } from '../core/math/matrix'
import { transformRect, type Rect } from '../core/math/rect'
import type { SnapGuide } from '../core/snap'
import { boxWorldTransform, type NodeBox } from '../core/transform'
import type { ResizeHandleId } from '../interaction/resize'

export interface FrameNodeBox {
  id: NodeId
  rect: Rect
}

export interface FrameViewport {
  x: number
  y: number
  zoom: number
}

export interface FrameState {
  time: number
  duration: number
  drawnNodes: number
  selection: readonly NodeId[]
  hoveredId: NodeId | null
  hoveredHandle: ResizeHandleId | null
  marquee: Rect | null
  previews: ReadonlyMap<NodeId, NodeBox>
  selectionBounds: Rect | null
  draft: Rect | null
  snapGuides: readonly SnapGuide[]
  pointer: Vec2 | null
  viewport: FrameViewport
}

export interface FrameInfo {
  time: number
  duration: number
  drawnNodes: number
  selection: readonly NodeId[]
  hoveredId: NodeId | null
  hoveredHandle: ResizeHandleId | null
  marquee: Rect | null
  selectionBounds: Rect | null
  draft: Rect | null
  snapGuides: readonly SnapGuide[]
  pointer: Vec2 | null
  viewport: FrameViewport
  selectedBoxes: readonly FrameNodeBox[]
}

export interface FrameInfoOptions {
  selectedBoxes?: boolean
}

export function frameInfoOf(
  scene: SceneReader,
  state: FrameState,
  options: FrameInfoOptions = {},
): FrameInfo {
  const recordBoxes = options.selectedBoxes ?? true
  return {
    time: state.time,
    duration: state.duration,
    drawnNodes: state.drawnNodes,
    selection: [...state.selection],
    hoveredId: state.hoveredId,
    hoveredHandle: state.hoveredHandle,
    marquee: copyRect(state.marquee),
    selectionBounds: copyRect(state.selectionBounds),
    draft: copyRect(state.draft),
    snapGuides: state.snapGuides.map(copyGuide),
    pointer: state.pointer ? { ...state.pointer } : null,
    viewport: { ...state.viewport },
    selectedBoxes: recordBoxes
      ? selectedBoxesOf(scene, state).map((box) => ({
          id: box.id,
          rect: { ...box.rect },
        }))
      : [],
  }
}

export function selectedBoxesOf(scene: SceneReader, state: FrameState): FrameNodeBox[] {
  const boxes: FrameNodeBox[] = []
  for (const id of state.selection) {
    const node = scene.getNode(id)
    if (!node || !node.visible) continue
    const preview = state.previews.get(id)
    const box = preview ?? node
    const transform = preview
      ? boxWorldTransform(scene, node, preview)
      : scene.getWorldTransform(id)
    boxes.push({
      id,
      rect: transformRect(transform, { x: 0, y: 0, width: box.width, height: box.height }),
    })
  }
  return boxes
}

function copyRect(rect: Rect | null): Rect | null {
  return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
}

function copyGuide(guide: SnapGuide): SnapGuide {
  return {
    axis: guide.axis,
    position: guide.position,
    from: guide.from,
    to: guide.to,
  }
}
