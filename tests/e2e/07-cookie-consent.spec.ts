import { expect, test } from '@playwright/test'

/**
 * 2.8's integrated CookieConsent (src/components/cookie-consent/*) writes a
 * localStorage entry under "trafico_cookie_consent" with shape:
 *   { necessary: true, analytics, affiliates, version: "2", timestamp }
 *
 * The banner is a FocusTrap `role="dialog" aria-modal="true"` labeled
 * "Consentimiento de cookies". Buttons: "Aceptar todas", "Solo necesarias",
 * "Configurar". CONSENT_VERSION bumped to "2" — any stored version mismatch
 * triggers a re-prompt, so tests must write version: "2".
 */
test.describe('flow 07 — GDPR cookie consent', () => {
  test('first-visit banner → accept → persists across reload', async ({ page, context }) => {
    test.setTimeout(30_000)

    // 1) fresh load with no consent state — banner should appear
    await page.goto('/')
    const banner = page.getByRole('dialog', { name: /Consentimiento de cookies/i })
    await expect(banner).toBeVisible()

    // 2) click "Aceptar todas" — banner disappears, localStorage records consent
    await banner.getByRole('button', { name: /^Aceptar todas$/i }).click()
    await expect(banner).toBeHidden()

    const stored = await page.evaluate(() =>
      localStorage.getItem('trafico_cookie_consent'),
    )
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!) as {
      necessary: boolean
      analytics: boolean
      affiliates: boolean
      version: string
    }
    expect(parsed.analytics).toBe(true)
    expect(parsed.affiliates).toBe(true)
    expect(parsed.version).toBe('2')

    // 3) reload — banner must NOT be shown again
    await page.reload()
    await expect(
      page.getByRole('dialog', { name: /Consentimiento de cookies/i }),
    ).toHaveCount(0)

    // 4) second scenario: fresh page in same context, wipe consent, click "Solo necesarias"
    const page2 = await context.newPage()
    await page2.addInitScript(() => {
      try {
        localStorage.removeItem('trafico_cookie_consent')
      } catch {
        /* storage unavailable */
      }
    })
    await page2.goto('/')
    const banner2 = page2.getByRole('dialog', { name: /Consentimiento de cookies/i })
    await expect(banner2).toBeVisible()
    await banner2.getByRole('button', { name: /^Solo necesarias$/i }).click()
    await expect(banner2).toBeHidden()

    const rejected = await page2.evaluate(() =>
      localStorage.getItem('trafico_cookie_consent'),
    )
    expect(rejected).not.toBeNull()
    const rejectedParsed = JSON.parse(rejected!) as {
      analytics: boolean
      affiliates: boolean
      version: string
    }
    expect(rejectedParsed.analytics).toBe(false)
    expect(rejectedParsed.affiliates).toBe(false)
    expect(rejectedParsed.version).toBe('2')
  })
})
