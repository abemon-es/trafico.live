import { test } from '@playwright/test'

test.describe('flow 04 — calculadora route form', () => {
  test.fixme('user enters origin + destination and submits without errors', async () => {
    /* TODO after form accessibility fixes land (/calculadora label associations).
     * Steps:
     *  1. goto('/calculadora')
     *  2. fill input[name="origin"] with 'Madrid'
     *  3. fill input[name="destination"] with 'Barcelona'
     *  4. click submit button
     *  5. assert result area populated (distance + time visible)
     *  6. assert no console errors
     */
  })
})
