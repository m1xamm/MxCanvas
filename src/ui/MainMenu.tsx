import { useRef, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import logoDarkUrl from '../assets/logo-dark.svg'
import { useTranslation } from '../i18n/use-i18n'
import { MenuItem } from './MenuItem'
import { Popup } from './Popup'

export interface MainMenuProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onOpenSettings: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function MainMenu({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onOpenSettings,
  buttonRef,
}: MainMenuProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const localButtonRef = useRef<HTMLButtonElement | null>(null)
  const anchorRef = buttonRef ?? localButtonRef

  return (
    <div class="main-menu">
      <button
        type="button"
        class="control menu-button"
        aria-label={t('mainMenuLabel')}
        aria-haspopup="menu"
        aria-expanded={open}
        ref={anchorRef}
        onClick={() => setOpen((value) => !value)}
      >
        <img class="menu-button__logo" src={logoDarkUrl} alt="" width={28} height={28} />
      </button>
      <Popup
        open={open}
        anchorRef={anchorRef}
        side="below"
        align="start"
        ariaLabel={t('mainMenuLabel')}
        onClose={() => setOpen(false)}
      >
        <MenuItem
          icon="newFile"
          label={t('newFile')}
          hotkey={t('hotkeys.newFile')}
          onClick={() => {
            setOpen(false)
            onNew()
          }}
        />
        <MenuItem
          icon="openFile"
          label={t('openFile')}
          hotkey={t('hotkeys.openFile')}
          onClick={() => {
            setOpen(false)
            onOpen()
          }}
        />
        <MenuItem
          icon="saveFile"
          label={t('saveFile')}
          hotkey={t('hotkeys.saveFile')}
          onClick={() => {
            setOpen(false)
            onSave()
          }}
        />
        <MenuItem
          icon="saveFileAs"
          label={t('saveFileAs')}
          hotkey={t('hotkeys.saveFileAs')}
          onClick={() => {
            setOpen(false)
            onSaveAs()
          }}
        />
        <MenuItem
          icon="settings"
          label={t('settings')}
          onClick={() => {
            setOpen(false)
            onOpenSettings()
          }}
        />
      </Popup>
    </div>
  )
}
