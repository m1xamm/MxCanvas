import type { Paint, RectangleNode, SceneNodeUnion } from './document/types'
import { sameRgb } from './color'
import { stackIndexForRow } from './stack'

export interface PaintSummary {
  row: number
  paint: Paint
  mixedColor: boolean
  mixedOpacity: boolean
  mixedVisible: boolean
}

export function summarizeFills(nodes: readonly RectangleNode[]): PaintSummary[] {
  return summarizePaints(nodes, (node) => node.fills)
}

export function summarizeStrokes(nodes: readonly SceneNodeUnion[]): PaintSummary[] {
  return summarizePaints(nodes, (node) => node.strokes)
}

function summarizePaints<T extends SceneNodeUnion>(
  nodes: readonly T[],
  readPaints: (node: T) => readonly Paint[],
): PaintSummary[] {
  if (nodes.length === 0) return []
  const rowCount = nodes.reduce((count, node) => Math.max(count, readPaints(node).length), 0)
  const summaries: PaintSummary[] = []
  for (let row = 0; row < rowCount; row += 1) {
    const paints = collectRow(nodes, readPaints, row)
    const paint = paints[0]
    if (!paint) continue
    summaries.push({
      row,
      paint,
      mixedColor: paints.some((candidate) => !sameRgb(candidate.color, paint.color)),
      mixedOpacity: paints.some((candidate) => candidate.opacity !== paint.opacity),
      mixedVisible: paints.some((candidate) => candidate.visible !== paint.visible),
    })
  }
  return summaries
}

function collectRow<T extends SceneNodeUnion>(
  nodes: readonly T[],
  readPaints: (node: T) => readonly Paint[],
  row: number,
): Paint[] {
  const paints: Paint[] = []
  let primary: Paint | null = null
  nodes.forEach((node, index) => {
    const list = readPaints(node)
    const paintIndex = stackIndexForRow(list.length, row)
    const paint = paintIndex === null ? undefined : list[paintIndex]
    if (!paint) return
    if (index === 0) primary = paint
    paints.push(paint)
  })
  return primary ? [primary, ...paints.filter((paint) => paint !== primary)] : paints
}
