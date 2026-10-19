import { describe, expect, it } from 'vitest'
import { createRectangleNode } from './document/create-node'
import { summarizeFills, summarizeStrokes } from './paints'
import type { Paint, RectangleNode } from './document/types'

function rectangle(id: string, fills: Paint[] = [], strokes: Paint[] = []): RectangleNode {
  const node = createRectangleNode({ id, name: id, x: 0, y: 0, width: 100, height: 100 })
  return { ...node, fills, strokes }
}

function solid(hex: number, opacity = 1, visible = true): Paint {
  return { type: 'solid', color: { r: hex, g: hex, b: hex }, opacity, visible }
}

describe('summarizeFills', () => {
  it('lists every fill of a single node from the top down', () => {
    const rows = summarizeFills([rectangle('a', [solid(1), solid(2), solid(3)])])
    expect(rows.map((row) => row.paint.color.r)).toEqual([3, 2, 1])
    expect(rows.every((row) => !row.mixedColor && !row.mixedOpacity && !row.mixedVisible)).toBe(true)
  })

  it('uses the primary node for the shown values', () => {
    const rows = summarizeFills([rectangle('a', [solid(10)]), rectangle('b', [solid(200)])])
    expect(rows[0]?.paint.color.r).toBe(10)
    expect(rows[0]?.mixedColor).toBe(true)
    expect(rows[0]?.mixedOpacity).toBe(false)
  })

  it('keeps rows beyond the first node fills', () => {
    const rows = summarizeFills([rectangle('a', [solid(1)]), rectangle('b', [solid(2), solid(3)])])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.paint.color.r).toBe(1)
    expect(rows[0]?.mixedColor).toBe(true)
    expect(rows[1]?.paint.color.r).toBe(2)
    expect(rows[1]?.mixedColor).toBe(false)
  })

  it('flags mixed opacity and visibility', () => {
    const rows = summarizeFills([
      rectangle('a', [solid(5, 0.5, true)]),
      rectangle('b', [solid(5, 1, false)]),
    ])
    expect(rows[0]?.mixedColor).toBe(false)
    expect(rows[0]?.mixedOpacity).toBe(true)
    expect(rows[0]?.mixedVisible).toBe(true)
  })

  it('returns nothing without nodes', () => {
    expect(summarizeFills([])).toEqual([])
  })
})

describe('summarizeStrokes', () => {
  it('returns nothing when no node has a stroke', () => {
    expect(summarizeStrokes([rectangle('a', [solid(1)])])).toEqual([])
  })

  it('lists stroke rows the same way as fills', () => {
    const rows = summarizeStrokes([
      rectangle('a', [], [solid(20)]),
      rectangle('b', [], [solid(30), solid(40)]),
    ])
    expect(rows.map((row) => row.paint.color.r)).toEqual([20, 30])
    expect(rows[0]?.mixedColor).toBe(true)
    expect(rows[1]?.mixedColor).toBe(false)
  })
})
