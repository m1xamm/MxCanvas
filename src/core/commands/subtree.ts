import type { Document } from '../document/document'
import type { NodeId, SceneNodeUnion } from '../document/types'

export interface SubtreeEntry {
  node: SceneNodeUnion
  parentId: NodeId | null
  index: number
}

export function topLevelIds(document: Document, ids: readonly NodeId[]): readonly NodeId[] {
  const wanted = new Set(ids)
  const seen = new Set<NodeId>()
  const result: NodeId[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    if (hasSelectedAncestor(document, id, wanted)) continue
    result.push(id)
  }
  return result
}

export function collectSubtrees(document: Document, ids: readonly NodeId[]): SubtreeEntry[] {
  const entries: SubtreeEntry[] = []
  for (const id of topLevelIds(document, ids)) collectEntry(document, id, entries)
  return entries
}

function collectEntry(document: Document, id: NodeId, out: SubtreeEntry[]): void {
  const node = document.getNode(id)
  if (!node) return
  out.push({ node, parentId: node.parentId, index: siblingIndex(document, node) })
  for (const childId of node.children) collectEntry(document, childId, out)
}

function siblingIndex(document: Document, node: SceneNodeUnion): number {
  const siblings =
    node.parentId === null
      ? document.getRootChildren()
      : document.getNode(node.parentId)?.children
  return siblings ? siblings.indexOf(node.id) : 0
}

function hasSelectedAncestor(
  document: Document,
  id: NodeId,
  wanted: ReadonlySet<NodeId>,
): boolean {
  let parentId = document.getNode(id)?.parentId ?? null
  while (parentId !== null) {
    const parent = document.getNode(parentId)
    if (!parent) return false
    if (wanted.has(parentId)) return true
    parentId = parent.parentId
  }
  return false
}
