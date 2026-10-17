export type ToolId =
  | 'move'
  | 'hand'
  | 'scale'
  | 'frame'
  | 'section'
  | 'slice'
  | 'rectangle'
  | 'line'
  | 'arrow'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'pen'
  | 'pencil'
  | 'text'

export type ToolGroupId = 'move' | 'frame' | 'shapes' | 'pen' | 'text'

export interface ToolDefinition {
  id: ToolId
  hotkey?: string
  available: boolean
}

export interface ToolGroup {
  id: ToolGroupId
  defaultTool: ToolId
  tools: readonly ToolId[]
}

export const TOOL_GROUPS: readonly ToolGroup[] = [
  { id: 'move', defaultTool: 'move', tools: ['move', 'hand', 'scale'] },
  { id: 'frame', defaultTool: 'frame', tools: ['frame', 'section', 'slice'] },
  {
    id: 'shapes',
    defaultTool: 'rectangle',
    tools: ['rectangle', 'line', 'arrow', 'ellipse', 'polygon', 'star'],
  },
  { id: 'pen', defaultTool: 'pen', tools: ['pen', 'pencil'] },
  { id: 'text', defaultTool: 'text', tools: ['text'] },
]

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'move', hotkey: 'V', available: true },
  { id: 'hand', hotkey: 'H', available: true },
  { id: 'scale', hotkey: 'K', available: false },
  { id: 'frame', hotkey: 'F', available: false },
  { id: 'section', hotkey: 'Shift+S', available: false },
  { id: 'slice', hotkey: 'S', available: false },
  { id: 'rectangle', hotkey: 'R', available: true },
  { id: 'line', hotkey: 'L', available: false },
  { id: 'arrow', hotkey: 'Shift+L', available: false },
  { id: 'ellipse', hotkey: 'O', available: false },
  { id: 'polygon', available: false },
  { id: 'star', available: false },
  { id: 'pen', hotkey: 'P', available: false },
  { id: 'pencil', hotkey: 'Shift+P', available: false },
  { id: 'text', hotkey: 'T', available: false },
]

export const TOOL_HOTKEYS: ReadonlyMap<string, ToolId> = new Map([
  ['KeyV', 'move'],
  ['KeyR', 'rectangle'],
  ['KeyH', 'hand'],
])

export function toolDefinition(id: ToolId): ToolDefinition {
  const definition = TOOLS.find((tool) => tool.id === id)
  if (!definition) throw new Error(`Unknown tool: ${id}`)
  return definition
}

export function toolGroup(id: ToolGroupId): ToolGroup {
  const group = TOOL_GROUPS.find((candidate) => candidate.id === id)
  if (!group) throw new Error(`Unknown tool group: ${id}`)
  return group
}

export function groupOfTool(id: ToolId): ToolGroupId {
  const group = TOOL_GROUPS.find((candidate) => candidate.tools.includes(id))
  if (!group) throw new Error(`Tool has no group: ${id}`)
  return group.id
}

export function groupDisplayTool(
  group: ToolGroup,
  lastUsed: Readonly<Record<ToolGroupId, ToolId>>,
): ToolId {
  const candidate = lastUsed[group.id]
  return group.tools.includes(candidate) ? candidate : group.defaultTool
}

export function defaultGroupTools(): Record<ToolGroupId, ToolId> {
  const record = {} as Record<ToolGroupId, ToolId>
  for (const group of TOOL_GROUPS) record[group.id] = group.defaultTool
  return record
}
