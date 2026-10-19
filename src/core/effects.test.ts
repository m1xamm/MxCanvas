import { describe, expect, it } from 'vitest'
import { createRectangleNode } from './document/create-node'
import { cloneEffect, DEFAULT_DROP_SHADOW, summarizeEffects } from './effects'
import type { DropShadowEffect, RectangleNode } from './document/types'

function rectangle(id: string, effects: DropShadowEffect[] = []): RectangleNode {
  const node = createRectangleNode({ id, name: id, x: 0, y: 0, width: 100, height: 100 })
  return { ...node, effects }
}

function shadow(offsetY: number, blur = 4): DropShadowEffect {
  return { ...DEFAULT_DROP_SHADOW, offsetY, blur, color: { r: 0, g: 0, b: 0 } }
}

describe('cloneEffect', () => {
  it('copies the color object', () => {
    const source = shadow(2)
    const copy = cloneEffect(source)
    copy.color.r = 200
    expect(source.color.r).toBe(0)
  })
})

describe('summarizeEffects', () => {
  it('returns nothing when no node has an effect', () => {
    expect(summarizeEffects([rectangle('a')])).toEqual([])
  })

  it('lists the effects of a single node from the top down', () => {
    const rows = summarizeEffects([rectangle('a', [shadow(2), shadow(6)])])
    expect(rows.map((row) => row.effect.offsetY)).toEqual([6, 2])
    expect(rows.every((row) => !row.mixedOffsetY && !row.mixedBlur)).toBe(true)
  })

  it('flags mixed values against the first node', () => {
    const rows = summarizeEffects([
      rectangle('a', [shadow(2, 8)]),
      rectangle('b', [shadow(2, 16)]),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.effect.blur).toBe(8)
    expect(rows[0]?.mixedBlur).toBe(true)
    expect(rows[0]?.mixedOffsetY).toBe(false)
  })

  it('keeps rows beyond the first node effects', () => {
    const rows = summarizeEffects([rectangle('a', [shadow(2)]), rectangle('b', [shadow(1), shadow(3)])])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.effect.offsetY).toBe(2)
    expect(rows[0]?.mixedOffsetY).toBe(true)
    expect(rows[1]?.mixedOffsetY).toBe(false)
  })
})
