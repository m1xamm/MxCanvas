import { Store } from '../core/store'
import { parseProject } from '../core/serialization/project-file'
import {
  applyProjectSnapshot,
  documentNameStore,
  serializeCurrentProject,
} from './project-session'
import { scene } from './editor'
import { projectViewport } from './viewport-state'
import { readAutosave, writeAutosave } from './autosave-db'

export const AUTOSAVE_DEBOUNCE_MS = 1_000

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export const saveStatusStore = new Store<SaveStatus>('idle')

let enabled = false
let started = false
let timer: number | null = null
let version = 0
let savedVersion = -1
let saving: Promise<void> | null = null

export function isAutosaveDisabled(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.has('stress') || params.get('autosave') === 'off'
}

export async function restoreAutosavedProject(): Promise<boolean> {
  try {
    const payload = await readAutosave()
    if (!payload) return false
    applyProjectSnapshot(parseProject(payload.text), true)
    return true
  } catch {
    return false
  }
}

export function startAutosave(active: boolean, restored: boolean): void {
  if (started) return
  started = true
  enabled = active
  savedVersion = restored ? 0 : -1
  saveStatusStore.set(active ? (restored ? 'saved' : 'unsaved') : 'idle')
  if (!active) return
  scene.subscribe(markProjectChanged)
  projectViewport.subscribe(markProjectChanged)
  documentNameStore.subscribe(markProjectChanged)
  document.addEventListener('visibilitychange', flushWhenHidden)
  window.addEventListener('pagehide', flushOnPageHide)
}

export function markProjectChanged(): void {
  if (!enabled) return
  version += 1
  saveStatusStore.set('unsaved')
  if (timer !== null) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    timer = null
    void flushAutosave()
  }, AUTOSAVE_DEBOUNCE_MS)
}

export function flushAutosave(): Promise<void> {
  if (!enabled) return Promise.resolve()
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  const task = async () => {
    const target = version
    if (target === savedVersion) return
    let text: string
    try {
      text = serializeCurrentProject()
    } catch {
      saveStatusStore.set('error')
      return
    }
    saveStatusStore.set('saving')
    try {
      await writeAutosave(text)
      if (version === target) {
        savedVersion = target
        saveStatusStore.set('saved')
      }
    } catch {
      if (version === target) saveStatusStore.set('error')
    }
  }
  const next = saving ? saving.then(task, task) : task()
  const wrapped = next.finally(() => {
    if (saving === wrapped) saving = null
  })
  saving = wrapped
  return wrapped
}

function flushWhenHidden(): void {
  if (document.visibilityState === 'hidden') void flushAutosave()
}

function flushOnPageHide(): void {
  void flushAutosave()
}
