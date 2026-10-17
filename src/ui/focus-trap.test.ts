import { describe, expect, it } from 'vitest'
import { nextFocusIndex } from './focus-trap'

describe('nextFocusIndex', () => {
  it('cycles forward and wraps around', () => {
    expect(nextFocusIndex(3, 0, false)).toBe(1)
    expect(nextFocusIndex(3, 1, false)).toBe(2)
    expect(nextFocusIndex(3, 2, false)).toBe(0)
  })

  it('cycles backwards and wraps around', () => {
    expect(nextFocusIndex(3, 2, true)).toBe(1)
    expect(nextFocusIndex(3, 1, true)).toBe(0)
    expect(nextFocusIndex(3, 0, true)).toBe(2)
  })

  it('pulls focus inside when it is outside of the trap', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0)
    expect(nextFocusIndex(3, -1, true)).toBe(2)
  })

  it('reports nothing to focus in an empty trap', () => {
    expect(nextFocusIndex(0, -1, false)).toBe(-1)
    expect(nextFocusIndex(0, 0, true)).toBe(-1)
  })
})
