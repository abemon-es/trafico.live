import { expect, test } from '@playwright/test'

test.describe('flow 01 — home → hub → entity', () => {
  test('user lands on home, opens a hub, drills into an entity page', async ({ page }) => {
    test.setTimeout(45_000)

    // Pre-accept cookies so the bottom banner does not clip CTAs.
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

    // 1) home
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()

    // 2) navigate to /trenes hub — use .first() since the nav + hero both link
    await page.getByRole('link', { name: /^trenes$/i }).first().click()
    await page.waitForURL('**/trenes', { timeout: 15_000 })

    // 3) hub H1 contains "tren"
    await expect(
      page.getByRole('heading', { level: 1 }).filter({ hasText: /tren/i }),
    ).toBeVisible()

    // 4) drill into a Cercanías network detail (SSG entity page — always present).
    // Target the exact href; "Madrid" appears in several other unrelated
    // contexts (city pages, province landing) and the name regex matches them.
    await page.locator('a[href="/trenes/cercanias/madrid"]').first().click()
    await page.waitForURL(/\/trenes\/cercanias\/madrid/, { timeout: 15_000 })

    // 5) URL pattern holds
    expect(new URL(page.url()).pathname).toBe('/trenes/cercanias/madrid')

    // 6) entity H1 present and non-empty
    const entityH1 = page.getByRole('heading', { level: 1 }).first()
    await expect(entityH1).toBeVisible()
    await expect(entityH1).not.toHaveText('')
  })
})
