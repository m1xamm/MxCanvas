import { Store } from '../core/store'
import {
  PROJECT_VERSION,
  serializeProject,
  type ProjectSnapshot,
} from '../core/serialization/project-file'
import { t, subscribeLanguage } from '../i18n/i18n'
import { setSelection } from '../interaction/selection'
import { setHoveredLayer } from '../interaction/layer-list'
import { history, scene } from './editor'
import { applyProjectViewport, currentProjectViewport } from './viewport-state'

export const documentNameStore = new Store<string | null>(null)

subscribeLanguage(updateDocumentTitle)
updateDocumentTitle()

export function setDocumentName(name: string | null): void {
  const normalized = normalizeName(name)
  if (documentNameStore.get() === normalized) return
  documentNameStore.set(normalized)
  updateDocumentTitle()
}

export function updateDocumentTitle(): void {
  const name = documentNameStore.get()
  document.title = name ? `${name} — ${t('windowTitle')}` : t('windowTitle')
}

export function applyProjectSnapshot(snapshot: ProjectSnapshot): void {
  history.clear()
  setSelection([])
  setHoveredLayer(null)
  scene.replaceAll(snapshot.nodes)
  setDocumentName(snapshot.name)
  applyProjectViewport(snapshot.viewport)
}

export function resetProject(): void {
  applyProjectSnapshot({
    version: PROJECT_VERSION,
    name: null,
    viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
    nodes: [],
  })
}

export function serializeCurrentProject(): string {
  return serializeProject(scene, documentNameStore.get(), currentProjectViewport())
}

function normalizeName(name: string | null): string | null {
  const trimmed = name?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}
