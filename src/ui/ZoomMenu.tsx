import { useRef, useState } from 'preact/hooks'
import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'
import { viewportActions, type ViewportActions } from '../app/viewport-actions'
import { formatZoomPercent } from './format-zoom'
import { Icon } from './Icon'
import { MenuItem } from './MenuItem'
import { Popup } from './Popup'

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
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <div class="zoom-menu">
      <button
        type="button"
        class="control zoom-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('zoomLabel')}
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
      >
        <span class="zoom-readout" aria-live="polite">
          {formatZoomPercent(zoom)}
        </span>
        <Icon name="chevron" size={16} />
      </button>
      <Popup
        open={open}
        anchorRef={buttonRef}
        side="below"
        align="end"
        ariaLabel={t('zoomLabel')}
        onClose={() => setOpen(false)}
      >
        {ZOOM_ITEMS.map((item) => (
          <MenuItem
            key={item.key}
            label={t(item.key)}
            hotkey={item.hotkey}
            onClick={() => {
              const actions = viewportActions()
              if (actions) item.run(actions)
              setOpen(false)
            }}
          />
        ))}
      </Popup>
    </div>
  )
}
