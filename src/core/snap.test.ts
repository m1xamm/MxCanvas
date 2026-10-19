import { describe, expect, it } from 'vitest'
import type { Rect } from './math/rect'
import { computeSnap, type SnapGuide } from './snap'

const MOVING = { x: 10, y: 20, width: 30, height: 40 }
const NO_GUIDES: readonly SnapGuide[] = []

function snapRect(rect: Rect, targets: Rect[] = [], tolerance = 3): Rect {
  return computeSnap({
    rect,
    targets,
    tolerance,
    objectSnap: targets.length > 0,
    pixelSnap: targets.length === 0,
    mode: 'move',
  }).rect
}

describe('computeSnap', () => {
  it('returns the rect untouched when both snaps are off', () => {
    const rect = { x: 10.4, y: 20.6, width: 30, height: 40 }
    const result = computeSnap({
      rect,
      targets: [],
      tolerance: 3,
      objectSnap: false,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect).toBe(rect)
    expect(result.guides).toEqual(NO_GUIDES)
  })

  it('lands the bounds of a move on whole pixels', () => {
    expect(snapRect({ x: 10.4, y: 20.6, width: 30, height: 40 })).toEqual({
      x: 10,
      y: 21,
      width: 30,
      height: 40,
    })
  })

  it('rounds only the edges a resize drags', () => {
    const rect = { x: 10.4, y: 20.6, width: 30.2, height: 40.1 }
    expect(
      computeSnap({
        rect,
        targets: [],
        tolerance: 3,
        objectSnap: false,
        pixelSnap: true,
        mode: 'resize',
        edges: { left: false, right: true, top: false, bottom: true },
      }).rect,
    ).toEqual({ x: 10.4, y: 20.6, width: 30.6, height: 40.4 })
  })

  it('rounds both edges of a creation drag', () => {
    expect(
      computeSnap({
        rect: { x: 10.4, y: 20.6, width: 30.2, height: 40.1 },
        targets: [],
        tolerance: 3,
        objectSnap: false,
        pixelSnap: true,
        mode: 'resize',
        edges: { left: true, right: true, top: true, bottom: true },
      }).rect,
    ).toEqual({ x: 10, y: 21, width: 31, height: 40 })
  })

  it('snaps a moved box to the nearest line of another box', () => {
    const target = { x: 12, y: 0, width: 10, height: 10 }
    const result = computeSnap({
      rect: MOVING,
      targets: [target],
      tolerance: 3,
      objectSnap: true,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect).toEqual({ x: 12, y: 20, width: 30, height: 40 })
    expect(result.guides).toEqual([{ axis: 'x', position: 12, from: 0, to: 60 }])
  })

  it('prefers the nearest line and keeps the first on a tie', () => {
    const near = { x: 12, y: 100, width: 1, height: 1 }
    const far = { x: 27, y: 100, width: 1, height: 1 }
    const result = computeSnap({
      rect: MOVING,
      targets: [near, far],
      tolerance: 3,
      objectSnap: true,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect.x).toBe(12)
  })

  it('ignores lines outside the tolerance', () => {
    const result = computeSnap({
      rect: MOVING,
      targets: [{ x: 16, y: 100, width: 2, height: 10 }],
      tolerance: 3,
      objectSnap: true,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect).toBe(MOVING)
    expect(result.guides).toEqual(NO_GUIDES)
  })

  it('falls back to pixels when no object line is in range', () => {
    const result = computeSnap({
      rect: { x: 10.4, y: 20.6, width: 30, height: 40 },
      targets: [{ x: 200, y: 200, width: 10, height: 10 }],
      tolerance: 3,
      objectSnap: true,
      pixelSnap: true,
      mode: 'move',
    })
    expect(result.rect).toEqual({ x: 10, y: 21, width: 30, height: 40 })
    expect(result.guides).toEqual(NO_GUIDES)
  })

  it('leaves a fixed edge alone while resizing', () => {
    const result = computeSnap({
      rect: { x: 10.2, y: 0, width: 30, height: 10 },
      targets: [{ x: 10, y: 0, width: 1, height: 1 }],
      tolerance: 1,
      objectSnap: true,
      pixelSnap: false,
      mode: 'resize',
      edges: { left: false, right: true, top: false, bottom: false },
    })
    expect(result.rect).toEqual({ x: 10.2, y: 0, width: 30, height: 10 })
    expect(result.guides).toEqual(NO_GUIDES)
  })

  it('rounds a moving edge that has no object match', () => {
    const result = computeSnap({
      rect: { x: 100.4, y: 0, width: 50.1, height: 10 },
      targets: [{ x: 150, y: 0, width: 2, height: 1 }],
      tolerance: 1,
      objectSnap: true,
      pixelSnap: true,
      mode: 'resize',
      edges: { left: true, right: true, top: false, bottom: false },
    })
    expect(result.rect).toEqual({ x: 100, y: 0, width: 50, height: 10 })
  })

  it('translates a moved box as a whole when the center matches', () => {
    const result = computeSnap({
      rect: { x: 10, y: 0, width: 20, height: 10 },
      targets: [{ x: 17, y: 100, width: 8, height: 1 }],
      tolerance: 6,
      objectSnap: true,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect).toEqual({ x: 11, y: 0, width: 20, height: 10 })
    expect(result.guides).toEqual([{ axis: 'x', position: 21, from: 0, to: 101 }])
  })

  it('stretches a guide across both boxes on the other axis', () => {
    const result = computeSnap({
      rect: { x: 100, y: 20, width: 30, height: 40 },
      targets: [{ x: 0, y: 12, width: 10, height: 10 }],
      tolerance: 3,
      objectSnap: true,
      pixelSnap: false,
      mode: 'move',
    })
    expect(result.rect).toEqual({ x: 100, y: 22, width: 30, height: 40 })
    expect(result.guides).toEqual([{ axis: 'y', position: 22, from: 0, to: 130 }])
  })
})
