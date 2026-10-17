import { describe, expect, it, vi } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM, Viewport } from './viewport'

describe('Viewport', () => {
  it('maps screen points to world points with pan and zoom applied', () => {
    const viewport = new Viewport({ pan: { x: 100, y: 50 }, zoom: 2 })
    expect(viewport.screenToWorld({ x: 200, y: 150 })).toEqual({ x: 50, y: 50 })
    expect(viewport.worldToScreen({ x: 50, y: 50 })).toEqual({ x: 200, y: 150 })
  })

  it('round-trips points between screen and world space', () => {
    const viewport = new Viewport({ pan: { x: -320, y: 210 }, zoom: 1.75 })
    const screen = { x: 640, y: 480 }
    const roundTripped = viewport.worldToScreen(viewport.screenToWorld(screen))
    expect(roundTripped.x).toBeCloseTo(screen.x, 9)
    expect(roundTripped.y).toBeCloseTo(screen.y, 9)
  })

  it('keeps the world point under the cursor fixed while zooming', () => {
    const viewport = new Viewport({ pan: { x: 37, y: -11 }, zoom: 1.5 })
    const cursor = { x: 420, y: 260 }
    const worldBefore = viewport.screenToWorld(cursor)
    viewport.zoomAt(cursor, 1.3)
    expect(viewport.zoom).toBeCloseTo(1.95, 9)
    const worldAfter = viewport.screenToWorld(cursor)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 9)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 9)
  })

  it('clamps zoom to the maximum while staying anchored', () => {
    const viewport = new Viewport({ pan: { x: 12, y: 34 }, zoom: 8 })
    const cursor = { x: 300, y: 200 }
    const worldBefore = viewport.screenToWorld(cursor)
    viewport.zoomAt(cursor, 1e9)
    expect(viewport.zoom).toBe(MAX_ZOOM)
    const worldAfter = viewport.screenToWorld(cursor)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 9)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 9)
  })

  it('clamps zoom to the minimum while staying anchored', () => {
    const viewport = new Viewport({ pan: { x: -140, y: 96 }, zoom: 1 })
    const cursor = { x: 512, y: 384 }
    const worldBefore = viewport.screenToWorld(cursor)
    viewport.zoomAt(cursor, 1e-9)
    expect(viewport.zoom).toBe(MIN_ZOOM)
    const worldAfter = viewport.screenToWorld(cursor)
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 9)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 9)
  })

  it('clamps the initial zoom into range', () => {
    expect(new Viewport({ zoom: 1000 }).zoom).toBe(MAX_ZOOM)
    expect(new Viewport({ zoom: 0 }).zoom).toBe(MIN_ZOOM)
  })

  it('pans without changing zoom', () => {
    const viewport = new Viewport({ pan: { x: 10, y: 20 }, zoom: 2 })
    viewport.panBy({ x: 30, y: -10 })
    expect(viewport.pan).toEqual({ x: 40, y: 10 })
    expect(viewport.zoom).toBe(2)
    expect(viewport.screenToWorld({ x: 40, y: 10 })).toEqual({ x: 0, y: 0 })
  })

  it('notifies subscribers on pan and zoom and stops after unsubscribe', () => {
    const viewport = new Viewport()
    const listener = vi.fn()
    const unsubscribe = viewport.subscribe(listener)
    viewport.panBy({ x: 5, y: 5 })
    viewport.zoomAt({ x: 0, y: 0 }, 2)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    viewport.panBy({ x: 5, y: 5 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('sets pan and zoom directly and clamps the zoom', () => {
    const viewport = new Viewport()
    const listener = vi.fn()
    viewport.subscribe(listener)
    viewport.setView({ x: 40, y: 20 }, 3)
    expect(viewport.pan).toEqual({ x: 40, y: 20 })
    expect(viewport.zoom).toBe(3)
    viewport.setView({ x: 40, y: 20 }, 3)
    expect(listener).toHaveBeenCalledTimes(1)
    viewport.setView({ x: 0, y: 0 }, 1000)
    expect(viewport.zoom).toBe(MAX_ZOOM)
  })
})
