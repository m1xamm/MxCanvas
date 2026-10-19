import { describe, expect, it } from 'vitest'
import {
  handleHoverScale,
  HANDLE_HOVER_DURATION_MS,
  HANDLE_HOVER_MAX_SCALE,
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

