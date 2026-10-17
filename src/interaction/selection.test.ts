import { afterEach, describe, expect, it } from 'vitest'
import {
  pruneSelection,
  selectionOnPress,
  selectionStore,
  setSelection,
  toggleSelection,
  unionSelection,
} from './selection'

afterEach(() => {
  setSelection([])
})

describe('selection store', () => {
  it('replaces the previous selection', () => {
    setSelection(['a', 'b'])
    setSelection(['c'])
    expect(selectionStore.get()).toEqual(['c'])
  })

  it('drops ids that no longer exist in the document', () => {
    setSelection(['a', 'b', 'c'])
    pruneSelection((id) => id !== 'b')
    expect(selectionStore.get()).toEqual(['a', 'c'])
  })

  it('keeps the stored ids when all of them exist', () => {
    setSelection(['a'])
    const before = selectionStore.get()
    pruneSelection(() => true)
    expect(selectionStore.get()).toBe(before)
  })
})

describe('selection rules', () => {
  it('selects a single node on press and keeps an existing selection', () => {
    expect(selectionOnPress([], 'a')).toEqual(['a'])
    expect(selectionOnPress(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(selectionOnPress(['a'], 'b')).toEqual(['b'])
  })

  it('toggles a node in and out', () => {
    expect(toggleSelection([], 'a')).toEqual(['a'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('unions ids without duplicates', () => {
    expect(unionSelection(['a'], ['b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})
