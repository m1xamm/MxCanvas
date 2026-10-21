import type { ComponentChildren } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { hexToRgb, rgbToHex, withAlphaColor } from '../../core/color'
import type { PaintSummary } from '../../core/paints'
import type { RgbColor } from '../../core/document/types'
import type { MessageKey } from '../../i18n/i18n'
import { useTranslation } from '../../i18n/use-i18n'
import { Cluster } from '../Cluster'
import { Icon } from '../Icon'
import { ColorPicker } from './ColorPicker'
import { MIXED_PLACEHOLDER, NumberField } from './NumberField'

export interface PaintRowProps {
  summary: PaintSummary
  colorLabel: MessageKey
  removeLabel: MessageKey
  toggleLabel: MessageKey
  onColorChange: (color: RgbColor, live: boolean) => void
  onOpacityChange: (opacity: number, live: boolean) => void
  onVisibleChange: (visible: boolean) => void
  onRemove: () => void
  onHexChange: (color: RgbColor) => void
  middle: ComponentChildren
}

export function PaintRow({
  summary,
  colorLabel,
  removeLabel,
  toggleLabel,
  onColorChange,
  onOpacityChange,
  onVisibleChange,
  onRemove,
  onHexChange,
  middle,
}: PaintRowProps) {
  const t = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const swatchRef = useRef<HTMLButtonElement | null>(null)
  const { paint } = summary
  const visible = summary.mixedVisible ? false : paint.visible
  const hexLabel = summary.mixedColor ? `${t('hexLabel')}, ${t('mixedValue')}` : t('hexLabel')

  return (
    <Cluster class="paint-row cluster--fields">
      <button
        type="button"
        ref={swatchRef}
        class="control paint-swatch"
        aria-label={t(colorLabel)}
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((value) => !value)}
      >
        <span
          class="paint-swatch__chip"
          style={{ background: withAlphaColor(paint.color, paint.opacity) }}
        />
      </button>
      <label class="field field--hex" title={hexLabel}>
        <input
          class="field__input"
          type="text"
          value={summary.mixedColor ? '' : rgbToHex(paint.color)}
          placeholder={summary.mixedColor ? MIXED_PLACEHOLDER : ''}
          spellcheck={false}
          aria-label={hexLabel}
          onChange={(event) => {
            const parsed = hexToRgb(event.currentTarget.value)
            if (parsed) onHexChange(parsed)
          }}
        />
      </label>
      {middle}
      <button
        type="button"
        class={visible ? 'control paint-action' : 'control paint-action is-off'}
        aria-label={t(toggleLabel)}
        onClick={() => onVisibleChange(!visible)}
      >
        <Icon name={visible ? 'visibility' : 'visibilityOff'} size={16} />
      </button>
      <button type="button" class="control paint-action" aria-label={t(removeLabel)} onClick={onRemove}>
        <Icon name="remove" size={16} />
      </button>
      {pickerOpen && (
        <ColorPicker
          color={paint.color}
          alpha={paint.opacity}
          anchorRef={swatchRef}
          onChange={(color, alpha, live) => {
            onColorChange(color, live)
            if (Math.abs(alpha - paint.opacity) > 1e-6) onOpacityChange(alpha, live)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Cluster>
  )
}

export function PaintOpacityField({
  summary,
  onChange,
}: {
  summary: PaintSummary
  onChange: (opacity: number, live: boolean) => void
}) {
  const t = useTranslation()
  return (
    <NumberField
      value={summary.mixedOpacity ? null : Math.round(summary.paint.opacity * 100)}
      suffix="%"
      min={0}
      max={100}
      title={t('opacityLabel')}
      onChange={(value, live) => onChange(value / 100, live)}
    />
  )
}
