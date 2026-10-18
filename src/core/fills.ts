import type { RectangleNode, SolidPaint } from './document/types'

export interface FillSummary {
  row: number
  paint: SolidPaint
  mixedColor: boolean
  mixedOpacity: boolean
  mixedVisible: boolean
}

export function fillIndexForRow(fillCount: number, row: number): number | null {
  const index = fillCount - 1 - row
  return index < 0 ? null : index
}

export function summarizeFills(nodes: readonly RectangleNode[]): FillSummary[] {
  if (nodes.length === 0) return []
  const rowCount = nodes.reduce((count, node) => Math.max(count, node.fills.length), 0)
  const summaries: FillSummary[] = []
  for (let row = 0; row < rowCount; row += 1) {
    const paints = collectRow(nodes, row)
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

export function sameColor(a: SolidPaint['color'], b: SolidPaint['color']): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
}

function collectRow(nodes: readonly RectangleNode[], row: number): SolidPaint[] {
  const paints: SolidPaint[] = []
  let primary: SolidPaint | null = null
  nodes.forEach((node, index) => {
    const fillIndex = fillIndexForRow(node.fills.length, row)
    const paint = fillIndex === null ? undefined : node.fills[fillIndex]
    if (!paint) return
    if (index === 0) primary = paint
    paints.push(paint)
  })
  return primary ? [primary, ...paints.filter((paint) => paint !== primary)] : paints
}
