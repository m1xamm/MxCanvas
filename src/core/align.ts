import { boundsOfRects, type Rect } from './math/rect'

export type AlignMode = 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY'
export type DistributeMode = 'horizontal' | 'vertical'

const MIN_DISTRIBUTE_COUNT = 3
const CENTER = 0.5

export function alignRects(rects: readonly Rect[], mode: AlignMode): Rect[] {
  const bounds = boundsOfRects(rects)
  if (!bounds) return []
  return rects.map((rect) => alignRect(rect, bounds, mode))
}

export function distributeRects(rects: readonly Rect[], mode: DistributeMode): Rect[] {
  if (rects.length < MIN_DISTRIBUTE_COUNT) return [...rects]
  const horizontal = mode === 'horizontal'
  const order = rects.map((rect, index) => ({ rect, index }))
  order.sort((a, b) =>
    horizontal ? a.rect.x - b.rect.x || a.rect.y - b.rect.y : a.rect.y - b.rect.y || a.rect.x - b.rect.x,
  )
  const result = rects.map((rect) => ({ ...rect }))
  const gap = distributeGap(order.map((entry) => entry.rect), horizontal)
  let cursor = horizontal
    ? order[0]!.rect.x + order[0]!.rect.width + gap
    : order[0]!.rect.y + order[0]!.rect.height + gap
  for (let position = 1; position < order.length - 1; position += 1) {
    const entry = order[position]!
    result[entry.index] = horizontal
      ? { ...entry.rect, x: cursor }
      : { ...entry.rect, y: cursor }
    cursor += (horizontal ? entry.rect.width : entry.rect.height) + gap
  }
  return result
}

function alignRect(rect: Rect, bounds: Rect, mode: AlignMode): Rect {
  if (mode === 'left') return { ...rect, x: bounds.x }
  if (mode === 'right') return { ...rect, x: bounds.x + bounds.width - rect.width }
  if (mode === 'centerX') return { ...rect, x: bounds.x + (bounds.width - rect.width) * CENTER }
  if (mode === 'top') return { ...rect, y: bounds.y }
  if (mode === 'bottom') return { ...rect, y: bounds.y + bounds.height - rect.height }
  return { ...rect, y: bounds.y + (bounds.height - rect.height) * CENTER }
}

function distributeGap(sorted: readonly Rect[], horizontal: boolean): number {
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const span = horizontal
    ? last.x - (first.x + first.width)
    : last.y - (first.y + first.height)
  let occupied = 0
  for (let index = 1; index < sorted.length - 1; index += 1) {
    const rect = sorted[index]!
    occupied += horizontal ? rect.width : rect.height
  }
  return (span - occupied) / (sorted.length - 1)
}
