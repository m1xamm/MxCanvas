import { useEffect, useRef, useState } from 'preact/hooks'
import type { ProjectErrorCode } from '../core/serialization/project-file'
import { PROJECT_EXTENSION } from '../core/serialization/project-file'
import type { ToolId } from '../interaction/tools'
import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'
import { LeftPanel } from '../ui/LeftPanel'
import { MessageDialog } from '../ui/MessageDialog'
import { RightPanel } from '../ui/RightPanel'
import { SettingsDialog } from '../ui/SettingsDialog'
import { Toolbar } from '../ui/Toolbar'
import { UnsavedChangesDialog } from '../ui/UnsavedChangesDialog'
import { CanvasStage } from './CanvasStage'
import {
  newProject,
  openDroppedProject,
  openProject,
  saveProject,
  saveProjectAs,
  type ProjectFileErrorCode,
  type ProjectFileResult,
} from './project-files'
import { projectDirtyStore } from './project-session'
import { appStore, setTool } from './store'
import { useStoreValue } from './use-store-value'

type ProjectAction = { type: 'new' } | { type: 'open' } | { type: 'drop'; file: File }

type AppDialog =
  | { kind: 'confirm'; action: ProjectAction }
  | { kind: 'error'; title: MessageKey; message: MessageKey }

const PROJECT_ERROR_KEYS: Record<ProjectErrorCode, MessageKey> = {
  invalidJson: 'projectErrors.invalidJson',
  invalidFormat: 'projectErrors.invalidFormat',
  invalidVersion: 'projectErrors.invalidVersion',
  newerVersion: 'projectErrors.newerVersion',
  fileTooLarge: 'projectErrors.fileTooLarge',
  invalidDocument: 'projectErrors.invalidDocument',
  unsupportedNode: 'projectErrors.unsupportedNode',
}

export function App() {
  const t = useTranslation()
  const { tool, zoom, lastToolByGroup } = useStoreValue(appStore)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dialog, setDialog] = useState<AppDialog | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const blockedRef = useRef(false)
  blockedRef.current = settingsOpen || dialog !== null

  const showFileError = (result: ProjectFileResult, title: MessageKey) => {
    if (result.status !== 'error') return
    setDialog({ kind: 'error', title, message: fileErrorMessage(result.code) })
  }

  const runAction = async (action: ProjectAction): Promise<void> => {
    if (action.type === 'new') {
      newProject()
      return
    }
    const result =
      action.type === 'open' ? await openProject() : await openDroppedProject(action.file)
    showFileError(result, 'openFailedTitle')
  }

  const requestAction = (action: ProjectAction) => {
    if (projectDirtyStore.get()) {
      setDialog({ kind: 'confirm', action })
      return
    }
    void runAction(action)
  }

  const save = async (asNewFile: boolean): Promise<void> => {
    const result = asNewFile ? await saveProjectAs() : await saveProject()
    showFileError(result, 'saveFailedTitle')
  }

  const saveBeforeAction = async (action: ProjectAction): Promise<void> => {
    const result = await saveProject()
    if (result.status === 'ok') {
      setDialog(null)
      void runAction(action)
      return
    }
    showFileError(result, 'saveFailedTitle')
  }

  const discardAndRun = (action: ProjectAction) => {
    setDialog(null)
    void runAction(action)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (blockedRef.current) return
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.code === 'KeyS') {
        event.preventDefault()
        void save(event.shiftKey)
        return
      }
      if (event.code === 'KeyN') {
        event.preventDefault()
        requestAction({ type: 'new' })
        return
      }
      if (event.code === 'KeyO') {
        event.preventDefault()
        requestAction({ type: 'open' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      const transfer = event.dataTransfer
      if (!transfer || !Array.from(transfer.types).includes('Files')) return
      event.preventDefault()
      transfer.dropEffect = 'copy'
    }
    const onDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return
      event.preventDefault()
      if (blockedRef.current) return
      const list = Array.from(files)
      const file =
        list.find((item) => item.name.toLowerCase().endsWith(PROJECT_EXTENSION)) ?? list[0]
      if (file) requestAction({ type: 'drop', file })
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  const handleSelectTool = (nextTool: ToolId) => {
    setTool(nextTool)
  }

  const closeSettings = () => {
    setSettingsOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div class="app-shell">
      <LeftPanel
        onNew={() => requestAction({ type: 'new' })}
        onOpen={() => requestAction({ type: 'open' })}
        onSave={() => void save(false)}
        onSaveAs={() => void save(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        menuButtonRef={menuButtonRef}
      />
      <CanvasStage tool={tool} inputBlocked={settingsOpen || dialog !== null} />
      <RightPanel zoom={zoom} />
      <Toolbar
        activeTool={tool}
        lastToolByGroup={lastToolByGroup}
        onSelectTool={handleSelectTool}
      />
      {settingsOpen && <SettingsDialog onClose={closeSettings} />}
      {dialog?.kind === 'confirm' && (
        <UnsavedChangesDialog
          onSave={() => void saveBeforeAction(dialog.action)}
          onDiscard={() => discardAndRun(dialog.action)}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'error' && (
        <MessageDialog
          title={t(dialog.title)}
          message={t(dialog.message)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function fileErrorMessage(code: ProjectFileErrorCode): MessageKey {
  if (code === 'readFailed') return 'readFailed'
  if (code === 'writeFailed') return 'writeFailed'
  return PROJECT_ERROR_KEYS[code]
}
