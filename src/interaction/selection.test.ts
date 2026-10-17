import { afterEach, describe, expect, it } from 'vitest'
import { pruneSelection, selectionStore, setSelection } from './selection'

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
