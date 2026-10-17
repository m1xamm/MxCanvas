import { useState } from 'preact/hooks'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { MainMenu } from './MainMenu'

const PANEL_TABS = ['layers', 'assets'] as const
type PanelTab = (typeof PANEL_TABS)[number]

const TAB_LABEL_KEYS: Record<PanelTab, 'layers' | 'assets'> = {
  layers: 'layers',
  assets: 'assets',
}

const TAB_EMPTY_KEYS: Record<PanelTab, 'noLayers' | 'noAssets'> = {
  layers: 'noLayers',
  assets: 'noAssets',
}

export interface LeftPanelProps {
  onOpenSettings: () => void
}

export function LeftPanel({ onOpenSettings }: LeftPanelProps) {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<PanelTab>('layers')

  return (
    <Cluster direction="vertical" class="side-panel side-panel--left">
      <div class="block block--tight">
        <MainMenu onOpenSettings={onOpenSettings} />
      </div>
      <div class="block block--tight">
        <Cluster class="segmented-control" role="group" ariaLabel={t('panelsLabel')}>
          {PANEL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              class={
                tab === activeTab
                  ? 'control segmented-button segmented-button--stretch is-active'
                  : 'control segmented-button segmented-button--stretch'
              }
              aria-pressed={tab === activeTab}
              onClick={() => setActiveTab(tab)}
            >
              {t(TAB_LABEL_KEYS[tab])}
            </button>
          ))}
        </Cluster>
      </div>
      <div class="block block--row">
        <span class="page-name">{t('pageName')}</span>
      </div>
      <div class="block block--fill">
        <p class="panel-text">{t(TAB_EMPTY_KEYS[activeTab])}</p>
      </div>
    </Cluster>
  )
}
