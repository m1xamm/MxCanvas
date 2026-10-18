import { useEffect, useRef } from 'preact/hooks'
import type { TargetedKeyboardEvent, TargetedPointerEvent } from 'preact'
import type { NodeId, SceneNodeUnion } from '../core/document/types'
import { layerRowCorners, rowOffset } from '../core/layers'
import { useTranslation } from '../i18n/use-i18n'
import { selectLayer, setHoveredLayer } from '../interaction/layer-list'
import { Icon } from './Icon'
import { LAYER_TYPE_ICON_NAMES } from './icons'

const RENAME_KEY_CODE = 'F2'
const RENAME_COMMIT_KEY_CODE = 'Enter'
const RENAME_CANCEL_KEY_CODE = 'Escape'
const DRAG_THRESHOLD_PX = 4
const ACTION_SELECTOR = '.layer-row__action'

interface PressState {
  pointerId: number
  startY: number
  dragging: boolean
}

export interface LayerRowProps {
  node: SceneNodeUnion
  index: number
  rowCount: number
  order: readonly NodeId[]
  selected: boolean
  renaming: boolean
  onRenameStart: (id: NodeId) => void
  onRenameCommit: (id: NodeId, name: string) => void
  onRenameCancel: () => void
  onToggleVisible: (node: SceneNodeUnion) => void
  onToggleLock: (node: SceneNodeUnion) => void
  onDragStart: (id: NodeId) => void
  onDragMove: (clientY: number) => void
  onDragEnd: () => void
}

export function LayerRow(props: LayerRowProps) {
  const { node, index, rowCount, order, selected, renaming } = props
  const t = useTranslation()
  const rowRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pressRef = useRef<PressState | null>(null)
  const cancelRef = useRef(false)
  const typeIcon = LAYER_TYPE_ICON_NAMES[node.type]

  useEffect(() => {
    if (!renaming) return
    cancelRef.current = false
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [renaming])

  const handlePointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || renaming) return
    if (isActionTarget(event.target)) return
    rowRef.current?.focus()
    selectLayer(node.id, order, {
      toggle: event.ctrlKey || event.metaKey,
      range: event.shiftKey,
    })
    pressRef.current = { pointerId: event.pointerId, startY: event.clientY, dragging: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: TargetedPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    if (!press || press.pointerId !== event.pointerId) return
    if (!press.dragging) {
      if (Math.abs(event.clientY - press.startY) < DRAG_THRESHOLD_PX) return
      press.dragging = true
      props.onDragStart(node.id)
    }
    props.onDragMove(event.clientY)
  }

  const handlePointerUp = (event: TargetedPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current
    if (!press || press.pointerId !== event.pointerId) return
    pressRef.current = null
    if (press.dragging) props.onDragEnd()
  }

  const handleKeyDown = (event: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (event.code !== RENAME_KEY_CODE) return
    event.preventDefault()
    props.onRenameStart(node.id)
  }

  const commitRename = () => {
    props.onRenameCommit(node.id, inputRef.current?.value ?? node.name)
  }

  const className = selected ? 'layer-row is-selected' : 'layer-row'
  const corners = layerRowCorners(index, rowCount)
  const visibilityClass = node.visible ? 'control layer-row__action' : 'control layer-row__action is-on'
  const lockClass = node.locked ? 'control layer-row__action is-on' : 'control layer-row__action'

  return (
    <div
      ref={rowRef}
      class={className}
      style={{
        top: `${rowOffset(index)}px`,
        '--layer-row-radius': `${corners.top}px ${corners.top}px ${corners.bottom}px ${corners.bottom}px`,
      }}
      role="option"
      aria-selected={selected}
      tabindex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDblClick={() => props.onRenameStart(node.id)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHoveredLayer(node.id)}
      onMouseLeave={() => setHoveredLayer(null)}
    >
      <span class="layer-row__icon">
        <Icon name={typeIcon} size={16} />
      </span>
      {renaming ? (
        <input
          ref={inputRef}
          class="layer-row__input"
          defaultValue={node.name}
          aria-label={t('renameLayer')}
          onKeyDown={(event) => {
            if (event.code === RENAME_COMMIT_KEY_CODE) {
              event.preventDefault()
              commitRename()
            } else if (event.code === RENAME_CANCEL_KEY_CODE) {
              event.preventDefault()
              cancelRef.current = true
              props.onRenameCancel()
            }
          }}
          onBlur={() => {
            if (cancelRef.current) return
            commitRename()
          }}
        />
      ) : (
        <span class="layer-row__name">{node.name}</span>
      )}
      <span class="layer-row__actions">
        <button
          type="button"
          class={visibilityClass}
          aria-pressed={!node.visible}
          aria-label={t('toggleLayerVisibility')}
          onClick={() => props.onToggleVisible(node)}
        >
          {node.visible ? (
            <Icon name="visibility" size={16} />
          ) : (
            <Icon name="visibilityOff" size={16} filled />
          )}
        </button>
        <button
          type="button"
          class={lockClass}
          aria-pressed={node.locked}
          aria-label={t('toggleLayerLock')}
          onClick={() => props.onToggleLock(node)}
        >
          {node.locked ? (
            <Icon name="lock" size={16} filled />
          ) : (
            <Icon name="unlock" size={16} />
          )}
        </button>
      </span>
    </div>
  )
}

function isActionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(ACTION_SELECTOR) !== null
}
