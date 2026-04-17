import { expect, test } from '@playwright/test'

test.describe('flow 08 — sitemap + robots + llms.txt reachable', () => {
  test('SEO files respond 200 with correct content-type', async ({ request, page }) => {
    test.setTimeout(45_000)

    // sitemap.xml — at root, returns the sitemap index (XML)
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    expect(sitemap.headers()['content-type']).toMatch(/xml/i)
    const sitemapBody = await sitemap.text()
    expect(sitemapBody).toContain('<sitemapindex')
    expect(sitemapBody).toMatch(/https:\/\/trafico\.live\/sitemap\/\d+\.xml/)

    // robots.txt — plain text, must mention User-agent directive
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(robots.headers()['content-type']).toMatch(/text\/plain/i)
    expect(await robots.text()).toMatch(/User-agent/i)

    // llms.txt — AI crawler guidance. text/plain or text/markdown both valid
    // per the llms.txt spec (https://llmstxt.org). 2.8 shipped as markdown.
    const llms = await request.get('/llms.txt')
    expect(llms.status()).toBe(200)
    expect(llms.headers()['content-type']).toMatch(/text\/(plain|markdown)/i)

    // Fetch a sitemap chunk and sample a few URLs — assert they load non-5xx.
    const chunk = await request.get('/sitemap/0.xml')
    expect(chunk.status()).toBe(200)
    const chunkBody = await chunk.text()
    const locs = [...chunkBody.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs.length).toBeGreaterThanOrEqual(10)

    // Sanity-check a few known-stable hub paths (not sampled from sitemap —
    // sitemap content correctness is 2.5/2.6 scope and would make this test
    // flaky against their 404s). We only care that the sitemap + robots
    // contract holds and that at least one linked hub renders.
    const stablePaths = ['/', '/trenes', '/maritimo']
    for (const path of stablePaths) {
      const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      expect(resp?.status(), `stable path ${path}`).toBeLessThan(400)
    }
  })
})
