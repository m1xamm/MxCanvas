import { useRef } from 'preact/hooks'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { useDialogFocus } from './use-dialog-focus'

export interface MessageDialogProps {
  title: string
  message: string
  onClose: () => void
}

export function MessageDialog({ title, message, onClose }: MessageDialogProps) {
  const t = useTranslation()
  const cardRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(cardRef, onClose)

  return (
    <div
      class="scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        class="dialog-card dialog-card--message"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="message-dialog-title"
        ref={cardRef}
      >
        <Cluster direction="vertical">
          <div class="dialog-row dialog-row--stack">
            <span class="dialog-title" id="message-dialog-title">
              {title}
            </span>
            <p class="dialog-message">{message}</p>
          </div>
          <div class="dialog-row dialog-row--actions">
            <button
              type="button"
              class="control dialog-button dialog-button--primary"
              onClick={onClose}
            >
              {t('ok')}
            </button>
          </div>
        </Cluster>
      </div>
    </div>
  )
}
