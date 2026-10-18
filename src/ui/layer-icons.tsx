import type { JSX } from 'preact'
import type { NodeType } from '../core/document/types'
import { IconBase } from './icon-base'

const LAYER_ICON_SIZE = 16

function RectangleLayerIcon() {
  return (
    <IconBase size={LAYER_ICON_SIZE}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
    </IconBase>
  )
}

export function VisibilityIcon() {
  return (
    <IconBase size={LAYER_ICON_SIZE}>
      <path d="M2.6 12S6.4 6.4 12 6.4 21.4 12 21.4 12 17.6 17.6 12 17.6 2.6 12 2.6 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </IconBase>
  )
}

export function VisibilityOffIcon() {
  return (
    <IconBase size={LAYER_ICON_SIZE}>
      <path d="M4.2 8.6C3.1 10 2.6 12 2.6 12s3.8 5.6 9.4 5.6c1.6 0 3-.45 4.1-1.1" />
      <path d="M19 15.1c1.4-1.3 2.4-3.1 2.4-3.1s-3.8-5.6-9.4-5.6c-.7 0-1.35.09-1.95.24" />
      <path d="M9.9 10a2.6 2.6 0 0 0 3.7 3.7" />
      <path d="M4.5 19.5 19.5 4.5" />
    </IconBase>
  )
}

export function LockIcon() {
  return (
    <IconBase size={LAYER_ICON_SIZE}>
      <rect x="5" y="10.5" width="14" height="9" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </IconBase>
  )
}

export function UnlockIcon() {
  return (
    <IconBase size={LAYER_ICON_SIZE}>
      <rect x="5" y="10.5" width="14" height="9" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0" />
    </IconBase>
  )
}

export const LAYER_TYPE_ICONS: Record<NodeType, () => JSX.Element> = {
  rectangle: RectangleLayerIcon,
}
