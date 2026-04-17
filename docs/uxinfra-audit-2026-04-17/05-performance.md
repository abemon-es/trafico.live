# 05 — Performance Audit
**trafico.live · 2026-04-17 · Measured live production**

---

## 1. Real Page Weights

All measurements via `curl` with `Accept-Encoding: gzip, br`. Raw HTML sizes from no-compression fetch (`curl -o -`). Playwright navigation timing measured on same session.

| Page | Compressed (br) | Decompressed HTML | TTFB (ms) | DCL (ms) | Load (ms) |
|------|----------------:|------------------:|----------:|---------:|----------:|
| `/` (home) | 25.9 KB | 211 KB | 63 | 118 | 121 |
| `/gasolineras` | 25.8 KB | **307 KB** | 149 | — | — |
| `/maritimo` | 18.3 KB | 172 KB | 99 | 125 | 150 |
| `/trenes` | 12.5 KB | 88 KB | 102 | 120 | 147 |
| `/intensidad` | 12.7 KB | 95 KB | 106 | 125 | 137 |
| `/mapa` | 10.2 KB | 69 KB | 142 | — | — |

**Compression ratio** is excellent (~12:1 on average via Brotli). TTFB is fast (60–155 ms), well under the 800 ms threshold. HTML alone is not the bottleneck.

**Outlier:** `/gasolineras` at 307 KB decompressed is the heaviest page. The source is two full province grids rendered server-side (52 provinces × repeated HTML structure with pricing data) plus 40+ city links and 10 fuel-type pill rows — all SSR-inlined into the HTML. At 772 lines of source, this page generates ~5× the markup of `/mapa`.

---

## 2. JavaScript Bundle

Measured via `performance.getEntriesByType('resource')` on `/` after full load.

| Metric | Value |
|--------|------:|
| Total JS chunks loaded | 35 |
| Total JS decoded (uncompressed) | **2,195 KB** |
| Total resources (all types) | 79 |
| External scripts loaded | 0 (all proxied/deferred) |

### Top chunks by decoded size (home page)

| Chunk | Decoded KB | Notes |
|-------|----------:|-------|
| `0r_e4i0cy4-pn.js` | **970 KB** | Largest — likely maplibre-gl + pmtiles combined vendor |
| `0woxltqahxj.6.js` | 226 KB | Secondary vendor chunk (recharts + motion?) |
| `0ru1cp5luw1sb.js` | 192 KB | App bundle (HomeClient dynamic components) |
| `1545ka~kjheh1.js` | 134 KB | Shared components |
| `00gawvcfje6.4.js` | 80 KB | — |
| `031znkmtoex71.js` | 53 KB | — |
| `0hze_3fbrwjte.js` | 45 KB | — |
| `0ecjvv7_p3omq.js` | 44 KB | — |
| CSS (`04v4-anw5dkb.css`) | **174 KB** | Main stylesheet |
| CSS (`0jdczluf6chwz.css`) | 68 KB | Secondary CSS |

**Total CSS decoded: ~242 KB.** Two stylesheets for a Tailwind v4 project is expected (framework + app tokens), but 174 KB for the main sheet warrants review — Tailwind v4 relies on CSS `@layer` purging at build time.

---

## 3. Bundle Analysis

### Dynamic import coverage

`dynamic()` is used in **43 call sites across 23 files**. Coverage is solid on the heaviest components:

| Component | Lazy-loaded | Notes |
|-----------|:-----------:|-------|
| `TraficoMap` (MapLibre) | YES | All map pages, `ssr: false` |
| `IntensityMap` | YES | `ssr: false` |
| `StationMap` | YES | |
| `RouteMap` (Renfe lines) | YES | |
| `HomeClient` sections (11 components) | YES | Aggressive split |
| `DashboardClient` charts | YES | `BreakdownCharts`, `TimeSeriesChart` |
| `HistoricalMap` | YES | |
| Recharts chart components | **MIXED** | See below |

### Recharts — NOT consistently lazy

24 files import directly from the `recharts` barrel (`from "recharts"`). Only a subset end up behind a `dynamic()` wrapper in their parent. Confirmed direct static imports (no parent `dynamic()`):

- `src/app/inteligencia/motociclistas/moto-charts.tsx`
- `src/components/inteligencia/AccidentTrendChart.tsx`

The `trenes/content.tsx` and `intensidad/content.tsx` import both **recharts AND maplibre** at the top level — recharts is pulled in eagerly whenever the `"use client"` boundary is hit, even though the charts are below the fold. **Recharts is estimated ~150–200 KB decoded** of the 226 KB secondary vendor chunk.

### MapLibre-GL

Imported as the full `maplibregl` default in 10+ files. All are gated behind `dynamic({ ssr: false })` at the page level. The 970 KB vendor chunk is the combined maplibre-gl + pmtiles bundle — this is expected for a map-heavy app and is only loaded after hydration.

### Lucide React

271 files import from `lucide-react` using **named imports** (e.g., `import { Train, Loader2, ... } from "lucide-react"`). This is tree-shaken correctly — no barrel-import risk here. Lucide icons are not a bundle concern.

### AWS SDK

`@aws-sdk/client-ses` and `@aws-sdk/client-sesv2` are in `dependencies` (not `devDependencies`). They are only imported in `src/lib/email/ses.ts`. If this module is ever transitively imported by a client component, it would add ~500 KB to the browser bundle. Current usage appears server-only but should be confirmed with a `"server-only"` guard.

---

## 4. Asset Optimization

| Check | Status | Detail |
|-------|--------|--------|
| `next/image` usage | MISSING | 0 imports of `next/image`. 3 raw `<img>` tags found (camera page, media page). |
| avif/webp formats configured | YES | `images.formats: ["image/avif", "image/webp"]` in `next.config.ts` — but irrelevant without `next/image`. |
| Remote patterns configured | YES | DGT camera URLs whitelisted |
| OG image format | GOOD | `/og-image.webp` exists (also `.png` fallback) |
| Camera `<img>` dimensions | MISSING | `src/app/camaras/camara/[id]/page.tsx:58` has `<img>` without width/height — **CLS risk** |
| Static `/_next/static/` caching | GOOD | `cache-control: public, max-age=31536000, immutable` confirmed on chunks |
| HTML pages caching | PARTIAL | `s-maxage=60, stale-while-revalidate=120` for most pages. Tier 1 static pages (radares, zbe, etc.) get 5 min. CF reports `DYNAMIC` for HTML — pages are not being served from CF edge cache. |

**Critical finding:** Cloudflare returns `CF-Cache-Status: DYNAMIC` on all HTML pages. This means every visitor triggers an origin request. The `s-maxage=60` header is set correctly, but Cloudflare is not caching the HTML. This is likely because the `Set-Cookie` header or Cloudflare's "Bypass Cache on Cookie" rule is stripping edge caching. The JS/CSS static chunks do get `immutable` headers and are cached correctly by browsers.

---

## 5. Font Loading

| Check | Status | Detail |
|-------|--------|--------|
| Font provider | Google Fonts via `next/font/google` | Exo 2, DM Sans, JetBrains Mono |
| Self-hosted | YES | `next/font/google` self-hosts fonts at build time — no external font request at runtime |
| `font-display: swap` | YES | All three fonts use `display: "swap"` |
| Weights loaded | MINIMAL | Exo 2: 500/600/700/800 · DM Sans: 400/500/600 · JetBrains: 400/500 |
| Preconnect to `fonts.gstatic.com` | YES | Set in layout `<head>` |
| Font preload | IMPLICIT | `next/font/google` injects preload links automatically |
| FOUT risk | LOW | `swap` strategy means text visible immediately in fallback font |
| Layout shift from fonts | LOW-MEDIUM | Exo 2 is wide/condensed — can cause reflow if fallback metrics differ significantly |

**No external font requests** at runtime — `next/font/google` handles download at build time and serves from `/_next/static/media/`. This is correct.

---

## 6. Server-Side Performance

### ISR / SSG coverage

| Pattern | Count | Notes |
|---------|------:|-------|
| `generateStaticParams` (SSG) | 47 pages | Cercanías networks, provinces, roads, etc. |
| `export const revalidate` (ISR) | 30+ pages | Values: 300s (fuel), 1800s (IMD), 3600s (guides), 86400s (EV charger detail) |
| Home page revalidate | 300s (5 min) | ISR |
| `/intensidad` revalidate | 1800s (30 min) | ISR — appropriate for annual IMD data |
| `/gasolineras` revalidate | 300s | ISR |
| `/maritimo` revalidate | 300s | ISR |
| Fully dynamic (no revalidate) | ~70% of pages | Falls back to dynamic rendering per request |

### Prisma query patterns

Pages use `Promise.all()` for parallel queries — no sequential waterfalls detected in the critical pages (`/gasolineras` runs 3 `Promise.all` groups covering 13 total queries in parallel groups). 

**One confirmed N+1:** `src/app/informes/mensual/[month]/page.tsx` runs sequential `prisma.article.findUnique()` in a `for...of` loop (lines 24–28). Low traffic page, acceptable risk.

**`/carreteras/page.tsx`** runs `Object.keys(ROAD_TYPE_CONFIG).map(async (type) => prisma.road.findMany(...))` — this spawns parallel queries via `Promise.all`, not sequential. OK.

### Redis caching coverage

89 of ~121 API route files include Redis caching (`redis`, `cache`, `getCache`, `setCache`). ~73% coverage. The uncached ~27% are mostly webhook handlers, billing routes, and low-traffic endpoints. Core high-traffic endpoints (`/api/gasolineras`, `/api/trenes/*`, `/api/aviacion`) are cached.

185 `useSWR` calls across client components — all benefit from SWR's built-in deduplication and revalidation window.

---

## 7. Third-Party Scripts

| Script | Strategy | Notes |
|--------|----------|-------|
| Google Analytics (`gtag.js`) | `afterInteractive` | Correct — deferred until after hydration |
| GA consent default setter | **`beforeInteractive`** | Runs before page hydration. The inline snippet is tiny (~200 bytes) but it blocks the parser on every page. Could be moved to `afterInteractive` with consent mode v2. |
| GA init script | `afterInteractive` | Correct |
| Service Worker (`sw.js`) | `afterInteractive` | Correct |
| Tile Service Worker (`tile-sw.js`) | `afterInteractive` | Correct |
| Sentry | Via `@sentry/nextjs` wrapper | Injects automatically — tunneled via `/monitoring` to avoid ad blockers. Client sampling: 50% replay, 25% traces. |
| `WebVitals` component | Client component in layout | Hooks into `useReportWebVitals` — runs client-side only, no blocking |
| Ads (`StickyFooterAd`) | **Disabled** (`return null`) | No ad network load currently |

**Finding:** The `ga-consent-default` script using `beforeInteractive` adds a render-blocking inline script to every page. While the payload is tiny, this is unnecessary — Consent Mode v2 default can be set with `afterInteractive` or inlined as a `<script>` tag in `<head>` without the Next.js `Script` component.

---

## 8. Core Web Vitals Predictions

### LCP — MEDIUM RISK

**Primary LCP candidate on home:** The hero map takes ~120 ms to `DOMContentLoaded`, but MapLibre is loaded dynamically with `ssr: false`. The actual map canvas renders well after hydration. The LCP element is likely the `<h1>` heading "Tráfico en Tiempo Real en España" rendered server-side — this is a **positive pattern**. However, the above-fold content shows a map loading skeleton (animated pulse) until MapLibre initializes. If Lighthouse measures the skeleton placeholder as LCP, the score improves; if it catches the map tiles, LCP could be 3–5s.

**Font rendering:** Exo 2 with `display: swap` means the heading initially renders in system font, then swaps. If the metrics differ enough, this triggers a layout shift during LCP measurement window.

### CLS — MEDIUM RISK

| Risk | Source | Severity |
|------|--------|----------|
| Camera `<img>` without dimensions | `camaras/camara/[id]/page.tsx` | Medium |
| Font swap (Exo 2 wide metrics) | Layout shift on heading render | Low-Medium |
| Map canvas resize | MapLibre initializes into fixed-height container | Low (container height is fixed in CSS) |
| SWR data load | Province stats and counts replace skeleton | Low (uses CSS skeleton with same dimensions) |

### INP / FID — HIGH RISK on map pages

Map pages (`/`, `/mapa`, `/trenes`, `/maritimo`) load 970 KB of MapLibre + pmtiles. While deferred via `dynamic()`, the main-thread parse and compile of ~1 MB JS after hydration will block interactivity for 200–600 ms on mid-range devices. This is the **biggest real-user performance risk** on the site.

The `/trenes/content.tsx` and `/intensidad/content.tsx` import recharts synchronously (`"use client"` boundary) — this adds ~150–200 KB to the synchronous evaluation chain, worsening INP on those pages.

---

## Summary

**Home page weight:** 26 KB compressed, 211 KB raw HTML, 2.2 MB JS decoded (all lazy after hydration).

**Slowest URL (HTML generation):** `/gasolineras` at 307 KB raw, driven by two full province grids (52 provinces × 2 tables) inlined into SSR HTML.

**Biggest performance issue:** The 970 KB MapLibre + pmtiles vendor chunk (decoded) is evaluated on every map page after hydration. Combined with recharts loaded synchronously in `trenes/content.tsx` and `intensidad/content.tsx`, this creates a ~1.2 MB main-thread parse burst that blocks INP on mid-range devices.

**Top 3 fixes by impact:**

1. **Wrap recharts in `dynamic()` in `trenes/content.tsx` and `intensidad/content.tsx`** — The chart components are below the fold. Moving them to `dynamic({ ssr: false })` defers ~150–200 KB from the synchronous evaluation chain, directly improving INP and TTI on those pages. Pattern already exists in the codebase (`BreakdownCharts`, `TimeSeriesChart` in DashboardClient).

2. **Fix Cloudflare HTML caching (`CF-Cache-Status: DYNAMIC`)** — All HTML pages bypass CF edge cache despite `s-maxage=60`. Likely caused by a cookie being set on first response (cookie consent, session). Enable "Cache Everything" rule in Cloudflare for HTML routes excluding `/api/*`, with bypass condition on `Authorization` header only. This would serve cached HTML from 300+ CF PoPs instead of hitting the origin on every request.

3. **Add `width` and `height` to the camera `<img>` tag and migrate to `next/image`** — The camera detail page (`camaras/camara/[id]/page.tsx:58`) uses a raw `<img>` without dimensions, causing a CLS event on page load. `next/image` also enables lazy loading, avif/webp auto-conversion (already configured in `next.config.ts`), and built-in blur placeholders — zero-cost wins since the format support is already declared.
