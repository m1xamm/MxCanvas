export interface Vec2 {
  x: number
  y: number
}

export interface Mat2D {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

const DEGENERATE_DETERMINANT = 1e-12

export function multiply(left: Mat2D, right: Mat2D): Mat2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function translation(tx: number, ty: number): Mat2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty }
}

export function scaling(sx: number, sy: number): Mat2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }
}

export function rotation(radians: number): Mat2D {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
}

export function applyToPoint(matrix: Mat2D, point: Vec2): Vec2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

export function invert(matrix: Mat2D): Mat2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (Math.abs(determinant) < DEGENERATE_DETERMINANT) return null
  const factor = 1 / determinant
  return {
    a: matrix.d * factor,
    b: -matrix.b * factor,
    c: -matrix.c * factor,
    d: matrix.a * factor,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) * factor,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) * factor,
  }
}
