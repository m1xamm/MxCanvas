import type { Rect } from './math/rect'

export type SnapAxis = 'x' | 'y'
export type SnapMode = 'move' | 'resize'

export interface SnapEdgeMask {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export const ALL_SNAP_EDGES: SnapEdgeMask = {
  left: true,
  right: true,
  top: true,
  bottom: true,
}

export interface SnapGuide {
  axis: SnapAxis
  position: number
  from: number
  to: number
}

export interface SnapInput {
  rect: Rect
  targets: readonly Rect[]
  tolerance: number
  objectSnap: boolean
  pixelSnap: boolean
  mode: SnapMode
  edges?: SnapEdgeMask
}

export interface SnapResult {
  rect: Rect
  guides: readonly SnapGuide[]
}

export type SnapFn = (rect: Rect, mode: SnapMode, edges: SnapEdgeMask) => SnapResult

const LINE_START = 0
const LINE_CENTER = 1
const LINE_END = 2
const LINE_KINDS = 3

const NO_GUIDES: readonly SnapGuide[] = []
const NO_AXIS_DELTAS: AxisDeltas = { start: 0, end: 0, guides: NO_GUIDES }

interface AxisDeltas {
  start: number
  end: number
  guides: readonly SnapGuide[]
}

interface LineMatch {
  delta: number
  distance: number
  target: Rect
  guide: SnapGuide
}

export function computeSnap(input: SnapInput): SnapResult {
  if (!input.objectSnap && !input.pixelSnap) return { rect: input.rect, guides: [] }
  const edges = input.edges ?? ALL_SNAP_EDGES
  const x = snapAxis(input, 'x', edges)
  const y = snapAxis(input, 'y', edges)
  const moved = x.start !== 0 || x.end !== 0 || y.start !== 0 || y.end !== 0
  const snapped = moved ? applyAxisDeltas(input.rect, x, y) : input.rect
  if (x.guides.length === 0 && y.guides.length === 0) return { rect: snapped, guides: NO_GUIDES }
  return { rect: snapped, guides: [...x.guides, ...y.guides] }
}

export function applyAxisDeltas(rect: Rect, x: AxisDeltas, y: AxisDeltas): Rect {
  const left = rect.x + x.start
  const right = rect.x + rect.width + x.end
  const top = rect.y + y.start
  const bottom = rect.y + rect.height + y.end
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function snapAxis(input: SnapInput, axis: SnapAxis, edges: SnapEdgeMask): AxisDeltas {
  if (input.mode === 'move') return snapMoveAxis(input, axis)
  return snapEdgesAxis(input, axis, edges)
}

function snapMoveAxis(input: SnapInput, axis: SnapAxis): AxisDeltas {
  if (input.objectSnap) {
    let best: LineMatch | null = null
    let bestKind = LINE_START
    for (let kind = 0; kind < LINE_KINDS; kind += 1) {
      const match = bestLineMatch(input, axis, kind)
      if (!match) continue
      if (best && match.distance >= best.distance) continue
      best = match
      bestKind = kind
    }
    if (best) {
      const delta = best.delta
      return {
        start: delta,
        end: delta,
        guides: [withPosition(best.guide, lineValue(input.rect, axis, bestKind) + delta)],
      }
    }
  }
  if (!input.pixelSnap) return NO_AXIS_DELTAS
  const delta = roundDelta(lineValue(input.rect, axis, LINE_START))
  return { start: delta, end: delta, guides: NO_GUIDES }
}

function snapEdgesAxis(input: SnapInput, axis: SnapAxis, edges: SnapEdgeMask): AxisDeltas {
  const guides: SnapGuide[] = []
  let start = 0
  let end = 0
  for (let kind = LINE_START; kind <= LINE_END; kind += 2) {
    if (!movesEdge(kind, axis, edges)) continue
    const match = input.objectSnap ? bestLineMatch(input, axis, kind) : null
    if (match) {
      if (kind === LINE_START) start = match.delta
      else end = match.delta
      guides.push(match.guide)
      continue
    }
    if (!input.pixelSnap) continue
    const delta = roundDelta(lineValue(input.rect, axis, kind))
    if (kind === LINE_START) start = delta
    else end = delta
  }
  return { start, end, guides: guides.length === 0 ? NO_GUIDES : guides }
}

function bestLineMatch(input: SnapInput, axis: SnapAxis, kind: number): LineMatch | null {
  const value = lineValue(input.rect, axis, kind)
  let bestDistance = Infinity
  let bestDelta = 0
  let bestTarget: Rect | null = null
  for (const target of input.targets) {
    for (let targetKind = 0; targetKind < LINE_KINDS; targetKind += 1) {
      const delta = lineValue(target, axis, targetKind) - value
      const distance = Math.abs(delta)
      if (distance > input.tolerance || distance >= bestDistance) continue
      bestDistance = distance
      bestDelta = delta
      bestTarget = target
    }
  }
  if (!bestTarget) return null
  return {
    delta: bestDelta,
    distance: bestDistance,
    target: bestTarget,
    guide: guideFor(input.rect, bestTarget, axis, value + bestDelta),
  }
}

function movesEdge(kind: number, axis: SnapAxis, edges: SnapEdgeMask): boolean {
  if (axis === 'x') return kind === LINE_START ? edges.left : edges.right
  return kind === LINE_START ? edges.top : edges.bottom
}

function lineValue(rect: Rect, axis: SnapAxis, kind: number): number {
  const start = axis === 'x' ? rect.x : rect.y
  const size = axis === 'x' ? rect.width : rect.height
  if (kind === LINE_CENTER) return start + size / 2
  return kind === LINE_START ? start : start + size
}

function guideFor(rect: Rect, target: Rect, axis: SnapAxis, position: number): SnapGuide {
  const moving = perpendicularRange(rect, axis)
  const other = perpendicularRange(target, axis)
  return {
    axis,
    position,
    from: Math.min(moving.from, other.from),
    to: Math.max(moving.to, other.to),
  }
}

function withPosition(guide: SnapGuide, position: number): SnapGuide {
  return { axis: guide.axis, position, from: guide.from, to: guide.to }
}

function perpendicularRange(rect: Rect, axis: SnapAxis): { from: number; to: number } {
  if (axis === 'x') return { from: rect.y, to: rect.y + rect.height }
  return { from: rect.x, to: rect.x + rect.width }
}

function roundDelta(value: number): number {
  return Math.round(value) - value
}
