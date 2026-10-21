import { useEffect } from 'preact/hooks'
import type { RefObject } from 'preact'
import { collectFocusable, nextFocusIndex } from './focus-trap'

const ESCAPE_KEY_CODE = 'Escape'
const TAB_KEY_CODE = 'Tab'

export function useDialogFocus(
  cardRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    collectFocusable(card)[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === ESCAPE_KEY_CODE) {
        onClose()
        return
      }
      if (event.code !== TAB_KEY_CODE) return
      const focusable = collectFocusable(card)
      const target = nextFocusIndex(
        focusable.length,
        focusable.indexOf(document.activeElement as HTMLElement),
        event.shiftKey,
      )
      if (target === -1) return
      event.preventDefault()
      focusable[target]?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cardRef, onClose])
}
