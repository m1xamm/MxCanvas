import type { ToolId } from '../interaction/tools'
import { LeftPanel } from '../ui/LeftPanel'
import { RightPanel } from '../ui/RightPanel'
import { Toolbar } from '../ui/Toolbar'
import { CanvasStage } from './CanvasStage'
import { appStore, setTool } from './store'
import { useStoreValue } from './use-store-value'

export function App() {
  const { tool, zoom } = useStoreValue(appStore)

  const handleSelectTool = (nextTool: ToolId) => {
    setTool(nextTool)
  }

  return (
    <div class="app-shell">
      <LeftPanel />
      <CanvasStage tool={tool} />
      <RightPanel zoom={zoom} />
      <Toolbar activeTool={tool} onSelectTool={handleSelectTool} />
    </div>
  )
}
