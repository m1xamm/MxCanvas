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

const SNAP_ANCHOR = { start: { x: 420, y: 300 }, end: { x: 560, y: 420 } }
const SNAP_MOVED = { start: { x: 760, y: 480 }, end: { x: 900, y: 600 } }
const SNAP_DRAG_OFFSET = { x: -336, y: -50 }

const STROKE_RECT = { start: { x: 560, y: 320 }, end: { x: 860, y: 520 } }
const STROKE_WEIGHT = '8'
const STROKE_ADD_LABEL = 'Добавить обводку'
const STROKE_WEIGHT_LABEL = 'Толщина обводки'
const RIGHT_PANEL = '.side-panel--right'

const EFFECT_RECT = { start: { x: 360, y: 690 }, end: { x: 720, y: 810 } }
const EFFECT_ADD_LABEL = 'Добавить эффект'
const EFFECT_OFFSET_Y_LABEL = 'Смещение по Y'
const EFFECT_BLUR_LABEL = 'Размытие'
const EFFECT_SPREAD_LABEL = 'Размах'
const EFFECT_OFFSET_Y = '16'
const EFFECT_BLUR = '16'
const EFFECT_SPREAD = '8'
const EFFECT_ZOOM_DELTA = GRID_ZOOM_WHEEL_DELTA * 2
const EFFECT_COLOR_LABEL = 'Цвет тени'
const EFFECT_HEX = 'FF8A3D'
const EFFECT_OPACITY_PERCENT = 100
const EFFECT_CROP = {
  x: EFFECT_RECT.start.x - 48,
  y: EFFECT_RECT.start.y - 48,
  width: 416,
  height: 256,
}
const FILL_OPACITY_HIDDEN = '0'
const FILL_OPACITY_SHOWN = '100'

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

async function captureCrop(page, name, clip) {
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: `${OUTPUT_DIR}${name}.png`, clip })
}

async function captureElement(page, selector, name) {
  const box = await page.locator(selector).boundingBox()
  if (!box) return
  await captureCrop(page, name, box)
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

async function zoomWithWheel(page, deltaY, point = GRID_CENTER) {
  await page.mouse.move(point.x, point.y)
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

  const positionField = page.locator('.field').first()
  await positionField.hover()
  await page.waitForTimeout(HOVER_SETTLE_MS)
  await capture(page, 'input-hover')
  await positionField.locator('.field__input').click()
  await capture(page, 'input-focus')
  await page.keyboard.press('Escape')
  await parkPointer(page)

  await page.locator('.paint-swatch').first().click()
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
  const opacityField = page.locator('.paint-row .field__input').nth(FILL_OPACITY_INDEX)
  await opacityField.click()
  await opacityField.fill(MIXED_OPACITY_PERCENT)
  await page.keyboard.press('Enter')
  await layerRow(page, LAYER_MULTI_ROW).click({ modifiers: ['Control'] })
  await parkPointer(page)
  await capture(page, 'properties-mixed')
  await captureElement(page, RIGHT_PANEL, 'mixed-panel')

  const hexField = page.locator('.paint-row .field__input').nth(FILL_HEX_INDEX)
  await layerRow(page, LAYER_SINGLE_ROW).click()
  await hexField.click()
  await hexField.fill('FF5722')
  await hexField.press('Enter')
  await parkPointer(page)
  await capture(page, 'properties-hex')
}

async function runPaintShots(page) {
  await page.evaluate('document.activeElement?.blur()')
  await drawRectangle(page, STROKE_RECT.start, STROKE_RECT.end)
  await parkPointer(page)
  await captureElement(page, RIGHT_PANEL, 'panel-no-stroke')

  await page.getByLabel(STROKE_ADD_LABEL).click()
  await parkPointer(page)
  await capture(page, 'stroke-added')
  await captureElement(page, RIGHT_PANEL, 'panel-stroke-weight')

  const weight = page.getByLabel(STROKE_WEIGHT_LABEL)
  await weight.click()
  await weight.fill(STROKE_WEIGHT)
  await weight.press('Enter')
  await parkPointer(page)
  await capture(page, 'stroke-weight')
  await captureElement(page, RIGHT_PANEL, 'panel-stroke')

  await page.locator('.paint-row .paint-swatch').last().click()
  await page.locator('.color-picker').waitFor()
  await page.locator('.color-picker__square').click({ position: { x: 120, y: 30 } })
  await parkPointer(page)
  await capture(page, 'stroke-color')
  await captureElement(page, RIGHT_PANEL, 'panel-stroke-color')
  await page.mouse.click(GRID_CENTER.x, GRID_CENTER.y)
}

async function runSnapShots(page) {
  await page.evaluate('document.activeElement?.blur()')
  await drawRectangle(page, SNAP_ANCHOR.start, SNAP_ANCHOR.end)
  await drawRectangle(page, SNAP_MOVED.start, SNAP_MOVED.end)
  const center = {
    x: (SNAP_MOVED.start.x + SNAP_MOVED.end.x) / 2,
    y: (SNAP_MOVED.start.y + SNAP_MOVED.end.y) / 2,
  }
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + SNAP_DRAG_OFFSET.x, center.y + SNAP_DRAG_OFFSET.y, { steps: 12 })
  await capture(page, 'snap-guides')
  await captureCrop(page, 'snap-guides-zoom', { x: 340, y: 240, width: 460, height: 420 })
  await page.mouse.up()
  await parkPointer(page)
  await capture(page, 'snap-guides-result')
}

async function runEffectsShots(page) {
  await page.evaluate('document.activeElement?.blur()')
  await drawRectangle(page, EFFECT_RECT.start, EFFECT_RECT.end)
  await parkPointer(page)
  await page.getByLabel(EFFECT_ADD_LABEL).click()
  await parkPointer(page)
  await capture(page, 'effect-added')
  await captureElement(page, RIGHT_PANEL, 'panel-effect')

  await fillNumberField(page, EFFECT_OFFSET_Y_LABEL, EFFECT_OFFSET_Y)
  await fillNumberField(page, EFFECT_BLUR_LABEL, EFFECT_BLUR)
  await fillNumberField(page, EFFECT_SPREAD_LABEL, EFFECT_SPREAD)
  await pickEffectColor(page)
  await parkPointer(page)
  await capture(page, 'effect-shadow')
  await captureCrop(page, 'effect-shadow-zoom', EFFECT_CROP)
  const fillOpacity = page.locator('.paint-row').first().locator('.field__input').nth(1)
  await fillField(fillOpacity, FILL_OPACITY_HIDDEN)
  await parkPointer(page)
  await captureCrop(page, 'effect-no-fill', EFFECT_CROP)
  await fillField(fillOpacity, FILL_OPACITY_SHOWN)
  await zoomWithWheel(page, EFFECT_ZOOM_DELTA, {
    x: (EFFECT_RECT.start.x + EFFECT_RECT.end.x) / 2,
    y: (EFFECT_RECT.start.y + EFFECT_RECT.end.y) / 2,
  })
  await capture(page, 'effect-shadow-zoomed')
  await page.keyboard.press('Shift+Digit0')
}

async function pickEffectColor(page) {
  await page.getByLabel(EFFECT_COLOR_LABEL).click()
  await page.locator('.color-picker').waitFor()
  const hex = page.locator('.color-picker input').first()
  await hex.fill(EFFECT_HEX)
  await hex.press('Enter')
  const alpha = page.locator('.color-picker input').nth(1)
  await alpha.fill(String(EFFECT_OPACITY_PERCENT))
  await alpha.press('Enter')
  await page.keyboard.press('Escape')
}

async function fillNumberField(page, label, value) {
  await fillField(page.getByLabel(label), value)
}

async function fillField(field, value) {
  await field.click()
  await field.fill(value)
  await field.press('Enter')
}

async function runShots(page) {
  await capture(page, 'initial')
  await captureCrop(page, 'logo-crop', { x: 6, y: 6, width: 52, height: 52 })
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
  await runSnapShots(page)
  await runPaintShots(page)
  await runEffectsShots(page)
}

await clearOutputDir()
await withPage(VIEWPORT, runShots)
await withPage(NARROW_VIEWPORT, (page) => capture(page, 'initial-narrow'))
