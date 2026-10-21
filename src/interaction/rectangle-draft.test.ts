import { describe, expect, it, vi } from 'vitest'
import { ALL_SNAP_EDGES, type SnapEdgeMask, type SnapGuide } from '../core/snap'
import {
  clickRectangle,
  rectangleDraft,
  rectangleFromDrag,
  type RectangleDraftSnap,
} from './rectangle-draft'

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

  it('keeps the press point as the anchor with zero size', () => {
    expect(rectangleFromDrag({ x: 50, y: 50 }, { x: 51, y: 52 }, NO_MODIFIERS)).toEqual({
      x: 50,
      y: 50,
      width: 1,
      height: 2,
    })
  })
})

describe('clickRectangle', () => {
  it('creates a 100x100 rect at the click point', () => {
    expect(clickRectangle({ x: 50, y: 50 })).toEqual({ x: 50, y: 50, width: 100, height: 100 })
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

  it('snaps only the moving edges and keeps the anchor fixed', () => {
    const roundMovingEdges: RectangleDraftSnap = (rect, edges) => {
      const left = edges.left ? Math.round(rect.x) : rect.x
      const top = edges.top ? Math.round(rect.y) : rect.y
      const right = edges.right ? Math.round(rect.x + rect.width) : rect.x + rect.width
      const bottom = edges.bottom ? Math.round(rect.y + rect.height) : rect.y + rect.height
      return {
        rect: { x: left, y: top, width: right - left, height: bottom - top },
        guides: NO_GUIDES,
      }
    }
    const draft = rectangleDraft({
      start: { x: 10.4, y: 10.6 },
      end: { x: 110.6, y: 60.4 },
      modifiers: NO_MODIFIERS,
      snap: roundMovingEdges,
      snapDisabled: false,
    })
    expect(draft.rect.x).toBe(10.4)
    expect(draft.rect.y).toBe(10.6)
    expect(draft.rect.x + draft.rect.width).toBe(111)
    expect(draft.rect.y + draft.rect.height).toBe(60)
  })

  it('snaps the edges that move when the drag goes left and up', () => {
    const snap = vi.fn<RectangleDraftSnap>((rect) => ({ rect, guides: NO_GUIDES }))
    rectangleDraft({
      start: { x: 100, y: 100 },
      end: { x: 40, y: 30 },
      modifiers: NO_MODIFIERS,
      snap,
      snapDisabled: false,
    })
    expect(snap).toHaveBeenCalledWith(
      { x: 40, y: 30, width: 60, height: 70 },
      { left: true, right: false, top: true, bottom: false },
      false,
    )
  })

  it('snaps every edge when the drag grows from the center', () => {
    const snap = vi.fn<RectangleDraftSnap>((rect) => ({ rect, guides: NO_GUIDES }))
    rectangleDraft({
      start: { x: 100, y: 100 },
      end: { x: 120, y: 130 },
      modifiers: CENTER_ONLY,
      snap,
      snapDisabled: false,
    })
    expect(snap).toHaveBeenCalledWith(
      { x: 80, y: 70, width: 40, height: 60 },
      ALL_SNAP_EDGES,
      false,
    )
  })

  it('keeps a shift drag square after snapping', () => {
    const widen: RectangleDraftSnap = (rect, edges): { rect: typeof rect; guides: readonly SnapGuide[] } => ({
      rect: edges.right ? { ...rect, width: 120 } : rect,
      guides: NO_GUIDES,
    })
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
    const edges: SnapEdgeMask = { left: false, right: true, top: false, bottom: true }
    expect(snap).toHaveBeenCalledWith({ x: 0, y: 0, width: 50, height: 50 }, edges, true)
  })
})
