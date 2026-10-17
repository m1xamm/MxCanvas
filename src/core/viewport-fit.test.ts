import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM } from './viewport'
import { FIT_PADDING_PX, fitBounds } from './viewport-fit'

const CANVAS_AREA = { x: 0, y: 0, width: 800, height: 600 }

describe('fitBounds', () => {
  it('fits a wide rectangle by its width', () => {
    const fit = fitBounds({ x: 0, y: 0, width: 400, height: 100 }, CANVAS_AREA)
    expect(fit?.zoom).toBeCloseTo(672 / 400, 9)
  })

  it('fits a tall rectangle by its height', () => {
    const fit = fitBounds({ x: 0, y: 0, width: 100, height: 400 }, CANVAS_AREA)
    expect(fit?.zoom).toBeCloseTo(472 / 400, 9)
  })

  it('keeps 64px of padding around the content', () => {
    expect(FIT_PADDING_PX).toBe(64)
    const fit = fitBounds({ x: 0, y: 0, width: 100, height: 100 }, CANVAS_AREA, FIT_PADDING_PX)
    expect(fit?.zoom).toBeCloseTo(472 / 100, 9)
  })

  it('centers the bounds inside the padded area', () => {
    const fit = fitBounds({ x: 0, y: 0, width: 100, height: 100 }, CANVAS_AREA)
    expect(fit?.pan.x).toBeCloseTo(164, 6)
    expect(fit?.pan.y).toBeCloseTo(64, 6)
  })

  it('fits the content between the sidebars', () => {
    const fit = fitBounds(
      { x: 100, y: 100, width: 200, height: 200 },
      { x: 240, y: 0, width: 320, height: 600 },
    )
    expect(fit?.zoom).toBeCloseTo(192 / 200, 9)
    expect(fit?.pan.x).toBeCloseTo(208, 6)
    expect(fit?.pan.y).toBeCloseTo(108, 6)
  })

  it('clamps the zoom into the viewport limits', () => {
    const huge = fitBounds({ x: 0, y: 0, width: 1e7, height: 1e7 }, CANVAS_AREA)
    expect(huge?.zoom).toBe(MIN_ZOOM)
    const tiny = fitBounds({ x: 0, y: 0, width: 0.001, height: 0.001 }, CANVAS_AREA)
    expect(tiny?.zoom).toBe(MAX_ZOOM)
  })

  it('treats a zero size bound as one world pixel', () => {
    const fit = fitBounds({ x: 10, y: 10, width: 0, height: 0 }, CANVAS_AREA)
    expect(fit?.zoom).toBe(MAX_ZOOM)
    expect(fit?.pan.x).toBeCloseTo(400 - 10 * MAX_ZOOM, 6)
  })

  it('returns null when the padding does not fit into the area', () => {
    const small = { x: 0, y: 0, width: 100, height: 100 }
    expect(fitBounds({ x: 0, y: 0, width: 10, height: 10 }, small)).toBeNull()
    expect(fitBounds({ x: 0, y: 0, width: 10, height: 10 }, { ...small, width: 1000 })).toBeNull()
  })
})
