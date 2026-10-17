import { useRef, useState } from 'preact/hooks'
import { toolDefinition, type ToolGroup, type ToolId } from '../interaction/tools'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { ChevronIcon, TOOL_ICONS } from './icons'
import { useDismiss } from './use-dismiss'

export interface ToolGroupButtonProps {
  group: ToolGroup
  tool: ToolId
  activeTool: ToolId
  onSelectTool: (tool: ToolId) => void
}

export function ToolGroupButton({ group, tool, activeTool, onSelectTool }: ToolGroupButtonProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useDismiss(open, () => setOpen(false), rootRef)

  const definition = toolDefinition(tool)
  const isActive = group.tools.includes(activeTool)
  const Icon = TOOL_ICONS[tool]
  const label = t(`tools.${tool}`)

  return (
    <div class={isActive ? 'tool-group is-active' : 'tool-group'} ref={rootRef}>
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
      {open && (
        <Cluster direction="vertical" class="menu-popup menu-popup--above" role="menu">
          {group.tools.map((id) => {
            const item = toolDefinition(id)
            const itemLabel = t(`tools.${id}`)
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                class="control menu-item menu-item--tool"
                disabled={!item.available}
                onClick={() => {
                  setOpen(false)
                  onSelectTool(id)
                }}
              >
                <span>{itemLabel}</span>
                {item.hotkey && <span class="menu-item__hotkey">{item.hotkey}</span>}
              </button>
            )
          })}
        </Cluster>
      )}
    </div>
  )
}
