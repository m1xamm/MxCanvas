import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SHOT_DIR = fileURLToPath(new URL('../.shots/', import.meta.url))

export function ensureShotDir() {
  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true })
}

export function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function approx(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

export function rectApprox(actual, expected, tolerance, message) {
  assert(actual !== null && actual !== undefined, `${message}: missing rect`)
  approx(actual.x, expected.x, tolerance, `${message} x`)
  approx(actual.y, expected.y, tolerance, `${message} y`)
  approx(actual.width, expected.width, tolerance, `${message} width`)
  approx(actual.height, expected.height, tolerance, `${message} height`)
}

export function unionRects(rects) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const rect of rects) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function pointerDelta(a, b) {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function dragDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

export function checkFramesConsistent(frames, label) {
  for (const frame of frames) {
    if (!frame.selectionBounds) {
      assert(frame.selectedBoxes.length === 0, `${label}: frame ${frame.frame} boxes without bounds`)
      continue
    }
    assert(
      frame.selectedBoxes.length > 0,
      `${label}: frame ${frame.frame} has bounds without selected boxes`,
    )
    const union = unionRects(frame.selectedBoxes.map((box) => box.rect))
    rectApprox(union, frame.selectionBounds, 1e-6, `${label}: frame ${frame.frame} overlay vs boxes`)
  }
}

export function checkDraftAnchor(draftFrames, label) {
  const first = draftFrames[0]
  assert(first, `${label}: no draft frames`)
  const anchor = { x: first.draft.x, y: first.draft.y }
  for (const frame of draftFrames) {
    approx(frame.draft.x, anchor.x, 1e-6, `${label}: frame ${frame.frame} draft anchor x`)
    approx(frame.draft.y, anchor.y, 1e-6, `${label}: frame ${frame.frame} draft anchor y`)
  }
}

export function checkBoxFollowsPointer(frames, base, start, label, tolerance = 0.75) {
  for (const frame of frames) {
    const box = frame.selectedBoxes[0]?.rect ?? null
    if (!box || !frame.pointer) continue
    approx(box.x - base.x, frame.pointer.x - start.x, tolerance, `${label}: frame ${frame.frame} box x`)
    approx(box.y - base.y, frame.pointer.y - start.y, tolerance, `${label}: frame ${frame.frame} box y`)
  }
}

export function createHelpers(page) {
  return {
    page,
    async history() {
      return page.evaluate(() => window.__mxDebug.history())
    },
    async selection() {
      return page.evaluate(() => window.__mxDebug.selection())
    },
    async nodes() {
      return page.evaluate(() => window.__mxDebug.nodes())
    },
    async frames(last = 400) {
      return page.evaluate((count) => window.__mxDebug.frames.slice(-count), last)
    },
    async lastFrame() {
      return page.evaluate(() => window.__mxDebug.last())
    },
    async clearFrames() {
      await page.evaluate(() => window.__mxDebug.clear())
    },
    async cursor() {
      return page.$eval('.canvas-surface', (element) => getComputedStyle(element).cursor)
    },
    async findNode(name) {
      const nodes = await page.evaluate(() => window.__mxDebug.nodes())
      return nodes.find((node) => node.name === name) ?? null
    },
    async pressDrag(from, to, options = {}) {
      const keys = options.keys ?? []
      const steps = options.steps ?? 18
      const stepDelayMs = options.stepDelayMs ?? 6
      for (const key of keys) await page.keyboard.down(key)
      await page.mouse.move(from.x, from.y, { steps: 2 })
      await page.mouse.down(options.button ? { button: options.button } : undefined)
      for (let step = 1; step <= steps; step += 1) {
        await page.mouse.move(
          from.x + ((to.x - from.x) * step) / steps,
          from.y + ((to.y - from.y) * step) / steps,
        )
        await page.waitForTimeout(stepDelayMs)
      }
      await page.waitForTimeout(30)
      return {
        async release() {
          await page.mouse.up(options.button ? { button: options.button } : undefined)
          for (const key of keys) await page.keyboard.up(key)
          await page.waitForTimeout(40)
        },
      }
    },
    async drawRect(rect, options = {}) {
      await page.keyboard.press('KeyR')
      const drag = await this.pressDrag(
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { keys: options.keys ?? [], steps: options.steps ?? 12 },
      )
      await drag.release()
      await page.waitForTimeout(40)
    },
    async clickCanvas(point) {
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
      await page.mouse.up()
      await page.waitForTimeout(40)
    },
    async moveTo(point) {
      await page.mouse.move(point.x, point.y, { steps: 3 })
      await page.waitForTimeout(60)
    },
  }
}
