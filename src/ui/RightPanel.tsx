import { LANGUAGES, setLanguage, type Language, type MessageKey } from '../i18n/i18n'
import { useLanguage, useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { formatZoomPercent } from './format-zoom'

export interface RightPanelProps {
  zoom: number
}

const LANGUAGE_LABEL_KEYS: Record<Language, 'languageRu' | 'languageEn'> = {
  ru: 'languageRu',
  en: 'languageEn',
}

const SECTION_KEYS: readonly MessageKey[] = [
  'sections.position',
  'sections.layout',
  'sections.appearance',
  'sections.fill',
  'sections.stroke',
  'sections.effects',
  'sections.export',
]

export function RightPanel({ zoom }: RightPanelProps) {
  const t = useTranslation()
  const language = useLanguage()

  return (
    <Cluster direction="vertical" class="side-panel side-panel--right">
      <div class="block block--row">
        <Cluster class="segmented-control" role="group" ariaLabel={t('languageLabel')}>
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              class={code === language ? 'control segmented-button is-active' : 'control segmented-button'}
              aria-pressed={code === language}
              onClick={() => setLanguage(code)}
            >
              {t(LANGUAGE_LABEL_KEYS[code])}
            </button>
          ))}
        </Cluster>
        <span class="zoom-readout" aria-live="polite" aria-label={t('zoomLabel')}>
          {formatZoomPercent(zoom)}
        </span>
      </div>
      {SECTION_KEYS.map((key) => (
        <div key={key} class="block block--stack">
          <span class="section-title">{t(key)}</span>
        </div>
      ))}
    </Cluster>
  )
}
