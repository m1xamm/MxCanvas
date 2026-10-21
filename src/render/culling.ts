import type { NodeId, SceneNodeUnion, SceneReader } from '../core/document/types'
import type { Mat2D } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'

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
  if (intersectsBounds(scene.getWorldTransform(id), node.width, node.height, bounds)) out.push(node)
  for (const childId of node.children) collectNode(scene, childId, bounds, out)
}

function intersectsBounds(matrix: Mat2D, width: number, height: number, bounds: Rect): boolean {
  const offsetX = matrix.c * height
  const offsetY = matrix.d * height
  const rightX = matrix.a * width
  const rightY = matrix.b * width
  const minX = Math.min(matrix.e, matrix.e + rightX, matrix.e + rightX + offsetX, matrix.e + offsetX)
  const maxX = Math.max(matrix.e, matrix.e + rightX, matrix.e + rightX + offsetX, matrix.e + offsetX)
  const minY = Math.min(matrix.f, matrix.f + rightY, matrix.f + rightY + offsetY, matrix.f + offsetY)
  const maxY = Math.max(matrix.f, matrix.f + rightY, matrix.f + rightY + offsetY, matrix.f + offsetY)
  return (
    minX < bounds.x + bounds.width &&
    bounds.x < maxX &&
    minY < bounds.y + bounds.height &&
    bounds.y < maxY
  )
}
