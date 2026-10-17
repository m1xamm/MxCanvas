import { describe, expect, it } from 'vitest'
import {
  applyToPoint,
  invert,
  multiply,
  rotation,
  scaling,
  translation,
  type Mat2D,
  type Vec2,
} from './matrix'

function expectPointClose(actual: Vec2, expected: Vec2): void {
  expect(actual.x).toBeCloseTo(expected.x, 9)
  expect(actual.y).toBeCloseTo(expected.y, 9)
}

function expectMatrixClose(actual: Mat2D | null, expected: Mat2D): void {
  if (!actual) throw new Error('expected a matrix, received null')
  for (const key of Object.keys(expected) as Array<keyof Mat2D>) {
    expect(actual[key]).toBeCloseTo(expected[key], 9)
  }
}

describe('matrix', () => {
  it('translates points', () => {
    expectPointClose(applyToPoint(translation(10, -5), { x: 2, y: 3 }), { x: 12, y: -2 })
  })

  it('scales points from the origin', () => {
    expectPointClose(applyToPoint(scaling(2, 3), { x: 2, y: 3 }), { x: 4, y: 9 })
  })

  it('rotates points around the origin', () => {
    expectPointClose(applyToPoint(rotation(Math.PI / 2), { x: 1, y: 0 }), { x: 0, y: 1 })
  })

  it('applies the right matrix first when multiplying', () => {
    const composed = multiply(translation(10, -4), scaling(2, 3))
    expectPointClose(applyToPoint(composed, { x: 1, y: 1 }), { x: 12, y: -1 })
  })

  it('composes translations into a single translation', () => {
    expectMatrixClose(multiply(translation(5, 6), translation(-5, -6)), translation(0, 0))
  })

  it('inverts composed transforms', () => {
    const matrix = multiply(translation(30, 40), multiply(rotation(0.5), scaling(2, 3)))
    const inverse = invert(matrix)
    const point = { x: 7, y: -3 }
    if (!inverse) throw new Error('expected an invertible matrix')
    expectPointClose(applyToPoint(inverse, applyToPoint(matrix, point)), point)
    expectPointClose(applyToPoint(matrix, applyToPoint(inverse, point)), point)
  })

  it('returns null for singular matrices', () => {
    expect(invert(scaling(0, 1))).toBeNull()
  })
})
