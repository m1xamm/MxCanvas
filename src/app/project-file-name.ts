import { PROJECT_EXTENSION } from '../core/serialization/project-file'

const INVALID_FILE_NAME = /[<>:"/\\|?*\u0000-\u001f]/g
const TRAILING_DOTS_AND_SPACES = /[. ]+$/g
const WHITESPACE = /\s+/g
const MAX_FILE_BASE_LENGTH = 120

export function sanitizeFileBaseName(value: string): string {
  const base = value
    .replace(INVALID_FILE_NAME, ' ')
    .replace(WHITESPACE, ' ')
    .trim()
    .replace(TRAILING_DOTS_AND_SPACES, '')
  if (base === '') return 'Untitled'
  return base.slice(0, MAX_FILE_BASE_LENGTH)
}

export function projectFileNameFor(name: string | null, untitledName: string): string {
  const base = sanitizeFileBaseName(name ?? untitledName)
  return base.toLowerCase().endsWith(PROJECT_EXTENSION)
    ? base
    : `${base}${PROJECT_EXTENSION}`
}

export function documentNameFromFileName(fileName: string): string {
  const base = fileName.toLowerCase().endsWith(PROJECT_EXTENSION)
    ? fileName.slice(0, -PROJECT_EXTENSION.length)
    : fileName
  return sanitizeFileBaseName(base)
}
