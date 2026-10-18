import { describe, expect, it } from 'vitest'
import { alignRects, distributeRects } from './align'

const A = { x: 0, y: 0, width: 100, height: 50 }
const B = { x: 40, y: 20, width: 60, height: 100 }
const C = { x: 200, y: 80, width: 20, height: 30 }
const SET = [A, B, C]

describe('alignRects', () => {
  it('aligns to the left edge of the bounding box', () => {
    const result = alignRects(SET, 'left')
    expect(result.map((rect) => rect.x)).toEqual([0, 0, 0])
    expect(result[1]?.y).toBe(B.y)
  })

  it('aligns to the right edge', () => {
    const result = alignRects(SET, 'right')
    expect(result.map((rect) => rect.x + rect.width)).toEqual([220, 220, 220])
  })

  it('aligns horizontal centers', () => {
    const result = alignRects(SET, 'centerX')
    expect(result.map((rect) => rect.x + rect.width / 2)).toEqual([110, 110, 110])
  })

  it('aligns to the top and bottom edges', () => {
    expect(alignRects(SET, 'top').map((rect) => rect.y)).toEqual([0, 0, 0])
    expect(alignRects(SET, 'bottom').map((rect) => rect.y + rect.height)).toEqual([120, 120, 120])
  })

  it('aligns vertical centers', () => {
    const result = alignRects(SET, 'centerY')
    expect(result.map((rect) => rect.y + rect.height / 2)).toEqual([60, 60, 60])
  })

  it('keeps sizes and returns nothing for an empty input', () => {
    expect(alignRects(SET, 'left')[0]).toEqual({ ...A, x: 0 })
    expect(alignRects([], 'left')).toEqual([])
  })
})

describe('distributeRects', () => {
  it('creates equal gaps between neighbours', () => {
    const result = distributeRects(
      [
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 50, y: 0, width: 20, height: 20 },
        { x: 200, y: 0, width: 20, height: 20 },
      ],
      'horizontal',
    )
    expect(result.map((rect) => rect.x)).toEqual([0, 100, 200])
  })

  it('keeps the outer rects in place and ignores the input order', () => {
    const result = distributeRects(
      [
        { x: 200, y: 0, width: 20, height: 20 },
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 50, y: 0, width: 20, height: 20 },
      ],
      'horizontal',
    )
    expect(result[1]).toEqual({ x: 0, y: 0, width: 20, height: 20 })
    expect(result[0]).toEqual({ x: 200, y: 0, width: 20, height: 20 })
    expect(result[2]?.x).toBe(100)
  })

  it('distributes vertically', () => {
    const result = distributeRects(
      [
        { x: 0, y: 0, width: 20, height: 40 },
        { x: 0, y: 30, width: 20, height: 40 },
        { x: 0, y: 200, width: 20, height: 40 },
      ],
      'vertical',
    )
    expect(result.map((rect) => rect.y)).toEqual([0, 100, 200])
  })

  it('does nothing below three rects', () => {
    expect(distributeRects([A, B], 'horizontal')).toEqual([A, B])
    expect(distributeRects([], 'vertical')).toEqual([])
  })

  it('handles overlapping rects with a negative gap', () => {
    const result = distributeRects(
      [
        { x: 0, y: 0, width: 60, height: 20 },
        { x: 10, y: 0, width: 60, height: 20 },
        { x: 40, y: 0, width: 60, height: 20 },
      ],
      'horizontal',
    )
    expect(result.map((rect) => rect.x)).toEqual([0, 20, 40])
  })
})
