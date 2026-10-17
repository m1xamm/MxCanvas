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

export function Toolbar({ activeTool, lastToolByGroup, onSelectTool }: ToolbarProps) {
  const t = useTranslation()
  return (
    <Cluster class="toolbar" role="toolbar" ariaLabel={t('toolbarLabel')}>
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
