import { translation } from '../math/matrix'
import type { NodeId, RectangleNode, SolidPaint } from './types'

export const DEFAULT_RECTANGLE_FILL: SolidPaint = {
  type: 'solid',
  color: { r: 217, g: 217, b: 217 },
  opacity: 1,
}

export interface RectangleNodeInit {
  id: NodeId
  name: string
  x: number
  y: number
  width: number
  height: number
  parentId?: NodeId | null
}

export function createRectangleNode(init: RectangleNodeInit): RectangleNode {
  return {
    id: init.id,
    type: 'rectangle',
    name: init.name,
    parentId: init.parentId ?? null,
    children: [],
    transform: translation(init.x, init.y),
    width: init.width,
    height: init.height,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [{ ...DEFAULT_RECTANGLE_FILL, color: { ...DEFAULT_RECTANGLE_FILL.color } }],
    cornerRadius: 0,
  }
}
