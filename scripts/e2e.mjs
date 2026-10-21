import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createHelpers, ensureShotDir, SHOT_DIR } from './e2e-helpers.mjs'
import { flows } from './e2e-flows.mjs'

const PORT = 5199
const VIEWPORT = { width: 1440, height: 900 }
const FLOW_TIMEOUT_MS = 90000
const SETTLE_MS = 150

async function runFlow(context, url, flow) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  try {
    await page.goto(url)
    await page.locator('.app-shell').waitFor({ timeout: 15000 })
    await page.waitForFunction(() => Boolean(window.__mxDebug), null, { timeout: 15000 })
    await page.waitForFunction(() => window.__mxDebug.last() !== null, null, { timeout: 15000 })
    await page.waitForTimeout(SETTLE_MS)
    await flow.run(page, createHelpers(page))
    if (errors.length > 0) throw new Error(`console errors: ${errors.join(' | ')}`)
  } catch (error) {
    const shot = fileURLToPath(new URL(`../.shots/e2e-${slug(flow.name)}.png`, import.meta.url))
    await page.screenshot({ path: shot }).catch(() => {})
    throw error
  } finally {
    await page.close()
  }
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function main() {
  ensureShotDir()
  const server = await createServer({ server: { port: PORT, strictPort: true } })
  await server.listen()
  const url = server.resolvedUrls?.local?.[0] ?? `http://localhost:${PORT}/`
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'ru-RU',
    deviceScaleFactor: 1,
  })
  const failures = []
  let passed = 0
  try {
    for (const flow of flows) {
      const flowUrl = flow.autosave ? url : `${url}?autosave=off`
      const result = await Promise.race([
        runFlow(context, flowUrl, flow)
          .then(() => null)
          .catch((error) => error),
        new Promise((resolve) => setTimeout(() => resolve(new Error('flow timeout')), FLOW_TIMEOUT_MS)),
      ])
      if (result === null) {
        passed += 1
        console.log(`ok   ${flow.name}`)
      } else {
        failures.push({ name: flow.name, error: result })
        console.log(`FAIL ${flow.name}`)
        console.log(`     ${result.message.replace(/\n/g, '\n     ')}`)
      }
    }
  } finally {
    await context.close()
    await browser.close()
    await server.close()
  }
  console.log('')
  console.log(`${passed}/${flows.length} flows passed`)
  if (failures.length > 0) {
    console.log(`screenshots: ${SHOT_DIR}`)
    process.exitCode = 1
  }
}

await main()
