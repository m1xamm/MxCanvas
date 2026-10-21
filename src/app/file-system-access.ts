export interface ProjectFileWriter {
  write(data: Blob | string): Promise<void>
  close(): Promise<void>
}

export interface ProjectFileHandle {
  readonly name: string
  getFile(): Promise<File>
  createWritable(): Promise<ProjectFileWriter>
}

interface ProjectPickerAcceptType {
  description: string
  accept: Record<string, string[]>
}

interface ProjectPickerWindow extends Window {
  showSaveFilePicker?: (options: {
    suggestedName?: string
    types?: readonly ProjectPickerAcceptType[]
  }) => Promise<ProjectFileHandle>
  showOpenFilePicker?: (options: {
    types?: readonly ProjectPickerAcceptType[]
    multiple?: boolean
  }) => Promise<ProjectFileHandle[]>
}

const PROJECT_PICKER_TYPES: readonly ProjectPickerAcceptType[] = [
  {
    description: 'MxCanvas',
    accept: { 'application/json': ['.mxc'] },
  },
]

const FILE_INPUT_ACCEPT = '.mxc,application/json'
const DOWNLOAD_URL_REVOKE_MS = 1_000

export function isFallbackMode(search: string): boolean {
  return new URLSearchParams(search).has('fallback')
}

export function canUseFilePickers(search: string): boolean {
  if (isFallbackMode(search)) return false
  const picker = window as ProjectPickerWindow
  return (
    typeof picker.showSaveFilePicker === 'function' &&
    typeof picker.showOpenFilePicker === 'function'
  )
}

export async function pickSaveHandle(suggestedName: string): Promise<ProjectFileHandle | null> {
  const picker = window as ProjectPickerWindow
  if (!picker.showSaveFilePicker) return null
  try {
    return await picker.showSaveFilePicker({
      suggestedName,
      types: PROJECT_PICKER_TYPES,
    })
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }
}

export async function pickOpenHandle(): Promise<ProjectFileHandle | null> {
  const picker = window as ProjectPickerWindow
  if (!picker.showOpenFilePicker) return null
  try {
    const handles = await picker.showOpenFilePicker({
      types: PROJECT_PICKER_TYPES,
      multiple: false,
    })
    return handles[0] ?? null
  } catch (error) {
    if (isAbortError(error)) return null
    throw error
  }
}

export function pickFileWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = FILE_INPUT_ACCEPT
    input.hidden = true
    const finish = (file: File | null) => {
      input.remove()
      resolve(file)
    }
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => finish(null), { once: true })
    document.body.append(input)
    input.click()
  })
}

export async function writeHandleText(handle: ProjectFileHandle, text: string): Promise<void> {
  const writer = await handle.createWritable()
  await writer.write(new Blob([text], { type: 'application/json' }))
  await writer.close()
}

export function downloadTextFile(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_REVOKE_MS)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
