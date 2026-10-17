import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { formatZoomPercent } from './format-zoom'

export interface RightPanelProps {
  zoom: number
}

const SECTION_KEYS: readonly MessageKey[] = [
  'sections.position',
  'sections.layout',
  'sections.appearance',
  'sections.fill',
  'sections.stroke',
  'sections.effects',
  'sections.export',
]

export function RightPanel({ zoom }: RightPanelProps) {
  const t = useTranslation()

  return (
    <Cluster direction="vertical" class="side-panel side-panel--right">
      <div class="block block--row">
        <span class="zoom-readout" aria-live="polite" aria-label={t('zoomLabel')}>
          {formatZoomPercent(zoom)}
        </span>
      </div>
      {SECTION_KEYS.map((key) => (
        <div key={key} class="block block--stack">
          <span class="section-title">{t(key)}</span>
        </div>
      ))}
    </Cluster>
  )
}
