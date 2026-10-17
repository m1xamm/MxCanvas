import { useState } from 'preact/hooks'

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
    <aside class="side-panel side-panel--left">
      <div class="panel-tabs" role="tablist" aria-label="Document panels">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            class={tab === activeTab ? 'panel-tab panel-tab--active' : 'panel-tab'}
            aria-selected={tab === activeTab}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div class="panel-body">
        <p class="panel-empty">{TAB_EMPTY_MESSAGES[activeTab]}</p>
      </div>
    </aside>
  )
}
