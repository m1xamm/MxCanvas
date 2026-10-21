import {
  activeAutosavePayload,
  nextAutosaveSlot,
  type AutosaveMeta,
  type AutosavePayload,
  type AutosaveSlot,
  type AutosaveSlots,
} from '../core/serialization/autosave-slots'

const DB_NAME = 'mxcanvas'
const DB_VERSION = 1
const STORE_NAME = 'autosave'
const META_KEY = 'meta'

let databasePromise: Promise<IDBDatabase> | null = null

export async function readAutosave(): Promise<AutosavePayload | null> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const metaRequest = store.get(META_KEY)
    const aRequest = store.get(slotKey('a'))
    const bRequest = store.get(slotKey('b'))
    transaction.oncomplete = () => {
      const meta = readMeta(metaRequest.result)
      const slots: AutosaveSlots = {
        a: readPayload(aRequest.result),
        b: readPayload(bRequest.result),
      }
      resolve(activeAutosavePayload(meta, slots))
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('autosave read failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('autosave read aborted'))
  })
}

export async function writeAutosave(text: string, savedAt = Date.now()): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const metaRequest = store.get(META_KEY)
    metaRequest.onsuccess = () => {
      const slot = nextAutosaveSlot(readMeta(metaRequest.result))
      store.put({ text, savedAt }, slotKey(slot))
      store.put({ active: slot, savedAt }, META_KEY)
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('autosave write failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('autosave write aborted'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      resolve(database)
    }
    request.onerror = () => reject(request.error ?? new Error('autosave database failed'))
  })
  return databasePromise
}

function slotKey(slot: AutosaveSlot): string {
  return `slot-${slot}`
}

function readMeta(value: unknown): AutosaveMeta | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (record.active !== 'a' && record.active !== 'b') return null
  if (typeof record.savedAt !== 'number' || !Number.isFinite(record.savedAt)) return null
  return { active: record.active, savedAt: record.savedAt }
}

function readPayload(value: unknown): AutosavePayload | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  if (typeof record.text !== 'string') return null
  if (typeof record.savedAt !== 'number' || !Number.isFinite(record.savedAt)) return null
  return { text: record.text, savedAt: record.savedAt }
}
