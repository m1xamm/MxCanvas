import { createPortal } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { RefObject, TargetedEvent } from 'preact'
import { clamp01, hexToRgb, hsvToRgb, rgbToHex, rgbToHsv, type HsvColor } from '../../core/color'
import type { RgbColor } from '../../core/document/types'
import { sameColor } from '../../core/paints'
import { formatNumber, parseNumberInput } from '../../core/number-input'
import { useTranslation } from '../../i18n/use-i18n'
import { Cluster } from '../Cluster'
import { computePopupPlacement } from '../popup-position'

const ANCHOR_GAP_PX = 8
const WINDOW_MARGIN_PX = 8
const MAX_HUE = 360

export interface ColorPickerProps {
  color: RgbColor
  alpha: number
  anchorRef: RefObject<HTMLElement | null>
  onChange: (color: RgbColor, alpha: number, live: boolean) => void
  onClose: () => void
}

export function ColorPicker({ color, alpha, anchorRef, onChange, onClose }: ColorPickerProps) {
  const t = useTranslation()
  const [hsv, setHsv] = useState<HsvColor>(() => rgbToHsv(color))
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const emitted = useRef<RgbColor | null>(null)
  const alphaRef = useRef(alpha)
  const hsvRef = useRef(hsv)
  alphaRef.current = alpha
  hsvRef.current = hsv

  useEffect(() => {
    if (emitted.current && sameColor(emitted.current, color)) return
    setHsv(rgbToHsv(color))
  }, [color.r, color.g, color.b])

  useLayoutEffect(() => {
    const update = () => {
      const anchor = anchorRef.current
      const root = rootRef.current
      if (!anchor || !root) return
      const rect = anchor.getBoundingClientRect()
      setPlacement(
        computePopupPlacement({
          anchor: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          popup: { width: root.offsetWidth, height: root.offsetHeight },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          side: 'below',
          align: 'end',
          gap: ANCHOR_GAP_PX,
          margin: WINDOW_MARGIN_PX,
        }),
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [anchorRef])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [anchorRef, onClose])

  const emit = (next: HsvColor, nextAlpha: number, live: boolean) => {
    const rgb = hsvToRgb(next)
    emitted.current = rgb
    setHsv(next)
    onChange(rgb, clamp01(nextAlpha), live)
  }

  const finish = () => {
    onChange(hsvToRgb(hsvRef.current), clamp01(alphaRef.current), false)
  }

  const startDrag =
    (update: (x: number, y: number, rect: DOMRect, live: boolean) => void) =>
    (event: TargetedEvent<HTMLDivElement, PointerEvent>) => {
      if (event.button !== 0) return
      const element = event.currentTarget
      const rect = element.getBoundingClientRect()
      element.setPointerCapture(event.pointerId)
      update(event.clientX - rect.x, event.clientY - rect.y, rect, false)
      const move = (moveEvent: PointerEvent) => {
        update(moveEvent.clientX - rect.x, moveEvent.clientY - rect.y, rect, true)
      }
      const end = () => {
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerup', end)
        element.removeEventListener('pointercancel', end)
        finish()
      }
      element.addEventListener('pointermove', move)
      element.addEventListener('pointerup', end)
      element.addEventListener('pointercancel', end)
    }

  const rgb = hsvToRgb(hsv)
  const hex = rgbToHex(rgb)
  const hueColor = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }))

  return createPortal(
    <div
      ref={rootRef}
      class="color-picker"
      style={{
        left: `${placement?.left ?? 0}px`,
        top: `${placement?.top ?? 0}px`,
        visibility: placement ? 'visible' : 'hidden',
      }}
      onKeyDown={(event) => {
        if (event.code === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        class="color-picker__square"
        style={{ '--picker-hue': `#${hueColor}` } as Record<string, string>}
        onPointerDown={startDrag((x, y, rect, live) => {
          emit({ h: hsvRef.current.h, s: x / rect.width, v: 1 - y / rect.height }, alphaRef.current, live)
        })}
      >
        <span
          class="color-picker__thumb"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div class="color-picker__fields">
        <div
          class="color-picker__slider color-picker__hue"
          onPointerDown={startDrag((x, _y, rect, live) => {
            emit({ ...hsvRef.current, h: (x / rect.width) * MAX_HUE }, alphaRef.current, live)
          })}
        >
          <span class="color-picker__thumb" style={{ left: `${(hsv.h / MAX_HUE) * 100}%` }} />
        </div>
        <div
          class="color-picker__slider color-picker__alpha"
          style={{ '--picker-color': `#${hex}` } as Record<string, string>}
          onPointerDown={startDrag((x, _y, rect, live) => {
            emit(hsvRef.current, x / rect.width, live)
          })}
        >
          <span class="color-picker__thumb" style={{ left: `${alpha * 100}%` }} />
        </div>
      </div>
      <Cluster>
        <label class="field">
          <span class="field__label">{t('hexLabel')}</span>
          <input
            class="field__input"
            type="text"
            value={hex}
            spellcheck={false}
            aria-label={t('hexLabel')}
            onInput={(event) => {
              const parsed = hexToRgb(event.currentTarget.value)
              if (!parsed) return
              emitted.current = parsed
              setHsv(rgbToHsv(parsed))
              onChange(parsed, alphaRef.current, false)
            }}
          />
        </label>
        <label class="field">
          <span class="field__label">%</span>
          <input
            class="field__input"
            type="text"
            value={formatNumber(Math.round(alpha * 100))}
            aria-label={t('opacityLabel')}
            onChange={(event) => {
              const parsed = parseNumberInput(event.currentTarget.value)
              if (parsed === null) return
              onChange(hsvToRgb(hsvRef.current), clamp01(parsed / 100), false)
            }}
          />
        </label>
      </Cluster>
    </div>,
    document.body,
  )
}
