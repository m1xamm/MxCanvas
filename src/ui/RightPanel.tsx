import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { PropertiesPanel } from './properties/PropertiesPanel'
import { ZoomMenu } from './ZoomMenu'

export interface RightPanelProps {
  zoom: number
}

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
    </Cluster>
  )
}
