import { test } from '@playwright/test'

test.describe('flow 05 — trenes live click opens side panel', () => {
  test.fixme('user clicks a live train marker and sees its details', async () => {
    /* TODO after 2.1 map unification + 2.5 entity pages.
     * Steps:
     *  1. goto('/trenes')
     *  2. wait for maplibre canvas
     *  3. wait for >=1 train marker rendered (poll network response /api/trenes/posiciones)
     *  4. click first train marker
     *  5. assert side panel visible with train number, brand, current delay
     *  6. click "Ver detalles" — assert navigation to /trenes/linea/:slug or /trenes/flota/:id
     */
  })
})
