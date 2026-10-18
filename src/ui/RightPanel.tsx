import type { MessageKey } from '../i18n/i18n'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { PropertiesPanel } from './properties/PropertiesPanel'
import { ZoomMenu } from './ZoomMenu'

export interface RightPanelProps {
  zoom: number
}

const SECTION_KEYS: readonly MessageKey[] = [
  'sections.layout',
  'sections.stroke',
  'sections.effects',
  'sections.export',
]

export function RightPanel({ zoom }: RightPanelProps) {
  const t = useTranslation()

  return (
    <Cluster direction="vertical" class="side-panel side-panel--right">
      <div class="block block--tight">
        <ZoomMenu zoom={zoom} />
      </div>
      <div class="block block--tight">
        <Cluster class="segmented-control" role="group" ariaLabel={t('design')}>
          <button
            type="button"
            class="control segmented-button segmented-button--stretch is-active"
            aria-pressed="true"
          >
            {t('design')}
          </button>
        </Cluster>
      </div>
      <PropertiesPanel />
      {SECTION_KEYS.map((key) => (
        <div key={key} class="block block--stack">
          <span class="section-title">{t(key)}</span>
        </div>
      ))}
    </Cluster>
  )
}
