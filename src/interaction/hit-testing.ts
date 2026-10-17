import type { NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
import { applyToPoint, invert, type Vec2 } from '../core/math/matrix'

export function hitTest(scene: SceneReader, worldPoint: Vec2): SceneNodeUnion | null {
  const rootIds = scene.getRootChildren()
  for (let index = rootIds.length - 1; index >= 0; index -= 1) {
    const id = rootIds[index]
    if (!id) continue
    const hit = hitTestNode(scene, id, worldPoint)
    if (hit) return hit
  }
  return null
}

function hitTestNode(scene: SceneReader, id: NodeId, worldPoint: Vec2): SceneNodeUnion | null {
  const node = scene.getNode(id)
  if (!node || !node.visible) return null
  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    const childId = node.children[index]
    if (!childId) continue
    const hit = hitTestNode(scene, childId, worldPoint)
    if (hit) return hit
  }
  if (node.locked) return null
  return containsWorldPoint(scene, node, worldPoint) ? node : null
}

function containsWorldPoint(scene: SceneReader, node: SceneNodeUnion, worldPoint: Vec2): boolean {
  const inverse = invert(scene.getWorldTransform(node.id))
  if (!inverse) return false
  const local = applyToPoint(inverse, worldPoint)
  return local.x >= 0 && local.y >= 0 && local.x <= node.width && local.y <= node.height
}
