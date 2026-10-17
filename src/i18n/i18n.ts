import { Store } from '../core/store'
import { en, type Dictionary } from './en'
import { ru } from './ru'

export type Language = 'ru' | 'en'

export const LANGUAGES: readonly Language[] = ['ru', 'en']

const DEFAULT_LANGUAGE: Language = 'ru'
const STORAGE_KEY = 'mxcanvas.language'

type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`
}[keyof T & string]

export type MessageKey = Leaves<Dictionary>

const DICTIONARIES: Record<Language, Dictionary> = { ru, en }

const languageStore = new Store<Language>(resolveInitialLanguage())

export function getLanguage(): Language {
  return languageStore.get()
}

export function setLanguage(language: Language): void {
  if (languageStore.get() === language) return
  languageStore.set(language)
  storeLanguage(language)
  applyDocumentLanguage(language)
}

export function subscribeLanguage(listener: () => void): () => void {
  return languageStore.subscribe(() => listener())
}

export function matchLanguage(tag: string): Language {
  return tag.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function t(key: MessageKey): string {
  return lookup(DICTIONARIES[languageStore.get()], key)
}

function resolveInitialLanguage(): Language {
  const language = readStoredLanguage() ?? detectLanguage()
  applyDocumentLanguage(language)
  return language
}

function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE
  return matchLanguage(navigator.language)
}

function readStoredLanguage(): Language | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'ru' || stored === 'en' ? stored : null
}

function storeLanguage(language: Language): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, language)
}

function applyDocumentLanguage(language: Language): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
}

function lookup(dictionary: Dictionary, key: string): string {
  let value: unknown = dictionary
  for (const part of key.split('.')) {
    if (typeof value !== 'object' || value === null) throw new Error(`Unknown message key: ${key}`)
    value = (value as Record<string, unknown>)[part]
  }
  if (typeof value !== 'string') throw new Error(`Unknown message key: ${key}`)
  return value
}
