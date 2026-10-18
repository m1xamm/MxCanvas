import { mkdir, readdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const OUTPUT_DIR = fileURLToPath(new URL('../.shots/', import.meta.url))
const VIEWPORT = { width: 1440, height: 900 }
const NARROW_VIEWPORT = { width: 1100, height: 700 }
const DEVICE_SCALE_FACTOR = 2
const UI_LANGUAGE = 'ru-RU'
const SETTLE_MS = 450
const HOVER_SETTLE_MS = 300
const TAB_LIMIT = 200

const RECT_START = { x: 560, y: 360 }
const RECT_END = { x: 880, y: 560 }

const POINTER_PARK = { x: 680, y: 120 }
const GRID_CENTER = { x: 720, y: 460 }
const GRID_ZOOM_WHEEL_DELTA = -89

const TOOLBAR_GROUPS = ['move', 'frame', 'shapes', 'pen', 'text']
const TOOLBAR_HOVER_INDEX = 2
const TOOLBAR_PRESS_INDEX = 0

const LAYER_COLUMNS = 4
const LAYER_ROWS = 3
const LAYER_SIZE = { width: 140, height: 120 }
const LAYER_GRID = { x: 320, y: 220, stepX: 200, stepY: 160 }
const LAYER_SINGLE_ROW = 5
const LAYER_MULTI_ROW = 8
const LAYER_HOVER_ROW = 10
const LAYER_RENAME_ROW = 1
const LAYER_STATE_ROW = 4
const LAYER_DRAG_ROW = 6
const LAYER_DRAG_DISTANCE = 70
const ACTION_VISIBILITY_INDEX = 0
const ACTION_LOCK_INDEX = 1

const FILL_HEX_INDEX = 0
const FILL_OPACITY_INDEX = 1
const MIXED_OPACITY_PERCENT = '40'
const ALIGN_LEFT_INDEX = 0

async function withPage(viewport, run) {
  const server = await createServer({ server: { port: 5199, strictPort: true } })
  await server.listen()
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      locale: UI_LANGUAGE,
    })
    const page = await context.newPage()
    await page.goto(server.resolvedUrls.local[0])
    await page.locator('.app-shell').waitFor()
    await page.waitForTimeout(SETTLE_MS)
    await run(page, viewport)
    await context.close()
  } finally {
    await browser.close()
    await server.close()
  }
}

async function capture(page, name, zoomSteps = 0) {
  for (let step = 0; step < zoomSteps; step += 1) {
    await page.keyboard.press('Control+Equal')
  }
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: `${OUTPUT_DIR}${name}.png` })
}

async function parkPointer(page) {
  await page.mouse.move(POINTER_PARK.x, POINTER_PARK.y)
}

async function drawRectangle(page, start = RECT_START, end = RECT_END) {
  await page.keyboard.press('KeyR')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 8 })
  await page.mouse.up()
}

function layerRectangle(index) {
  const column = index % LAYER_COLUMNS
  const row = Math.floor(index / LAYER_COLUMNS)
  const start = {
    x: LAYER_GRID.x + column * LAYER_GRID.stepX,
    y: LAYER_GRID.y + row * LAYER_GRID.stepY,
  }
  return { start, end: { x: start.x + LAYER_SIZE.width, y: start.y + LAYER_SIZE.height } }
}

async function drawLayerRectangles(page) {
  const count = LAYER_COLUMNS * LAYER_ROWS
  for (let index = 0; index < count; index += 1) {
    const { start, end } = layerRectangle(index)
    await drawRectangle(page, start, end)
  }
}

async function tabUntil(page, expression) {
  for (let press = 0; press < TAB_LIMIT; press += 1) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(expression)) return
  }
  throw new Error(`Tab did not reach ${expression}`)
}

async function zoomWithWheel(page, deltaY) {
  await page.mouse.move(GRID_CENTER.x, GRID_CENTER.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, deltaY)
  await page.keyboard.up('Control')
}

function layerRow(page, index) {
  return page.locator('.layer-row').nth(index)
}

function layerAction(page, rowIndex, actionIndex) {
  return layerRow(page, rowIndex).locator('.layer-row__action').nth(actionIndex)
}

async function pressToolbarButton(page, index) {
  const target = page.locator('.tool-group__main').nth(index)
  const box = await target.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
}

async function releaseToolbarButton(page) {
  await page.mouse.move(POINTER_PARK.x, POINTER_PARK.y, { steps: 4 })
  await page.mouse.up()
}

async function dragLayerRow(page, index) {
  const row = layerRow(page, index)
  const box = await row.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + LAYER_DRAG_DISTANCE, { steps: 6 })
}

async function openPopup(page, trigger) {
  await trigger.click()
  await page.locator('.popup.is-open').waitFor()
}

async function runToolbarShots(page) {
  await page.locator('.tool-group__main').nth(TOOLBAR_HOVER_INDEX).hover()
  await capture(page, 'toolbar-hover')

  await pressToolbarButton(page, TOOLBAR_PRESS_INDEX)
  await capture(page, 'toolbar-pressed')
  await releaseToolbarButton(page)

  await page.keyboard.press('KeyR')
  await parkPointer(page)
  await capture(page, 'toolbar-active')

  await tabUntil(
    page,
    "document.activeElement?.closest('.tool-group.is-active .tool-group__main') != null",
  )
  await capture(page, 'toolbar-focus')
  await page.evaluate('document.activeElement?.blur()')
}

async function runMenuShots(page) {
  await openPopup(page, page.locator('.menu-button'))
  await capture(page, 'main-menu-open')
  await page.keyboard.press('Escape')

  await openPopup(page, page.locator('.menu-button'))
  await page.locator('.menu-item', { hasText: 'Настройки' }).click()
  await capture(page, 'settings-dialog')
  await page.keyboard.press('Escape')

  await openPopup(page, page.locator('.zoom-menu__button'))
  await capture(page, 'zoom-menu-open')
  await page.keyboard.press('Escape')

  for (const [index, group] of TOOLBAR_GROUPS.entries()) {
    await openPopup(page, page.locator('.tool-group__chevron').nth(index))
    await capture(page, `toolbar-${group}`)
    await page.keyboard.press('Escape')
  }
}

async function runLayersShots(page) {
  await layerRow(page, LAYER_SINGLE_ROW).click()
  await parkPointer(page)
  await capture(page, 'layers-selected')

  await layerRow(page, LAYER_MULTI_ROW).click({ modifiers: ['Shift'] })
  await parkPointer(page)
  await capture(page, 'layers-multi')

  await layerRow(page, LAYER_HOVER_ROW).hover()
  await page.waitForTimeout(HOVER_SETTLE_MS)
  await capture(page, 'layers-hovered')

  await page.locator('.layer-row__name').nth(LAYER_RENAME_ROW).dblclick()
  await page.locator('.layer-row__input').waitFor()
  await capture(page, 'layers-rename')
  await page.keyboard.press('Enter')

  await layerRow(page, LAYER_STATE_ROW).hover()
  await layerAction(page, LAYER_STATE_ROW, ACTION_VISIBILITY_INDEX).click()
  await layerAction(page, LAYER_STATE_ROW, ACTION_LOCK_INDEX).click()
  await layerRow(page, LAYER_STATE_ROW).hover()
  await capture(page, 'layers-hidden-locked')

  await dragLayerRow(page, LAYER_DRAG_ROW)
  await capture(page, 'layers-dragging')
  await page.mouse.up()
}

async function clearOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  const entries = await readdir(OUTPUT_DIR)
  await Promise.all(entries.map((entry) => rm(`${OUTPUT_DIR}${entry}`, { force: true })))
}

async function runPropertiesShots(page) {
  await capture(page, 'properties-single')

  await page.locator('.fill-swatch').first().click()
  await page.locator('.color-picker').waitFor()
  await capture(page, 'color-picker-open')
  await page.locator('.color-picker__square').click({ position: { x: 30, y: 30 } })
  await parkPointer(page)
  await capture(page, 'color-picker-live')
  await page.mouse.click(GRID_CENTER.x, GRID_CENTER.y)
}

async function runMixedPropertiesShots(page) {
  await layerRow(page, LAYER_SINGLE_ROW).click()
  await layerRow(page, LAYER_MULTI_ROW).click({ modifiers: ['Control'] })
  await layerRow(page, LAYER_HOVER_ROW).click({ modifiers: ['Control'] })
  await parkPointer(page)
  await capture(page, 'properties-multi')

  await page.locator('.align-button').nth(ALIGN_LEFT_INDEX).click()
  await parkPointer(page)
  await capture(page, 'align-applied')

  await layerRow(page, LAYER_SINGLE_ROW).click()
  const opacityField = page.locator('.fill-row .field__input').nth(FILL_OPACITY_INDEX)
  await opacityField.click()
  await opacityField.fill(MIXED_OPACITY_PERCENT)
  await page.keyboard.press('Enter')
  await layerRow(page, LAYER_MULTI_ROW).click({ modifiers: ['Control'] })
  await parkPointer(page)
  await capture(page, 'properties-mixed')

  const hexField = page.locator('.fill-row .field__input').nth(FILL_HEX_INDEX)
  await layerRow(page, LAYER_SINGLE_ROW).click()
  await hexField.click()
  await hexField.fill('FF5722')
  await hexField.press('Enter')
  await parkPointer(page)
  await capture(page, 'properties-hex')
}

async function runShots(page) {
  await capture(page, 'initial')
  await capture(page, 'grid-default')

  await zoomWithWheel(page, GRID_ZOOM_WHEEL_DELTA)
  await capture(page, 'grid-zoomed')
  await parkPointer(page)
  await page.keyboard.press('Shift+Digit0')
  await capture(page, 'pixel-grid-800', 3)
  await page.keyboard.press('Shift+Digit0')

  await runToolbarShots(page)

  await drawRectangle(page)
  await parkPointer(page)
  await capture(page, 'rectangle-selected')

  await page.mouse.move(RECT_END.x, RECT_END.y)
  await page.waitForTimeout(HOVER_SETTLE_MS)
  await capture(page, 'handle-hovered')
  await parkPointer(page)

  await runPropertiesShots(page)

  await runMenuShots(page)

  await page.keyboard.press('KeyV')
  await page.mouse.click(RECT_START.x + 30, RECT_START.y + 30)
  await page.keyboard.press('Delete')
  await drawLayerRectangles(page)
  await parkPointer(page)

  await runLayersShots(page)
  await runMixedPropertiesShots(page)
}

await clearOutputDir()
await withPage(VIEWPORT, runShots)
await withPage(NARROW_VIEWPORT, (page) => capture(page, 'initial-narrow'))
