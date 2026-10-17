import { useEffect, useState } from 'preact/hooks'
import { getLanguage, subscribeLanguage, t, type Language, type MessageKey } from './i18n'

export function useLanguage(): Language {
  const [language, setLanguageState] = useState(getLanguage)
  useEffect(() => subscribeLanguage(() => setLanguageState(getLanguage())), [])
  return language
}

export function useTranslation(): (key: MessageKey) => string {
  useLanguage()
  return t
}
