import { useEffect, useRef } from 'preact/hooks'
import { canvasGridStore, setCanvasGridVisible } from '../app/settings'
import { useStoreValue } from '../app/use-store-value'
import { LANGUAGES, setLanguage } from '../i18n/i18n'
import { useLanguage, useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { collectFocusable, nextFocusIndex } from './focus-trap'
import { Icon } from './Icon'
import { Switch } from './Switch'

const ESCAPE_KEY_CODE = 'Escape'
const TAB_KEY_CODE = 'Tab'

export interface SettingsDialogProps {
  onClose: () => void
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const t = useTranslation()
  const language = useLanguage()
  const canvasGridVisible = useStoreValue(canvasGridStore)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const initial = collectFocusable(card)
    initial[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === ESCAPE_KEY_CODE) {
        onClose()
        return
      }
      if (event.code !== TAB_KEY_CODE) return
      const focusable = collectFocusable(card)
      const target = nextFocusIndex(
        focusable.length,
        focusable.indexOf(document.activeElement as HTMLElement),
        event.shiftKey,
      )
      if (target === -1) return
      event.preventDefault()
      focusable[target]?.focus()
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
      <div
        class="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('settings')}
        ref={cardRef}
      >
        <Cluster direction="vertical">
          <div class="dialog-row">
            <span class="dialog-title">{t('settings')}</span>
            <button
              type="button"
              class="control icon-button"
              aria-label={t('closeLabel')}
              onClick={onClose}
            >
              <Icon name="close" />
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
          <div class="dialog-row">
            <span class="dialog-label">{t('canvasGridLabel')}</span>
            <Switch
              checked={canvasGridVisible}
              label={t('canvasGridLabel')}
              onChange={setCanvasGridVisible}
            />
          </div>
        </Cluster>
      </div>
    </div>
  )
}
