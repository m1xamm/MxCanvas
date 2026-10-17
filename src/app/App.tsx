import { useRef, useState } from 'preact/hooks'
import type { ToolId } from '../interaction/tools'
import { LeftPanel } from '../ui/LeftPanel'
import { RightPanel } from '../ui/RightPanel'
import { SettingsDialog } from '../ui/SettingsDialog'
import { Toolbar } from '../ui/Toolbar'
import { CanvasStage } from './CanvasStage'
import { appStore, setTool } from './store'
import { useStoreValue } from './use-store-value'

export function App() {
  const { tool, zoom } = useStoreValue(appStore)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  const handleSelectTool = (nextTool: ToolId) => {
    setTool(nextTool)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div class="app-shell">
      <LeftPanel onOpenSettings={() => setSettingsOpen(true)} menuButtonRef={menuButtonRef} />
      <CanvasStage tool={tool} inputBlocked={settingsOpen} />
      <RightPanel zoom={zoom} />
      <Toolbar activeTool={tool} onSelectTool={handleSelectTool} />
      {settingsOpen && <SettingsDialog onClose={closeSettings} />}
    </div>
  )
}
