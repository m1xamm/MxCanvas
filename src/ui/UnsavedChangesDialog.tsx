import { useRef } from 'preact/hooks'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { useDialogFocus } from './use-dialog-focus'

export interface UnsavedChangesDialogProps {
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({ onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  const t = useTranslation()
  const cardRef = useRef<HTMLDivElement | null>(null)
  useDialogFocus(cardRef, onCancel)

  return (
    <div
      class="scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        class="dialog-card dialog-card--message"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        ref={cardRef}
      >
        <Cluster direction="vertical">
          <div class="dialog-row dialog-row--stack">
            <span class="dialog-title" id="unsaved-dialog-title">
              {t('unsavedTitle')}
            </span>
            <p class="dialog-message">{t('unsavedMessage')}</p>
          </div>
          <div class="dialog-row dialog-row--actions">
            <button type="button" class="control dialog-button" onClick={onCancel}>
              {t('cancel')}
            </button>
            <button
              type="button"
              class="control dialog-button dialog-button--danger"
              onClick={onDiscard}
            >
              {t('discardChanges')}
            </button>
            <button
              type="button"
              class="control dialog-button dialog-button--primary"
              onClick={onSave}
            >
              {t('saveChanges')}
            </button>
          </div>
        </Cluster>
      </div>
    </div>
  )
}
