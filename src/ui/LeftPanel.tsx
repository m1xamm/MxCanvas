import { useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import { useTranslation } from '../i18n/use-i18n'
import { Cluster } from './Cluster'
import { DocumentName } from './DocumentName'
import { Icon } from './Icon'
import { LayersPanel } from './LayersPanel'
import { MainMenu } from './MainMenu'

const PANEL_TABS = ['file', 'assets'] as const
type PanelTab = (typeof PANEL_TABS)[number]

const TAB_LABEL_KEYS: Record<PanelTab, 'file' | 'assets'> = {
  file: 'file',
  assets: 'assets',
}

export interface LeftPanelProps {
  onOpenSettings: () => void
  menuButtonRef?: RefObject<HTMLButtonElement | null>
}

export function LeftPanel({ onOpenSettings, menuButtonRef }: LeftPanelProps) {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<PanelTab>('file')

  return (
    <Cluster direction="vertical" class="side-panel side-panel--left">
      <div class="block block--tight">
        <div class="file-head">
          <MainMenu onOpenSettings={onOpenSettings} buttonRef={menuButtonRef} />
          <DocumentName />
        </div>
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
      {activeTab === 'file' ? (
        <>
          <div class="block block--section">
            <div class="section-head">
              <span class="section-title">{t('pages')}</span>
              <button
                type="button"
                class="control icon-button"
                aria-label={t('addPage')}
                title={t('addPage')}
                disabled
              >
                <Icon name="add" size={16} />
              </button>
            </div>
            <Cluster direction="vertical">
              <div class="panel-row is-active" aria-current="page">
                {t('pageName')}
              </div>
            </Cluster>
          </div>
          <LayersPanel />
        </>
      ) : (
        <div class="block block--section block--fill">
          <span class="section-title">{t('assets')}</span>
          <p class="panel-text">{t('noAssets')}</p>
        </div>
      )}
    </Cluster>
  )
}
