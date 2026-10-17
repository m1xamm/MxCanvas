import type { SceneNodeUnion, SceneReader } from './document/types'
import { transformRect, type Rect } from './math/rect'

export function nodeWorldRect(scene: SceneReader, node: SceneNodeUnion): Rect {
  return transformRect(scene.getWorldTransform(node.id), {
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
  })
}
