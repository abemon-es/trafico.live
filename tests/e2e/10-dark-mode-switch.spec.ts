import { test } from '@playwright/test'

test.describe('flow 10 — dark mode toggle persists', () => {
  test.fixme('user toggles theme, reload preserves choice', async () => {
    /* TODO after ThemeToggle a11y label fix (Spanish) lands.
     * Steps:
     *  1. goto('/')
     *  2. assert initial theme (respect prefers-color-scheme)
     *  3. click ThemeToggle button (aria-label in Spanish: "Cambiar a modo oscuro" / "Cambiar a modo claro")
     *  4. assert document.documentElement classList contains 'dark' (or whatever scheme)
     *  5. assert localStorage 'theme' persisted
     *  6. reload — assert theme persisted
     *  7. click again — flips back
     */
  })
})
