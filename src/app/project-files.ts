import {
  ProjectFileError,
  parseProject,
  type ProjectErrorCode,
} from '../core/serialization/project-file'
import { t } from '../i18n/i18n'
import {
  applyProjectSnapshot,
  documentNameStore,
  resetProject,
  serializeCurrentProject,
  setDocumentName,
  setProjectDirty,
} from './project-session'
import {
  canUseFilePickers,
  downloadTextFile,
  pickFileWithInput,
  pickOpenHandle,
  pickSaveHandle,
  writeHandleText,
  type ProjectFileHandle,
} from './file-system-access'
import { documentNameFromFileName, projectFileNameFor } from './project-file-name'

export type ProjectFileErrorCode = ProjectErrorCode | 'readFailed' | 'writeFailed'

export type ProjectFileResult =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'error'; code: ProjectFileErrorCode }

interface OpenSource {
  file: File
  handle: ProjectFileHandle | null
}

let fileHandle: ProjectFileHandle | null = null

export function newProject(): void {
  fileHandle = null
  resetProject()
}

export async function openProject(): Promise<ProjectFileResult> {
  let source: OpenSource | null
  try {
    source = await selectOpenSource()
  } catch {
    return readError()
  }
  if (!source) return { status: 'cancelled' }
  return openSource(source)
}

export async function openDroppedProject(file: File): Promise<ProjectFileResult> {
  return openSource({ file, handle: null })
}

export function saveProject(): Promise<ProjectFileResult> {
  if (fileHandle) return writeToHandle(fileHandle, false)
  return saveProjectAs()
}

export async function saveProjectAs(): Promise<ProjectFileResult> {
  const fileName = projectFileNameFor(documentNameStore.get(), t('untitledFile'))
  if (canUseFilePickers(window.location.search)) {
    let handle: ProjectFileHandle | null
    try {
      handle = await pickSaveHandle(fileName)
    } catch {
      return writeError()
    }
    if (!handle) return { status: 'cancelled' }
    return writeToHandle(handle, true)
  }
  let text: string
  try {
    text = serializeCurrentProject()
  } catch {
    return writeError()
  }
  try {
    downloadTextFile(text, fileName)
  } catch {
    return writeError()
  }
  adoptDocumentName(fileName)
  setProjectDirty(false)
  return { status: 'ok' }
}

async function selectOpenSource(): Promise<OpenSource | null> {
  if (canUseFilePickers(window.location.search)) {
    const handle = await pickOpenHandle()
    if (!handle) return null
    return { file: await handle.getFile(), handle }
  }
  const file = await pickFileWithInput()
  return file ? { file, handle: null } : null
}

async function openSource(source: OpenSource): Promise<ProjectFileResult> {
  let text: string
  try {
    text = await source.file.text()
  } catch {
    return readError()
  }
  try {
    const snapshot = parseProject(text)
    fileHandle = source.handle
    applyProjectSnapshot(snapshot)
    return { status: 'ok' }
  } catch (error) {
    return { status: 'error', code: errorCodeOf(error) }
  }
}

async function writeToHandle(
  handle: ProjectFileHandle,
  adoptName: boolean,
): Promise<ProjectFileResult> {
  const text = serializeCurrentProject()
  try {
    await writeHandleText(handle, text)
  } catch {
    return writeError()
  }
  fileHandle = handle
  if (adoptName) adoptDocumentName(handle.name)
  setProjectDirty(false)
  return { status: 'ok' }
}

function adoptDocumentName(fileName: string): void {
  if (documentNameStore.get() !== null) return
  setDocumentName(documentNameFromFileName(fileName))
}

function errorCodeOf(error: unknown): ProjectFileErrorCode {
  return error instanceof ProjectFileError ? error.code : 'invalidDocument'
}

function readError(): ProjectFileResult {
  return { status: 'error', code: 'readFailed' }
}

function writeError(): ProjectFileResult {
  return { status: 'error', code: 'writeFailed' }
}
