import { describe, expect, it } from 'vitest'
import {
  handleHoverScale,
  HANDLE_HOVER_DURATION_MS,
  HANDLE_HOVER_MAX_SCALE,
  labelAnimationDone,
  labelAppearScale,
} from './selection-overlay'

describe('handleHoverScale', () => {
  it('grows from one to the maximum', () => {
    expect(handleHoverScale(0)).toBe(1)
    expect(handleHoverScale(HANDLE_HOVER_DURATION_MS)).toBe(HANDLE_HOVER_MAX_SCALE)
    expect(handleHoverScale(1000)).toBe(HANDLE_HOVER_MAX_SCALE)
    expect(handleHoverScale(HANDLE_HOVER_DURATION_MS / 2)).toBeGreaterThan(1)
    expect(handleHoverScale(HANDLE_HOVER_DURATION_MS / 2)).toBeLessThan(HANDLE_HOVER_MAX_SCALE)
  })

  it('treats negative time as the start', () => {
    expect(handleHoverScale(-10)).toBe(1)
  })
})

describe('labelAppearScale', () => {
  it('scales the badge in from 0.92 to 1', () => {
    expect(labelAppearScale(0)).toBeCloseTo(0.92, 6)
    expect(labelAppearScale(1000)).toBe(1)
  })

  it('grows monotonically', () => {
    let previous = 0
    for (let elapsed = 0; elapsed <= 200; elapsed += 10) {
      const scale = labelAppearScale(elapsed)
      expect(scale).toBeGreaterThanOrEqual(previous)
      previous = scale
    }
  })

  it('reports when the animation is over', () => {
    expect(labelAnimationDone(0)).toBe(false)
    expect(labelAnimationDone(159)).toBe(false)
    expect(labelAnimationDone(160)).toBe(true)
  })
})
