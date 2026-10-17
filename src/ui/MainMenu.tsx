import { useEffect, useRef, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { AppIcon } from './icons'

const ESCAPE_KEY_CODE = 'Escape'

export interface MainMenuProps {
  onOpenSettings: () => void
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function MainMenu({ onOpenSettings, buttonRef }: MainMenuProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === ESCAPE_KEY_CODE) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div class="main-menu" ref={rootRef}>
      <button
        type="button"
        class="control menu-button"
        aria-label={t('mainMenuLabel')}
        aria-haspopup="menu"
        aria-expanded={open}
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon />
      </button>
      {open && (
        <Cluster direction="vertical" class="menu-popup" role="menu">
          <button
            type="button"
            role="menuitem"
            class="control menu-item"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            {t('settings')}
          </button>
        </Cluster>
      )}
    </div>
  )
}
