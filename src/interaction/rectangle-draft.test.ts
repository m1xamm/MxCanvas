import { describe, expect, it, vi } from 'vitest'
import type { SnapGuide } from '../core/snap'
import { rectangleDraft, rectangleFromDrag, type RectangleDraftSnap } from './rectangle-draft'

const NO_MODIFIERS = { square: false, fromCenter: false }
const SQUARE_ONLY = { square: true, fromCenter: false }
const CENTER_ONLY = { square: false, fromCenter: true }
const SQUARE_FROM_CENTER = { square: true, fromCenter: true }

describe('rectangleFromDrag', () => {
  it('creates a rect from a drag in any direction', () => {
    expect(rectangleFromDrag({ x: 10, y: 10 }, { x: 110, y: 60 }, NO_MODIFIERS)).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
    expect(rectangleFromDrag({ x: 110, y: 60 }, { x: 10, y: 10 }, NO_MODIFIERS)).toEqual({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    })
  })

  it('snaps to a square with shift held', () => {
    expect(rectangleFromDrag({ x: 0, y: 0 }, { x: 100, y: 40 }, SQUARE_ONLY)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
    expect(rectangleFromDrag({ x: 100, y: 100 }, { x: 0, y: 40 }, SQUARE_ONLY)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it('grows from the center with alt held', () => {
    expect(rectangleFromDrag({ x: 100, y: 100 }, { x: 120, y: 130 }, CENTER_ONLY)).toEqual({
      x: 80,
      y: 70,
      width: 40,
      height: 60,
    })
  })

  it('combines shift and alt', () => {
    expect(
      rectangleFromDrag({ x: 100, y: 100 }, { x: 120, y: 130 }, SQUARE_FROM_CENTER),
    ).toEqual({ x: 70, y: 70, width: 60, height: 60 })
  })

  it('creates a 100x100 rect at the click point when movement is under 3px', () => {
    expect(rectangleFromDrag({ x: 50, y: 50 }, { x: 51, y: 52.9 }, NO_MODIFIERS)).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    })
    expect(rectangleFromDrag({ x: 50, y: 50 }, { x: 50, y: 50 }, SQUARE_FROM_CENTER)).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    })
  })

  it('treats a 3px drag as a drag', () => {
    expect(rectangleFromDrag({ x: 0, y: 0 }, { x: 3, y: 0 }, NO_MODIFIERS)).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 0,
    })
  })
})

const NO_GUIDES: readonly SnapGuide[] = []

const roundEdges: RectangleDraftSnap = (rect) => {
  const left = Math.round(rect.x)
  const top = Math.round(rect.y)
  return {
    rect: {
      x: left,
      y: top,
      width: Math.round(rect.x + rect.width) - left,
      height: Math.round(rect.y + rect.height) - top,
    },
    guides: NO_GUIDES,
  }
}

describe('rectangleDraft', () => {
  it('keeps the raw rect without a snap function', () => {
    const draft = rectangleDraft({
      start: { x: 10.4, y: 10.6 },
      end: { x: 110.4, y: 60.6 },
      modifiers: NO_MODIFIERS,
      snap: null,
      snapDisabled: false,
    })
    expect(draft.rect).toEqual({ x: 10.4, y: 10.6, width: 100, height: 50 })
    expect(draft.guides).toEqual(NO_GUIDES)
  })

  it('lands both edges of the drag on whole pixels', () => {
    const draft = rectangleDraft({
      start: { x: 10.4, y: 10.6 },
      end: { x: 110.6, y: 60.4 },
      modifiers: NO_MODIFIERS,
      snap: roundEdges,
      snapDisabled: false,
    })
    expect(draft.rect).toEqual({ x: 10, y: 11, width: 101, height: 49 })
  })

  it('keeps a shift drag square after snapping', () => {
    const widen: RectangleDraftSnap = (rect) => ({ rect: { ...rect, width: 120 }, guides: NO_GUIDES })
    const draft = rectangleDraft({
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
      modifiers: SQUARE_ONLY,
      snap: widen,
      snapDisabled: false,
    })
    expect(draft.rect).toEqual({ x: 0, y: 0, width: 120, height: 120 })
  })

  it('keeps an alt drag centered after snapping', () => {
    const draft = rectangleDraft({
      start: { x: 100.2, y: 100.4 },
      end: { x: 120.6, y: 130.5 },
      modifiers: CENTER_ONLY,
      snap: roundEdges,
      snapDisabled: false,
    })
    expect(draft.rect).toEqual({ x: 79.7, y: 69.9, width: 41, height: 61 })
  })

  it('passes the disabled flag to the snap function', () => {
    const snap = vi.fn<RectangleDraftSnap>((rect) => ({ rect, guides: NO_GUIDES }))
    rectangleDraft({
      start: { x: 0, y: 0 },
      end: { x: 50, y: 50 },
      modifiers: NO_MODIFIERS,
      snap,
      snapDisabled: true,
    })
    expect(snap).toHaveBeenCalledWith({ x: 0, y: 0, width: 50, height: 50 }, true)
  })
})
