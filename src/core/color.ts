import type { RgbColor, SolidPaint } from './document/types'

export interface HsvColor {
  h: number
  s: number
  v: number
}

const MAX_CHANNEL = 255
const HEX_RADIX = 16
const SHORT_HEX_LENGTH = 3
const FULL_HEX_LENGTH = 6
const HUE_SECTOR = 60
const FULL_TURN = 360

export function rgbToHex(color: RgbColor): string {
  return [color.r, color.g, color.b]
    .map((channel) => clampChannel(channel).toString(HEX_RADIX).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]+$/i.test(cleaned)) return null
  if (cleaned.length !== SHORT_HEX_LENGTH && cleaned.length !== FULL_HEX_LENGTH) return null
  const expanded =
    cleaned.length === SHORT_HEX_LENGTH
      ? cleaned
          .split('')
          .map((digit) => `${digit}${digit}`)
          .join('')
      : cleaned
  const value = Number.parseInt(expanded, HEX_RADIX)
  return {
    r: (value >> 16) & MAX_CHANNEL,
    g: (value >> 8) & MAX_CHANNEL,
    b: value & MAX_CHANNEL,
  }
}

export function rgbToHsv(color: RgbColor): HsvColor {
  const r = clampChannel(color.r) / MAX_CHANNEL
  const g = clampChannel(color.g) / MAX_CHANNEL
  const b = clampChannel(color.b) / MAX_CHANNEL
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const hue = max === min ? 0 : hueOf(r, g, b, max, delta)
  return { h: (hue + FULL_TURN) % FULL_TURN, s: max === 0 ? 0 : delta / max, v: max }
}

export function hsvToRgb(hsv: HsvColor): RgbColor {
  const hue = ((hsv.h % FULL_TURN) + FULL_TURN) % FULL_TURN
  const saturation = clamp01(hsv.s)
  const value = clamp01(hsv.v)
  const chroma = value * saturation
  const sector = hue / HUE_SECTOR
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1))
  const offset = value - chroma
  const [r, g, b] = sectorRgb(sector, chroma, secondary)
  return {
    r: Math.round((r + offset) * MAX_CHANNEL),
    g: Math.round((g + offset) * MAX_CHANNEL),
    b: Math.round((b + offset) * MAX_CHANNEL),
  }
}

export function clonePaint(paint: SolidPaint): SolidPaint {
  return { ...paint, color: { ...paint.color } }
}

export function clonePaints(paints: readonly SolidPaint[]): SolidPaint[] {
  return paints.map(clonePaint)
}

export function paintToCss(paint: SolidPaint): string {
  const { r, g, b } = paint.color
  return `rgba(${r}, ${g}, ${b}, ${clamp01(paint.opacity)})`
}

export function withAlphaColor(color: RgbColor, alpha: number): string {
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${clamp01(alpha)})`
}

export function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_CHANNEL, Math.max(0, Math.round(value)))
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function hueOf(r: number, g: number, b: number, max: number, delta: number): number {
  if (max === r) return HUE_SECTOR * (((g - b) / delta) % 6)
  if (max === g) return HUE_SECTOR * ((b - r) / delta + 2)
  return HUE_SECTOR * ((r - g) / delta + 4)
}

function sectorRgb(sector: number, chroma: number, secondary: number): [number, number, number] {
  if (sector < 1) return [chroma, secondary, 0]
  if (sector < 2) return [secondary, chroma, 0]
  if (sector < 3) return [0, chroma, secondary]
  if (sector < 4) return [0, secondary, chroma]
  if (sector < 5) return [secondary, 0, chroma]
  return [chroma, 0, secondary]
}
