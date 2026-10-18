import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { useTranslation } from '../i18n/use-i18n'
import {
  groupDisplayTool,
  TOOL_GROUPS,
  type ToolGroupId,
  type ToolId,
} from '../interaction/tools'
import { Cluster } from './Cluster'
import { ToolGroupButton } from './ToolGroupButton'

export interface ToolbarProps {
  activeTool: ToolId
  lastToolByGroup: Readonly<Record<ToolGroupId, ToolId>>
  onSelectTool: (tool: ToolId) => void
}

interface IndicatorBox {
  left: number
  width: number
}

export function Toolbar({ activeTool, lastToolByGroup, onSelectTool }: ToolbarProps) {
  const t = useTranslation()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const update = () => {
      const active = root.querySelector<HTMLElement>('.tool-group.is-active')
      setIndicator(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(root)
    return () => observer.disconnect()
  }, [activeTool])

  return (
    <Cluster class="toolbar" role="toolbar" ariaLabel={t('toolbarLabel')} rootRef={rootRef}>
      {indicator && (
        <span
          class="toolbar__indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
          }}
        />
      )}
      {TOOL_GROUPS.map((group) => (
        <ToolGroupButton
          key={group.id}
          group={group}
          tool={groupDisplayTool(group, lastToolByGroup)}
          activeTool={activeTool}
          onSelectTool={onSelectTool}
        />
      ))}
    </Cluster>
  )
}
