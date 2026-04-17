import { test, expect } from '@playwright/test'

/**
 * 2.3 shipped the hamburger + accordion MobileMenu with aria-expanded on the
 * toggle and aria-controls="mobile-nav" on the container. The scaffold spec
 * asked for a focus trap + Escape handler, but those ship later (see
 * docs/a11y-report.md → deferred). This test covers what exists today:
 * open → hub link closes menu → arrives at hub page.
 *
 * The mobile projects in playwright.config.ts (mobile-iphone-13, -iphone-se,
 * -galaxy-s21) supply their own viewports — we don't override here. On the
 * desktop project the hamburger is hidden (md:hidden) so the test is skipped.
 */
test.describe('flow 06 — mobile nav open/close/link', () => {
  test('user opens hamburger, taps a hub link, arrives at hub', async ({ page, viewport }) => {
    test.setTimeout(30_000)

    // Desktop runs have the hamburger hidden — skip rather than fail.
    test.skip(
      !viewport || viewport.width >= 768,
      'hamburger is md:hidden on viewports >= 768px',
    )

    // Dismiss cookie banner so it doesn't clip the accordion.
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

    await page.goto('/')

    const hamburger = page.getByRole('button', { name: /Abrir menú/i })
    await expect(hamburger).toBeVisible()
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false')

    await hamburger.click()
    await expect(
      page.getByRole('button', { name: /Cerrar menú/i }),
    ).toHaveAttribute('aria-expanded', 'true')

    // Menu container mounts with id="mobile-nav"
    const menu = page.locator('#mobile-nav')
    await expect(menu).toBeVisible()

    // Tap the /trafico hub link. Each accordion header has a Link to
    // panel.hub.href visible even with the section collapsed, so we don't need
    // to expand any accordion first. /trenes lives inside a subcategory and
    // would require expansion — use /trafico as the stable top-level hub.
    const traficoLink = menu.locator('a[href="/trafico"]').first()
    await traficoLink.scrollIntoViewIfNeeded()
    await traficoLink.click()

    await page.waitForURL('**/trafico', { timeout: 15_000 })
    await expect(page.locator('h1').first()).toBeVisible()

    // After navigation, the menu should be closed again (AnimatePresence unmounts).
    await expect(page.locator('#mobile-nav')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Abrir menú/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
