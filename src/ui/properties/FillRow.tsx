import { useRef, useState } from 'preact/hooks'
import { hexToRgb, rgbToHex, withAlphaColor } from '../../core/color'
import type { FillSummary } from '../../core/fills'
import type { RgbColor } from '../../core/document/types'
import { useTranslation } from '../../i18n/use-i18n'
import { Cluster } from '../Cluster'
import { Icon } from '../Icon'
import { ColorPicker } from './ColorPicker'
import { NumberField } from './NumberField'

export interface FillRowProps {
  summary: FillSummary
  onColorChange: (color: RgbColor, live: boolean) => void
  onOpacityChange: (opacity: number, live: boolean) => void
  onVisibleChange: (visible: boolean) => void
  onRemove: () => void
  onHexChange: (color: RgbColor) => void
}

export function FillRow({
  summary,
  onColorChange,
  onOpacityChange,
  onVisibleChange,
  onRemove,
  onHexChange,
}: FillRowProps) {
  const t = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const swatchRef = useRef<HTMLButtonElement | null>(null)
  const { paint } = summary
  const visible = summary.mixedVisible ? false : paint.visible

  return (
    <Cluster class="fill-row">
      <button
        type="button"
        ref={swatchRef}
        class="control fill-swatch"
        aria-label={t('fillColorLabel')}
        aria-expanded={pickerOpen}
        style={{ background: withAlphaColor(paint.color, paint.opacity) }}
        onClick={() => setPickerOpen((value) => !value)}
      />
      <label class="field field--hex">
        <input
          class="field__input"
          type="text"
          value={summary.mixedColor ? '' : rgbToHex(paint.color)}
          placeholder={summary.mixedColor ? t('mixedValue') : ''}
          spellcheck={false}
          aria-label={t('hexLabel')}
          onChange={(event) => {
            const parsed = hexToRgb(event.currentTarget.value)
            if (parsed) onHexChange(parsed)
          }}
        />
      </label>
      <NumberField
        value={summary.mixedOpacity ? null : Math.round(paint.opacity * 100)}
        suffix="%"
        min={0}
        max={100}
        title={t('opacityLabel')}
        onChange={(value, live) => onOpacityChange(value / 100, live)}
      />
      <button
        type="button"
        class={visible ? 'control fill-action' : 'control fill-action is-off'}
        aria-label={t('toggleFillVisibility')}
        onClick={() => onVisibleChange(!visible)}
      >
        <Icon name={visible ? 'visibility' : 'visibilityOff'} size={16} />
      </button>
      <button type="button" class="control fill-action" aria-label={t('removeFill')} onClick={onRemove}>
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
