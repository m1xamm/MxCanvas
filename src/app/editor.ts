import { DeleteNodesCommand } from '../core/commands/delete-nodes-command'
import { alignRects, distributeRects, type AlignMode, type DistributeMode } from '../core/align'
import { MoveNodesCommand } from '../core/commands/move-nodes-command'
import { RenameNodeCommand } from '../core/commands/rename-node-command'
import { ReorderNodesCommand } from '../core/commands/reorder-nodes-command'
import { ResizeNodesCommand } from '../core/commands/resize-nodes-command'
import { SetConstrainProportionsCommand } from '../core/commands/set-constrain-proportions-command'
import { SetCornerRadiusCommand } from '../core/commands/set-corner-radius-command'
import { SetFillsCommand } from '../core/commands/set-fills-command'
import { SetNodeLockedCommand } from '../core/commands/set-node-locked-command'
import { SetNodeVisibleCommand } from '../core/commands/set-node-visible-command'
import { SetOpacityCommand } from '../core/commands/set-opacity-command'
import { SetStrokeWeightCommand } from '../core/commands/set-stroke-weight-command'
import { SetStrokesCommand } from '../core/commands/set-strokes-command'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import { clamp01, clonePaint, clonePaints } from '../core/color'
import { createRectangleNode, DEFAULT_FILL, DEFAULT_STROKE } from '../core/document/create-node'
import { Document } from '../core/document/document'
import type { NodeId, Paint, RectangleNode, RgbColor, SceneNodeUnion } from '../core/document/types'
import { paintIndexForRow } from '../core/paints'
import { planLayerReorder, siblingGroups, type LayerMove, type LayerOrderMode } from '../core/layers'
import type { Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
import { History } from '../core/history'
import {
  rectBoxChanges,
  selectionBoxChanges,
  selectionConstrained,
  selectionEntries,
  selectionNodes,
  selectionRect,
  targetRect,
  type SelectionEntry,
  type SelectionField,
} from '../core/selection-box'
import { pruneSelection, selectionStore, setSelection } from '../interaction/selection'
import { t } from '../i18n/i18n'

export const scene = new Document()
export const history = new History()

history.subscribe(() => {
  pruneSelection((id) => scene.getNode(id) !== undefined)
})

let rectangleCount = 0

export function moveSelection(delta: Vec2): void {
  const ids = selectionStore.get()
  if (ids.length === 0 || (delta.x === 0 && delta.y === 0)) return
  history.execute(new MoveNodesCommand(scene, ids, delta))
}

export function nudgeSelection(delta: Vec2): void {
  const ids = selectionStore.get()
  if (ids.length === 0 || (delta.x === 0 && delta.y === 0)) return
  history.execute(new MoveNodesCommand(scene, ids, delta, { mergeable: true }))
}

export function resizeSelection(changes: readonly NodeBoxChange[]): void {
  if (changes.length === 0) return
  history.execute(new ResizeNodesCommand(scene, changes))
}

export function alignSelection(mode: AlignMode): void {
  applySelectionRects((entries) => alignRects(entries.map((entry) => entry.rect), mode))
}

export function distributeSelection(mode: DistributeMode): void {
  applySelectionRects((entries) => distributeRects(entries.map((entry) => entry.rect), mode))
}

function applySelectionRects(compute: (entries: readonly SelectionEntry[]) => Rect[]): void {
  const entries = selectionEntries(scene, selectionStore.get())
  if (entries.length < 2) return
  const changes = rectBoxChanges(scene, entries, compute(entries))
  if (changes.length > 0) history.execute(new ResizeNodesCommand(scene, changes))
}

export function setSelectionField(field: SelectionField, value: number, live = false): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const rect = selectionRect(scene, ids)
  if (!rect) return
  const proportional = selectionConstrained(selectionNodes(scene, ids))
  const changes = selectionBoxChanges(scene, ids, targetRect(rect, field, value, proportional))
  if (changes.length === 0) return
  history.execute(new ResizeNodesCommand(scene, changes, { mergeable: live }))
}

export function setSelectionOpacity(percent: number, live = false): void {
  const command = SetOpacityCommand.forNodes(scene, selectionStore.get(), percent / 100, {
    mergeable: live,
  })
  if (command) history.execute(command)
}

export function setSelectionCornerRadius(radius: number, live = false): void {
  const command = SetCornerRadiusCommand.forNodes(scene, selectionStore.get(), radius, {
    mergeable: live,
  })
  if (command) history.execute(command)
}

export function setSelectionConstrainProportions(value: boolean): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  if (selectionNodes(scene, ids).every((node) => node.constrainProportions === value)) return
  history.execute(new SetConstrainProportionsCommand(scene, ids, value))
}

export function addSelectionFill(): void {
  applySelectionPaints('fills', (node) => [...clonePaints(node.fills), clonePaint(DEFAULT_FILL)])
}

export function removeSelectionFill(row: number): void {
  applySelectionPaints('fills', (node) => removePaintAt(node.fills, row))
}

export function setSelectionFillColor(row: number, color: RgbColor, live = false): void {
  applySelectionPaints('fills', (node) => updatePaintAt(node.fills, row, (paint) => ({ ...paint, color })), live)
}

export function setSelectionFillOpacity(row: number, opacity: number, live = false): void {
  applySelectionPaints(
    'fills',
    (node) => updatePaintAt(node.fills, row, (paint) => ({ ...paint, opacity: clamp01(opacity) })),
    live,
  )
}

export function setSelectionFillVisible(row: number, visible: boolean): void {
  applySelectionPaints('fills', (node) => updatePaintAt(node.fills, row, (paint) => ({ ...paint, visible })))
}

export function addSelectionStroke(): void {
  applySelectionPaints('strokes', (node) => [...clonePaints(node.strokes), clonePaint(DEFAULT_STROKE)])
}

export function removeSelectionStroke(row: number): void {
  applySelectionPaints('strokes', (node) => removePaintAt(node.strokes, row))
}

export function setSelectionStrokeColor(row: number, color: RgbColor, live = false): void {
  applySelectionPaints('strokes', (node) => updatePaintAt(node.strokes, row, (paint) => ({ ...paint, color })), live)
}

export function setSelectionStrokeOpacity(row: number, opacity: number, live = false): void {
  applySelectionPaints(
    'strokes',
    (node) => updatePaintAt(node.strokes, row, (paint) => ({ ...paint, opacity: clamp01(opacity) })),
    live,
  )
}

export function setSelectionStrokeVisible(row: number, visible: boolean): void {
  applySelectionPaints('strokes', (node) => updatePaintAt(node.strokes, row, (paint) => ({ ...paint, visible })))
}

export function setSelectionStrokeWeight(weight: number, live = false): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const command = SetStrokeWeightCommand.forNodes(scene, ids, weight, { mergeable: live })
  if (command) history.execute(command)
}

type PaintField = 'fills' | 'strokes'

function applySelectionPaints(
  field: PaintField,
  update: (node: SceneNodeUnion) => Paint[],
  live = false,
): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const command =
    field === 'fills'
      ? SetFillsCommand.forNodes(scene, ids, update, { mergeable: live })
      : SetStrokesCommand.forNodes(scene, ids, update, { mergeable: live })
  if (command) history.execute(command)
}

function removePaintAt(paints: readonly Paint[], row: number): Paint[] {
  const index = paintIndexForRow(paints.length, row)
  return paints.filter((_paint, at) => at !== index).map(clonePaint)
}

function updatePaintAt(paints: readonly Paint[], row: number, update: (paint: Paint) => Paint): Paint[] {
  const index = paintIndexForRow(paints.length, row)
  return paints.map((paint, at) => (at === index ? update(clonePaint(paint)) : clonePaint(paint)))
}

export function deleteSelection(): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  history.execute(new DeleteNodesCommand(scene, ids))
}

export function createRectangle(bounds: Rect): RectangleNode {
  rectangleCount += 1
  return createRectangleNode({
    id: crypto.randomUUID(),
    name: `${t('shapes.rectangle')} ${rectangleCount}`,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  })
}

export function renameNode(id: NodeId, name: string): void {
  const node = scene.getNode(id)
  if (!node) return
  const trimmed = name.trim()
  if (trimmed === '' || trimmed === node.name) return
  history.execute(new RenameNodeCommand(scene, id, trimmed))
}

export function setNodeVisible(id: NodeId, visible: boolean): void {
  const node = scene.getNode(id)
  if (!node || node.visible === visible) return
  history.execute(new SetNodeVisibleCommand(scene, [id], visible))
  if (!visible) {
    setSelection(selectionStore.get().filter((current) => current !== id))
  }
}

export function setNodeLocked(id: NodeId, locked: boolean): void {
  const node = scene.getNode(id)
  if (!node || node.locked === locked) return
  history.execute(new SetNodeLockedCommand(scene, [id], locked))
}

export function toggleSelectionVisible(): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const visible = !allNodes(ids).every((node) => node.visible)
  history.execute(new SetNodeVisibleCommand(scene, ids, visible))
  if (!visible) setSelection([])
}

export function toggleSelectionLocked(): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const locked = !allNodes(ids).every((node) => node.locked)
  history.execute(new SetNodeLockedCommand(scene, ids, locked))
}

export function reorderNode(id: NodeId, toIndex: number): void {
  if (!scene.getNode(id)) return
  if (scene.getSiblingIds(id).indexOf(id) === toIndex) return
  history.execute(new ReorderNodesCommand(scene, [{ id, toIndex }]))
}

export function reorderSelection(mode: LayerOrderMode): void {
  const ids = selectionStore.get()
  if (ids.length === 0) return
  const moves: LayerMove[] = []
  for (const group of siblingGroups(scene, ids)) {
    moves.push(...planLayerReorder(group.siblings, group.selected, mode))
  }
  if (moves.length === 0) return
  history.execute(new ReorderNodesCommand(scene, moves))
}

function allNodes(ids: readonly NodeId[]): readonly SceneNodeUnion[] {
  const nodes: SceneNodeUnion[] = []
  for (const id of ids) {
    const node = scene.getNode(id)
    if (node) nodes.push(node)
  }
  return nodes
}
