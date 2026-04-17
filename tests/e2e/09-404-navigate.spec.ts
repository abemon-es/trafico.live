import { expect, test } from '@playwright/test'

test.describe('flow 09 — 404 page renders and links back home', () => {
  test('missing route renders branded 404 and nav works', async ({ page }) => {
    test.setTimeout(30_000)

    // Pre-accept cookies so the consent dialog doesn't cover the CTA links.
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

    const resp = await page.goto('/ruta-que-no-existe-xyz-12345', {
      waitUntil: 'domcontentloaded',
    })
    expect(resp?.status()).toBe(404)

    // Branded 404 markers from src/app/not-found.tsx (2.8 integrated copy:
    // "404" glyph + H1 "Esta ruta no existe"; "Página no encontrada" lives in
    // <title> metadata only).
    await expect(page.locator('text=404').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: /Esta ruta no existe/i }),
    ).toBeVisible()

    // "Ir al inicio" link takes us home
    const homeLink = page.getByRole('link', { name: /Ir al inicio/i })
    await expect(homeLink).toBeVisible()
    await homeLink.click()
    await page.waitForURL((u) => u.pathname === '/')

    // Home should render its own H1
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
