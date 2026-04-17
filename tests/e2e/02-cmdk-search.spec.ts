import { test } from '@playwright/test'

test.describe('flow 02 — Cmd+K global search', () => {
  test.fixme('user opens palette, types a query, selects a result', async () => {
    /* TODO after 2.3 combobox ARIA lands.
     * Steps:
     *  1. goto('/')
     *  2. press 'Meta+k' (or 'Control+k' on linux)
     *  3. assert combobox role visible, focus inside input
     *  4. type 'madrid'
     *  5. wait for role=listbox with >=1 option
     *  6. press 'ArrowDown' + 'Enter'
     *  7. assert navigation to the selected entity
     */
  })
})
