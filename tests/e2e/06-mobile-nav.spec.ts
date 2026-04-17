import { test, devices } from '@playwright/test'

test.use({ ...devices['iPhone 13'] })

test.describe('flow 06 — mobile nav open/close/link', () => {
  test.fixme('user opens hamburger, navigates, menu closes', async () => {
    /* TODO after 2.3 MobileMenu Escape handler lands.
     * Steps:
     *  1. goto('/')
     *  2. assert hamburger button visible (aria-label includes "menú")
     *  3. click hamburger — assert aria-expanded="true" and focus trapped
     *  4. press 'Tab' a few times — assert focus stays inside menu
     *  5. press 'Escape' — assert menu closes and focus returns to hamburger
     *  6. open again, click a nav link — assert navigation + menu auto-closes
     */
  })
})
