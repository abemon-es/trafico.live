import fs from 'node:fs/promises'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

type PageSpec = {
  name: string
  path: string
  waitForSelector?: string
  mapFullscreen?: boolean
  livesData?: boolean
}

const HUB_PAGES: PageSpec[] = [
  { name: 'home', path: '/', livesData: true },
  { name: 'hub-maritimo', path: '/maritimo', livesData: true },
  { name: 'hub-aviacion', path: '/aviacion', livesData: true },
  { name: 'hub-trenes', path: '/trenes', livesData: true },
  { name: 'hub-trafico', path: '/trafico', livesData: true },
  { name: 'hub-transporte-publico', path: '/transporte-publico' },
  { name: 'hub-meteo', path: '/meteo' },
  { name: 'hub-combustible', path: '/combustible' },
  { name: 'hub-calidad-aire', path: '/calidad-aire' },
]

const MAP_FULLSCREEN_PAGES: PageSpec[] = [
  { name: 'map-camaras', path: '/camaras', mapFullscreen: true },
  { name: 'map-gasolineras', path: '/gasolineras', mapFullscreen: true },
  { name: 'map-estaciones-aforo', path: '/estaciones-aforo', mapFullscreen: true },
  { name: 'map-incidencias', path: '/incidencias', mapFullscreen: true, livesData: true },
  { name: 'map-radares', path: '/radares', mapFullscreen: true },
  { name: 'map-carreteras', path: '/carreteras', mapFullscreen: true },
  { name: 'map-maritimo-live', path: '/maritimo/en-vivo', mapFullscreen: true, livesData: true },
  { name: 'map-aviacion-live', path: '/aviacion/en-vivo', mapFullscreen: true, livesData: true },
]

const ALL_PAGES: PageSpec[] = [...HUB_PAGES, ...MAP_FULLSCREEN_PAGES]

async function setColorScheme(page: Page, mode: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: mode })
  await page.evaluate((t) => {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(t)
    html.setAttribute('data-theme', t)
    html.style.colorScheme = t
  }, mode)
}

async function goAndWait(page: Page, path: string): Promise<number> {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
  const status = response?.status() ?? 0
  if (status >= 400) return status
  const finalUrl = new URL(page.url())
  if (finalUrl.pathname !== path && !(path === '/' && finalUrl.pathname === '/')) {
    return 308
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: 8_000 })
  } catch {
    // networkidle may never settle on map pages — fall through
  }
  await page.waitForTimeout(800)
  return status
}

for (const spec of ALL_PAGES) {
  for (const mode of ['light', 'dark'] as const) {
    test(`baseline — ${spec.name} (${mode})`, async ({ page }) => {
      test.setTimeout(60_000)
      await setColorScheme(page, mode)
      const status = await goAndWait(page, spec.path)
      test.skip(status !== 200, `${spec.path} returned ${status}; skipping baseline`)

      const snapshotName = `${spec.name}-${mode}.png`
      if (spec.livesData) {
        // Live-data pages never stabilise — single-frame capture, no comparison.
        const snapshotPath = test.info().snapshotPath(snapshotName)
        await fs.mkdir(path.dirname(snapshotPath), { recursive: true })
        await page.screenshot({ path: snapshotPath, fullPage: !spec.mapFullscreen })
        test.info().annotations.push({
          type: 'baseline-mode',
          description: 'single-frame (live data, no stability check)',
        })
        return
      }
      await expect(page).toHaveScreenshot(snapshotName, {
        fullPage: !spec.mapFullscreen,
        maxDiffPixelRatio: 0.01,
        timeout: 15_000,
      })
    })
  }
}
