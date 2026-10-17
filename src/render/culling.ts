import type { NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
import { rectsIntersect, transformRect, type Rect } from '../core/math/rect'

export function collectVisibleNodes(
  scene: SceneReader,
  bounds: Rect,
  out: SceneNodeUnion[],
): SceneNodeUnion[] {
  out.length = 0
  for (const rootId of scene.getRootChildren()) collectNode(scene, rootId, bounds, out)
  return out
}

function collectNode(scene: SceneReader, id: NodeId, bounds: Rect, out: SceneNodeUnion[]): void {
  const node = scene.getNode(id)
  if (!node || !node.visible) return
  const nodeBounds = transformRect(scene.getWorldTransform(id), {
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
  })
  if (rectsIntersect(nodeBounds, bounds)) out.push(node)
  for (const childId of node.children) collectNode(scene, childId, bounds, out)
}
