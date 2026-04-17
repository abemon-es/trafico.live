import { expect, test } from '@playwright/test'

test.describe('flow 10 — dark mode toggle persists', () => {
  test('user toggles theme, reload preserves choice', async ({ page }) => {
    test.setTimeout(45_000)

    // Pre-accept cookies so the consent dialog does not overlay the
    // ThemeToggle on first render. Runs on every navigation (including reload)
    // so it MUST NOT touch the 'theme' key, otherwise the reload-persists
    // assertion breaks. Playwright contexts start with empty storage anyway.
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
        /* localStorage may be unavailable */
      }
    })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    // Light mode should be inactive (no .dark on <html>)
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)

    // Find the toggle via Spanish aria-label
    const toggle = page.getByRole('button', { name: /Activar modo oscuro/i })
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    // Click → dark activated
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)

    // Label flips to the "back to light" variant
    const flipped = page.getByRole('button', { name: /Activar modo claro/i })
    await expect(flipped).toBeVisible()
    await expect(flipped).toHaveAttribute('aria-pressed', 'true')

    // localStorage persisted
    const stored = await page.evaluate(() => localStorage.getItem('theme'))
    expect(stored).toBe('dark')

    // Reload — theme preserved (FOUC-free if the inline script in layout.tsx runs first,
    // otherwise at minimum restored after hydration)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)
    await expect(page.getByRole('button', { name: /Activar modo claro/i })).toBeVisible()

    // Click again — back to light
    await page.getByRole('button', { name: /Activar modo claro/i }).click()
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)
    const storedAfter = await page.evaluate(() => localStorage.getItem('theme'))
    expect(storedAfter).toBe('light')
  })
})
