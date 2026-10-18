import { describe, expect, it } from 'vitest'
import {
  clonePaint,
  hsvToRgb,
  hexToRgb,
  paintToCss,
  rgbToHex,
  rgbToHsv,
  withAlphaColor,
} from './color'

describe('color conversion', () => {
  it('formats rgb as uppercase hex', () => {
    expect(rgbToHex({ r: 13, g: 153, b: 255 })).toBe('0D99FF')
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('000000')
  })

  it('clamps out of range channels', () => {
    expect(rgbToHex({ r: 300, g: -20, b: 12.4 })).toBe('FF000C')
  })

  it('parses six digit hex with and without a hash', () => {
    expect(hexToRgb('0d99ff')).toEqual({ r: 13, g: 153, b: 255 })
    expect(hexToRgb('  #0D99FF ')).toEqual({ r: 13, g: 153, b: 255 })
  })

  it('parses three digit hex', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('f0a')).toEqual({ r: 255, g: 0, b: 170 })
  })

  it('rejects invalid hex input', () => {
    expect(hexToRgb('')).toBeNull()
    expect(hexToRgb('#12')).toBeNull()
    expect(hexToRgb('#12345g')).toBeNull()
    expect(hexToRgb('#1234567')).toBeNull()
  })

  it('converts between rgb and hsv', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 })
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 })
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(hsvToRgb({ h: 120, s: 1, v: 0.5 })).toEqual({ r: 0, g: 128, b: 0 })
  })

  it('round trips every primary sector', () => {
    const samples = [
      { r: 13, g: 153, b: 255 },
      { r: 255, g: 200, b: 10 },
      { r: 34, g: 139, b: 34 },
      { r: 200, g: 30, b: 90 },
      { r: 120, g: 120, b: 120 },
    ]
    for (const sample of samples) {
      expect(hsvToRgb(rgbToHsv(sample))).toEqual(sample)
    }
  })

  it('normalizes hue and saturation', () => {
    expect(hsvToRgb({ h: 720, s: 2, v: 1 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual({ r: 0, g: 0, b: 255 })
    expect(hsvToRgb({ h: 480, s: 1, v: 1 })).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('builds css strings', () => {
    expect(paintToCss({ type: 'solid', color: { r: 1, g: 2, b: 3 }, opacity: 0.5, visible: true })).toBe(
      'rgba(1, 2, 3, 0.5)',
    )
    expect(withAlphaColor({ r: 255, g: 0, b: 0 }, 2)).toBe('rgba(255, 0, 0, 1)')
  })

  it('clones paints without sharing arrays', () => {
    const paint = { type: 'solid' as const, color: { r: 1, g: 2, b: 3 }, opacity: 1, visible: true }
    const clone = clonePaint(paint)
    expect(clone).toEqual(paint)
    expect(clone.color).not.toBe(paint.color)
  })
})
