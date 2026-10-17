import { MoveNodesCommand } from '../core/commands/move-nodes-command'
import { ResizeNodesCommand } from '../core/commands/resize-nodes-command'
import type { NodeBoxChange } from '../core/commands/node-box-change'
import { createRectangleNode } from '../core/document/create-node'
import { Document } from '../core/document/document'
import type { RectangleNode } from '../core/document/types'
import type { Vec2 } from '../core/math/matrix'
import type { Rect } from '../core/math/rect'
import { History } from '../core/history'
import { pruneSelection, selectionStore } from '../interaction/selection'
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

export function resizeSelection(changes: readonly NodeBoxChange[]): void {
  if (changes.length === 0) return
  history.execute(new ResizeNodesCommand(scene, changes))
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
