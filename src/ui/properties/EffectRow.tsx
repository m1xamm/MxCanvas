import type { ComponentChildren } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { withAlphaColor } from '../../core/color'
import type { EffectSummary } from '../../core/effects'
import type { RgbColor } from '../../core/document/types'
import { useTranslation } from '../../i18n/use-i18n'
import { Cluster } from '../Cluster'
import { Icon } from '../Icon'
import { ColorPicker } from './ColorPicker'

export interface EffectRowProps {
  summary: EffectSummary
  expanded: boolean
  onToggleExpanded: () => void
  onColorChange: (color: RgbColor, live: boolean) => void
  onOpacityChange: (opacity: number, live: boolean) => void
  onVisibleChange: (visible: boolean) => void
  onRemove: () => void
  children: ComponentChildren
}

export function EffectRow({
  summary,
  expanded,
  onToggleExpanded,
  onColorChange,
  onOpacityChange,
  onVisibleChange,
  onRemove,
  children,
}: EffectRowProps) {
  const t = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const swatchRef = useRef<HTMLButtonElement | null>(null)
  const { effect } = summary
  const visible = summary.mixedVisible ? false : effect.visible

  return (
    <Cluster direction="vertical">
      <Cluster class="effect-row cluster--fields">
        <button
          type="button"
          ref={swatchRef}
          class="control paint-swatch"
          aria-label={t('effectColorLabel')}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((value) => !value)}
        >
          <span
            class="paint-swatch__chip"
            style={{ background: withAlphaColor(effect.color, effect.opacity) }}
          />
        </button>
        <button
          type="button"
          class="control effect-name"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          {t('effectDropShadow')}
        </button>
        <button
          type="button"
          class={visible ? 'control paint-action' : 'control paint-action is-off'}
          aria-label={t('toggleEffectVisibility')}
          onClick={() => onVisibleChange(!visible)}
        >
          <Icon name={visible ? 'visibility' : 'visibilityOff'} size={16} />
        </button>
        <button type="button" class="control paint-action" aria-label={t('removeEffect')} onClick={onRemove}>
          <Icon name="remove" size={16} />
        </button>
      </Cluster>
      {expanded && children}
      {pickerOpen && (
        <ColorPicker
          color={effect.color}
          alpha={effect.opacity}
          anchorRef={swatchRef}
          onChange={(color, alpha, live) => {
            onColorChange(color, live)
            if (Math.abs(alpha - effect.opacity) > 1e-6) onOpacityChange(alpha, live)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Cluster>
  )
}
