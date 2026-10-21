import { describe, expect, it } from 'vitest'
import {
  documentNameFromFileName,
  projectFileNameFor,
  sanitizeFileBaseName,
} from './project-file-name'

describe('project file names', () => {
  it('replaces characters that file systems reject', () => {
    expect(sanitizeFileBaseName('Landing: v1 / final?')).toBe('Landing v1 final')
    expect(sanitizeFileBaseName('a<b>c|d*e')).toBe('a b c d e')
  })

  it('trims dots and spaces and falls back to a title', () => {
    expect(sanitizeFileBaseName('  Card.  ')).toBe('Card')
    expect(sanitizeFileBaseName('   ')).toBe('Untitled')
    expect(sanitizeFileBaseName('...')).toBe('Untitled')
  })

  it('appends the project extension once', () => {
    expect(projectFileNameFor('Landing', 'Untitled')).toBe('Landing.mxc')
    expect(projectFileNameFor('Landing.MXC', 'Untitled')).toBe('Landing.MXC')
    expect(projectFileNameFor(null, 'Без названия')).toBe('Без названия.mxc')
  })

  it('keeps the base name when saving as', () => {
    expect(documentNameFromFileName('Landing page.mxc')).toBe('Landing page')
    expect(documentNameFromFileName('Landing.MXC')).toBe('Landing')
    expect(documentNameFromFileName('bad:name.mxc')).toBe('bad name')
  })

  it('keeps Cyrillic names intact', () => {
    expect(projectFileNameFor('Макет сайта', 'Без названия')).toBe('Макет сайта.mxc')
    expect(documentNameFromFileName('Макет сайта.mxc')).toBe('Макет сайта')
  })
})
