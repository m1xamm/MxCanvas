import { useEffect, useRef, useState } from 'preact/hooks'
import type { TargetedEvent, TargetedPointerEvent } from 'preact'
import type { NodeId } from '../core/document/types'
import {
  displayOrder,
  dropBoundary,
  LAYER_ROW_PITCH,
  layerListHeight,
  reorderTargetIndex,
  revealRow,
  virtualWindow,
} from '../core/layers'
import { renameNode, reorderNode, scene, setNodeLocked, setNodeVisible } from '../app/editor'
import { useSceneVersion } from '../app/use-scene-version'
import { useStoreValue } from '../app/use-store-value'
import { useTranslation } from '../i18n/use-i18n'
import { clearLayerSelection, setHoveredLayer } from '../interaction/layer-list'
import { selectionStore } from '../interaction/selection'
import { LayerRow } from './LayerRow'

const DROP_INDICATOR_OFFSET_PX = 1

interface DropTarget {
  id: NodeId
  boundary: number
}

export function LayersPanel() {
  const t = useTranslation()
  const sceneVersion = useSceneVersion()
  const selection = useStoreValue(selectionStore)
  const listRef = useRef<HTMLDivElement | null>(null)
  const draggedIdRef = useRef<NodeId | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [renamingId, setRenamingId] = useState<NodeId | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const order = displayOrder(scene.getRootChildren())
  const rowCount = order.length
  const rows = virtualWindow({ scrollTop, viewportHeight, rowCount })
  const visibleIds = order.slice(rows.start, rows.end)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => setViewportHeight(list.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const index = order.findIndex((id) => selection.includes(id))
    if (index === -1) return
    const target = revealRow(list.scrollTop, list.clientHeight, index)
    if (target !== null) list.scrollTop = target
  }, [selection, sceneVersion])

  const handleScroll = (event: TargetedEvent<HTMLDivElement, Event>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }

  const handleListPointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof Element && target.closest('.layer-row')) return
    clearLayerSelection()
  }

  const handleRenameCommit = (id: NodeId, name: string) => {
    setRenamingId(null)
    renameNode(id, name)
  }

  const handleDragMove = (clientY: number) => {
    const list = listRef.current
    const id = draggedIdRef.current
    if (!list || !id) return
    const rect = list.getBoundingClientRect()
    const contentY = clientY - rect.top + list.scrollTop
    setDropTarget({ id, boundary: dropBoundary(contentY, rowCount) })
  }

  const handleDragEnd = () => {
    draggedIdRef.current = null
    setHoveredLayer(null)
    if (dropTarget) {
      const target = reorderTargetIndex(order, dropTarget.id, dropTarget.boundary)
      if (target >= 0) reorderNode(dropTarget.id, target)
    }
    setDropTarget(null)
  }

  return (
    <div class="block block--section block--fill">
      <span class="section-title">{t('layers')}</span>
      {rowCount === 0 ? (
        <p class="panel-text">{t('noLayers')}</p>
      ) : (
        <div
          class="layers-list"
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label={t('layers')}
          onScroll={handleScroll}
          onPointerDown={handleListPointerDown}
        >
          <div class="layers-list__inner" style={{ height: `${layerListHeight(rowCount)}px` }}>
            {visibleIds.map((id, offset) => {
              const node = scene.getNode(id)
              if (!node) return null
              return (
                <LayerRow
                  key={id}
                  node={node}
                  index={rows.start + offset}
                  order={order}
                  selected={selection.includes(id)}
                  renaming={renamingId === id}
                  onRenameStart={setRenamingId}
                  onRenameCommit={handleRenameCommit}
                  onRenameCancel={() => setRenamingId(null)}
                  onToggleVisible={(target) => setNodeVisible(target.id, !target.visible)}
                  onToggleLock={(target) => setNodeLocked(target.id, !target.locked)}
                  onDragStart={(dragId) => {
                    draggedIdRef.current = dragId
                    setHoveredLayer(null)
                  }}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
              )
            })}
            {dropTarget && (
              <div
                class="layers-drop-indicator"
                style={{ top: `${dropIndicatorTop(dropTarget.boundary)}px` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function dropIndicatorTop(boundary: number): number {
  return Math.max(0, boundary * LAYER_ROW_PITCH - DROP_INDICATOR_OFFSET_PX)
}
