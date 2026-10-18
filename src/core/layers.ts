import type { Document } from './document/document'
import type { NodeId } from './document/types'

export const LAYER_ROW_HEIGHT = 32
export const LAYER_ROW_GAP = 2
export const LAYER_ROW_PITCH = LAYER_ROW_HEIGHT + LAYER_ROW_GAP
export const LAYER_OVERSCAN = 4

export type LayerOrderMode = 'forward' | 'backward' | 'front' | 'back'

export interface LayerMove {
  id: NodeId
  toIndex: number
}

export interface LayerClickInput {
  order: readonly NodeId[]
  id: NodeId
  selection: readonly NodeId[]
  anchor: NodeId | null
  toggle: boolean
  range: boolean
}

export interface LayerClickResult {
  selection: readonly NodeId[]
  anchor: NodeId | null
}

export interface VirtualWindowInput {
  scrollTop: number
  viewportHeight: number
  rowCount: number
  overscan?: number
}

export interface VirtualWindow {
  start: number
  end: number
}

export interface SiblingGroup {
  siblings: readonly NodeId[]
  selected: NodeId[]
}

export function displayOrder(rootChildren: readonly NodeId[]): NodeId[] {
  return [...rootChildren].reverse()
}

export function selectionRange(
  order: readonly NodeId[],
  anchorId: NodeId,
  targetId: NodeId,
): NodeId[] {
  const target = order.indexOf(targetId)
  if (target === -1) return []
  const anchor = order.indexOf(anchorId)
  if (anchor === -1) return [targetId]
  return order.slice(Math.min(anchor, target), Math.max(anchor, target) + 1)
}

export function layerClick(input: LayerClickInput): LayerClickResult {
  if (input.range && input.anchor !== null) {
    const range = selectionRange(input.order, input.anchor, input.id)
    if (range.length > 0) return { selection: range, anchor: input.anchor }
  }
  if (input.toggle) {
    return { selection: toggledSelection(input.selection, input.id), anchor: input.id }
  }
  return { selection: [input.id], anchor: input.id }
}

export function virtualWindow(input: VirtualWindowInput): VirtualWindow {
  const { scrollTop, viewportHeight, rowCount } = input
  const overscan = input.overscan ?? LAYER_OVERSCAN
  if (rowCount <= 0) return { start: 0, end: 0 }
  const start = clamp(Math.floor(scrollTop / LAYER_ROW_PITCH) - overscan, 0, rowCount)
  const end = clamp(
    Math.ceil((scrollTop + viewportHeight) / LAYER_ROW_PITCH) + overscan,
    start,
    rowCount,
  )
  return { start, end }
}

export function layerListHeight(rowCount: number): number {
  return rowCount <= 0 ? 0 : rowCount * LAYER_ROW_PITCH - LAYER_ROW_GAP
}

export function rowOffset(index: number): number {
  return index * LAYER_ROW_PITCH
}

export function revealRow(
  scrollTop: number,
  viewportHeight: number,
  index: number,
): number | null {
  const top = rowOffset(index)
  if (top < scrollTop) return top
  const bottom = top + LAYER_ROW_HEIGHT
  if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight
  return null
}

export function dropBoundary(contentY: number, rowCount: number): number {
  if (rowCount <= 0) return 0
  return clamp(Math.round(contentY / LAYER_ROW_PITCH), 0, rowCount)
}

export function reorderIds(order: readonly NodeId[], from: number, insertAt: number): NodeId[] {
  const result = [...order]
  if (from < 0 || from >= result.length) return result
  const moved = result.splice(from, 1)[0]
  if (moved === undefined) return result
  const target = insertAt > from ? insertAt - 1 : insertAt
  result.splice(clamp(target, 0, result.length), 0, moved)
  return result
}

export function reorderTargetIndex(
  displayIds: readonly NodeId[],
  id: NodeId,
  boundary: number,
): number {
  const from = displayIds.indexOf(id)
  if (from === -1) return -1
  const next = reorderIds(displayIds, from, boundary)
  const index = next.indexOf(id)
  return index === -1 ? -1 : next.length - 1 - index
}

export function planLayerReorder(
  siblings: readonly NodeId[],
  selected: readonly NodeId[],
  mode: LayerOrderMode,
): LayerMove[] {
  const chosen = new Set(selected)
  const ordered = siblings.filter((id) => chosen.has(id))
  if (ordered.length === 0) return []
  const working = [...siblings]
  if (mode === 'front') return planEdgeMoves(working, ordered, working.length - 1)
  if (mode === 'back') return planEdgeMoves(working, [...ordered].reverse(), 0)
  const stepOrder = mode === 'forward' ? [...ordered].reverse() : ordered
  return planStepMoves(working, stepOrder, mode === 'forward' ? 1 : -1, chosen)
}

export function siblingGroups(document: Document, ids: readonly NodeId[]): SiblingGroup[] {
  const groups = new Map<string, SiblingGroup>()
  for (const id of ids) {
    const node = document.getNode(id)
    if (!node) continue
    const group = groups.get(node.parentId ?? '')
    if (group) {
      group.selected.push(id)
      continue
    }
    groups.set(node.parentId ?? '', { siblings: document.getSiblingIds(id), selected: [id] })
  }
  return [...groups.values()]
}

function planEdgeMoves(
  working: NodeId[],
  ordered: readonly NodeId[],
  toIndex: number,
): LayerMove[] {
  const moves: LayerMove[] = []
  for (const id of ordered) {
    const index = working.indexOf(id)
    if (index === -1 || index === toIndex) continue
    working.splice(index, 1)
    working.splice(toIndex, 0, id)
    moves.push({ id, toIndex })
  }
  return moves
}

function planStepMoves(
  working: NodeId[],
  ordered: readonly NodeId[],
  step: number,
  chosen: ReadonlySet<NodeId>,
): LayerMove[] {
  const moves: LayerMove[] = []
  for (const id of ordered) {
    const index = working.indexOf(id)
    if (index === -1) continue
    const target = index + step
    if (target < 0 || target >= working.length) continue
    const neighbour = working[target]
    if (neighbour !== undefined && chosen.has(neighbour)) continue
    working.splice(index, 1)
    working.splice(target, 0, id)
    moves.push({ id, toIndex: target })
  }
  return moves
}

function toggledSelection(selection: readonly NodeId[], id: NodeId): readonly NodeId[] {
  return selection.includes(id)
    ? selection.filter((current) => current !== id)
    : [...selection, id]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
