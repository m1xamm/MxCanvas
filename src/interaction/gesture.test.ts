import { describe, expect, it } from 'vitest'
import { isDrag, moveDelta } from './gesture'

describe('isDrag', () => {
  it('counts movement under 3px as a click', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false)
    expect(isDrag({ x: 0, y: 0 }, { x: 2.9, y: 2.9 })).toBe(false)
    expect(isDrag({ x: 10, y: 10 }, { x: 7.1, y: 12.9 })).toBe(false)
  })

  it('treats 3px as a drag', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(true)
    expect(isDrag({ x: 0, y: 0 }, { x: 0, y: -3 })).toBe(true)
  })
})

describe('moveDelta', () => {
  it('returns the full delta without an axis lock', () => {
    expect(moveDelta({ x: 10, y: 10 }, { x: 40, y: 25 }, false)).toEqual({ x: 30, y: 15 })
    expect(moveDelta({ x: 40, y: 25 }, { x: 10, y: 40 }, false)).toEqual({ x: -30, y: 15 })
  })

  it('locks the movement to the dominant axis', () => {
    expect(moveDelta({ x: 0, y: 0 }, { x: 40, y: 25 }, true)).toEqual({ x: 40, y: 0 })
    expect(moveDelta({ x: 0, y: 0 }, { x: -20, y: 45 }, true)).toEqual({ x: 0, y: 45 })
    expect(moveDelta({ x: 0, y: 0 }, { x: 30, y: 30 }, true)).toEqual({ x: 30, y: 0 })
  })
})
