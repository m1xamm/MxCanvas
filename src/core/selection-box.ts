import type { Document } from './document/document'
import type { NodeId, SceneNodeUnion } from './document/types'
import type { NodeBoxChange } from './commands/node-box-change'
import { topLevelIds } from './commands/subtree'
import { boundsOfRects, mapRectWithBounds, type Rect } from './math/rect'
import { nodeBox, nodeWorldRect, worldRectToBox } from './transform'

export type SelectionField = 'x' | 'y' | 'width' | 'height'

export interface SelectionEntry {
  id: NodeId
  node: SceneNodeUnion
  rect: Rect
}

export const MIN_NODE_SIZE = 1

export function selectionEntries(document: Document, ids: readonly NodeId[]): SelectionEntry[] {
  const entries: SelectionEntry[] = []
  for (const id of topLevelIds(document, ids)) {
    const node = document.getNode(id)
    if (node) entries.push({ id, node, rect: nodeWorldRect(document, node) })
  }
  return entries
}

export function selectionRect(document: Document, ids: readonly NodeId[]): Rect | null {
  return boundsOfRects(selectionEntries(document, ids).map((entry) => entry.rect))
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
  const entries = selectionEntries(document, ids)
  return rectBoxChanges(
    document,
    entries,
    entries.map((entry) => mapRectWithBounds(entry.rect, source, target)),
  )
}

export function rectBoxChanges(
  document: Document,
  entries: readonly SelectionEntry[],
  targets: readonly Rect[],
): NodeBoxChange[] {
  const changes: NodeBoxChange[] = []
  entries.forEach((entry, index) => {
    const target = targets[index]
    if (!target) return
    changes.push({
      id: entry.id,
      from: nodeBox(entry.node),
      to: worldRectToBox(document, entry.node, target),
    })
  })
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
