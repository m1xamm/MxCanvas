import { useState } from 'preact/hooks'
import { Cluster } from './Cluster'

const PANEL_TABS = ['layers', 'assets'] as const
type PanelTab = (typeof PANEL_TABS)[number]

const TAB_LABELS: Record<PanelTab, string> = {
  layers: 'Layers',
  assets: 'Assets',
}

const TAB_EMPTY_MESSAGES: Record<PanelTab, string> = {
  layers: 'No layers yet',
  assets: 'No assets yet',
}

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('layers')

  return (
    <Cluster direction="vertical" class="side-panel side-panel--left">
      <div class="block block--tight">
        <Cluster class="segmented-control">
          {PANEL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              class={tab === activeTab ? 'control segmented-button is-active' : 'control segmented-button'}
              aria-pressed={tab === activeTab}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </Cluster>
      </div>
      <div class="block block--row">
        <span class="page-name">Page 1</span>
      </div>
      <div class="block block--fill">
        <p class="panel-text">{TAB_EMPTY_MESSAGES[activeTab]}</p>
      </div>
    </Cluster>
  )
}
