import { createRectangleNode } from '../core/document/create-node'
import { Document } from '../core/document/document'
import type { RectangleNode } from '../core/document/types'
import type { Rect } from '../core/math/rect'
import { History } from '../core/history'
import { t } from '../i18n/i18n'

export const scene = new Document()
export const history = new History()

let rectangleCount = 0

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
