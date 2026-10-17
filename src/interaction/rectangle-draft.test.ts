import { describe, expect, it } from 'vitest'
import { rectangleFromDrag } from './rectangle-draft'

const NO_MODIFIERS = { square: false, fromCenter: false }
const SQUARE_ONLY = { square: true, fromCenter: false }
const CENTER_ONLY = { square: false, fromCenter: true }
const SQUARE_FROM_CENTER = { square: true, fromCenter: true }

describe('rectangleFromDrag', () => {
  it('creates a rect from a drag in any direction', () => {
    expect(rectangleFromDrag({ x: 10, y: 10 }, { x: 110, y: 60 }, NO_MODIFIERS)).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
    expect(rectangleFromDrag({ x: 110, y: 60 }, { x: 10, y: 10 }, NO_MODIFIERS)).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
  })

  it('snaps to a square with shift held', () => {
    expect(rectangleFromDrag({ x: 0, y: 0 }, { x: 100, y: 40 }, SQUARE_ONLY)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    expect(rectangleFromDrag({ x: 100, y: 100 }, { x: 0, y: 40 }, SQUARE_ONLY)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it('grows from the center with alt held', () => {
    expect(rectangleFromDrag({ x: 100, y: 100 }, { x: 120, y: 130 }, CENTER_ONLY)).toEqual({
      x: 80,
      y: 70,
      width: 40,
      height: 60,
    })
  })

  it('combines shift and alt', () => {
    expect(
      rectangleFromDrag({ x: 100, y: 100 }, { x: 120, y: 130 }, SQUARE_FROM_CENTER),
    ).toEqual({ x: 70, y: 70, width: 60, height: 60 })
  })

  it('creates a 100x100 rect at the click point when movement is under 3px', () => {
    expect(rectangleFromDrag({ x: 50, y: 50 }, { x: 51, y: 52.9 }, NO_MODIFIERS)).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    })
    expect(rectangleFromDrag({ x: 50, y: 50 }, { x: 50, y: 50 }, SQUARE_FROM_CENTER)).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    })
  })

  it('treats a 3px drag as a drag', () => {
    expect(rectangleFromDrag({ x: 0, y: 0 }, { x: 3, y: 0 }, NO_MODIFIERS)).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 0,
    })
  })
})
