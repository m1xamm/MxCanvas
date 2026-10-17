import { useEffect } from 'preact/hooks'
import type { RefObject } from 'preact'

const ESCAPE_KEY_CODE = 'Escape'

export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  rootRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === ESCAPE_KEY_CODE) onDismiss()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onDismiss, rootRef])
}
