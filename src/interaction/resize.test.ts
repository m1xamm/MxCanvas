import { describe, expect, it } from 'vitest'
import { mapRectWithBounds } from '../core/math/rect'
import { handleAtPoint, handleCursor, handlePoint, resizeBounds, type ResizeHandleId } from './resize'

const BOUNDS = { x: 0, y: 0, width: 100, height: 100 }

const ALL_HANDLES: readonly ResizeHandleId[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']

describe('handlePoint', () => {
  it('places every handle on the bounds', () => {
    expect(handlePoint(BOUNDS, 'nw')).toEqual({ x: 0, y: 0 })
    expect(handlePoint(BOUNDS, 'se')).toEqual({ x: 100, y: 100 })
    expect(handlePoint(BOUNDS, 'n')).toEqual({ x: 50, y: 0 })
    expect(handlePoint(BOUNDS, 'w')).toEqual({ x: 0, y: 50 })
  })
})

describe('handleAtPoint', () => {
  it('hits a corner handle inside its square', () => {
    expect(handleAtPoint(BOUNDS, { x: 3, y: 3 })).toBe('nw')
    expect(handleAtPoint(BOUNDS, { x: 100, y: 100 })).toBe('se')
  })

  it('prioritizes corners where handles overlap', () => {
    const small = { x: 0, y: 0, width: 4, height: 4 }
    expect(handleAtPoint(small, { x: 2, y: 2 })).toBe('nw')
  })

  it('returns null away from the handles', () => {
    expect(handleAtPoint(BOUNDS, { x: 50, y: 50 })).toBeNull()
    expect(handleAtPoint(BOUNDS, { x: 20, y: 4 })).toBeNull()
  })
})

describe('handleCursor', () => {
  it('maps handles to resize cursors', () => {
    expect(handleCursor('nw')).toBe('nwse-resize')
    expect(handleCursor('se')).toBe('nwse-resize')
    expect(handleCursor('ne')).toBe('nesw-resize')
    expect(handleCursor('sw')).toBe('nesw-resize')
    expect(handleCursor('n')).toBe('ns-resize')
    expect(handleCursor('e')).toBe('ew-resize')
    expect(handleCursor('s')).toBe('ns-resize')
    expect(handleCursor('w')).toBe('ew-resize')
  })
})

describe('resizeBounds', () => {
  it('follows the pointer from a corner handle', () => {
    const rect = resizeBounds({
      bounds: BOUNDS,
      handle: 'se',
      pointer: { x: 150, y: 140 },
      proportional: false,
      fromCenter: false,
    })
    expect(rect).toEqual({ x: 0, y: 0, width: 150, height: 140 })
  })

  it('keeps the opposite corner fixed for the nw handle', () => {
    const rect = resizeBounds({
      bounds: BOUNDS,
      handle: 'nw',
      pointer: { x: -20, y: -10 },
      proportional: false,
      fromCenter: false,
    })
    expect(rect.x).toBeCloseTo(-20)
    expect(rect.y).toBeCloseTo(-10)
    expect(rect.width).toBeCloseTo(120)
    expect(rect.height).toBeCloseTo(110)
  })

  it('keeps the aspect ratio with proportional enabled', () => {
    const corner = resizeBounds({
      bounds: BOUNDS,
      handle: 'se',
      pointer: { x: 150, y: 200 },
      proportional: true,
      fromCenter: false,
    })
    expect(corner).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    const side = resizeBounds({
      bounds: BOUNDS,
      handle: 'e',
      pointer: { x: 150, y: 0 },
      proportional: true,
      fromCenter: false,
    })
    expect(side).toEqual({ x: 0, y: -25, width: 150, height: 150 })
  })

  it('scales around the center when fromCenter is enabled', () => {
    const rect = resizeBounds({
      bounds: BOUNDS,
      handle: 'se',
      pointer: { x: 150, y: 150 },
      proportional: false,
      fromCenter: true,
    })
    expect(rect).toEqual({ x: -50, y: -50, width: 200, height: 200 })
  })

  it('flips the bounds when the pointer crosses the opposite edge', () => {
    const rect = resizeBounds({
      bounds: BOUNDS,
      handle: 'e',
      pointer: { x: -50, y: 0 },
      proportional: false,
      fromCenter: false,
    })
    expect(rect).toEqual({ x: 0, y: 0, width: -50, height: 100 })
  })

  it('keeps every handle draggable', () => {
    for (const handle of ALL_HANDLES) {
      const rect = resizeBounds({
        bounds: BOUNDS,
        handle,
        pointer: { x: 100, y: 100 },
        proportional: false,
        fromCenter: false,
      })
      expect(Number.isFinite(rect.width)).toBe(true)
      expect(Number.isFinite(rect.height)).toBe(true)
    }
  })
})

describe('mapRectWithBounds', () => {
  it('scales node rects proportionally inside the bounds', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 }
    const to = { x: 0, y: 0, width: 200, height: 50 }
    expect(mapRectWithBounds({ x: 0, y: 0, width: 50, height: 50 }, from, to)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 25,
    })
    expect(mapRectWithBounds({ x: 50, y: 50, width: 50, height: 50 }, from, to)).toEqual({
      x: 100,
      y: 25,
      width: 100,
      height: 25,
    })
  })

  it('mirrors node rects when the bounds flip', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 }
    const flipped = { x: 0, y: 0, width: -50, height: 100 }
    expect(mapRectWithBounds({ x: 0, y: 0, width: 50, height: 100 }, from, flipped)).toEqual({
      x: -25,
      y: 0,
      width: 25,
      height: 100,
    })
  })
})
