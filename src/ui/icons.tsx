import type { ComponentChildren, JSX } from 'preact'
import type { ToolId } from '../interaction/tools'

const ICON_SIZE_PX = 20
const ICON_STROKE_WIDTH = 1.8

function IconBase({ children }: { children: ComponentChildren }) {
  return (
    <svg
      width={ICON_SIZE_PX}
      height={ICON_SIZE_PX}
      viewBox="0 0 24 24"
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

function ScaleIcon() {
  return (
    <IconBase>
      <path d="M4.5 19.5l9-9" />
      <path d="M13 4.5h6.5V11" />
      <path d="M4.5 13v6.5H11" />
    </IconBase>
  )
}

function SectionIcon() {
  return (
    <IconBase>
      <rect x="4" y="6.5" width="16" height="11" rx="2" stroke-dasharray="3 3" />
    </IconBase>
  )
}

function SliceIcon() {
  return (
    <IconBase>
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
      <path d="M8.4 16 17 5.5M15.6 16 7 5.5" />
    </IconBase>
  )
}

function ArrowIcon() {
  return (
    <IconBase>
      <path d="M5.5 18.5 18.5 5.5" />
      <path d="M12.5 5.5h6v6" />
    </IconBase>
  )
}

function PolygonIcon() {
  return (
    <IconBase>
      <path d="M12 4.5 20 10.3 16.9 19.5H7.1L4 10.3z" />
    </IconBase>
  )
}

function StarIcon() {
  return (
    <IconBase>
      <path d="M12 4.5l2.35 4.9 5.15.6-3.85 3.6 1 5.4-4.65-2.55L7.35 19l1-5.4L4.5 10l5.15-.6z" />
    </IconBase>
  )
}

function PencilIcon() {
  return (
    <IconBase>
      <path d="M5 19l1.1-4.6 8.6-8.6 3.5 3.5-8.6 8.6z" />
      <path d="M13.5 7l3.5 3.5" />
    </IconBase>
  )
}

export function ChevronIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 3 4 5.5 6.5 3" />
    </svg>
  )
}

export function AppIcon() {
  return (
    <IconBase>
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="5" />
      <path d="M8.5 15.5V8.5l3.5 4 3.5-4v7" />
    </IconBase>
  )
}

export function CloseIcon() {
  return (
    <IconBase>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </IconBase>
  )
}

export function SettingsIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="4.6" />
      <path d="M16.4 12h2.6M7.6 12H5M12 7.6V5M12 16.4V19M15.11 8.89l1.84-1.84M8.89 8.89 7.05 7.05M15.11 15.11l1.84 1.84M8.89 15.11l-1.84 1.84" />
    </IconBase>
  )
}

export const TOOL_ICONS: Record<ToolId, () => JSX.Element> = {
  move: MoveIcon,
  hand: HandIcon,
  scale: ScaleIcon,
  frame: FrameIcon,
  section: SectionIcon,
  slice: SliceIcon,
  rectangle: RectangleIcon,
  line: LineIcon,
  arrow: ArrowIcon,
  ellipse: EllipseIcon,
  polygon: PolygonIcon,
  star: StarIcon,
  pen: PenIcon,
  pencil: PencilIcon,
  text: TextIcon,
}
