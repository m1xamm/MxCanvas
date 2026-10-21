import { describe, expect, it } from 'vitest'
import { activeAutosavePayload, nextAutosaveSlot, type AutosaveSlots } from './autosave-slots'

const EMPTY_SLOTS: AutosaveSlots = { a: null, b: null }

describe('autosave double buffer', () => {
  it('writes to the inactive slot', () => {
    expect(nextAutosaveSlot(null)).toBe('a')
    expect(nextAutosaveSlot({ active: 'a', savedAt: 1 })).toBe('b')
    expect(nextAutosaveSlot({ active: 'b', savedAt: 2 })).toBe('a')
  })

  it('reads only the slot named by committed metadata', () => {
    expect(activeAutosavePayload(null, EMPTY_SLOTS)).toBeNull()
    const slots: AutosaveSlots = {
      a: { text: 'old', savedAt: 1 },
      b: { text: 'new', savedAt: 2 },
    }
    expect(activeAutosavePayload({ active: 'b', savedAt: 2 }, slots)?.text).toBe('new')
    expect(activeAutosavePayload({ active: 'a', savedAt: 1 }, slots)?.text).toBe('old')
  })

  it('ignores a partially written inactive slot and mismatched metadata', () => {
    const slots: AutosaveSlots = {
      a: { text: 'committed', savedAt: 5 },
      b: { text: 'partial', savedAt: 6 },
    }
    expect(activeAutosavePayload({ active: 'a', savedAt: 5 }, slots)?.text).toBe('committed')
    expect(activeAutosavePayload({ active: 'a', savedAt: 6 }, slots)).toBeNull()
    expect(activeAutosavePayload({ active: 'b', savedAt: 5 }, slots)).toBeNull()
  })
})
