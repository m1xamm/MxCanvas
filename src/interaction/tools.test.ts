import { describe, expect, it } from 'vitest'
import {
  defaultGroupTools,
  groupDisplayTool,
  groupOfTool,
  TOOL_GROUPS,
  TOOL_HOTKEYS,
  TOOLS,
  toolDefinition,
  toolGroup,
  type ToolId,
} from './tools'

const UNIMPLEMENTED_TOOLS: readonly ToolId[] = [
  'scale',
  'frame',
  'section',
  'slice',
  'line',
  'arrow',
  'ellipse',
  'polygon',
  'star',
  'pen',
  'pencil',
  'text',
]

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

  it('keeps the hotkeys of the implemented tools', () => {
    expect([...TOOL_HOTKEYS.entries()]).toEqual([
      ['KeyV', 'move'],
      ['KeyR', 'rectangle'],
      ['KeyH', 'hand'],
    ])
  })
})

describe('tool groups', () => {
  it('assigns every tool to exactly one group', () => {
    const assigned = TOOL_GROUPS.flatMap((group) => group.tools)
    expect(new Set(assigned).size).toBe(assigned.length)
    expect(new Set(assigned)).toEqual(new Set(TOOLS.map((tool) => tool.id)))
  })

  it('resolves the group of a tool', () => {
    expect(groupOfTool('move')).toBe('move')
    expect(groupOfTool('hand')).toBe('move')
    expect(groupOfTool('scale')).toBe('move')
    expect(groupOfTool('rectangle')).toBe('shapes')
    expect(groupOfTool('star')).toBe('shapes')
    expect(groupOfTool('pencil')).toBe('pen')
    expect(groupOfTool('text')).toBe('text')
  })

  it('shows the last used tool of a group', () => {
    const lastUsed = { ...defaultGroupTools(), move: 'hand' as ToolId }
    expect(groupDisplayTool(toolGroup('move'), lastUsed)).toBe('hand')
    expect(groupDisplayTool(toolGroup('shapes'), lastUsed)).toBe('rectangle')
  })

  it('falls back to the default tool when the remembered tool is foreign', () => {
    const lastUsed = { ...defaultGroupTools(), shapes: 'text' as ToolId }
    expect(groupDisplayTool(toolGroup('shapes'), lastUsed)).toBe('rectangle')
  })

  it('starts every group on its default tool', () => {
    const defaults = defaultGroupTools()
    for (const group of TOOL_GROUPS) {
      expect(defaults[group.id]).toBe(group.defaultTool)
      expect(group.tools).toContain(group.defaultTool)
    }
  })

  it('marks the unimplemented tools as unavailable', () => {
    for (const id of ['move', 'hand', 'rectangle'] as const) {
      expect(toolDefinition(id).available).toBe(true)
    }
    for (const id of UNIMPLEMENTED_TOOLS) {
      expect(toolDefinition(id).available).toBe(false)
    }
  })
})
