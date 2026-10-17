import { formatZoomPercent } from './format-zoom'

export interface RightPanelProps {
  zoom: number
}

export function RightPanel({ zoom }: RightPanelProps) {
  return (
    <aside class="side-panel side-panel--right">
      <div class="panel-tabs">
        <span class="panel-tab panel-tab--active">Design</span>
        <span class="zoom-readout" aria-live="polite">
          {formatZoomPercent(zoom)}
        </span>
      </div>
      <div class="panel-body">
        <p class="panel-empty">Nothing selected</p>
      </div>
    </aside>
  )
}
