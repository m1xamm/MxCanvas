import type { Document } from './document/document'
import type { NodeId, SceneNodeUnion } from './document/types'
import type { NodeBoxChange } from './commands/node-box-change'
import { topLevelIds } from './commands/subtree'
import { boundsOfRects, mapRectWithBounds, type Rect } from './math/rect'
import { nodeBox, nodeWorldRect, worldRectToBox } from './transform'

export type SelectionField = 'x' | 'y' | 'width' | 'height'

export const MIN_NODE_SIZE = 1

export function selectionRect(document: Document, ids: readonly NodeId[]): Rect | null {
  const rects: Rect[] = []
  for (const id of topLevelIds(document, ids)) {
    const node = document.getNode(id)
    if (node) rects.push(nodeWorldRect(document, node))
  }
  return boundsOfRects(rects)
}

export function targetRect(
  rect: Rect,
  field: SelectionField,
  value: number,
  proportional: boolean,
): Rect {
  if (field === 'x') return { ...rect, x: value }
  if (field === 'y') return { ...rect, y: value }
  if (field === 'width') {
    const width = Math.max(value, MIN_NODE_SIZE)
    const height = proportional ? proportionalSize(width, rect.width, rect.height) : rect.height
    return { ...rect, width, height }
  }
  const height = Math.max(value, MIN_NODE_SIZE)
  const width = proportional ? proportionalSize(height, rect.height, rect.width) : rect.width
  return { ...rect, width, height }
}

export function selectionBoxChanges(
  document: Document,
  ids: readonly NodeId[],
  target: Rect,
): NodeBoxChange[] {
  const source = selectionRect(document, ids)
  if (!source || (source.width === 0 && source.height === 0)) return []
  const changes: NodeBoxChange[] = []
  for (const id of topLevelIds(document, ids)) {
    const node = document.getNode(id)
    if (!node) continue
    changes.push({
      id,
      from: nodeBox(node),
      to: worldRectToBox(document, node, mapRectWithBounds(nodeWorldRect(document, node), source, target)),
    })
  }
  return changes
}

export function selectionNodes(document: Document, ids: readonly NodeId[]): SceneNodeUnion[] {
  const nodes: SceneNodeUnion[] = []
  for (const id of ids) {
    const node = document.getNode(id)
    if (node) nodes.push(node)
  }
  return nodes
}

export function selectionConstrained(nodes: readonly SceneNodeUnion[]): boolean {
  return nodes.length > 0 && nodes.every((node) => node.constrainProportions)
}

function proportionalSize(size: number, base: number, other: number): number {
  if (base === 0) return other
  return Math.max((size * other) / base, MIN_NODE_SIZE)
}
