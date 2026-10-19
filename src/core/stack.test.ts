import { describe, expect, it } from 'vitest'
import { stackIndexForRow } from './stack'

describe('stackIndexForRow', () => {
  it('numbers rows from the top of the stack', () => {
    expect(stackIndexForRow(1, 0)).toBe(0)
    expect(stackIndexForRow(3, 0)).toBe(2)
    expect(stackIndexForRow(3, 2)).toBe(0)
    expect(stackIndexForRow(3, 3)).toBeNull()
  })
})
