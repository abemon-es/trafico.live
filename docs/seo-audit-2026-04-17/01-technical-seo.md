# Technical SEO Audit — trafico.live
**Date:** 2026-04-17  
**Scope:** Source audit + live HTTP checks (trafico.live down via WebFetch/502; curl confirmed 200 on subpages)

---

## 1. Crawlability & Indexability

### 1.1 robots.txt

Served dynamically via `src/app/robots.ts`. Live URL: `https://trafico.live/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/, /_next/, /static/

User-agent: GPTBot
Allow: /, /carreteras/, /sitemap.xml

User-agent: ChatGPT-User / Anthropic-AI / Claude-Web
Allow: /, /carreteras/, /sitemap.xml
```

**Issues:**
- AI bots (GPTBot, Anthropic-AI, Claude-Web) are **only allowed** `/` and `/carreteras/`. All other content — trenes, aviacion, maritimo, gasolineras — is implicitly disallowed. This is likely unintentional and blocks AI indexing of 140+ page types.
- `/static/` disallow is redundant (Next.js doesn't serve that path). `/_next/` is correct.

### 1.2 Sitemap

Served via API route rewrite (`/sitemap.xml` → `/api/sitemap-index`). Architecture: shard index + 14 child sitemaps with 5,000 URLs/shard cap. Also has `/news-sitemap.xml` (48h rolling, Google News).

| Shard | Content | Est. URLs |
|-------|---------|-----------|
| 0 | Core static pages + roads + cities + communities + airports + transit operators + vessels | ~830 |
| 1–3 | Gas stations (~12,000) | ~12,000 |
| 100–102 | Municipalities | ~8,000 |
| 200 | Postal codes | ~5,000 (truncated — see below) |
| 300 | Insights / articles / tags | ~500+ |
| 400 | Maritime stations | ~500 |
| 500 | Radars | ~3,000 |
| 600 | Cameras | ~3,000 |
| 700–701 | EV chargers | ~8,000 |

**Max coverage: ~41,000 URLs across 14 shards.**

**Critical gaps — entity pages absent from all shards:**

| Missing entity | Est. count | Page route |
|----------------|-----------|------------|
| Railway stations | 2,154 | `/trenes/estacion/[slug]` |
| Railway routes/lines | 1,248 | `/trenes/linea/[slug]` |
| Air quality stations | 565 | `/calidad-aire/estacion/[id]` |
| Air quality by province | 52 | `/calidad-aire/provincia/[slug]` |
| Climate stations | ~900 | `/clima/estacion/[id]` |
| Climate by province | 52 | `/clima/provincia/[slug]` |
| Ferry routes | ~50 | `/maritimo/ferries/[slug]` |
| Maritime zones | 8 | `/maritimo/zonas/[zone]` |

**Total uncrawlable entity pages: ~5,000+**

**Postal code undercount:** `FALLBACK_POSTAL_CODE_SHARDS = 1` covers only 5,000 URLs. Spain has ~10,000 active postal codes (`/codigo-postal/[cp]`). Second shard (id=201) is never registered → ~5,000 postal code pages not submitted.

**File reference:** `src/lib/sitemap-generator.ts` — `getSitemapShardIds()` line 51, `FALLBACK_POSTAL_CODE_SHARDS` line 25.

### 1.3 Noindex Quality Gates

Conditionally applied in 5 page types — all intentional and correct:

| Page | Condition | File |
|------|-----------|------|
| `/codigo-postal/[cp]` | No gas stations near that CP | `src/app/codigo-postal/[cp]/page.tsx:120` |
| `/espana/.../[municipality]` | No data for municipality | `src/app/espana/[community]/[province]/[municipality]/page.tsx:107` |
| `/noticias/[slug]` | Article older than threshold | `src/app/noticias/[slug]/page.tsx:44` |
| `/transporte-publico/[operator]` | Zero routes ingested | `src/app/transporte-publico/[operator]/page.tsx:283` |
| `/municipio/[slug]` | Pop < 2000 AND no gas stations | `src/app/municipio/[slug]/page.tsx:84` |

No spurious noindex found.

### 1.4 HTTP-Level Blocking (Cloudflare)

From live curl on `/` (502 from Cloudflare, subpages 200):
- No `X-Robots-Tag` header on any page — correct.
- Homepage returns `502` intermittently via Cloudflare; subpages serve correctly. The 502 is likely a Coolify → web container timeout on the uncached homepage (hero map + multiple DB calls with `revalidate=300`). Googlebot will encounter this occasionally.
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` on dynamic pages.
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` on static-ish pages (correct).

---

## 2. Canonicals

### 2.1 Canonical tag presence

| Layer | Count | Status |
|-------|-------|--------|
| Pages with `alternates.canonical` | 157 | ✓ |
| Pages with metadata but NO canonical | **32** | ⚠ Issue |

**32 pages missing canonical** (file paths relative to `src/app/`):

```
/trenes/page.tsx                   /trenes/lineas/page.tsx
/carreteras/page.tsx               /carreteras/autopistas/page.tsx
/carreteras/autovias/page.tsx      /carreteras/nacionales/page.tsx
/carreteras/regionales/page.tsx    /estaciones-aforo/page.tsx
/intensidad/page.tsx               /atascos/page.tsx
/cortes-trafico/page.tsx           /puntos-negros/page.tsx
/operaciones/page.tsx              /restricciones/page.tsx
/ciclistas/page.tsx                /guias/*.page.tsx (9 pages)
/gasolineras-24-horas/page.tsx     /prediccion-trafico/page.tsx
/prediccion/precio-combustible/page.tsx  /ruta/page.tsx
/etiqueta-ambiental/page.tsx       /informes/combustible/[date]/page.tsx
/informes/mensual/[month]/page.tsx /informes/semanal/[week]/page.tsx
```

Without a canonical, Next.js falls back to the layout's `alternates.canonical: BASE_URL` — meaning **all 32 pages self-report their canonical as `https://trafico.live`** (the homepage). This is a critical duplicate content signal to Googlebot.

**Confirmed live:** `/trenes` canonical tag renders `https://trafico.live` instead of `https://trafico.live/trenes`.

### 2.2 Title template double-suffix

Root layout defines `template: "%s | trafico.live"`. Any page that manually appends `| trafico.live` to its title string will produce double-suffixed titles:

```
"Red Ferroviaria de España — Mapa de trenes en tiempo real | trafico.live | trafico.live"
```

**Affected pages: 55** (confirmed with `/trenes` and `/aviacion` live). Sample:

```
src/app/trenes/page.tsx                    → "... | trafico.live | trafico.live"
src/app/aviacion/page.tsx                  → "... | trafico.live | trafico.live"
src/app/calidad-aire/page.tsx              → "... | trafico.live | trafico.live"
src/app/transporte-publico/page.tsx        → "... | trafico.live | trafico.live"
src/app/estadisticas-transporte/page.tsx   → "... | trafico.live | trafico.live"
```

`src/app/trenes/page.tsx` line 5 — remove ` | trafico.live` from all affected title strings.

### 2.3 Trailing slashes

Next.js returns `308` (permanent redirect) for trailing-slash URLs:
- `https://trafico.live/trenes/` → `308` → `/trenes`
- `https://trafico.live/maritimo/` → `308` → `/maritimo`

These are proper redirects, though 308 (vs 301) is acceptable and Googlebot handles it. No issue.

### 2.4 www vs apex

`https://www.trafico.live/` → `301` → `https://trafico.live/` — correct, handled at middleware/Cloudflare level.

### 2.5 Double redirect chains

`/explorar` → `308` `/comunidad-autonoma` → `308` `/espana` — 2-hop redirect wastes crawl budget. Defined in `next.config.ts` lines 202–228. The intermediate hop to `/comunidad-autonoma` should be collapsed to a single redirect to `/espana`.

`/provincias` → `308` → `/espana` — single hop, fine.

### 2.6 Query-parameter canonicalization

No evidence of query parameters being indexed (no `?v=1` or similar in sitemaps). Sitemap uses clean URLs only. API routes are excluded from robots.txt. No issue detected.

---

## 3. Structured Data / JSON-LD

### 3.1 Global schemas (all pages)

Set via `StructuredData` component in `src/app/layout.tsx`:

| Schema type | Status | Notes |
|-------------|--------|-------|
| `Organization` | ✓ | name, url, logo, contactPoint, areaServed, foundingDate |
| `WebSite` | ✓ | With `SearchAction` potentialAction (Sitelinks Searchbox eligible) |
| `ItemList` (SiteNavigation) | ✓ | 30 nav items as `SiteNavigationElement` |

**Issue:** `Organization.sameAs` is an empty array (`[]`). Should include official social profiles (Twitter/X: @traficolive, LinkedIn, GitHub if public). Missing sameAs weakens entity disambiguation.

### 3.2 Page-level schema coverage

| Page type | Schema type | Assessment |
|-----------|------------|------------|
| Homepage (`/`) | Dataset, Service, BreadcrumbList, FAQPage, ItemList, Speakable | ✓ Rich |
| Gas station (`/gasolineras/terrestres/[id]`) | `GasStation` + `LocalBusiness` + `Offer` (fuel prices) | ✓ Excellent |
| Airport (`/aviacion/aeropuertos/[iata]`) | `Airport` with GeoCoordinates, iataCode, icaoCode | ✓ Good |
| Road (`/carreteras/[roadId]`) | `Road` with length, containedInPlace | ✓ Good |
| Article (`/noticias/[slug]`) | `WebPage` + `BreadcrumbList` | ⚠ No `Article`/`NewsArticle` type |
| Railway station (`/trenes/estacion/[slug]`) | `WebPage` only | ⚠ Missing `TrainStation` |
| Railway line (`/trenes/linea/[slug]`) | `WebPage` only | ⚠ Missing `BusRoute`/`TrainTrip` |
| Maritime (`/maritimo/buques/[slug]`) | Not confirmed | ⚠ Unverified |
| Transit operator (`/transporte-publico/[operator]`) | Not confirmed | ⚠ Unverified |
| Air quality station (`/calidad-aire/estacion/[id]`) | Not confirmed | ⚠ Missing |
| Postal code (`/codigo-postal/[cp]`) | Not confirmed | ⚠ Missing `Place` |
| Municipality (`/municipio/[slug]`) | Not confirmed | ⚠ Missing `City`/`AdministrativeArea` |

**Estimated structured data coverage: ~45% of page types have purpose-specific schemas.**

**Schema generator functions available but unused on several page types:**
- `generateDatasetSchema` — not used on `/calidad-aire`, `/estadisticas-transporte`
- `generateServiceSchema` — not used on `/transporte-publico`
- `generateFAQSchema` — only used on homepage

**Missing high-value schemas:**

| Entity | Recommended schema | Why |
|--------|-------------------|-----|
| `/noticias/[slug]` | `NewsArticle` | Google News eligibility, rich results |
| `/trenes/estacion/[slug]` | `TrainStation` | Google Knowledge Graph; 2,154 stations |
| `/calidad-aire/estacion/[id]` | `Place` + Dataset | Air quality data richness |
| `/municipio/[slug]` | `City` | Geographic entity disambiguation |
| `/trenes/cercanias/[network]` | `PublicTransitMap` / `BusOrCoach` | Transit-specific rich result |

---

## 4. Core Web Vitals

### 4.1 HTML payload

| Page | Size |
|------|------|
| `/` (homepage) | **187 KB** HTML |
| `/aviacion` | **212 KB** HTML |
| `/maritimo` | **115 KB** HTML |
| `/trenes` | **83 KB** HTML |

The homepage at 187 KB HTML (pre-JS) is within acceptable range but is high given the hero map hasn't loaded yet (MapLibre renders client-side). The aviacion page at 212 KB is the heaviest — likely inline SVG or extensive SSR content.

### 4.2 Script loading

Homepage loads **47 script tags** (16 async, 16 preloads, 31 inline). CSS: 2 files (good — Tailwind v4 generates a single bundle). No render-blocking sync scripts except 1 (the GA consent default `beforeInteractive` inline script, which is intentional and tiny).

### 4.3 LCP risk factors

| Risk | Assessment | Severity |
|------|-----------|----------|
| Hero MapLibre map loads client-side | Map canvas blank until JS hydrates + tiles load. LCP candidate is likely a text heading, not the map | Medium |
| 3 font preloads (`woff2`) | Using `display: swap` — correct. Fonts are self-hosted via Next.js | Low |
| No `og:image` rendered → social preview broken | Not a LCP factor but impacts CTR | High |
| `revalidate=300` on homepage with DB queries | Occasional cache miss triggers multiple DB round-trips → slower TTFB → LCP delay | Medium |
| `beforeInteractive` GA consent script | Small, but fires synchronously — cannot remove without breaking consent flow | Low |

### 4.4 CLS risks

| Risk | Assessment |
|------|-----------|
| `<StickyFooterAd />` injected into DOM after page load | If it has height and appears below content, this causes CLS. `sticky` positioning mitigates but doesn't eliminate it | Medium |
| Map canvas injected dynamically | MapLibre canvas replaces placeholder container. If container has no min-height set, CLS occurs | Medium |
| Fonts `display: swap` | Brief FOUT but measured CLS impact is usually < 0.01 | Low |
| Raw `<img>` without dimensions in 3 files | `src/app/camaras/camara/[id]/page.tsx`, `src/app/media/page.tsx`, `src/components/map/TrafficMap.tsx` — these bypass next/image and lack `width`/`height` → guaranteed CLS | High |

### 4.5 Image optimization

| Method | Files |
|--------|-------|
| `next/image` used | 3 files: `camaras/[city]`, `camaras/carretera/[road]`, `andorra/page.tsx` |
| Raw `<img>` tag | 3 files: `camaras/camara/[id]`, `media/page.tsx`, `map/TrafficMap.tsx` |

DGT camera images (`nap.dgt.es`, `infocar.dgt.es`) are configured in `next.config.ts` `remotePatterns` for next/image, but the camera detail page uses a raw `<img>` tag. This misses AVIF/WebP conversion and automatic dimension hints.

---

## 5. Mobile-First

### 5.1 Viewport

`<meta name="viewport" content="width=device-width, initial-scale=1"/>` — correct, no `user-scalable=no` restriction. Set in `src/app/layout.tsx` via `export const viewport: Viewport`.

### 5.2 Responsive breakpoints

Tailwind v4 CSS-first in `src/app/globals.css`. No hardcoded `px` font sizes detected — Tailwind responsive utilities used throughout (`hidden md:flex`, etc. visible in live HTML). Fluid typography via CSS custom properties (`--font-heading`, `--font-body`).

### 5.3 Touch targets

From live HTML inspection: navigation uses `button` elements with padding classes. No explicit touch-target size violations detected in source scan, but sticky footer ad (`<StickyFooterAd />`) warrants manual testing to confirm 44×44px minimum.

---

## 6. hreflang & i18n

- `<html lang="es">` — correct, set in `src/app/layout.tsx` line 186.
- No hreflang tags — appropriate for a Spain-only Spanish-language site. No en/es confusion detected.
- `og:locale: es_ES` on all pages.
- WebSite schema has `inLanguage: "es"`.
- No issues.

---

## 7. Internal Redirects / Status Codes

### 7.1 Redirect inventory

| Source | Destination | Code | Status |
|--------|------------|------|--------|
| `www.trafico.live` | `trafico.live` | 301 | ✓ |
| `/combustible(/*)` | `/gasolineras(/*)` | 301 (permanent) | ✓ |
| `/alertas(/*)` | `/incidencias(/*)` | 301 | ✓ |
| `/provincias` | `/espana` | 308 | ✓ |
| `/blog(/*)` | `/noticias(/*)` | 308 | ✓ |
| `/insights(/*)` | `/noticias(/*)` | 308 | ✓ |
| `/informes(/*)` | `/noticias(/*)` | 308 | ✓ |
| `/explorar` | `/comunidad-autonoma` | 308 → `/espana` (2 hops) | ⚠ Double hop |
| `/comunidad-autonoma(/*)` | `/espana(/*)` | 308 | ✓ |
| `/electrolineras(/*)` | `/carga-ev(/*)` | 301 | ✓ |
| `trailing slash` | clean URL | 308 | ✓ |

**Note:** `next.config.ts` sets `permanent: true` for most redirects but Next.js issues `308` for named redirects (not `301`). Googlebot treats 308 equivalent to 301 for link equity. No practical issue.

### 7.2 Double redirect chain

`/explorar` → `308` `/comunidad-autonoma` → `308` `/espana`

**Fix:** Add a direct redirect `{ source: "/explorar", destination: "/espana", permanent: true }` before the existing one in `next.config.ts` line 203–207. The existing `/explorar/territorios/:slug` → `/espana/:slug` redirect is fine.

### 7.3 Notable: `/informes` in sitemap despite being a redirect target

`src/lib/sitemap-generator.ts` line 924 notes `/informes` excluded, and `next.config.ts` has the redirect — correct. No issue.

### 7.4 Sitemap lists `/provincias/[code]` pages

`src/lib/sitemap-generator.ts` lines 1199–1212 generates `${BASE_URL}/provincias/${province}` URLs. But `/provincias` 301-redirects to `/espana`. These URLs in the sitemap send Googlebot through a redirect before landing on the actual province page. The canonical URL in the province page metadata points to the `espana/` hierarchy. This is a minor crawl budget waste.

---

## 8. Performance Signals

### 8.1 Preconnect / prefetch hints

Set in `src/app/layout.tsx` `<head>`:

| Hint | Target | Correct? |
|------|--------|----------|
| `<link rel="preconnect">` | `tiles.trafico.live` | ✓ |
| `<link rel="dns-prefetch">` | `tiles.trafico.live` | ✓ (fallback) |
| `<link rel="preconnect">` | `www.googletagmanager.com` | ✓ |
| `<link rel="preconnect">` | `www.google-analytics.com` | ✓ |
| `<link rel="preconnect">` | `fonts.gstatic.com` | ✓ |

**Missing preconnects:**
- `https://fonts.openmaptiles.org` — referenced in CSP `font-src` and likely loaded for MapLibre vector labels. No preconnect hint.
- `https://api.open-meteo.com` / `https://marine-api.open-meteo.com` — referenced in CSP `connect-src`. No preconnect (acceptable since these are data APIs, not LCP resources).

### 8.2 og:image missing sitewide

**117 pages** define `openGraph` metadata without an `images` key. When a page defines `openGraph: { ... }` without `images`, Next.js App Router **does not inherit** the layout's `images` array — the page-level `openGraph` object takes complete precedence.

Result: `og:image` meta tag is absent from 117+ pages. `twitter:image` IS set (inherited from layout's `twitter` block which is not overridden). This means Twitter/X card previews work but Facebook/LinkedIn/WhatsApp shares show no image.

**Live confirmation:**
- `/` — `og:image` absent, `twitter:image` present
- `/trenes` — `og:image` absent, `twitter:image` present  
- `/maritimo` — `og:image` absent, `twitter:image` present
- `/aviacion` — `og:image` absent, `twitter:image` present

**Fix:** Add `images: [{ url: \`${BASE_URL}/og-image.webp\`, width: 1200, height: 630 }]` to all page-level `openGraph` objects, or extract a shared `defaultOgImages` constant and spread it in.

### 8.3 Lazy loading

Next.js chunks are loaded with `async` attribute (confirmed in HTML). MapLibre and GSAP are not in the source — only native MapLibre GL is used (no GSAP dependency in this project). Recharts is used for charts and should be dynamically imported if it isn't already.

### 8.4 Service workers

Two service workers registered via `afterInteractive` scripts in layout: `sw.js` (general cache) and `tile-sw.js` (tile caching). These help returning visitor performance but don't affect first-visit LCP.

---

## Summary

### Sitemap completeness score: **62/100**

- 14 shards, ~41,000 URLs registered
- ~5,000+ high-value entity pages absent (railway stations/lines, air quality stations, climate stations, ferry routes)
- Postal code shard truncated at 5,000 (~50% coverage)

### Structured data coverage: **~45%**

- Homepage is rich (6 schema types)
- Gas stations have excellent LocalBusiness + Offer schemas
- Airports have proper Airport schema
- Railway stations, air quality, municipality, and transit pages lack entity-specific schemas

### Biggest CWV risk

**og:image absent sitewide** (CTR/social sharing impact) combined with **raw `<img>` tags in camera pages** (CLS/no lazy load). The primary LCP risk is the homepage intermittent 502 from Cloudflare on cache miss — server TTFB spikes will drag LCP for a crawl bot hitting an uncached page.

### Canonical consistency issues

1. **32 pages** missing `alternates.canonical` → all self-report canonical as `https://trafico.live` (homepage). Most critical: `/trenes`, `/carreteras/*`, `/guias/*`, `/etiqueta-ambiental`.
2. **55 pages** have double title suffix `| trafico.live | trafico.live` due to manual suffix in title strings conflicting with layout template.

### Top 3 fixes by impact

| Priority | Fix | Impact |
|----------|-----|--------|
| 1 | **Add `alternates.canonical` to 32 pages** missing it — resolves false duplicate content signal where all these pages claim `https://trafico.live` as canonical | Prevents index consolidation loss on 32 pages |
| 2 | **Add railway stations/lines, air quality stations to sitemap** — 2,154 + 1,248 + 565 entity pages currently invisible to crawlers | Unlocks ~4,000 indexable entity pages |
| 3 | **Add `images` to all page-level `openGraph` objects** — `og:image` is absent on 117 pages, killing social share previews on Facebook/LinkedIn/WhatsApp | CTR improvement on all social shares |

**Bonus (title):** Strip ` | trafico.live` from 55 manually-suffixed title strings — the layout template adds it automatically. File-level fix required per page.
