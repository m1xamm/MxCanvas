import type { ComponentChildren } from 'preact'

const VIEW_BOX_SIZE = 24
const ICON_STROKE_WIDTH = 1.8
const DEFAULT_ICON_SIZE = 20

export interface IconBaseProps {
  size?: number
  children: ComponentChildren
}

export function IconBase({ size = DEFAULT_ICON_SIZE, children }: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      fill="none"
      stroke="currentColor"
      stroke-width={ICON_STROKE_WIDTH}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
