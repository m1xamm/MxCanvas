import { useTranslation } from '../i18n/use-i18n'
import { TOOLS, type ToolId } from '../interaction/tools'
import { Cluster } from './Cluster'
import { TOOL_ICONS } from './icons'

export interface ToolbarProps {
  activeTool: ToolId
  onSelectTool: (tool: ToolId) => void
}

export function Toolbar({ activeTool, onSelectTool }: ToolbarProps) {
  const t = useTranslation()
  return (
    <Cluster class="toolbar" role="toolbar" ariaLabel={t('toolbarLabel')}>
      {TOOLS.map((tool) => {
        const Icon = TOOL_ICONS[tool.id]
        const isActive = tool.id === activeTool
        const label = t(`tools.${tool.id}`)
        return (
          <button
            key={tool.id}
            type="button"
            class={isActive ? 'control tool-button is-active' : 'control tool-button'}
            title={tool.hotkey ? `${label} (${tool.hotkey})` : label}
            aria-label={label}
            aria-pressed={isActive}
            disabled={!tool.available}
            onClick={() => onSelectTool(tool.id)}
          >
            <Icon />
          </button>
        )
      })}
    </Cluster>
  )
}
