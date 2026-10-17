import { describe, expect, it } from 'vitest'
import { rotation, translation } from './matrix'
import { rectsIntersect, transformRect } from './rect'

describe('transformRect', () => {
  it('translates a rect', () => {
    const result = transformRect(translation(10, 20), { x: 1, y: 2, width: 3, height: 4 })
    expect(result).toEqual({ x: 11, y: 22, width: 3, height: 4 })
  })

  it('computes axis-aligned bounds after rotation', () => {
    const result = transformRect(rotation(Math.PI / 2), { x: 0, y: 0, width: 10, height: 20 })
    expect(result.x).toBeCloseTo(-20)
    expect(result.y).toBeCloseTo(0)
    expect(result.width).toBeCloseTo(20)
    expect(result.height).toBeCloseTo(10)
  })
})

describe('rectsIntersect', () => {
  it('detects overlapping rects', () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
  })

  it('detects containment', () => {
    expect(rectsIntersect({ x: 2, y: 2, width: 2, height: 2 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true)
  })

  it('rejects touching and disjoint rects', () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false)
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 })).toBe(false)
  })
})
