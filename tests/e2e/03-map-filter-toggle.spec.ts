import { expect, test } from '@playwright/test'

test.describe('flow 03 — TraficoMap layer toggle', () => {
  test('user toggles a map layer on/off without errors', async ({ page }) => {
    test.setTimeout(45_000)

    // Pre-accept cookies so the banner doesn't overlay the panel.
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'trafico_cookie_consent',
          JSON.stringify({
            necessary: true,
            analytics: true,
            affiliates: true,
            version: '2',
            timestamp: new Date().toISOString(),
          }),
        )
      } catch {
        /* storage unavailable */
      }
    })

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/trafico')
    // Canvas mounts after MapLibre init — give it time
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 15_000 })

    // Layer panel opens by default (state: open = true in TraficoMapControls).
    // Target the "Cámaras de tráfico" layer. Its checkbox aria-label flips
    // between "Activar capa ..." and "Desactivar capa ..." depending on state,
    // so match either via title on the wrapping <label> which is stable.
    const camarasRow = page
      .locator('label[title*="Cámaras"], label:has(input[aria-label*="Cámaras"])')
      .first()
    await expect(camarasRow).toBeAttached({ timeout: 10_000 })
    const camaras = camarasRow.locator('input[type="checkbox"]')

    const initiallyChecked = await camaras.isChecked()

    // Clicking the label row toggles — direct input is sr-only, but <label>
    // wraps the whole row so any click on the row text works.
    await camarasRow.click()
    // Wait for React state to flip
    await expect(camaras).toBeChecked({ checked: !initiallyChecked })

    // Flip back
    await camarasRow.click()
    await expect(camaras).toBeChecked({ checked: initiallyChecked })

    // Filter out well-known upstream errors unrelated to the layer-toggle
    // logic: WebGL context init warnings, tile-server 502s (tiles.trafico.live
    // is a separate infra dependency), resource-load failures.
    const realErrors = consoleErrors.filter(
      (e) =>
        !/WebGL|GPU|Content Security Policy|ChunkLoad/i.test(e) &&
        !/tiles\.trafico\.live|AJAXError|Failed to load resource|\b502\b|\b503\b/i.test(e),
    )
    expect(realErrors, realErrors.join('\n---\n')).toHaveLength(0)
  })
})
