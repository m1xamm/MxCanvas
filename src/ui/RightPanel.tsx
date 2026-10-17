import { Cluster } from './Cluster'
import { formatZoomPercent } from './format-zoom'

export interface RightPanelProps {
  zoom: number
}

const SECTIONS = ['Position', 'Layout', 'Appearance', 'Fill', 'Stroke', 'Effects', 'Export'] as const

export function RightPanel({ zoom }: RightPanelProps) {
  return (
    <Cluster direction="vertical" class="side-panel side-panel--right">
      <div class="block block--row">
        <span class="zoom-readout" aria-live="polite">
          {formatZoomPercent(zoom)}
        </span>
      </div>
      {SECTIONS.map((section) => (
        <div key={section} class="block block--stack">
          <span class="section-title">{section}</span>
        </div>
      ))}
    </Cluster>
  )
}
