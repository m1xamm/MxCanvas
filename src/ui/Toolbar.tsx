import { TOOLS, type ToolId } from '../interaction/tools'
import { Cluster } from './Cluster'
import { TOOL_ICONS } from './icons'

export interface ToolbarProps {
  activeTool: ToolId
  onSelectTool: (tool: ToolId) => void
}

export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
  return (
    <div class="toolbar" role="toolbar" aria-label="Tools">
      <Cluster>
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id]
          const isActive = tool.id === activeTool
          return (
            <button
              key={tool.id}
              type="button"
              class={isActive ? 'control tool-button is-active' : 'control tool-button'}
              title={tool.hotkey ? `${tool.label} (${tool.hotkey})` : tool.label}
              aria-label={tool.label}
              aria-pressed={isActive}
              disabled={!tool.available}
              onClick={() => onSelectTool(tool.id)}
            >
              <Icon />
            </button>
          )
        })}
      </Cluster>
    </div>
  )
}
