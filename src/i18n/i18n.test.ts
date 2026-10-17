import { afterEach, describe, expect, it, vi } from 'vitest'
import { en } from './en'
import { matchLanguage, setLanguage, subscribeLanguage, t } from './i18n'
import { ru } from './ru'

function collectLeafKeys(dictionary: object, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix === '' ? key : `${prefix}.${key}`
    if (typeof value === 'string') {
      keys.push(path)
    } else {
      keys.push(...collectLeafKeys(value as object, path))
    }
  }
  return keys
}

function createFakeStorage(initial: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('i18n', () => {
  it('ships the same message keys in both languages', () => {
    expect(new Set(collectLeafKeys(ru))).toEqual(new Set(collectLeafKeys(en)))
  })

  it('translates messages for the active language', () => {
    setLanguage('en')
    expect(t('tools.move')).toBe('Move')
    setLanguage('ru')
    expect(t('tools.rectangle')).toBe('Прямоугольник')
  })

  it('maps language tags to supported languages', () => {
    expect(matchLanguage('ru-RU')).toBe('ru')
    expect(matchLanguage('ru')).toBe('ru')
    expect(matchLanguage('en-US')).toBe('en')
    expect(matchLanguage('de-DE')).toBe('en')
  })

  it('persists the language and notifies subscribers', () => {
    const storage = createFakeStorage()
    vi.stubGlobal('localStorage', storage)
    const listener = vi.fn()
    const unsubscribe = subscribeLanguage(listener)

    setLanguage('en')
    expect(storage.values.get('mxcanvas.language')).toBe('en')
    expect(listener).toHaveBeenCalledTimes(1)

    setLanguage('en')
    expect(listener).toHaveBeenCalledTimes(1)

    setLanguage('ru')
    expect(storage.values.get('mxcanvas.language')).toBe('ru')
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setLanguage('en')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('restores the stored language on first use', async () => {
    vi.stubGlobal('localStorage', createFakeStorage({ 'mxcanvas.language': 'en' }))
    vi.resetModules()
    const module = await import('./i18n')
    expect(module.getLanguage()).toBe('en')
  })

  it('detects the language from navigator when nothing is stored', async () => {
    vi.stubGlobal('localStorage', createFakeStorage())
    vi.stubGlobal('navigator', { language: 'ru-RU' })
    vi.resetModules()
    const module = await import('./i18n')
    expect(module.getLanguage()).toBe('ru')
  })
})
