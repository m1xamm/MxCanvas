import { createPortal } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren, RefObject } from 'preact'
import { Cluster } from './Cluster'
import { computePopupPlacement, type PopupAlign, type PopupPlacement, type PopupSide } from './popup-position'

export const POPUP_TRANSITION_MS = 150

const ANCHOR_GAP_PX = 8
const WINDOW_MARGIN_PX = 8
const ESCAPE_KEY_CODE = 'Escape'
const MENU_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)'

type PopupPhase = 'hidden' | 'entering' | 'open' | 'leaving'

export interface PopupProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  side?: PopupSide
  align?: PopupAlign
  ariaLabel?: string
  onClose: () => void
  children: ComponentChildren
}

export function Popup({
  open,
  anchorRef,
  side = 'below',
  align = 'start',
  ariaLabel,
  onClose,
  children,
}: PopupProps) {
  const [phase, setPhase] = useState<PopupPhase>('hidden')
  const [placement, setPlacement] = useState<PopupPlacement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const visible = phase !== 'hidden'

  useEffect(() => {
    if (open) {
      if (phase === 'hidden') setPhase('entering')
      else if (phase === 'entering') {
        let active = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (active) setPhase('open')
          })
        })
        return () => {
          active = false
        }
      } else if (phase === 'leaving') setPhase('open')
      return
    }
    if (phase === 'entering' || phase === 'open') {
      if (rootRef.current?.contains(document.activeElement)) anchorRef.current?.focus()
      setPhase('leaving')
      return
    }
    if (phase === 'leaving') {
      const timer = window.setTimeout(() => setPhase('hidden'), POPUP_TRANSITION_MS)
      return () => window.clearTimeout(timer)
    }
  }, [open, phase, anchorRef])

  useLayoutEffect(() => {
    if (!visible) return
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
          side,
          align,
          gap: ANCHOR_GAP_PX,
          margin: WINDOW_MARGIN_PX,
        }),
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [visible, anchorRef, side, align])

  useEffect(() => {
    if (phase !== 'entering' || !placement) return
    rootRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus()
  }, [phase, placement])

  useEffect(() => {
    if (!visible) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [visible, anchorRef, onClose])

  if (!visible) return null

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === ESCAPE_KEY_CODE) {
      event.stopPropagation()
      onClose()
      return
    }
    const root = rootRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = nextMenuItemIndex(event.code, current, items.length)
    if (next === null) return
    event.preventDefault()
    items[next]?.focus()
  }

  return createPortal(
    <div
      ref={rootRef}
      class={phase === 'open' ? 'popup is-open' : 'popup'}
      style={{
        left: `${placement?.left ?? 0}px`,
        top: `${placement?.top ?? 0}px`,
        visibility: placement ? 'visible' : 'hidden',
        transformOrigin: placement ? `${placement.originX}px ${placement.originY}px` : undefined,
      }}
      onKeyDown={onKeyDown}
    >
      <Cluster direction="vertical" role="menu" ariaLabel={ariaLabel}>
        {children}
      </Cluster>
    </div>,
    document.body,
  )
}

function nextMenuItemIndex(code: string, current: number, count: number): number | null {
  if (count === 0) return null
  const last = count - 1
  if (code === 'ArrowDown') return current >= last ? 0 : current + 1
  if (code === 'ArrowUp') return current <= 0 ? last : current - 1
  if (code === 'Home') return 0
  if (code === 'End') return last
  return null
}
