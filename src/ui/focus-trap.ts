const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function collectFocusable(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

export function nextFocusIndex(count: number, active: number, backwards: boolean): number {
  if (count === 0) return -1
  if (active === -1) return backwards ? count - 1 : 0
  if (backwards) return active === 0 ? count - 1 : active - 1
  return active === count - 1 ? 0 : active + 1
}
