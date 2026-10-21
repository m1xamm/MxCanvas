export type AutosaveSlot = 'a' | 'b'

export interface AutosaveMeta {
  active: AutosaveSlot
  savedAt: number
}

export interface AutosavePayload {
  text: string
  savedAt: number
}

export type AutosaveSlots = Record<AutosaveSlot, AutosavePayload | null>

export function nextAutosaveSlot(meta: AutosaveMeta | null): AutosaveSlot {
  return meta?.active === 'a' ? 'b' : 'a'
}

export function activeAutosavePayload(
  meta: AutosaveMeta | null,
  slots: AutosaveSlots,
): AutosavePayload | null {
  if (!meta) return null
  const payload = slots[meta.active]
  if (!payload) return null
  if (payload.savedAt !== meta.savedAt) return null
  return payload
}
