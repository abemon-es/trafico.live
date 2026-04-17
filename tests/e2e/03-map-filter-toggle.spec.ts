import { test } from '@playwright/test'

test.describe('flow 03 — TraficoMap layer toggle', () => {
  test.fixme('user toggles a map layer on/off without errors', async () => {
    /* TODO after 2.1 TraficoMap unification lands.
     * Steps:
     *  1. goto('/trafico')
     *  2. wait for .maplibregl-canvas to be visible
     *  3. click the layer-panel toggle (aria-label "Panel de capas")
     *  4. wait for aria-expanded="true"
     *  5. click the "Cámaras" layer switch
     *  6. assert switch aria-checked flips to 'true'
     *  7. capture page.on('console') errors — assert none
     *  8. click again — switch flips to 'false'
     */
  })
})
