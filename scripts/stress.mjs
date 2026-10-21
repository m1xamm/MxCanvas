import { chromium } from 'playwright'
import { createServer } from 'vite'

const PORT = 5197
const NODE_COUNT = 5000
const VIEWPORT = { width: 1440, height: 900 }
const INTERACTION_STEPS = 70
const STEP_DELAY_MS = 16
const PAN_DELTA = 24
const ZOOM_DELTA = 40
const DRAG_DELTA = 12
const TILE_STEP = 24
const DRAG_WORLD_POINT = { x: 10, y: 10 }
const RUNS = 2
const FPS_BUDGET_MS = 16.67

function percentile(values, fraction) {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  return sorted[index]
}

function stats(values) {
  return {
    count: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values.length > 0 ? Math.max(...values) : Number.NaN,
  }
}

function formatStats(label, values) {
  const result = stats(values)
  return `${label}: n=${result.count} p50=${result.p50.toFixed(2)}ms p95=${result.p95.toFixed(2)}ms max=${result.max.toFixed(2)}ms`
}

function frameIntervals(frames) {
  const result = []
  for (let index = 1; index < frames.length; index += 1) {
    result.push(frames[index].time - frames[index - 1].time)
  }
  return result
}

async function readFrames(page) {
  return page.evaluate(() =>
    window.__mxDebug.frames.map((frame) => ({
      duration: frame.duration,
      time: frame.time,
      drawnNodes: frame.drawnNodes,
    })),
  )
}

async function heapSize(client) {
  const { metrics } = await client.send('Performance.getMetrics')
  const value = metrics.find((metric) => metric.name === 'JSHeapUsedSize')
  return value ? value.value : Number.NaN
}

async function readMemory(page) {
  return page.evaluate(() => {
    const memory = performance.memory
    return {
      used: memory ? memory.usedJSHeapSize : Number.NaN,
      total: memory ? memory.totalJSHeapSize : Number.NaN,
      dom: document.querySelectorAll('*').length,
    }
  })
}

async function viewportOf(page) {
  const frame = await page.evaluate(() => window.__mxDebug.last())
  if (!frame) throw new Error('no frame recorded')
  return frame.viewport
}

function toScreen(viewport, x, y) {
  return { x: x * viewport.zoom + viewport.x, y: y * viewport.zoom + viewport.y }
}

async function pumpFrames(page) {
  await page.evaluate(() => {
    const pump = () => {
      requestAnimationFrame(pump)
    }
    requestAnimationFrame(pump)
  })
}

async function sample(page, label, run, gated) {
  const durations = []
  const intervals = []
  const drawn = []
  for (let round = 0; round < RUNS; round += 1) {
    await page.evaluate(() => window.__mxDebug.clear())
    await run()
    const frames = await readFrames(page)
    if (frames.length < 10) throw new Error(`${label}: only ${frames.length} frames recorded`)
    durations.push(...frames.map((frame) => frame.duration))
    intervals.push(...frameIntervals(frames))
    drawn.push(...frames.map((frame) => frame.drawnNodes))
  }
  const draw = stats(durations)
  const interval = stats(intervals)
  console.log(formatStats(`${label} draw time`, durations))
  console.log(formatStats(`${label} frame interval`, intervals))
  console.log(`${label}: drawn ${Math.min(...drawn)}..${Math.max(...drawn)} nodes`)
  return { draw, interval, gated }
}

async function selectAll(page) {
  await page.keyboard.press('Control+KeyA')
  await page.waitForTimeout(120)
}

async function dragSelection(page, label, viewport, center) {
  const world = {
    x: (center.x - viewport.x) / viewport.zoom,
    y: (center.y - viewport.y) / viewport.zoom,
  }
  const column = Math.floor(world.x / TILE_STEP)
  const row = Math.floor(world.y / TILE_STEP)
  const point = toScreen(viewport, column * TILE_STEP + DRAG_WORLD_POINT.x, row * TILE_STEP + DRAG_WORLD_POINT.y)
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  for (let step = 0; step < INTERACTION_STEPS; step += 1) {
    const offset = step % 2 === 0 ? DRAG_DELTA : -DRAG_DELTA
    await page.mouse.move(point.x + offset, point.y + offset)
    await page.waitForTimeout(STEP_DELAY_MS)
  }
  await page.mouse.up()
  const selected = await page.evaluate(() => window.__mxDebug.selection().length)
  console.log(`${label}: ${selected} nodes selected`)
}

async function main() {
  const server = await createServer({ server: { port: PORT, strictPort: true } })
  await server.listen()
  const url = `${server.resolvedUrls.local[0]}?stress=${NODE_COUNT}`
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'ru-RU' })
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Performance.enable')
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(url)
  await page.waitForFunction(
    (count) => window.__mxDebug?.nodes().length === count,
    NODE_COUNT,
    { timeout: 30000 },
  )
  await page.waitForTimeout(300)
  await pumpFrames(page)
  await page.evaluate(() => window.__mxDebug.setBoxRecording(false))
  await page.waitForTimeout(100)

  const loadedHeap = await heapSize(client)
  const loadedMemory = await readMemory(page)
  const loadedFrame = await page.evaluate(() => window.__mxDebug.last())
  console.log(
    `nodes: ${NODE_COUNT} zoom=${loadedFrame.viewport.zoom.toFixed(3)} drawn=${loadedFrame.drawnNodes} dom=${loadedMemory.dom}`,
  )

  const center = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 }
  const results = []

  results.push(
    await sample(
      page,
      'pan 100%',
      async () => {
        await page.mouse.move(center.x, center.y)
        for (let step = 0; step < INTERACTION_STEPS; step += 1) {
          await page.mouse.wheel(0, step % 2 === 0 ? PAN_DELTA : -PAN_DELTA)
          await page.waitForTimeout(STEP_DELAY_MS)
        }
      },
      true,
    ),
  )

  results.push(
    await sample(
      page,
      'zoom 100%',
      async () => {
        await page.mouse.move(center.x, center.y)
        await page.keyboard.down('Control')
        for (let step = 0; step < INTERACTION_STEPS; step += 1) {
          await page.mouse.wheel(0, step % 2 === 0 ? -ZOOM_DELTA : ZOOM_DELTA)
          await page.waitForTimeout(STEP_DELAY_MS)
        }
        await page.keyboard.up('Control')
      },
      true,
    ),
  )

  await page.mouse.move(center.x, center.y)
  await page.keyboard.press('Shift+Digit1')
  await page.waitForTimeout(150)
  await page.keyboard.press('Shift+Digit0')
  await page.waitForTimeout(150)
  await selectAll(page)
  const dragViewport = await viewportOf(page)

  results.push(
    await sample(
      page,
      'selection drag 100%',
      async () => dragSelection(page, 'selection drag 100%', dragViewport, center),
      true,
    ),
  )

  await page.keyboard.press('Shift+Digit1')
  await page.waitForTimeout(200)
  await selectAll(page)
  const fitFrame = await page.evaluate(() => window.__mxDebug.last())
  console.log(`fit zoom=${fitFrame.viewport.zoom.toFixed(3)} drawn=${fitFrame.drawnNodes} of ${NODE_COUNT}`)

  results.push(
    await sample(
      page,
      'pan fit',
      async () => {
        await page.mouse.move(center.x, center.y)
        for (let step = 0; step < INTERACTION_STEPS; step += 1) {
          await page.mouse.wheel(0, step % 2 === 0 ? PAN_DELTA : -PAN_DELTA)
          await page.waitForTimeout(STEP_DELAY_MS)
        }
      },
      false,
    ),
  )

  results.push(
    await sample(
      page,
      'selection drag fit',
      async () => dragSelection(page, 'selection drag fit', fitFrame.viewport, center),
      false,
    ),
  )

  const finalHeap = await heapSize(client)
  const finalMemory = await readMemory(page)
  console.log(`js heap: load=${(loadedHeap / 1048576).toFixed(1)}MB final=${(finalHeap / 1048576).toFixed(1)}MB`)
  console.log(
    `page memory: used=${(finalMemory.used / 1048576).toFixed(1)}MB total=${(finalMemory.total / 1048576).toFixed(1)}MB dom=${finalMemory.dom}`,
  )
  if (errors.length > 0) console.log(`page errors: ${errors.join(' | ')}`)

  const gated = results.filter((result) => result.gated)
  const worstGatedP95 = Math.max(...gated.map((result) => result.draw.p95))
  const worstP95 = Math.max(...results.map((result) => result.draw.p95))
  console.log(
    `worst draw p95: ${worstGatedP95.toFixed(2)}ms at 100% zoom, ${worstP95.toFixed(2)}ms including fit (budget ${FPS_BUDGET_MS}ms)`,
  )

  await context.close()
  await browser.close()
  await server.close()
  if (errors.length > 0) process.exitCode = 1
  if (worstGatedP95 > FPS_BUDGET_MS) process.exitCode = 1
}

await main()
