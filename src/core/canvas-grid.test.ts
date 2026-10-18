import { describe, expect, it } from 'vitest'
import {
  canvasGrid,
  dotCount,
  firstDotOffset,
  GRID_BASE_STEP,
  GRID_MAX_ALPHA,
  GRID_MIN_ALPHA,
  GRID_MIN_SCREEN_SPACING,
  gridAlpha,
  gridScreenSpacing,
  gridStep,
} from './canvas-grid'

const ZOOM_SAMPLES = [0.02, 0.07, 0.25, 1, 1.5, 2.5, 4, 17, 64, 256]

describe('gridStep', () => {
  it('picks the smallest 8 * 2^k step that reaches the minimum spacing', () => {
    expect(gridStep(1)).toBe(32)
    expect(gridStep(2.5)).toBe(8)
    expect(gridStep(4)).toBe(8)
    expect(gridStep(0.02)).toBe(1024)
    expect(gridStep(256)).toBe(0.125)
  })

  it('keeps the on-screen spacing between the minimum and twice the minimum', () => {
    for (const zoom of ZOOM_SAMPLES) {
      const spacing = gridScreenSpacing(zoom)
      expect(spacing).toBeGreaterThanOrEqual(GRID_MIN_SCREEN_SPACING)
      expect(spacing).toBeLessThan(GRID_MIN_SCREEN_SPACING * 2)
    }
  })

  it('doubles the step exactly when the spacing would drop below the minimum', () => {
    expect(gridStep(2.5)).toBe(GRID_BASE_STEP)
    expect(gridStep(2.49)).toBe(GRID_BASE_STEP * 2)
  })

  it('falls back to the base step for a zoom that cannot be measured', () => {
    expect(gridStep(0)).toBe(GRID_BASE_STEP)
    expect(gridStep(Number.NaN)).toBe(GRID_BASE_STEP)
  })
})

describe('gridAlpha', () => {
  it('stays inside the alpha range and peaks in the middle of an octave', () => {
    for (const zoom of ZOOM_SAMPLES) {
      const alpha = gridAlpha(zoom)
      expect(alpha).toBeGreaterThanOrEqual(GRID_MIN_ALPHA)
      expect(alpha).toBeLessThanOrEqual(GRID_MAX_ALPHA)
    }
    const spacing = GRID_MIN_SCREEN_SPACING * Math.SQRT2
    expect(gridAlpha(spacing / GRID_BASE_STEP)).toBeCloseTo(GRID_MAX_ALPHA, 6)
  })

  it('eases across a level change without a jump', () => {
    const before = 2.49
    const after = 2.5
    expect(gridStep(before)).toBe(16)
    expect(gridStep(after)).toBe(8)
    expect(Math.abs(gridAlpha(before) - gridAlpha(after))).toBeLessThan(0.02)
  })

  it('fades the same way on both ends of an octave', () => {
    expect(gridAlpha(2.5)).toBeCloseTo(GRID_MIN_ALPHA, 6)
    expect(gridAlpha(1.25)).toBeCloseTo(GRID_MIN_ALPHA, 6)
  })
})

describe('firstDotOffset', () => {
  it('returns the first lattice point at or after the minimum', () => {
    expect(firstDotOffset(0, 32)).toBe(0)
    expect(firstDotOffset(-100, 32)).toBe(-96)
    expect(firstDotOffset(33, 32)).toBe(64)
  })

  it('does not step past a lattice point on a round boundary', () => {
    expect(firstDotOffset(0.3, 0.1)).toBeCloseTo(0.3, 9)
  })
})

describe('dotCount', () => {
  it('counts the dots that fit into the range', () => {
    expect(dotCount(0, 96, 32)).toBe(4)
    expect(dotCount(0, 95, 32)).toBe(3)
    expect(dotCount(0, 0, 32)).toBe(1)
    expect(dotCount(64, 0, 32)).toBe(0)
  })
})

describe('canvasGrid', () => {
  it('covers the viewport bounds with the first dot inside', () => {
    const bounds = { x: 12, y: -40, width: 800, height: 600 }
    const grid = canvasGrid(bounds, 1)
    expect(grid.step).toBe(32)
    expect(grid.firstX).toBeGreaterThanOrEqual(bounds.x)
    expect(grid.firstX - grid.step).toBeLessThan(bounds.x)
    expect(grid.firstY).toBeGreaterThanOrEqual(bounds.y)
    expect(grid.firstX + (grid.columns - 1) * grid.step).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(grid.firstY + (grid.rows - 1) * grid.step).toBeLessThanOrEqual(bounds.y + bounds.height)
  })

  it('counts one dot when the bounds sit on a single lattice point', () => {
    const grid = canvasGrid({ x: 32, y: 32, width: 0, height: 0 }, 1)
    expect(grid.columns).toBe(1)
    expect(grid.rows).toBe(1)
  })

  it('keeps the dot count small at any zoom for a screen-sized viewport', () => {
    for (const zoom of ZOOM_SAMPLES) {
      const grid = canvasGrid({ x: 0, y: 0, width: 1440 / zoom, height: 900 / zoom }, zoom)
      expect(grid.columns).toBeLessThanOrEqual(1440 / GRID_MIN_SCREEN_SPACING + 1)
      expect(grid.rows).toBeLessThanOrEqual(900 / GRID_MIN_SCREEN_SPACING + 1)
    }
  })
})
