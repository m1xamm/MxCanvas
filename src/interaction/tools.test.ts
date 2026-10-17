import { describe, expect, it } from 'vitest'
import { TOOL_HOTKEYS, TOOLS } from './tools'

describe('tool hotkeys', () => {
  it('maps hotkeys to physical key codes only', () => {
    const codes = [...TOOL_HOTKEYS.keys()]
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) expect(code).toMatch(/^Key[A-Z]$/)
  })

  it('maps hotkeys only for available tools', () => {
    const availableTools = new Set(TOOLS.filter((tool) => tool.available).map((tool) => tool.id))
    for (const toolId of TOOL_HOTKEYS.values()) expect(availableTools.has(toolId)).toBe(true)
  })
})
