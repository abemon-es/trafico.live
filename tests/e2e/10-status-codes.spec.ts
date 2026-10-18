import { expect, test } from '@playwright/test'

/**
 * Missing pages must answer a real 404, not "200 + noindex" (a soft 404).
 *
 * Until 2026-10-19 every unknown URL on the site — including what Googlebot
 * and Bingbot fetched — returned 200 with two conflicting robots metas and a
 * canonical to the homepage. Cause: a root `src/app/loading.tsx` made every
 * route stream, so the 200 status was flushed before `notFound()` ran.
 *
 * Run it against localhost/staging only. Do NOT point it at production from
 * the Mac: requests for missing pages are what CrowdSec calls http-probing and
 * they got the office IP banned on 2026-10-19. The production guard for the
 * same rule is section 4b of bin/smoke-test.sh, which runs on compute.
 */

const MUST_404 = [
  `/ruta-inexistente-${Date.now()}`,
  '/espana/no-existe',
  '/carreteras/ZZ-999',
  '/noticias/no-existe',
  '/municipio/no-existe',
  '/rondas/no-existe',
  '/gasolineras/terrestres/99999999',
]

// Segments with their own loading.tsx still stream, so their dynamic children
// still soft-404. Tracked in docs/cto-loop/BACKLOG.md — flip to MUST_404 when
// those boundaries are scoped to the hub page only.
const KNOWN_SOFT_404 = ['/camaras/no-existe', '/trenes/estaciones/no-existe']

test.describe('HTTP status of missing pages', () => {
  for (const path of MUST_404) {
    test(`404 for ${path.replace(/\d{10,}/, '<ts>')}`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status()).toBe(404)
    })
  }

  for (const path of KNOWN_SOFT_404) {
    test.fixme(`404 for ${path} (segment loading.tsx)`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status()).toBe(404)
    })
  }

  test('existing pages still answer 200', async ({ request }) => {
    for (const path of ['/', '/espana/cataluna', '/carreteras/A-6', '/rondas/ronda-dalt']) {
      const res = await request.get(path, { maxRedirects: 0 })
      expect(res.status(), path).toBe(200)
    }
  })
})
