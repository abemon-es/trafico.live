import { test } from '@playwright/test'

test.describe('flow 09 — 404 page renders and links back home', () => {
  test.fixme('missing route renders branded 404 and nav works', async () => {
    /* TODO after 2.8 custom 404 page lands.
     * Steps:
     *  1. goto('/ruta-que-no-existe-xyz')
     *  2. assert response.status() === 404
     *  3. assert branded 404 content visible (h1 or specific text)
     *  4. click "Volver al inicio" — assert navigation to /
     *  5. assert home h1 renders
     */
  })
})
