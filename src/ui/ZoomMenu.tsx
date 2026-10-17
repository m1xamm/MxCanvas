import { useRef, useState } from 'preact/hooks'
import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'
import { viewportActions, type ViewportActions } from '../app/viewport-actions'
import { formatZoomPercent } from './format-zoom'
import { Cluster } from './Cluster'
import { ChevronIcon } from './icons'
import { useDismiss } from './use-dismiss'

interface ZoomMenuItem {
  key: MessageKey
  hotkey: string
  run: (actions: ViewportActions) => void
}

const ZOOM_ITEMS: readonly ZoomMenuItem[] = [
  { key: 'zoomIn', hotkey: 'Ctrl+=', run: (actions) => actions.zoomIn() },
  { key: 'zoomOut', hotkey: 'Ctrl+-', run: (actions) => actions.zoomOut() },
  { key: 'zoomTo100', hotkey: 'Shift+0', run: (actions) => actions.zoomReset() },
  { key: 'zoomToFit', hotkey: 'Shift+1', run: (actions) => actions.zoomToFit() },
  { key: 'zoomToSelection', hotkey: 'Shift+2', run: (actions) => actions.zoomToSelection() },
]

export interface ZoomMenuProps {
  zoom: number
}

export function ZoomMenu({ zoom }: ZoomMenuProps) {
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useDismiss(open, () => setOpen(false), rootRef)

  return (
    <div class="zoom-menu" ref={rootRef}>
      <button
        type="button"
        class="control zoom-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('zoomLabel')}
        onClick={() => setOpen((value) => !value)}
      >
        <span class="zoom-readout" aria-live="polite">
          {formatZoomPercent(zoom)}
        </span>
        <ChevronIcon />
      </button>
      {open && (
        <Cluster
          direction="vertical"
          role="menu"
          class="menu-popup menu-popup--right zoom-menu__popup"
        >
          {ZOOM_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              class="control menu-item menu-item--tool"
              onClick={() => {
                const actions = viewportActions()
                if (actions) item.run(actions)
                setOpen(false)
              }}
            >
              <span>{t(item.key)}</span>
              <span class="menu-item__hotkey">{item.hotkey}</span>
            </button>
          ))}
        </Cluster>
      )}
    </div>
  )
}
