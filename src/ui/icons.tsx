import type { ComponentChildren, JSX } from 'preact'
import type { ToolId } from '../interaction/tools'

function IconBase({ children }: { children: ComponentChildren }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function MoveIcon() {
  return (
    <IconBase>
      <path d="M5.5 3.5l12.6 7.7-6.1 1.4-2.8 5.9z" />
    </IconBase>
  )
}

function FrameIcon() {
  return (
    <IconBase>
      <path d="M8.5 3v18M15.5 3v18M3 8.5h18M3 15.5h18" />
    </IconBase>
  )
}

function RectangleIcon() {
  return (
    <IconBase>
      <rect x="4" y="5.5" width="16" height="13" rx="1.5" />
    </IconBase>
  )
}

function EllipseIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="8" />
    </IconBase>
  )
}

function LineIcon() {
  return (
    <IconBase>
      <path d="M5.5 18.5 18.5 5.5" />
    </IconBase>
  )
}

function PenIcon() {
  return (
    <IconBase>
      <path d="M13.9 3.5l6.6 6.6-7.7 7.6a3 3 0 0 1-1.4.8l-5.1 1.2 1.2-5.1a3 3 0 0 1 .8-1.4z" />
      <circle cx="12.6" cy="11.4" r="1.4" />
    </IconBase>
  )
}

function TextIcon() {
  return (
    <IconBase>
      <path d="M5.5 7V4.5h13V7M12 4.5v15M9 19.5h6" />
    </IconBase>
  )
}

function HandIcon() {
  return (
    <IconBase>
      <path d="M8.6 12V6.6a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11.6 12V5.1a1.5 1.5 0 0 1 3 0V12" />
      <path d="M14.6 12V5.6a1.5 1.5 0 0 1 3 0V12" />
      <path d="M8.6 12.5V11.6a1.5 1.5 0 0 0-3 0V15a6.5 6.5 0 0 0 6.5 6.5h1.8a6.5 6.5 0 0 0 6.5-6.5V8.1a1.5 1.5 0 0 0-3 0V12" />
    </IconBase>
  )
}

export const TOOL_ICONS: Record<ToolId, () => JSX.Element> = {
  move: MoveIcon,
  frame: FrameIcon,
  rectangle: RectangleIcon,
  ellipse: EllipseIcon,
  line: LineIcon,
  pen: PenIcon,
  text: TextIcon,
  hand: HandIcon,
}
