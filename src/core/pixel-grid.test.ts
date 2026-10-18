import { describe, expect, it } from 'vitest'
import {
  PIXEL_GRID_FULL_ZOOM,
  PIXEL_GRID_MIN_ZOOM,
  pixelGrid,
  pixelGridAlpha,
} from './pixel-grid'

describe('pixelGridAlpha', () => {
  it('is hidden below 400% zoom', () => {
    expect(pixelGridAlpha(1)).toBe(0)
    expect(pixelGridAlpha(PIXEL_GRID_MIN_ZOOM - 0.01)).toBe(0)
  })

  it('is fully visible from 800% zoom', () => {
    expect(pixelGridAlpha(PIXEL_GRID_FULL_ZOOM)).toBe(1)
    expect(pixelGridAlpha(40)).toBe(1)
  })

  it('eases in between 400% and 800%', () => {
    const middle = pixelGridAlpha((PIXEL_GRID_MIN_ZOOM + PIXEL_GRID_FULL_ZOOM) / 2)
    expect(middle).toBeCloseTo(0.5, 6)
    expect(pixelGridAlpha(5)).toBeGreaterThan(0)
    expect(pixelGridAlpha(5)).toBeLessThan(pixelGridAlpha(7))
  })

  it('ignores invalid zoom', () => {
    expect(pixelGridAlpha(0)).toBe(0)
    expect(pixelGridAlpha(Number.NaN)).toBe(0)
  })
})

describe('pixelGrid', () => {
  it('places lines on integer world coordinates inside the viewport', () => {
    const grid = pixelGrid({ x: 0.4, y: -1.6, width: 3, height: 2 }, 8)
    expect(grid.firstX).toBe(1)
    expect(grid.firstY).toBe(-1)
    expect(grid.columns).toBe(3)
    expect(grid.rows).toBe(2)
  })

  it('keeps lines on exact bounds', () => {
    const grid = pixelGrid({ x: 0, y: 0, width: 2, height: 1 }, 8)
    expect(grid.firstX).toBe(0)
    expect(grid.firstY).toBe(0)
    expect(grid.columns).toBe(3)
    expect(grid.rows).toBe(2)
  })

  it('reports no lines below the zoom threshold', () => {
    const grid = pixelGrid({ x: 0, y: 0, width: 100, height: 100 }, 2)
    expect(grid.alpha).toBe(0)
    expect(grid.columns).toBe(0)
    expect(grid.rows).toBe(0)
  })

  it('reports no lines for an empty viewport', () => {
    const grid = pixelGrid({ x: 0, y: 0, width: 0, height: 0 }, 8)
    expect(grid.columns).toBe(1)
    expect(grid.rows).toBe(1)
    expect(pixelGrid({ x: 0, y: 0, width: -5, height: 0 }, 8).columns).toBe(0)
  })

  it('counts one line per world pixel', () => {
    const grid = pixelGrid({ x: 0, y: 0, width: 15.5, height: 9.2 }, 16)
    expect(grid.columns).toBe(16)
    expect(grid.rows).toBe(10)
  })
})
