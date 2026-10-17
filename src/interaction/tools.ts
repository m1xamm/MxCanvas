export type ToolId = 'move' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'pen' | 'text' | 'hand'

export interface ToolDefinition {
  id: ToolId
  label: string
  hotkey?: string
  available: boolean
}

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'move', label: 'Move', hotkey: 'V', available: true },
  { id: 'frame', label: 'Frame', available: false },
  { id: 'rectangle', label: 'Rectangle', available: false },
  { id: 'ellipse', label: 'Ellipse', available: false },
  { id: 'line', label: 'Line', available: false },
  { id: 'pen', label: 'Pen', available: false },
  { id: 'text', label: 'Text', available: false },
  { id: 'hand', label: 'Hand', hotkey: 'H', available: true },
]

export const TOOL_HOTKEYS: ReadonlyMap<string, ToolId> = new Map([
  ['KeyV', 'move'],
  ['KeyH', 'hand'],
])
