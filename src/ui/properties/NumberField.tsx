import { useRef, useState } from 'preact/hooks'
import type { TargetedEvent } from 'preact'
import { formatNumber, parseNumberInput } from '../../core/number-input'
import { useTranslation } from '../../i18n/use-i18n'
import { Icon } from '../Icon'
import type { IconName } from '../icons'

const STEP = 1
const SHIFT_FACTOR = 10
const ALT_FACTOR = 0.1
const MIXED_LABEL_SEPARATOR = ', '

export const MIXED_PLACEHOLDER = '—'

type LabelPointerEvent = TargetedEvent<HTMLSpanElement, PointerEvent>

export interface NumberFieldProps {
  label?: string
  icon?: IconName
  value: number | null
  suffix?: string
  min?: number
  max?: number
  title?: string
  onChange: (value: number, live: boolean) => void
}

interface ScrubState {
  pointerId: number
  startX: number
  startValue: number
}

export function NumberField({ label, icon, value, suffix, min, max, title, onChange }: NumberFieldProps) {
  const t = useTranslation()
  const [draft, setDraft] = useState<string | null>(null)
  const scrub = useRef<ScrubState | null>(null)
  const mixed = value === null
  const text = draft ?? (mixed ? '' : formatNumber(value))
  const controlName = title ?? label ?? icon ?? ''
  const accessibleName = mixed ? `${controlName}${MIXED_LABEL_SEPARATOR}${t('mixedValue')}` : controlName

  const clamp = (next: number): number => {
    let result = next
    if (min !== undefined) result = Math.max(result, min)
    if (max !== undefined) result = Math.min(result, max)
    return result
  }

  const commit = (input: string) => {
    const parsed = parseNumberInput(input)
    if (parsed === null) return
    const next = clamp(parsed)
    if (value !== null && next === value) return
    onChange(next, false)
  }

  const nudge = (direction: 1 | -1, event: KeyboardEvent) => {
    const factor = event.shiftKey ? SHIFT_FACTOR : event.altKey ? ALT_FACTOR : 1
    const base = value ?? parseNumberInput(text) ?? 0
    const next = clamp(base + direction * STEP * factor)
    setDraft(formatNumber(next))
    onChange(next, true)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault()
      nudge(event.code === 'ArrowUp' ? 1 : -1, event)
      return
    }
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault()
      if (draft !== null) commit(draft)
      setDraft(null)
      return
    }
    if (event.code === 'Escape') {
      event.preventDefault()
      setDraft(null)
    }
  }

  const onLabelPointerDown = (event: LabelPointerEvent) => {
    if (event.button !== 0) return
    event.preventDefault()
    scrub.current = { pointerId: event.pointerId, startX: event.clientX, startValue: value ?? 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onLabelPointerMove = (event: LabelPointerEvent) => {
    const state = scrub.current
    if (!state || state.pointerId !== event.pointerId) return
    const factor = event.shiftKey ? SHIFT_FACTOR : 1
    const next = clamp(state.startValue + (event.clientX - state.startX) * STEP * factor)
    setDraft(formatNumber(next))
    onChange(next, true)
  }

  const onLabelPointerUp = (event: LabelPointerEvent) => {
    if (scrub.current?.pointerId !== event.pointerId) return
    scrub.current = null
    setDraft(null)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <label class="field" title={mixed ? accessibleName : title}>
      <span
        class="field__label"
        onPointerDown={onLabelPointerDown}
        onPointerMove={onLabelPointerMove}
        onPointerUp={onLabelPointerUp}
        onPointerCancel={onLabelPointerUp}
      >
        {icon ? <Icon name={icon} size={16} /> : label}
      </span>
      <input
        class="field__input"
        type="text"
        inputMode="decimal"
        spellcheck={false}
        value={text}
        placeholder={mixed ? MIXED_PLACEHOLDER : ''}
        aria-label={accessibleName}
        onFocus={() => setDraft(value === null ? '' : formatNumber(value))}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft !== null) commit(draft)
          setDraft(null)
        }}
      />
      {suffix && <span class="field__suffix">{suffix}</span>}
    </label>
  )
}
