export type ToolId = 'move' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'pen' | 'text' | 'hand'

export interface ToolDefinition {
  id: ToolId
  hotkey?: string
  available: boolean
}

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'move', hotkey: 'V', available: true },
  { id: 'frame', available: false },
  { id: 'rectangle', hotkey: 'R', available: true },
  { id: 'ellipse', available: false },
  { id: 'line', available: false },
  { id: 'pen', available: false },
  { id: 'text', available: false },
  { id: 'hand', hotkey: 'H', available: true },
]

export const TOOL_HOTKEYS: ReadonlyMap<string, ToolId> = new Map([
  ['KeyV', 'move'],
  ['KeyR', 'rectangle'],
  ['KeyH', 'hand'],
])
