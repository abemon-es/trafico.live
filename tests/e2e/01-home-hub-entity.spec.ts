import { test } from '@playwright/test'

test.describe('flow 01 — home → hub → entity', () => {
  test.fixme('user lands on home, opens a hub, drills into an entity page', async () => {
    /* TODO after 2.2 ships hubs.
     * Steps:
     *  1. goto('/')
     *  2. click the hub card for /trenes (selector TBD on 2.2 HubCard)
     *  3. wait for /trenes hero (selector: h1 containing "Trenes")
     *  4. click the first station card
     *  5. assert URL pattern /^\/trenes\/estacion\//
     *  6. assert H1 present and non-empty
     */
  })
})
