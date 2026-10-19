import type { Paint, RectangleNode, SceneNodeUnion } from './document/types'

export interface PaintSummary {
  row: number
  paint: Paint
  mixedColor: boolean
  mixedOpacity: boolean
  mixedVisible: boolean
}

export function paintIndexForRow(paintCount: number, row: number): number | null {
  const index = paintCount - 1 - row
  return index < 0 ? null : index
}

export function summarizeFills(nodes: readonly RectangleNode[]): PaintSummary[] {
  return summarizePaints(nodes, (node) => node.fills)
}

export function summarizeStrokes(nodes: readonly SceneNodeUnion[]): PaintSummary[] {
  return summarizePaints(nodes, (node) => node.strokes)
}

export function sameColor(a: Paint['color'], b: Paint['color']): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
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
      mixedColor: paints.some((candidate) => !sameColor(candidate.color, paint.color)),
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
    const paintIndex = paintIndexForRow(list.length, row)
    const paint = paintIndex === null ? undefined : list[paintIndex]
    if (!paint) return
    if (index === 0) primary = paint
    paints.push(paint)
  })
  return primary ? [primary, ...paints.filter((paint) => paint !== primary)] : paints
}
