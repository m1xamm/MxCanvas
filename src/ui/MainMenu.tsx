import { useRef, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import { useTranslation } from '../i18n/use-i18n'
import { AppIcon, SettingsIcon } from './icons'
import { MenuItem } from './MenuItem'
import { Popup } from './Popup'

export interface MainMenuProps {
  onOpenSettings: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function MainMenu({ onOpenSettings, buttonRef }: MainMenuProps) {
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
        <AppIcon />
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
          icon={SettingsIcon}
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
