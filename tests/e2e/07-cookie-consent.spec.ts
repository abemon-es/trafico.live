import { test } from '@playwright/test'

test.describe('flow 07 — GDPR cookie consent', () => {
  test.fixme('first-visit banner → accept → persists across reload', async () => {
    /* TODO after 2.8 GDPR banner + focus trap lands.
     * Steps:
     *  1. context = newContext() with no cookies
     *  2. goto('/')
     *  3. assert banner visible (role=dialog aria-modal=true)
     *  4. assert focus trapped inside banner
     *  5. click "Aceptar todas"
     *  6. assert banner disappears AND cookie 'tl-consent=accepted' set
     *  7. reload — assert banner NOT shown
     *  8. second scenario: click "Rechazar" — assert cookie set to 'rejected' and GA not loaded (check window.dataLayer absent or consent denied)
     */
  })
})
