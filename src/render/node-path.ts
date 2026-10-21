import type { SceneNodeUnion } from '../core/document/types'

const MAX_CORNER_RADIUS_FACTOR = 0.5

export function traceNodeRect(
  context: CanvasRenderingContext2D,
  node: SceneNodeUnion,
  width: number,
  height: number,
): void {
  const maxRadius = Math.min(width, height) * MAX_CORNER_RADIUS_FACTOR
  const radius = Math.max(0, Math.min(node.cornerRadius, maxRadius))
  context.beginPath()
  if (radius === 0) context.rect(0, 0, width, height)
  else context.roundRect(0, 0, width, height, radius)
}
