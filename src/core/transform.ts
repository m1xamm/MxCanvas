import type { SceneNodeUnion, SceneReader } from './document/types'
import { applyToPoint, invert, multiply, type Mat2D } from './math/matrix'
import { transformRect, type Rect } from './math/rect'

export interface NodeBox {
  transform: Mat2D
  width: number
  height: number
}

export function nodeBox(node: SceneNodeUnion): NodeBox {
  return { transform: node.transform, width: node.width, height: node.height }
}

export function nodeWorldRect(scene: SceneReader, node: SceneNodeUnion): Rect {
  return transformRect(scene.getWorldTransform(node.id), {
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
  })
}

export function boxWorldTransform(scene: SceneReader, node: SceneNodeUnion, box: NodeBox): Mat2D {
  return node.parentId === null
    ? box.transform
    : multiply(scene.getWorldTransform(node.parentId), box.transform)
}

export function worldRectToBox(scene: SceneReader, node: SceneNodeUnion, rect: Rect): NodeBox {
  const world = scene.getWorldTransform(node.id)
  const parent = node.parentId === null ? null : invert(scene.getWorldTransform(node.parentId))
  const origin = parent ? applyToPoint(parent, { x: rect.x, y: rect.y }) : { x: rect.x, y: rect.y }
  return {
    transform: { ...node.transform, e: origin.x, f: origin.y },
    width: unscaledSize(rect.width, Math.hypot(world.a, world.b)),
    height: unscaledSize(rect.height, Math.hypot(world.c, world.d)),
  }
}

function unscaledSize(size: number, scale: number): number {
  return scale === 0 ? size : size / scale
}
