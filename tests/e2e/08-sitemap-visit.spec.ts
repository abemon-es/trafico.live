import { test } from '@playwright/test'

test.describe('flow 08 — sitemap + robots + llms.txt reachable', () => {
  test.fixme('SEO files respond 200 with correct content-type', async () => {
    /* TODO after 2.8 W2 root SEO files land.
     * Steps:
     *  1. request /sitemap.xml — assert 200, content-type includes 'xml'
     *  2. request /robots.txt — assert 200, body contains 'User-agent'
     *  3. request /llms.txt — assert 200, content-type text/plain
     *  4. parse sitemap — assert >=100 URLs listed
     *  5. for each of ~5 sampled URLs from sitemap, visit — assert 200
     */
  })
})
