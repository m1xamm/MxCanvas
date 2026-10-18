import { useRef, useState } from 'preact/hooks'
import { toolDefinition, type ToolGroup, type ToolId } from '../interaction/tools'
import { useTranslation } from '../i18n/use-i18n'
import { ChevronIcon, TOOL_ICONS } from './icons'
import { MenuItem } from './MenuItem'
import { Popup } from './Popup'

export interface ToolGroupButtonProps {
  group: ToolGroup
  tool: ToolId
  activeTool: ToolId
  onSelectTool: (tool: ToolId) => void
}

export function ToolGroupButton({ group, tool, activeTool, onSelectTool }: ToolGroupButtonProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement | null>(null)

  const definition = toolDefinition(tool)
  const isActive = group.tools.includes(activeTool)
  const Icon = TOOL_ICONS[tool]
  const label = t(`tools.${tool}`)

  return (
    <div class={isActive ? 'tool-group is-active' : 'tool-group'} ref={groupRef}>
      <button
        type="button"
        class="control tool-group__main"
        title={definition.hotkey ? `${label} (${definition.hotkey})` : label}
        aria-label={label}
        aria-pressed={isActive}
        disabled={!definition.available}
        onClick={() => onSelectTool(tool)}
      >
        <Icon />
      </button>
      <button
        type="button"
        class="control tool-group__chevron"
        aria-label={t('toolGroupMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronIcon />
      </button>
      <Popup
        open={open}
        anchorRef={groupRef}
        side="above"
        align="center"
        ariaLabel={t('toolGroupMenu')}
        onClose={() => setOpen(false)}
      >
        {group.tools.map((id) => {
          const item = toolDefinition(id)
          return (
            <MenuItem
              key={id}
              icon={TOOL_ICONS[id]}
              label={t(`tools.${id}`)}
              hotkey={item.hotkey}
              disabled={!item.available}
              onClick={() => {
                setOpen(false)
                onSelectTool(id)
              }}
            />
          )
        })}
      </Popup>
    </div>
  )
}
