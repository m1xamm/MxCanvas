import { describe, expect, it } from 'vitest'
import { normalizeWheelDelta, wheelPanDelta, wheelZoomFactor } from './wheel'

describe('wheelZoomFactor', () => {
  it('keeps zoom unchanged for a zero delta', () => {
    expect(wheelZoomFactor(0)).toBe(1)
  })

  it('zooms in when scrolling up and out when scrolling down', () => {
    expect(wheelZoomFactor(-120)).toBeGreaterThan(1)
    expect(wheelZoomFactor(120)).toBeLessThan(1)
  })

  it('is symmetric for opposite deltas', () => {
    expect(wheelZoomFactor(-80) * wheelZoomFactor(80)).toBeCloseTo(1, 12)
  })
})

describe('wheelPanDelta', () => {
  it('moves the view opposite to the scroll deltas', () => {
    expect(wheelPanDelta({ deltaX: 10, deltaY: -20, deltaMode: 0, shiftKey: false })).toEqual({
      x: -10,
      y: 20,
    })
  })

  it('uses the vertical delta for horizontal pan when shift is held', () => {
    expect(wheelPanDelta({ deltaX: 0, deltaY: 30, deltaMode: 0, shiftKey: true })).toEqual({
      x: -30,
      y: 0,
    })
  })

  it('keeps the horizontal delta when shift is held and deltaX is present', () => {
    expect(wheelPanDelta({ deltaX: 15, deltaY: 0, deltaMode: 0, shiftKey: true })).toEqual({
      x: -15,
      y: 0,
    })
  })

  it('normalizes line-mode deltas to pixels', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48)
    expect(normalizeWheelDelta(3, 0)).toBe(3)
  })
})
