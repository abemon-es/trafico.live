import { expect, test } from '@playwright/test'

/**
 * 2.8 chose a localStorage-based consent store (not cookies) keyed on
 * "trafico_cookie_consent" with shape { analytics, version, timestamp }.
 * The banner is a bottom-docked `role="dialog" aria-label="Consentimiento…"`
 * (non-modal: it doesn't trap focus, and intentionally doesn't overlay the
 * page — so this test verifies the behaviour that actually shipped, not the
 * older scaffold spec that assumed cookies + focus trap).
 */
test.describe('flow 07 — GDPR cookie consent', () => {
  test('first-visit banner → accept → persists across reload', async ({ page, context }) => {
    test.setTimeout(30_000)

    // 1) fresh load with no consent state — banner should appear
    await page.goto('/')
    const banner = page.getByRole('dialog', { name: /Consentimiento de cookies/i })
    await expect(banner).toBeVisible()

    // 2) click "Aceptar" — banner disappears, localStorage records consent
    await banner.getByRole('button', { name: /^Aceptar$/i }).click()
    await expect(banner).toBeHidden()

    const stored = await page.evaluate(() =>
      localStorage.getItem('trafico_cookie_consent'),
    )
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!) as {
      analytics: boolean
      version: string
    }
    expect(parsed.analytics).toBe(true)
    expect(parsed.version).toBe('1')

    // 3) reload — banner must NOT be shown again
    await page.reload()
    await expect(
      page.getByRole('dialog', { name: /Consentimiento de cookies/i }),
    ).toHaveCount(0)

    // 4) second scenario: fresh context, click Rechazar
    const page2 = await context.newPage()
    // the context still carries the accepted consent; wipe via addInitScript
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
    await banner2.getByRole('button', { name: /^Rechazar$/i }).click()
    await expect(banner2).toBeHidden()

    const rejected = await page2.evaluate(() =>
      localStorage.getItem('trafico_cookie_consent'),
    )
    expect(rejected).not.toBeNull()
    const rejectedParsed = JSON.parse(rejected!) as { analytics: boolean }
    expect(rejectedParsed.analytics).toBe(false)
  })
})
