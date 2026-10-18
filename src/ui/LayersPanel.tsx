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
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null)
  const draggedIdRef = useRef<NodeId | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [renamingId, setRenamingId] = useState<NodeId | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const order = displayOrder(scene.getRootChildren())
  const knownIdsRef = useRef<Set<NodeId> | null>(null)
  const tracked = trackFreshIds(knownIdsRef.current, order)
  knownIdsRef.current = tracked.known
  const freshIds = tracked.fresh
  const rowCount = order.length
  const rows = virtualWindow({ scrollTop, viewportHeight, rowCount })
  const visibleIds = order.slice(rows.start, rows.end)

  useEffect(() => {
    if (!listElement) return
    const measure = () => setViewportHeight(listElement.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(listElement)
    return () => observer.disconnect()
  }, [listElement])

  useEffect(() => {
    if (!listElement) return
    const index = order.findIndex((id) => selection.includes(id))
    if (index === -1) return
    const target = revealRow(listElement.scrollTop, listElement.clientHeight, index)
    if (target !== null) listElement.scrollTop = target
  }, [selection, sceneVersion, listElement])

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
    const id = draggedIdRef.current
    if (!listElement || !id) return
    const rect = listElement.getBoundingClientRect()
    const contentY = clientY - rect.top + listElement.scrollTop
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
    <div class="block block--section block--fill block--bare">
      <span class="section-title">{t('layers')}</span>
      {rowCount === 0 ? (
        <p class="panel-text">{t('noLayers')}</p>
      ) : (
        <div
          class="layers-list"
          ref={setListElement}
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
                  rowCount={rowCount}
                  order={order}
                  selected={selection.includes(id)}
                  renaming={renamingId === id}
                  fresh={freshIds.has(id)}
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

function trackFreshIds(
  known: Set<NodeId> | null,
  order: readonly NodeId[],
): { known: Set<NodeId>; fresh: ReadonlySet<NodeId> } {
  if (known === null) return { known: new Set(order), fresh: EMPTY_IDS }
  const fresh = new Set<NodeId>()
  for (const id of order) {
    if (!known.has(id)) fresh.add(id)
    known.add(id)
  }
  const present = new Set(order)
  for (const id of [...known]) {
    if (!present.has(id)) known.delete(id)
  }
  return { known, fresh }
}

const EMPTY_IDS: ReadonlySet<NodeId> = new Set<NodeId>()
