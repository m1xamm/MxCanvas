import { useEffect } from 'preact/hooks'
import { LANGUAGES, setLanguage } from '../i18n/i18n'
import { useLanguage, useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { CloseIcon } from './icons'

const ESCAPE_KEY_CODE = 'Escape'

export interface SettingsDialogProps {
  onClose: () => void
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const t = useTranslation()
  const language = useLanguage()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === ESCAPE_KEY_CODE) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      class="scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div class="dialog-card" role="dialog" aria-modal="true" aria-label={t('settings')}>
        <Cluster direction="vertical">
          <div class="dialog-row">
            <span class="dialog-title">{t('settings')}</span>
            <button
              type="button"
              class="control icon-button"
              aria-label={t('closeLabel')}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
          <div class="dialog-row">
            <span class="dialog-label">{t('languageLabel')}</span>
            <Cluster class="segmented-control" role="group" ariaLabel={t('languageLabel')}>
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  class={
                    code === language
                      ? 'control segmented-button is-active'
                      : 'control segmented-button'
                  }
                  aria-pressed={code === language}
                  onClick={() => setLanguage(code)}
                >
                  {t(`languages.${code}`)}
                </button>
              ))}
            </Cluster>
          </div>
        </Cluster>
      </div>
    </div>
  )
}
