import { describe, expect, it } from 'vitest'
import { computePopupPlacement, type PopupPlacementInput } from './popup-position'

const VIEWPORT = { width: 1440, height: 900 }
const POPUP = { width: 200, height: 180 }
const GAP = 8
const MARGIN = 8

function placement(overrides: Partial<PopupPlacementInput>) {
  return computePopupPlacement({
    anchor: { x: 100, y: 100, width: 40, height: 40 },
    popup: POPUP,
    viewport: VIEWPORT,
    side: 'below',
    align: 'start',
    gap: GAP,
    margin: MARGIN,
    ...overrides,
  })
}

describe('computePopupPlacement', () => {
  it('places a menu below the anchor with the gap', () => {
    const result = placement({})
    expect(result.top).toBe(148)
    expect(result.left).toBe(100)
    expect(result.side).toBe('below')
  })

  it('aligns start, center and end to the anchor', () => {
    expect(placement({ align: 'start' }).left).toBe(100)
    expect(placement({ align: 'center', anchor: { x: 700, y: 100, width: 40, height: 40 } }).left).toBe(620)
    expect(placement({ align: 'end', anchor: { x: 700, y: 100, width: 40, height: 40 } }).left).toBe(540)
  })

  it('flips above the anchor when there is no room below', () => {
    const result = placement({ anchor: { x: 100, y: 800, width: 40, height: 40 } })
    expect(result.side).toBe('above')
    expect(result.top).toBe(612)
    expect(result.originY).toBe(POPUP.height)
  })

  it('flips below when the preferred side is above and there is no room', () => {
    const result = placement({ anchor: { x: 100, y: 20, width: 40, height: 40 }, side: 'above' })
    expect(result.side).toBe('below')
    expect(result.top).toBe(68)
    expect(result.originY).toBe(0)
  })

  it('clamps inside the window when neither side fits', () => {
    const result = placement({
      anchor: { x: 700, y: 450, width: 40, height: 40 },
      popup: { width: 200, height: 900 },
    })
    expect(result.top).toBe(MARGIN)
  })

  it('clamps on the right edge of the window', () => {
    const result = placement({ anchor: { x: 1400, y: 100, width: 40, height: 40 }, align: 'end' })
    expect(result.left).toBe(VIEWPORT.width - MARGIN - POPUP.width)
  })

  it('clamps on the left edge of the window', () => {
    const result = placement({ anchor: { x: 4, y: 100, width: 40, height: 40 }, align: 'center' })
    expect(result.left).toBe(MARGIN)
  })

  it('keeps the transform origin on the anchor when the menu is clamped', () => {
    const result = placement({ anchor: { x: 4, y: 100, width: 40, height: 40 }, align: 'center' })
    expect(result.originX).toBe(16)
    expect(result.originX).toBeLessThanOrEqual(result.left + POPUP.width)
  })

  it('returns whole pixels', () => {
    const result = placement({ anchor: { x: 100.4, y: 100.6, width: 40, height: 40 } })
    expect(Number.isInteger(result.left)).toBe(true)
    expect(Number.isInteger(result.top)).toBe(true)
    expect(Number.isInteger(result.originX)).toBe(true)
  })
})
