import type { NodeType } from '../../core/document/types'
import type { ToolId } from '../../interaction/tools'

export type IconName =
  | 'move'
  | 'hand'
  | 'scale'
  | 'frame'
  | 'section'
  | 'slice'
  | 'rectangle'
  | 'line'
  | 'arrow'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'pen'
  | 'pencil'
  | 'text'
  | 'chevron'
  | 'visibility'
  | 'visibilityOff'
  | 'lock'
  | 'unlock'
  | 'settings'
  | 'close'
  | 'add'
  | 'remove'
  | 'link'
  | 'linkOff'
  | 'check'
  | 'cornerRadius'
  | 'opacity'
  | 'alignLeft'
  | 'alignCenterX'
  | 'alignRight'
  | 'alignTop'
  | 'alignCenterY'
  | 'alignBottom'
  | 'distributeX'
  | 'distributeY'
  | 'blur'
  | 'spread'
  | 'strokeInside'
  | 'strokeCenter'
  | 'strokeOutside'
  | 'newFile'
  | 'openFile'
  | 'saveFile'
  | 'saveFileAs'

interface IconFiles {
  outlined: string
  filled: string
}

const ICON_FILES: Record<IconName, IconFiles> = {
  move: { outlined: 'arrow_selector_tool', filled: 'arrow_selector_tool-fill' },
  hand: { outlined: 'pan_tool', filled: 'pan_tool-fill' },
  scale: { outlined: 'open_in_full', filled: 'open_in_full-fill' },
  frame: { outlined: 'tag', filled: 'tag-fill' },
  section: { outlined: 'crop_free', filled: 'crop_free-fill' },
  slice: { outlined: 'content_cut', filled: 'content_cut-fill' },
  rectangle: { outlined: 'rectangle', filled: 'rectangle-fill' },
  line: { outlined: 'horizontal_rule', filled: 'horizontal_rule-fill' },
  arrow: { outlined: 'north_east', filled: 'north_east-fill' },
  ellipse: { outlined: 'circle', filled: 'circle-fill' },
  polygon: { outlined: 'pentagon', filled: 'pentagon-fill' },
  star: { outlined: 'star', filled: 'star-fill' },
  pen: { outlined: 'ink_pen', filled: 'ink_pen-fill' },
  pencil: { outlined: 'edit', filled: 'edit-fill' },
  text: { outlined: 'text_fields', filled: 'text_fields-fill' },
  chevron: { outlined: 'keyboard_arrow_down', filled: 'keyboard_arrow_down-fill' },
  visibility: { outlined: 'visibility', filled: 'visibility-fill' },
  visibilityOff: { outlined: 'visibility_off', filled: 'visibility_off-fill' },
  lock: { outlined: 'lock', filled: 'lock-fill' },
  unlock: { outlined: 'lock_open', filled: 'lock_open-fill' },
  settings: { outlined: 'settings', filled: 'settings-fill' },
  close: { outlined: 'close', filled: 'close-fill' },
  add: { outlined: 'add', filled: 'add-fill' },
  remove: { outlined: 'remove', filled: 'remove-fill' },
  link: { outlined: 'link', filled: 'link-fill' },
  linkOff: { outlined: 'link_off', filled: 'link_off-fill' },
  check: { outlined: 'check', filled: 'check-fill' },
  cornerRadius: { outlined: 'rounded_corner', filled: 'rounded_corner-fill' },
  opacity: { outlined: 'opacity', filled: 'opacity-fill' },
  alignLeft: { outlined: 'align_horizontal_left', filled: 'align_horizontal_left-fill' },
  alignCenterX: { outlined: 'align_horizontal_center', filled: 'align_horizontal_center-fill' },
  alignRight: { outlined: 'align_horizontal_right', filled: 'align_horizontal_right-fill' },
  alignTop: { outlined: 'align_vertical_top', filled: 'align_vertical_top-fill' },
  alignCenterY: { outlined: 'align_vertical_center', filled: 'align_vertical_center-fill' },
  alignBottom: { outlined: 'align_vertical_bottom', filled: 'align_vertical_bottom-fill' },
  distributeX: { outlined: 'horizontal_distribute', filled: 'horizontal_distribute-fill' },
  distributeY: { outlined: 'vertical_distribute', filled: 'vertical_distribute-fill' },
  blur: { outlined: 'blur_medium', filled: 'blur_medium-fill' },
  spread: { outlined: 'open_in_full', filled: 'open_in_full-fill' },
  strokeInside: { outlined: 'border_inner', filled: 'border_inner-fill' },
  strokeCenter: { outlined: 'border_style', filled: 'border_style-fill' },
  strokeOutside: { outlined: 'border_outer', filled: 'border_outer-fill' },
  newFile: { outlined: 'note_add', filled: 'note_add' },
  openFile: { outlined: 'folder_open', filled: 'folder_open' },
  saveFile: { outlined: 'save', filled: 'save' },
  saveFileAs: { outlined: 'save_as', filled: 'save_as' },
}

export const TOOL_ICON_NAMES: Record<ToolId, IconName> = {
  move: 'move',
  hand: 'hand',
  scale: 'scale',
  frame: 'frame',
  section: 'section',
  slice: 'slice',
  rectangle: 'rectangle',
  line: 'line',
  arrow: 'arrow',
  ellipse: 'ellipse',
  polygon: 'polygon',
  star: 'star',
  pen: 'pen',
  pencil: 'pencil',
  text: 'text',
}

export const LAYER_TYPE_ICON_NAMES: Record<NodeType, IconName> = {
  rectangle: 'rectangle',
}

const SOURCES = import.meta.glob('./*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SVG_BODY = /<svg[^>]*>([\s\S]*)<\/svg>/

export function iconMarkup(name: IconName, filled: boolean): string {
  const files = ICON_FILES[name]
  const source = SOURCES[`./${filled ? files.filled : files.outlined}.svg`]
  if (source === undefined) throw new Error(`Missing icon asset: ${name}`)
  const match = SVG_BODY.exec(source)
  if (!match || !match[1]) throw new Error(`Unreadable icon asset: ${name}`)
  return match[1].trim()
}
