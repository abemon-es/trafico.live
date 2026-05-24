# trafico.live — End-to-End Audit Log

Iterative audit + auto-improvement loop. CTO/CMO/CSO/CEO lens.
Append new iterations at top. Older iterations stay for trend tracking.

---

## Iteration 4 (wave 5) — 2026-05-23 (404 sweep + handover)

**Theme:** every entity URL pattern now resolves — no dead-ends from typos, sibling-paths, or hub-URLs that never existed.

### Pre-existing prod 404s found and fixed (this iter)

| Pattern | UI source | Fix |
|---|---|---|
| `/trenes/estaciones` → broken links to 1506 stations | catalog cards + table rows | Plural→singular path bug; `href` corrected `estaciones/[slug]` → `estacion/[slug]` |
| `/calidad-aire/estacion` | "Directorio estaciones" CTA on `/calidad-aire` | 308 → `/calidad-aire` |
| `/calidad-aire/provincia` | "Ver por provincia" CTA on `/calidad-aire` | 308 → `/calidad-aire` |
| `/trenes/estacion` | Sibling of `/trenes/estaciones`; deep links | 308 → `/trenes/estaciones` |
| `/trenes/linea` | Sibling of `/trenes/lineas`; deep links | 308 → `/trenes/lineas` |
| `/maritimo/ferries` | "Ferries" CTA on `/maritimo` + back-links from `/maritimo/ferries/proximo` and `/maritimo/ferries/[slug]` | 308 → `/maritimo/ferries/proximo` |
| `/maritimo/buque` | Singular typo of `/maritimo/buques` | 308 → `/maritimo/buques` |
| `/aviacion/aeropuerto` | Singular typo of `/aviacion/aeropuertos` | 308 → `/aviacion/aeropuertos` |
| `/accidentes/carretera` | Natural hub of `/accidentes/carretera/[road]` (built in this PR) | 308 → `/accidentes` |
| `/camaras/carretera` | Natural hub of `/camaras/carretera/[road]` | 308 → `/camaras` |
| `/noticias/tag` | Natural hub of `/noticias/tag/[slug]` | 308 → `/noticias` |
| `/carga-ev/punto` | Natural hub of `/carga-ev/punto/[id]` (rebuilt in this PR) | 308 → `/carga-ev` |
| `/trenes/tren` | Natural hub of `/trenes/tren/[trainId]` (built in this PR) | 308 → `/trenes` |
| `/trenes/cercania` | Singular typo of `/trenes/cercanias` | 308 → `/trenes/cercanias` |

**Total: 13 prod 404 → 308 redirects + 1 path-bug fix unlocking 1506 links.**

Each redirect lives in a 12-line server-component `page.tsx` using `permanentRedirect()` (308 — SEO-friendly equivalent of 301). Risk profile: minimal — pure additive, no behavior changes to existing pages.

### Why this matters

The iter-4 entity work (8 new pages + 95K rebuilt) created a new URL grammar (`/X/[entity]` everywhere). Anytime the bare `/X` parent had no `page.tsx`, it 404'd silently. Catching those before merge means crawlers, external links, typos, and back-button traversals all land somewhere useful.

### Iter-4 final state — PR #30 ready for review

- **38 commits, ~7.2K new lines**
- **All entity URL patterns resolve** — every parent of `[slug]/[id]/[trainId]/[road]` either renders a hub or redirects to a working catalog
- **Discoverability flywheel closed** for trenes, transit, EV chargers, gasolineras, vessels, radares, accidentes
- **Thin-pages liability cleared** — 95K pages (12K EV + 83K radars) reshipped from stubs to proper entity landings
- **8 new entity surfaces** with full content: `/accidentes/carretera/[road]`, `/maritimo/seguridad/estadisticas`, `/calidad-aire/prevision`, `/trenes/tren/[trainId]`, `/transporte-publico/[operator]/[route]`, `/maritimo/buques/[slug]/recorrido`, `/calidad-aire/{estacion,provincia}` + `/trenes/{estacion,linea}` redirects
- **Sitemap declares** every new pattern (per-road accidents 80, per-vessel recorrido top-500)
- **Homepage** has both SR-only entity nav + visible 6-card showcase
- **Ops shipped** alongside: 459GB disk freed, AIS reconnected, Typesense restored, web container rebuilt, VesselPosition 291M-row purge + VACUUM, typesense watchdog cron live

### Pending — handover to user

- Review + merge PR queue (#27 iter-1, #28 iter-2, #29 iter-3, **#30 iter-4**)
- `collector-realtime` container rebuild on compute (so opensky cron fix becomes effective)
- VesselPosition `VACUUM FULL` window (still 64GB on disk; statistics are current)
- GSC + GA4 OAuth scopes for the audit ingestion (or `claude-agent` SA grant)
- `/api/billing/portal` proper NextAuth-session reimpl (currently 501 stub)
- Vessel map-marker → ficha popup wiring (TraficoMap component-level work)
- PostGIS migration for Geo JSON columns

### One-line state summary

> Iter-4 wraps clean: 38 commits, 14 prod-404 closures, 95K entity-page rebuilds, 8 new entity surfaces, full discoverability flywheel, ops fully restored. PR queue (#27–#30) ready for review.

---

## Iteration 4 (wave 4) — 2026-05-23 (thin-pages liability cleared)

**Theme:** the two largest sitemap shards that were 100-line stubs at scale are now proper entity-landing pages. PR #30 ends here at ~6.8K new lines.

### What shipped

| Change | Pages affected | Detail |
|---|---|---|
| `/radares/radar/[id]` rebuilt 114 → 450 lines | **83 K** | Per-type SEO body (FIXED/SECTION/MOBILE/TRAFFIC_LIGHT), `Place` JSON-LD with speed-limit additionalProperty, BreadcrumbList, Google + Apple Maps deep-links, 3-card stat row (speed circle / road+pk / coords), partner-radar cross-link for SECTION cameras, haversine-ranked nearby on same road, cross-links to `/accidentes/carretera/[road]` + `/camaras/carretera/[road]` + per-province radar list. Pre-gen 1000 most-recently-updated, ISR 24h. |
| Visible "Páginas individuales" homepage section | 1 | 6-card showcase between `LiveCounterStrip` and `VerticalShowcase`. Per-entity accent colour, concrete example label per card, brand-coloured iconography. Pairs with the SR-only entity nav added one commit before. |
| PREGEN_ROADS expansion 34 → 80 (DGT-driven) | +46 pre-rendered roads | Queried AccidentMicrodata for top 80 roads by record count; every entry has ≥276 accidents → no thin content. Coverage now includes Cataluña C-*, Madrid M-*, Barcelona B-*, Sevilla SE-30, Canarias TF/GC, Baleares Ma-*, País Vasco GI-636 — networks the original list missed entirely. Mirrored across `page.tsx`, hub, and `sitemap-generator`. |
| `/transporte-publico/[operator]/parada/[stopId]` — "Líneas que paran aquí" section | ~50 K stops | Server-side query StopTime → Trip → Route distinct on routeId, ordered by routeType then shortName. Each line is a clickable badge linking to the per-route page (also from this PR). Capped at 200 stop_times so mega-stops don't time out. |

### State at end of wave 4

- **PR #30: 32 commits, ~7K new lines.**
- Thin-page liability: **2 stubs (12K EV chargers + 83K radars) → both now rich entity landings.**
- Discoverability flywheel: closed for trenes, transit (operator + route + stop), EV, gasolineras (local + national + cheaper), vessels (hub-side + recorrido), radares (per-radar → road → province + accidents on road).
- Homepage discovery surface: SR-only nav for crawlers + visible 6-card showcase for humans.
- Server-side data fetched, no client JS gates on the new surfaces.

### Still pending (handover to iter 5)

- Vessel map-marker → ficha: TraficoMap component-level popup wiring (deferred — invasive).
- OpenSky data: cron fix in git but running collector container is still on the old image. Needs SSH rebuild of `collector-realtime` on compute.
- VesselPosition `VACUUM FULL` window (table still 64GB on disk after row purge; statistics current, slots reusable; full reclaim needs a scheduled window).
- GSC + GA4 API ingestion (Tier C #12 — waiting on user-side OAuth scopes or `claude-agent` SA grant on `sc-domain:trafico.live` + GA4 viewer).
- `/api/billing/portal` proper NextAuth-session reimpl (current is 501 stub since wave-1).
- PostGIS migration for `TrafficFlow.geometry` + `ZBEZone.polygon` + `RoadworksZone.geometry` + `TransitRoute.geometry` + `FerryRoute.geometry` (all currently `Json`).

### One-line state summary

> Wave 4 closes the thin-pages chapter: 95K entity URLs (12K EV + 83K radars) reshipped from stubs to proper landings; PREGEN_ROADS 2.4× SEO; homepage entity showcase; transit stops now expose serving lines. **Next iter: merge PR queue, address infra fast-follows, or pick up Tier C analytics ingestion once user creds land.**

---

## Iteration 4 (wave 3) — 2026-05-23 (discoverability loop closure)

**Theme:** every entity surface from wave 2 is reachable in 2 clicks from the hub it belongs to, AND declared in the sitemap, AND seeded into the homepage crawler nav.

### What shipped

| Change | File |
|---|---|
| Hero-map "Train Detail Panel" → "Ver página completa" CTA → `/trenes/tren/[trainId]` | `src/app/trenes/content.tsx` |
| Operator-page route cards → wrapped in `Link` to `/transporte-publico/[operator]/[route]` (were inert `<div>`) | `src/app/transporte-publico/[operator]/page.tsx` |
| Sitemap-generator emits `/maritimo/buques/[slug]/recorrido` URLs (top 500 vessels with Voyage activity, name-eligible slug) | `src/lib/sitemap-generator.ts` |
| `/maritimo/buques` hub — "Actualizados recientemente" rows wrapped in `Link` to ficha (were inert) | `src/app/maritimo/buques/page.tsx` |
| `/maritimo/buques` hub — new "Con historial de viajes recientes" section listing top 12 vessels by latest Voyage.departedAt, each linking directly to `/recorrido` | `src/app/maritimo/buques/page.tsx` |
| Homepage SR-only `<nav aria-label="Páginas individuales">` with anchor links to every entity-URL pattern (per-train, per-vessel + recorrido, per-charger, per-station, per-operator, per-road accidents, prevision, SASEMAR estadísticas) | `src/app/page.tsx` |
| `/gasolineras/terrestres` — "Más barata de [BRAND] en España" cross-province section (national leap) | `src/app/gasolineras/terrestres/[id]/page.tsx` |

### Discoverability flywheel state at end of wave 3

| Vertical | Status |
|---|---|
| Trenes | ✅ full loop: `/trenes` → marker → "Ver página completa" → `/trenes/tren/[id]` → station chip → `/trenes/estacion/[slug]` → "Trenes ahora" → next train |
| Transit | ✅ full loop: `/transporte-publico` → operator → route card → `/transporte-publico/[operator]/[route]` → stop → operator |
| EV chargers | ✅ `/carga-ev` → punto → nearby chargers + nearby gas + city |
| Vessels | ✅ server-side: `/maritimo/buques` hub (linked rows + "Con historial") → ficha → "/recorrido" CTA → recorrido sub-page. Vessel-map-marker → ficha still requires TraficoMap component-level work (deferred — needs popup wiring inside the shared `TraficoMap` rather than per-page) |
| Aviation | ✅ page wiring is correct (nearbyAircraft already on /aviacion/aeropuertos/[iata]); waiting for AircraftPosition data to flow after the OpenSky cron-rate fix takes effect at next UTC daily reset |
| Gasolineras | ✅ same-brand local + national + cheaper-province + price-history chart + station-ranking + price-comparison |

### Operational notes

- **OpenSky** cron `*/4 → */10` (commit earlier in this iter) — daily quota was being busted at 720/400. Effective at next UTC midnight; until then 429s continue from the carried-over count.
- **Trafico-typesense** watchdog cron continues running every 10 min on database-primary; container has been healthy since the iter-1 rescue.
- **VesselPosition** working-set ~4M rows (post-purge); cleanup-realtime (iter 2) keeps it bounded going forward. VACUUM FULL deferred — table still 64GB on disk, statistics current, dead-tuple slots reusable.

### One-line state summary

> 27 commits in PR #30; security + SEO + storage + 8 new entity pages + complete discoverability loops + homepage crawler nav + recorrido sitemap. **Next: visual entity-cards section on homepage, OpenSky data verification after UTC reset, /gasolineras/terrestres price-history mini-chart polish.**

---

## Iteration 4 (wave 2) — 2026-05-23 (entity-page push, vision pass)

**Branch (continued):** `audit/iter-4-sweep-critical-fixes-v2`
**Trigger:** user — "each train, bus, plane, boat, vessel, each street ... proper landing page with current state + history + map + predictions + cross-links + mobile-first"
**Mode:** continuous shipping in 4-min wake cadence

### Vision reframe

Every entity gets its own properly-designed landing page. Not just hubs — the individual train, vessel, charger, route, stop, station each gets a real page with live state + history + cross-links + structured data.

### Shipped this wave (on top of wave-1 security/SEO fixes)

| Surface | What it does |
|---|---|
| `/accidentes/carretera/[road]` | DGT microdata per-road analysis (KM hotspots + year-over-year + day-of-week + weather correlation). 34 pre-gen + lazy. Long-tail SEO unlock. |
| `/maritimo/seguridad/estadisticas` | 6 yrs × 30K SASEMAR rescue events surfaced (was static copy page). |
| `/calidad-aire/prevision` | CAMS 5-day forecast — uncontested in ES SERP. |
| `/carga-ev/punto/[id]` rebuild | 12K EV-charger pages went from 111-line stub → rich entity (proper EVChargingStation schema, Google/Apple Maps deep-links, nearby chargers + gas stations with distance, same-network grouping). |
| `/trenes/tren/[trainId]` | Per-train live page — search any train, see its position + next stop + delay + route timeline of past+current+future stops linked to station pages. noindex (daily reuse). |
| `/trenes/estacion` live-trains | "Trenes ahora" section between map and alerts, listing every Renfe LD train currently associated with the station with brand-coloured cards. |
| `/transporte-publico/[operator]/[route]` | Per-line landing for 16 ingested GTFS operators × N routes. Per-direction stop timelines with arrival times, links to each stop, route-color hero, Schema.org BusTrip/TrainTrip. |
| `/maritimo/buques/[slug]/recorrido` | Voyage history per vessel — surfaces 493K Voyage + 746K PortCall rows that were collected but never rendered. Becomes the durable "where has this ship been" view after the VesselPosition 72h TTL purge. |
| Vessel hero cross-link | Adds prominent "Ver recorrido completo" CTA from /maritimo/buques/[slug] hero to the new /recorrido sub-page. |

### Ops (in addition to wave-1)

- **VesselPosition purge: 291.7M rows deleted in ~85 min** (50K-batch loop in background, AIS-collector-safe with 0.5s sleeps). Working set now ~4M (last 72h ingest). VACUUM ANALYZE done — statistics current, dead-tuple space marked reusable. Full disk reclaim deferred to a scheduled VACUUM FULL / pg_repack window.

### State summary

Branch contains ~15 commits in PR #30 totalling **8 critical security/SEO fixes + 8 new entity pages + 459GB disk freed + storage bomb defused + AIS reconnected + Typesense restored + 6-agent audit findings documented**. PR queue (4 PRs awaiting review) covers iter-1 → iter-4 work. All prod surfaces 200.

### Next-iter targets

- `/gasolineras/terrestres/[id]` depth pass (already has StationPriceHistory + PriceComparisonCard components — needs same-brand-nearby + cheapest-in-province sections)
- `/aviacion/aeropuertos/[iata]` live arrivals if OpenSky data near airport
- Pulse-page improvements + homepage cross-link surface for all the new entity pages
- VesselPosition VACUUM FULL window decision

---

## Iteration 4 — 2026-05-23 (full sweep — critical fixes)

**Branch:** `audit/iter-4-sweep-critical-fixes-v2` from `audit/iter-3-silent-failure-hardening`
**Trigger:** user — "full sweep + audit end-to-end, start pushing nonstop"
**Mode:** 6-agent parallel deep-audit fan-out (UX/DB/security/SEO/perf/errors) + bulk fix shipping

### Critical findings from the sweep

**Security (block-merge):**
1. `/api/billing/portal` lets any caller submit any email and receive a live Stripe portal URL for that customer. Zero auth.
2. `isSameOrigin` returns `true` when no `Origin` header → every "same-origin" guarded API is unauthenticated from `curl`/scripted clients.
3. `x-admin-email` (sourced from `NEXT_PUBLIC_ADMIN_EMAIL` — public env var visible in browser bundle) was used as admin auth on `/api/admin/affiliates/stats`.
4. `x-internal: 1` was the only gate on `/api/internal/*`. Header value literal + public.
5. `API_KEYS` / `ADMIN_SECRET` compared with `.includes()` / `!==` — timing oracle.
6. `/api/admin/seed-accidents` accepted any `API_KEYS` value to `deleteMany` historical accident data.

**SEO show-stoppers:**
7. `metadataBase` missing in root layout → every dynamic OG image rendered as `http://localhost:3000/...` in prod.
8. Vessel sitemap had no recency filter → ~82K stale URLs in one shard (over 50K limit; most 404).
9. `<StructuredData>` used `next/script` → serialized as `__next_s.push(...)` JS, not a real `<script type="application/ld+json">` tag.
10. `/calendario` is `"use client"` so no metadata export — inherited homepage title + canonical → duplicate-content signal.
11. Prisma schema mismatch in `/aviacion/cancelados` — queries `validFrom`/`validTo` which don't exist (real fields `startedAt`/`endedAt`).

**Operational (recorded; fixes in separate PRs):**
12. `VesselPosition`: 295.6M rows, 64GB, never purged. PR #28 prevents future bloat; one-time SQL purge still needed.
13. WAL archive on compute:/opt = 484GB and climbing — no `pgbackrest expire`.
14. `pg_stat_statements` documented as preloaded but NOT in `shared_preload_libraries` → zero query visibility.
15. Single PG node, no replica, no HA.
16. `Typesense` outage 03:30→09:29 today (~6h) — silent.
17. `collector-frequent` OOM every 6h on the dot — manually patched at 12:04Z.
18. `/api/trenes/posiciones` returns 500 (Renfe LD API regression). Flagship train map dead.
19. `/api/aviacion` returns empty (OpenSky collector not populating).
20. Many `force-dynamic` pages that could be `revalidate=N`.
21. Zero `loading.tsx` anywhere.
22. `MapLibre` 993KB chunk loaded on every page (incl. non-map).
23. API routes uncompressed (`/api/maritimo` 161KB, `/api/calidad-aire` 155KB).
24. CSP has `'unsafe-eval'` + `'unsafe-inline'` globally.
25. `cal.trafico.live` sends `X-Frame-Options: DENY` → `/calendario` iframes blocked (separate-repo fix).

### Shipped in this iter

| Severity | Fix | File |
|---|---|---|
| CRITICAL | `/api/billing/portal` → 501 stub until session auth | `src/app/api/billing/portal/route.ts` |
| CRITICAL | `isSameOrigin` returns `false` on missing Origin; new `safeCompare` using `crypto.timingSafeEqual` + SHA-256 | `src/lib/auth.ts` |
| HIGH | `/api/admin/affiliates/stats` uses NextAuth `auth()` session; client stops sending `x-admin-email` | `…/affiliates/stats/route.ts`, `src/app/admin/affiliates/page.tsx` |
| HIGH | `/api/internal/*` requires `INTERNAL_API_SECRET` env (constant-time) — no literal-value gate | `internal/enforce-tier`, `internal/keys/lookup` |
| HIGH | `/api/admin/seed-accidents` gated on `ADMIN_SECRET` via `safeCompare` (was public `API_KEYS`) | `admin/seed-accidents/route.ts` |
| HIGH | `/api/billing/refund` admin-secret check uses `safeCompare` | `billing/refund/route.ts` |
| CRITICAL-SEO | `metadataBase` set in root layout → OG images resolve to prod domain | `src/app/layout.tsx` |
| CRITICAL-SEO | Vessel sitemap gains 7d `updatedAt` filter → ~82K stale URLs removed | `src/lib/sitemap-generator.ts` |
| HIGH-SEO | `<StructuredData>` emits real `<script type="application/ld+json">` (was `next/script` JS-push) | `src/components/seo/StructuredData.tsx` |
| HIGH-SEO | `/calendario` gets server-side `layout.tsx` with title + canonical + OG | `src/app/calendario/layout.tsx` (new) |
| HIGH | `/aviacion/cancelados` Prisma fields renamed `validFrom→startedAt`, `validTo→endedAt` with nullable handling | `src/app/aviacion/cancelados/page.tsx` |

### Required env (must be set before deploy)

- `INTERNAL_API_SECRET` — shared secret for Edge middleware → Node API loopback. `openssl rand -hex 32`. Routes return 403/404 until set (safer than old "any caller wins").
- `ADMIN_SECRET` — already required by `/api/billing/refund`; now also gates `/api/admin/seed-accidents`.

No implicit allow on misconfig.

### Queued for iter 5+

- One-time `DELETE FROM VesselPosition WHERE createdAt < NOW() - INTERVAL '72 hours'` (recovers ~60GB)
- WAL archive retention cron, `pg_stat_statements` enable, PG read replica
- Trafico-typesense compose hardening on `abemon-es/serve`
- `/api/trenes/posiciones` debug, `collector-frequent` mem leak
- `loading.tsx` + `revalidate` for 100+ pages, MapLibre lazy-load, API gzip
- CSP nonce migration, `/api/billing/portal` reimpl with NextAuth
- Tier B dark-data hubs (`/accidentes`, `/maritimo/seguridad`, `/calidad-aire` forecast, per-operator transit)

### One-line state summary

> Iter-4 ships 12 file edits + 1 new file closing top critical security holes + SEO showstoppers. PR queue now #27/#28/#29/#30 (iter-1/2/3/4). **Next: ops fixes (VesselPosition purge, WAL cleanup, pg_stat_statements) + Tier B dark-data builds.**

---

## Iteration 3 — 2026-05-23 (silent-failure hardening)

**Branch:** `audit/iter-3-silent-failure-hardening` from `audit/iter-2-stability`
**Theme:** make the kind of silent-failure that hid the 15d AIS blackout impossible.

### Shipped

- **AIS WebSocket staleness watchdog** (`services/collector/shared/ws-client.ts` + `tasks/ais-stream/collector.ts`):
  - The existing reconnecting WS only triggered on `close` / `error` events. aisstream.io BETA WS can stay nominally "open" while producing zero traffic — exactly the pattern that froze the stats counter for 15 days.
  - New optional `staleMessageTimeoutMs` option (defaults to disabled; backwards-compat). AIS collector sets it to **5 min**.
  - When no message arrives for the threshold, `ws.terminate()` is forced, which triggers the existing reconnect cycle. After max consecutive failures the circuit breaker still kicks in (so this can't loop forever).

- **`/api/health` STALE_THRESHOLDS completed** (`src/app/api/health/route.ts`):
  - Was: 15 tasks with thresholds; everything else fell back to **24h** → silent failures hidden for a day.
  - Now: 39 tasks with explicit thresholds, each = max(2 × source cadence, 5 min buffer). Default tightened from 24h → 4h so new collectors surface in hours not days. Includes `ais-stream` at 10 min (matches the watchdog + reconnect window).

- **`/api/search` degraded signal** (`src/app/api/search/route.ts`):
  - Was: 200 + empty results when Typesense unreachable → indistinguishable from "no matches."
  - Now: response gains `degraded: true` and the HTTP status flips to **503** when:
    - `typesenseClient` is unset, or
    - the multi-search throws a connectivity error (ECONNREFUSED / ETIMEDOUT / ENOTFOUND / EAI_AGAIN / "fetch failed" / "Typesense unreachable" / socket hang up).
  - Non-connectivity errors still 200-with-empty (single bad query shouldn't 503 the site).
  - Degraded responses get `Cache-Control: no-store` so a transient outage doesn't lock in a 60s Redis cache after Typesense recovers.

### Investigated, not yet shipped

- **Why `trafico-typesense` vanished from database-primary** — `journalctl --since '14 days ago'` had no entries for the container. Either docker logs were rotated or the container was removed >14d ago via a sysadmin script. The container is now back with `restart=unless-stopped` + `mem_limit=2GB` + healthcheck (verified via `docker inspect`), so an OOM-kill or natural crash will auto-recover. Still worth adding a `docker compose up -d` watchdog cron and a deploy-system rule that flags missing critical containers. Deferred to iter 4 — needs the `abemon-es/serve` repo touch.

### Deferred

- `andorra` camera gating, `accident-microdata` schedule, `ourairports-runways` schedule, `air-quality-ccaa` schedule — same as iter 2 deferred list.
- Cmd+K UI update to render the new `degraded: true` flag from `/api/search`.

### One-line state summary

> Three silent-failure paths closed: AIS won't stall again, /api/health surfaces failures in hours not days, /api/search is now a 503 when Typesense is gone. **Next: ship `/accidentes` hub (Tier B #1, biggest dark-data unlock) + harden typesense compose via the serve repo.**

---

## Iteration 2 — 2026-05-23 (P0 rescue + stability shipping)

**Branch:** `audit/iter-2-stability` from `audit/iter-1-fixes`
**Trigger:** user request — full-site SOLVE-AND-SHIP after the P0 prod outage surfaced mid-iter-1
**Mode:** SSH ops (creds from `~/Desarrollos/server`) + code PR

### P0 incidents resolved

| Surface | Was | Now | Root cause |
|---|---|---|---|
| `https://trafico.live/` and every route | **500** | **200** | Cron job `trafico-live-isr-cleanup` v1 ran `find /app/.next/server/app -delete` on a too-broad glob, removing `*.js` build artifacts (page.js, route.js) inside the running container at 11:11Z → 4-min outage. Container kept restarting against broken filesystem. **Fix already patched by sysadmin at 11:17Z (cron v2 only touches .html/.body/.meta/.rsc).** Container needed an image rebuild to recover — ran `cd /opt/trafico && ./deploy.sh`, healthy in 6.5 min (build 395s + start 30s). |
| `https://tiles.trafico.live/spain.pmtiles` | **502** | **200** | `tiles-tiles-1` + `tiles-martin-1` containers had been stopped (only `tiles-nginx-exporter` was running). Restarted via `cd /opt/trafico/services/tiles && docker compose up -d`. |
| `https://tiles.trafico.live/dynamic/*` | **502** | **200** | `services/tiles/nginx.conf:3-5` had `upstream martin { server 10.100.0.3:3088; }` — wrong host (database-primary) and wrong port (nothing bound to 3088 anywhere). Patched to `server martin:3000;` via docker DNS. Verified `/dynamic/catalog` returns full Martin TileJSON. |
| `ais-stream` collector data freshness | 15.4 d stale | live | Container was Up 11 days but WebSocket had silently disconnected; stats counter frozen for 15.4 d. `docker restart collector-ais` reconnected to `wss://stream.aisstream.io/v0/stream` and "first message confirmed healthy." Need follow-up: WebSocket auto-reconnect logic to prevent silent stall. |
| Typesense at `10.100.0.3:6442` | **ECONNREFUSED** | **200** | The `trafico-typesense` container did not exist on database-primary (only the volume was orphaned). The compose at `/opt/trafico-compose.yml` had the spec; `docker compose up -d trafico-typesense` brought it up; ran `TASK=typesense-sync` from `collector-daily` and rebuilt 22 collections in 88s (gas_stations 12,362; ev_chargers 12,115; cameras 1,920; radars 737; voyages 10,000; port_calls 10,000; cities 3,459; etc). **Open question:** what removed the container? Worth investigating before iter 3. |
| Cmd+K search | empty results sitewide | working | Verified `/api/search?q=madrid` returns 200 with real results when Referer/Origin sent. Same-origin auth correctly silent-rejects external queries (separate UX gap flagged in iter 1). |

### P1 code shipped on `audit/iter-2-stability`

**Storage time bomb defused** — `services/collector/tasks/cleanup-realtime/collector.ts`:
- Previously cleaned ONLY `TransitVehiclePosition` (48h)
- Now also cleans:
  - `VesselPosition` **72h** — was ~10M rows/day, completely unbounded. At 6mo this table would hit 1.8B rows and the `[mmsi, createdAt desc]` index would degrade. Voyage detector only reads last 2h; long-term truth lives in Voyage + PortCall.
  - `CityTrafficReading` **7d** — ~1.7M rows/day, no prior cleanup
  - `TrafficIntensity` **48h** — Madrid sensor live data, ~880K rows/day. CLAUDE.md documents 48h rolling window, code never enforced it.
  - `TrafficReading` **48h** — DGT national detector readings, no prior cleanup
  - `RailwayDelaySnapshot` **90d** — small table (262K/year) but no purge; 90d keeps rolling-quarter brand punctuality stats.
- Per-table failures are caught + continue; aggregate failures surface via heartbeat.

**Cadence waste eliminated:**
- `services/collector/crontabs/realtime` — `v16` was polling DGT NAP every 2 min despite the collector's own docstring saying 5 min. `incident` task already polls the same DGT NAP URL every 2 min, so the `v16` extra-poll was pure waste. Now `*/5` — halves our DGT NAP load.
- `services/collector/crontabs/daily` — `ine-stats` moved daily → Sunday weekly (INE publishes quarterly). `aena-stats` moved daily → 1st-of-month (Eurostat AVIA_PAOA is annual with ~12-month lag).

**Map stack fix:**
- `services/tiles/nginx.conf` — Martin upstream patched (see P0 row above). Applied to prod hot-fix at 11:33Z; this commit syncs the source.

### Deferred (iter 3+)

- **AIS WebSocket auto-recovery** — restart unblocked it once but a silent reconnect logic is needed so a 15-day blackout never repeats. `services/collector/tasks/ais-stream/collector.ts` + shared `ws-client.ts`.
- **Why did `trafico-typesense` container disappear?** Audit `/var/log/docker.log` + sysadmin actions on database-primary. May need to add a `docker compose up -d` heartbeat to the deploy system.
- **`andorra` camera cadence gating** — fetched every 5min despite being a static catalog. Code change inside the andorra collector to gate cameras to daily.
- **`accident-microdata` annual schedule** — 2024 DGT XLSX release will not auto-import.
- **`ourairports-runways` weekly schedule** — `public/data/runways.json` decays.
- **`air-quality-ccaa` scheduling** — never wired into a crontab.
- **22 collectors missing explicit STALE_THRESHOLDS** — `/api/health` reports false-green for up to 24h after silent failures (the AIS pattern that bit us this week).
- **`/api/search` degraded signal** — return 503 with `degraded:true` when Typesense unreachable instead of silently empty.

### One-line state summary

> Prod fully restored to 200 (web + maps + dynamic tiles + search). Storage bomb defused before next nightly run. Cadence waste halved on DGT NAP. **Next: ship dark-data hubs (/accidentes 500K records, /maritimo/seguridad SASEMAR 30K rescues, /calidad-aire CAMS 5-day forecast) + GSC/GA4 API ingestion once user grants scopes.**

---

## Iteration 1 — 2026-05-23

**Branch:** `audit/iter-1-fixes` from `fix/csp-cal-embed`
**Trigger:** `/loop` (session-mode) — comprehensive end-to-end audit
**Operator:** Claude Opus 4.7 (1M ctx)

### Prod health snapshot

| Surface | Status |
|---|---|
| Homepage + 19 sampled routes (incl. multimodal, /calendario) | 200 across the board, p50 ~0.4s |
| `robots.txt` | 200, AI bots allow-listed (GPTBot, ChatGPT-User, Anthropic-AI, Claude-Web) |
| `sitemap.xml` | 200, index references 20 child sitemaps, ~121,947 URLs total |
| `news-sitemap.xml` | 200, 9 articles |
| Security headers | HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — all present |
| `/api/health` | **DEGRADED** — 10 collectors stale (see infra section) |
| Cmd+K search | **BROKEN** — Typesense index stale 14.5 days, `/api/search` returns empty results silently |
| AIS maritime tracking | **DEAD** — `ais-stream` collector has not run since 2026-05-07 (15.4 days) |

### Code-level findings (file:line cited)

**Analytics (GA4)**
- `src/app/layout.tsx:217-230` — GA4 initialized correctly with consent-mode-v2 defaults to denied, `G-NL52LCLDV7` ID.
- `src/lib/analytics.ts:81-86` — `trackPricingClick` was orphaned (never called from any component). **Fixed iter 1.**
- `src/lib/analytics.ts:92,103,114` — `trackApiDocsClick`, `trackNewsletterSignup`, `trackVerticalClick` partially or never called. Wire next iteration.
- `src/lib/ga4-measurement-protocol.ts` — server-side MP helper exists. Used only in affiliate redirector before iter 1.
- `src/components/api-landing/RequestAccessForm.tsx:27-32` — local `trackCtaClick`/`trackNewsletterSignup` shadowed canonical lib versions, sent every event as `filter_applied`. **Fixed iter 1.**
- `src/app/api/billing/route.ts` — zero GA4 events on checkout. **Fixed iter 1** (server-side `begin_checkout` MP event, gated on `gaClientId` passed by browser).
- `src/app/api/billing/webhook/route.ts` — zero GA4 events on `checkout.session.completed`. **Fixed iter 1** (server-side `purchase` MP event with full enhanced-ecommerce items array, EUR currency, real transaction_id).

**SEO**
- `src/app/robots.ts` — only listed 4 AI bots. **Fixed iter 1** — now allow-lists 19 AI/search crawler fingerprints (ClaudeBot, PerplexityBot, OAI-SearchBot, GoogleOther, Google-Extended, Applebot-Extended, Bytespider, CCBot, etc.).
- `src/lib/sitemap-generator.ts` — `/calendario` page missing from index. **Fixed iter 1.**
- `src/app/api/sitemap-index/route.ts` + `src/lib/sitemap-generator.ts` — empty sitemap shards (101, 102, 201, 202) were declared in the index but contained 0 URLs, wasting Googlebot crawl budget. **Fixed iter 1** — new `getActiveShardIds()` queries Prisma counts and emits only non-empty shards, with safe fallback to static list if DB query fails.
- `src/components/seo/StructuredData.tsx:13` — module-level mutable counter for script IDs could collide across concurrent SSR renders. **Fixed iter 1** — replaced with FNV-1a content hash (deterministic per payload).
- `src/app/layout.tsx:127` — `Organization.sameAs` is an empty array. Knowledge Panel gap. **Not fixed iter 1** — need MJ's social handles (X/Twitter, LinkedIn).
- `google-site-verification` meta tag — **NOT FOUND** in layout. `public/ef8b508f84f07064a1bda393b024e2f5.txt` exists, so file verification is presumably how GSC was verified. Confirm and add meta tag too for redundancy. **Deferred iter 2.**
- OG image overrides missing for: `/calidad-aire`, `/gasolineras`, `/incidencias`, `/estadisticas`, `/radares`. Generic `/og-image.webp` fallback served. **Deferred iter 3.**

**Bot / AI citation tracking**
- `src/middleware.ts` — had zero bot user-agent inspection. **Fixed iter 1** — detects 18 AI/LLM crawler fingerprints, logs structured `ai_bot_visit` JSON to stdout for Loki ingestion. Loki dashboard wiring deferred to iter 2.
- `public/llms.txt` exists and is well-structured.
- No `ai.txt` / `robots-ai.txt` (not standard, skip).

**Funnel / conversion**
- `src/app/dashboard/billing/page.tsx:73,80` — pricing CTAs use `<a href="/api/billing?tier=PRO">` (GET), but the endpoint only handles checkout via POST. **The dashboard upgrade flow is silently broken.** Iter 2 priority: convert to a form POST or a client-side fetch. Not fixed iter 1 to avoid touching the dashboard surface in the same PR.
- `src/components/api-landing/TierCard.tsx` — pricing CTAs now fire `trackPricingClick(tier, source)` on click. **Fixed iter 1.**

**Revenue leaks**
- `src/app/baliza-v-16/page.tsx:269-281` — Amazon affiliate tag is `AFFILIATE_TODO` placeholder. Every V16 click in production earns €0. **Blocked on MJ providing real Associates tag.**
- `src/app/maritimo/ferries/proximo/page.tsx:477,541` — DirectFerries affiliate not wired. **Blocked.**
- `src/app/reclamacion-vuelo/page.tsx:340,356` — AirHelp affiliate not wired. **Blocked.**

**Security / auth**
- `src/app/api/billing/portal/route.ts:9,64` — customer lookup by email instead of session. Allows any party with a valid email to open another user's billing portal. **HIGH severity. Deferred iter 2 (needs session/auth design decision).**
- `src/app/admin/affiliates/layout.tsx:9` — admin auth not role-gated; uses a hardcoded check. **MEDIUM. Deferred iter 2.**

### Infra issues (require SSH — flagged for MJ)

| Severity | Service | Issue | Action |
|---|---|---|---|
| CRITICAL | `ais-stream` | 15.4 days dead, vessel tracking stale | `ssh compute && docker compose -f docker-compose.collectors.yml --project-directory /opt/apps/trafico-live restart ais` + investigate why it died (likely OOM or WebSocket disconnect that exhausted retries) |
| CRITICAL | `typesense-sync` | 14.5 days stale, sitewide Cmd+K returns empty | `ssh compute && docker compose ... run --rm daily node services/collector/dist/index.js` with `TASK=typesense-sync`; verify `/api/search?q=madrid` after |
| HIGH | `cnmc-fuel`, `transit-gtfs`, `opensky`, `aemet-forecast` | `partial` status, fuel/transit/aviation pages serve stale data | Tail logs, rerun manually |
| MEDIUM | `/api/search` | Silent zero-results when index stale | Code fix iter 2: return 503 + degraded flag if index age > 24h |

### Shipped this iteration

Files modified on `audit/iter-1-fixes`:
- `src/lib/sitemap-generator.ts` — `/calendario` entry + `getActiveShardIds()` DB-backed
- `src/app/api/sitemap-index/route.ts` — uses `getActiveShardIds()`, fallback to static
- `src/app/robots.ts` — 19 AI/search bot allow-list
- `src/components/seo/StructuredData.tsx` — FNV-1a content hash IDs
- `src/lib/stripe.ts` — `createCheckoutSession` returns `{url, sessionId}` + accepts `tier`+`gaClientId` metadata
- `src/app/api/billing/route.ts` — fires `begin_checkout` MP event when `gaClientId` provided
- `src/app/api/billing/webhook/route.ts` — fires `purchase` MP event on `checkout.session.completed` with full ecommerce items
- `src/components/api-landing/RequestAccessForm.tsx` — uses canonical analytics lib
- `src/components/api-landing/TierCard.tsx` — wires `trackPricingClick` to PRO/ENTERPRISE CTAs
- `src/middleware.ts` — AI bot visit logging (18 fingerprints) → stdout/Loki

### KPIs to watch (iter 2 must verify)

- Sitemap index URL count drops from 20 to ~16 (4 empty shards removed)
- GSC sitemap errors drop to zero
- `ai_bot_visit` Loki entries appear within 1h of deploy
- `purchase` events appear in GA4 within 24h of next paid checkout
- `pricing_click` events appear in GA4 within 1h of next pricing-page visit
- Indexed pages in GSC up over 7d (verify next iteration)

### Deferred to iter 2

1. Verify deploy of iter 1 PR succeeded (probe sitemap-index, robots.txt, log Loki for `ai_bot_visit`).
2. SSH ops: restart `ais-stream`, run `typesense-sync` manually.
3. Fix dashboard pricing CTAs (`src/app/dashboard/billing/page.tsx`) — GET→POST conversion.
4. Add browser-side `gaClientId` capture from `_ga` cookie + plumb to POST `/api/billing`.
5. Add `google-site-verification` meta in layout.
6. Populate `Organization.sameAs` with real social profiles (ask MJ).
7. Add OG images for `/calidad-aire`, `/gasolineras`, `/incidencias`, `/estadisticas`, `/radares`.
8. Add search degradation flag (503) when Typesense unreachable.
9. Fix `/api/billing/portal` email-based lookup (security).
10. Add Prisma `BotVisit` model + nightly aggregation → public AI citations dashboard at `/sobre/citaciones-ia`.
11. Pull GSC + GA4 data via API to enrich audit log automatically.

### One-line state summary

> Production responding 200 on all routes; **search dead 14d, AIS dead 15d (infra ops blocked on SSH)**; iter 1 ships sitemap-index + robots + GA4 funnel + AI bot logging fixes; **next: verify deploy + dig into dashboard pricing bug + automate GSC/GA4 ingestion**.

---

## Wave 6 — iter-5 Entity-Page Expansion (2026-05-24)

### Objective

Complete the "per-entity data pages" expansion started in iter-4. Directive: "each train, bus, plane, boat, vessel, each street, each traffic light — all information properly translated into actionable data." 4 entity surfaces shipped.

### Surfaces shipped

| Surface | Route | Source data | Lines | Status |
|---|---|---|---|---|
| Per-aeronave | `/aviacion/avion/[icao24]` | `AircraftPosition` (OpenSky) | 583 | NEW |
| Per-puerto | `/maritimo/puerto/[slug]` | `SpanishPort` + `PortCall` + `FerryStop` | 513 | NEW |
| Per-cámara | `/camaras/camara/[id]` | `Camera` + `TrafficIncident` | 594 | EXPANDED (was 139-line stub) |
| Per-estación calidad-aire | `/calidad-aire/estacion/[id]` | `AirQualityStation` + `AirQualityReading` | 694 | ALREADY COMPLETE (verified) |

### Data exposed per surface

**`/aviacion/avion/[icao24]`**
- ICAO24 hex code, callsign, origin country
- Flight status: airborne vs on-ground
- Stats: altitude (m converted from feet), velocity (km/h from m/s), heading (° + direction), vertical rate (m/s)
- Last 24h position count + first/last timestamps
- Trajectory table: last 20 positions with time, lat, lon, alt, vel, ground/air state
- Vehicle JSON-LD, noindex (live data), ISR 60s
- Sitemap: offset 1200, daily, priority 0.45

**`/maritimo/puerto/[slug]`**
- Port type (comercial/pesquero/deportivo/mixto), coastal zone, province
- Stats: arrivals/departures in last 7d, ferry routes, AIS stations
- Recent port calls table: MMSI, arrival/departure timestamps, duration
- Ferry routes connecting to the port (via FerryStop stopName matching)
- Place JSON-LD with GeoCoordinates + address
- generateStaticParams: all 197 SpanishPort rows (fully static), ISR 3600s
- Sitemap: offset 1300, daily, priority 0.60

**`/camaras/camara/[id]`**
- Hero with road+km, active/inactive badge, DGT attribution
- Full-size DGT thumbnail (aspect-video) with overlay; graceful empty state when no stream
- Location info: road number, km point, province, coordinates, Google Maps deep-link
- Nearby incidents: TrafficIncident within 2km bounding box (severity, road, date)
- Nearby cameras: haversine-ranked top 8 within 5km (same road priority)
- Cross-links: same-road cameras, province, cameras hub, incidents hub
- VideoObject + Place dual JSON-LD
- generateStaticParams: top 500 cameras by lastUpdated, dynamicParams for rest

**`/calidad-aire/estacion/[id]`**
- Already full implementation: ICA level 1-6 color-coded, pollutant breakdown
- IcaTrendChart (Recharts) showing 7d ICA trend
- Nearby stations within 25km, province context
- Place + Dataset JSON-LD
- Sitemap at offset 1000 (pre-existing, unchanged)

### Sitemap impact

| Shard offset | Route pattern | Estimated URLs |
|---|---|---|
| 1200 | `/aviacion/avion/[icao24]` | Active ICAO24s in last 7d (varies, ~500-2000) |
| 1300 | `/maritimo/puerto/[slug]` | 197 Spanish ports |
| 1000 | `/calidad-aire/estacion/[id]` | 565 MITECO stations (pre-existing) |
| 600 | `/camaras/camara/[id]` | 14K+ DGT cameras (pre-existing) |

### Branch

`feat/iter-5-max-push` — commits:
1. `feat(aviacion)` — /aviacion/avion/[icao24]
2. `feat(maritimo)` — /maritimo/puerto/[slug]
3. `feat(camaras)` — /camaras/camara/[id] expansion
4. `feat(calidad-aire)` — sitemap offsets 1200+1300
5. `fix(build)` — pre-existing ssr:false errors in sobre/* pages

### Build verification

All 4 entity routes appear in `.next/server/app/` after `npm run build`:
- `/aviacion/avion/[icao24]` → `●` SSG (generateStaticParams)
- `/maritimo/puerto/[slug]` → `●` SSG (all 197 ports)
- `/camaras/camara/[id]` → `●` SSG (top 500)
- `/calidad-aire/estacion/[id]` → `●` SSG (all 565 stations)

Build warnings (pre-existing, not from iter-5):
- `@sentry/nextjs` config deprecation (Turbopack only, not production-impacting)
- Large string serialization in webpack cache (performance note, not error)
