import { useEffect, useRef, useState } from 'preact/hooks'
import { saveStatusStore, type SaveStatus } from '../app/autosave'
import { documentNameStore, setDocumentName } from '../app/project-session'
import { useStoreValue } from '../app/use-store-value'
import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'

const MAX_NAME_LENGTH = 200

const SAVE_LABEL_KEYS: Record<Exclude<SaveStatus, 'idle'>, MessageKey> = {
  unsaved: 'saveUnsaved',
  saving: 'saveSaving',
  saved: 'saveSaved',
  error: 'saveError',
}

export function DocumentName() {
  const t = useTranslation()
  const name = useStoreValue(documentNameStore)
  const saveStatus = useStoreValue(saveStatusStore)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const editingRef = useRef(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const startEditing = () => {
    cancelRef.current = false
    editingRef.current = true
    setDraft(name ?? '')
    setEditing(true)
  }

  const finishEditing = (value: string) => {
    if (!editingRef.current) return
    editingRef.current = false
    setDocumentName(value)
    setEditing(false)
  }

  const cancelEditing = () => {
    if (!editingRef.current) return
    editingRef.current = false
    cancelRef.current = true
    setEditing(false)
  }

  return (
    <div class="file-meta">
      {editing ? (
        <input
          ref={inputRef}
          class="file-name__input"
          value={draft}
          maxLength={MAX_NAME_LENGTH}
          aria-label={t('renameFile')}
          onInput={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
              event.preventDefault()
              finishEditing(event.currentTarget.value)
            } else if (event.code === 'Escape') {
              event.preventDefault()
              cancelEditing()
            }
          }}
          onBlur={(event) => {
            if (cancelRef.current) return
            finishEditing(event.currentTarget.value)
          }}
        />
      ) : (
        <button
          type="button"
          class="control file-name"
          title={t('renameFile')}
          aria-label={t('renameFile')}
          onDblClick={startEditing}
        >
          {name ?? t('untitledFile')}
        </button>
      )}
      {saveStatus !== 'idle' && (
        <span
          class={`file-save-state is-${saveStatus}`}
          role="status"
          aria-live="polite"
        >
          {t(SAVE_LABEL_KEYS[saveStatus])}
        </span>
      )}
    </div>
  )
}
