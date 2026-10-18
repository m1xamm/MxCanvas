import { selectionStore } from '../../interaction/selection'
import {
  addSelectionFill,
  alignSelection,
  distributeSelection,
  removeSelectionFill,
  scene,
  setSelectionConstrainProportions,
  setSelectionCornerRadius,
  setSelectionField,
  setSelectionFillColor,
  setSelectionFillOpacity,
  setSelectionFillVisible,
  setSelectionOpacity,
} from '../../app/editor'
import { useStoreValue } from '../../app/use-store-value'
import { useSceneVersion } from '../../app/use-scene-version'
import { summarizeFills } from '../../core/fills'
import type { AlignMode, DistributeMode } from '../../core/align'
import { selectionNodes, selectionRect } from '../../core/selection-box'
import type { RectangleNode, SceneNodeUnion } from '../../core/document/types'
import type { MessageKey } from '../../i18n/i18n'
import { useTranslation } from '../../i18n/use-i18n'
import { Cluster } from '../Cluster'
import { Icon } from '../Icon'
import type { IconName } from '../icons'
import { FillRow } from './FillRow'
import { NumberField } from './NumberField'

const MIN_SIZE = 1
const MIN_ALIGN_COUNT = 2
const MIN_DISTRIBUTE_COUNT = 3

interface AlignAction {
  icon: IconName
  label: MessageKey
  mode: AlignMode
}

interface DistributeAction {
  icon: IconName
  label: MessageKey
  mode: DistributeMode
}

const ALIGN_ACTIONS: readonly AlignAction[] = [
  { icon: 'alignLeft', label: 'alignLeft', mode: 'left' },
  { icon: 'alignCenterX', label: 'alignCenterX', mode: 'centerX' },
  { icon: 'alignRight', label: 'alignRight', mode: 'right' },
  { icon: 'alignTop', label: 'alignTop', mode: 'top' },
  { icon: 'alignCenterY', label: 'alignCenterY', mode: 'centerY' },
  { icon: 'alignBottom', label: 'alignBottom', mode: 'bottom' },
]

const DISTRIBUTE_ACTIONS: readonly DistributeAction[] = [
  { icon: 'distributeX', label: 'distributeX', mode: 'horizontal' },
  { icon: 'distributeY', label: 'distributeY', mode: 'vertical' },
]

export function PropertiesPanel() {
  const t = useTranslation()
  const ids = useStoreValue(selectionStore)
  useSceneVersion()

  if (ids.length === 0) return null

  const nodes = selectionNodes(scene, ids)
  const rect = selectionRect(scene, ids)
  const fills = summarizeFills(nodes.filter(isRectangle))
  const constrained = nodes.length > 0 && nodes.every((node) => node.constrainProportions)

  return (
    <>
      {ids.length >= MIN_ALIGN_COUNT && (
        <div class="block block--section">
          <span class="section-title">{t('sections.align')}</span>
          <Cluster>
            {ALIGN_ACTIONS.map((action) => (
              <button
                key={action.mode}
                type="button"
                class="control align-button"
                aria-label={t(action.label)}
                title={t(action.label)}
                onClick={() => alignSelection(action.mode)}
              >
                <Icon name={action.icon} size={16} />
              </button>
            ))}
          </Cluster>
          <Cluster>
            {DISTRIBUTE_ACTIONS.map((action) => (
              <button
                key={action.mode}
                type="button"
                class="control align-button"
                aria-label={t(action.label)}
                title={t(action.label)}
                disabled={ids.length < MIN_DISTRIBUTE_COUNT}
                onClick={() => distributeSelection(action.mode)}
              >
                <Icon name={action.icon} size={16} />
              </button>
            ))}
          </Cluster>
        </div>
      )}
      {rect && (
        <div class="block block--section">
          <span class="section-title">{t('sections.position')}</span>
          <Cluster>
            <NumberField
              label={t('positionX')}
              value={rect.x}
              title={t('positionX')}
              onChange={(value, live) => setSelectionField('x', value, live)}
            />
            <NumberField
              label={t('positionY')}
              value={rect.y}
              title={t('positionY')}
              onChange={(value, live) => setSelectionField('y', value, live)}
            />
          </Cluster>
          <Cluster>
            <NumberField
              label={t('sizeWidth')}
              value={rect.width}
              min={MIN_SIZE}
              title={t('sizeWidth')}
              onChange={(value, live) => setSelectionField('width', value, live)}
            />
            <NumberField
              label={t('sizeHeight')}
              value={rect.height}
              min={MIN_SIZE}
              title={t('sizeHeight')}
              onChange={(value, live) => setSelectionField('height', value, live)}
            />
          </Cluster>
        </div>
      )}
      <div class="block block--section">
        <span class="section-title">{t('sections.appearance')}</span>
        <Cluster>
          <NumberField
            icon="cornerRadius"
            value={uniformValue(nodes, (node) => node.cornerRadius)}
            min={0}
            title={t('cornerRadiusLabel')}
            onChange={(value, live) => setSelectionCornerRadius(value, live)}
          />
          <NumberField
            icon="opacity"
            value={percentValue(nodes, (node) => node.opacity)}
            suffix="%"
            min={0}
            max={100}
            title={t('opacityLabel')}
            onChange={(value, live) => setSelectionOpacity(value, live)}
          />
          <button
            type="button"
            class={constrained ? 'control proportion-toggle is-active' : 'control proportion-toggle'}
            aria-label={t('constrainProportionsLabel')}
            aria-pressed={constrained}
            onClick={() => setSelectionConstrainProportions(!constrained)}
          >
            <Icon name={constrained ? 'link' : 'linkOff'} size={16} filled={constrained} />
          </button>
        </Cluster>
      </div>
      <div class="block block--section">
        <div class="section-head">
          <span class="section-title">{t('sections.fill')}</span>
          <button
            type="button"
            class="control icon-button"
            aria-label={t('addFill')}
            onClick={addSelectionFill}
          >
            <Icon name="add" size={16} />
          </button>
        </div>
        <Cluster direction="vertical">
          {fills.map((summary) => (
            <FillRow
              key={summary.row}
              summary={summary}
              onColorChange={(color, live) => setSelectionFillColor(summary.row, color, live)}
              onOpacityChange={(opacity, live) => setSelectionFillOpacity(summary.row, opacity, live)}
              onVisibleChange={(visible) => setSelectionFillVisible(summary.row, visible)}
              onRemove={() => removeSelectionFill(summary.row)}
              onHexChange={(color) => setSelectionFillColor(summary.row, color)}
            />
          ))}
        </Cluster>
      </div>
    </>
  )
}

function isRectangle(node: SceneNodeUnion): node is RectangleNode {
  return node.type === 'rectangle'
}

function percentValue(
  nodes: readonly SceneNodeUnion[],
  read: (node: SceneNodeUnion) => number,
): number | null {
  const value = uniformValue(nodes, read)
  return value === null ? null : Math.round(value * 100)
}

function uniformValue(
  nodes: readonly SceneNodeUnion[],
  read: (node: SceneNodeUnion) => number,
): number | null {
  const first = nodes[0]
  if (!first) return null
  const value = read(first)
  return nodes.every((node) => Math.abs(read(node) - value) < 1e-6) ? value : null
}
