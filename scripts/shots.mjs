import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const OUTPUT_DIR = fileURLToPath(new URL('../.shots/', import.meta.url))
const VIEWPORT = { width: 1440, height: 900 }
const NARROW_VIEWPORT = { width: 1100, height: 700 }
const DEVICE_SCALE_FACTOR = 2
const UI_LANGUAGE = 'ru-RU'
const SETTLE_MS = 200
const HOVER_SETTLE_MS = 300

const RECT_START = { x: 560, y: 360 }
const RECT_END = { x: 880, y: 560 }

const TOOLBAR_GROUPS = ['move', 'frame', 'shapes', 'pen', 'text']

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

async function capture(page, name) {
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: `${OUTPUT_DIR}${name}.png` })
}

async function drawRectangle(page) {
  await page.keyboard.press('KeyR')
  await page.mouse.move(RECT_START.x, RECT_START.y)
  await page.mouse.down()
  await page.mouse.move(RECT_END.x, RECT_END.y, { steps: 8 })
  await page.mouse.up()
}

async function openPopup(page, trigger) {
  await trigger.click()
  await page.locator('.popup.is-open').waitFor()
}

async function runShots(page) {
  await capture(page, 'initial')

  await drawRectangle(page)
  await page.mouse.move(680, 120)
  await capture(page, 'rectangle-selected')

  await page.mouse.move(RECT_END.x, RECT_END.y)
  await page.waitForTimeout(HOVER_SETTLE_MS)
  await capture(page, 'handle-hovered')
  await page.mouse.move(680, 120)

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

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })
await withPage(VIEWPORT, runShots)
await withPage(NARROW_VIEWPORT, (page) => capture(page, 'initial-narrow'))
