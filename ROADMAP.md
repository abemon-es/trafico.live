# trafico.live — Product Roadmap

> Standalone traffic intelligence platform for Spain.
> Domain: trafico.live (Cloudflare) | Infra: Coolify on Hetzner | Repo: abemon-es/trafico.live

---

## Phase 0: Brand Independence ✅ COMPLETE (2026-03-24)

### 0.1 — Rebrand & Domain Setup ✅
- [x] Buy domain trafico.live (Cloudflare)
- [x] Create Coolify project "trafico-live" (ID: 10)
- [x] New brand identity: blue (#2563eb) / amber (#f59e0b), SVG logo, favicon, OG image
- [x] Update all metadata, OG tags, structured data → trafico.live
- [x] Update middleware: redirect old domains → trafico.live
- [x] Remove all Logistics Express references (0 occurrences)
- [x] DNS: A + CNAME + MX + SPF + DKIM + DMARC + GSC TXT (10 records)
- [x] Deploy on Coolify under new project
- [x] 301 redirects: trafico.logisticsexpress.es → trafico.live, www → apex
- [x] GA4 property updated (521333149, G-NL52LCLDV7)
- [x] GSC verified (sc-domain:trafico.live, siteOwner) + sitemap submitted (988 URLs)
- [x] SES domain verified + DKIM verified
- [x] Email routing: hola@trafico.live → mj@blue-mountain.es
- [x] Repo moved to abemon-es/trafico.live

### 0.2 — Fix Broken Features ✅
- [x] Fix font bug (Geist Sans now properly used)
- [x] Fix broken logo.png reference in structured data
- [x] Replace hardcoded hex colors with design tokens (tl-* palette)
- [x] Fix collector Docker network (logistics)
- [x] Rebuild collector images for new repo
- [x] Fix Coolify env var encryption (recreated cleanly)
- [ ] Fix EV charging pages (some routes may 404)
- [ ] Fix ZBE pages (some routes may 404)

---

## Phase 0.5: Legal & Compliance ✅ COMPLETE (2026-03-25)

### 0.5.1 — Repo Documentation ✅
- [x] Proper README.md (project description, setup, architecture)
- [x] Proprietary LICENSE (all rights reserved)
- [x] CHANGELOG.md (from git history)
- [x] SECURITY.md + `.well-known/security.txt` (RFC 9116)
- [x] GitHub templates (issue bug/feature, PR template)

### 0.5.2 — Legal Pages (LSSI-CE + GDPR/LOPDGDD) ✅
- [x] `/aviso-legal` — identification, conditions, IP, liability
- [x] `/politica-privacidad` — data controller, GDPR rights, data sources, retention
- [x] `/politica-cookies` — cookie inventory, consent mechanism, browser instructions
- [x] Cookie consent banner with accept/reject (gates GA4 behind consent)
- [x] GA4 loads only after explicit user consent (GDPR compliant)
- [x] "Gestionar cookies" button in footer to revoke consent
- [x] Legal links in footer (Aviso legal, Privacidad, Cookies)

---

## Phase 1: SEO Foundation ✅ COMPLETE (2026-03-25)

### 1.1 — Technical SEO Fixes ✅
- [x] Convert homepage from pure CSR → hybrid SSR (hero + stats SSR, map CSR)
- [x] Add `<link rel="canonical">` on all pages (45+ pages updated)
- [x] Switch `force-dynamic` → ISR (`revalidate = 120-3600`) on 35+ pages
- [x] Lazy-load heavy components (recharts, maplibre-gl) via next/dynamic

### 1.2 — High-Volume Landing Pages ✅ COMPLETE
- [x] `/precio-gasolina-hoy` — daily prices, province breakdown, 30d chart, FAQ schema
- [x] `/precio-diesel-hoy` — same for diesel
- [x] `/radares` — top-level dedicated radar map page + `/radares/[road]`
- [x] `/camaras/[city]` — per-city camera pages
- [x] `/zbe/[city]` — per-city ZBE pages with FAQ + AdministrativeArea schema
- [x] `/gasolineras/baratas/[city]` — cheapest per city

### 1.3 — DGT-Stolen Features (mostly done)
- [x] `/operaciones` — Operaciones especiales + seasonal campaign pages
- [x] `/restricciones` — Heavy vehicle + seasonal circulation restrictions
- [x] `/puntos-negros` — Accident black spots with FAQ schema + province breakdown
- [x] `/ciclistas` — Cyclist safety page with risk zones, regulations, FAQ schema

### 1.4 — Internal Linking & Structured Data ✅
- [x] Build internal link mesh: RelatedLinks component on 16+ pages
- [x] Add breadcrumbs on ~30 pages via Breadcrumbs component
- [x] FAQ sections with `FAQPage` schema on 10+ high-value pages
- [x] `GasStation` + `LocalBusiness` schema on station pages
- [x] `Place` + `amenityFeature` on EV charger pages (electrolineras/[city])
- [x] `City`/`Place` with `geo` on city pages (ciudad/[slug], trafico/[city], zbe/[city])

---

## Phase 2: Monetization Foundation ⏳ PARTIALLY DONE

### 2.1 — Ad Infrastructure (ready for ad network)
- [x] Ad placements: sidebar desktop, between-section mobile, sticky footer
- [x] Lazy-load ads below fold (IntersectionObserver + Suspense)
- [x] AdSlot component with data attributes for ad network targeting
- [ ] Sign up and integrate Setupad or Ezoic (needs account — not a code task)

### 2.2 — Affiliate Widgets ✅ BUILT
- [x] AffiliateWidget component: insurance, fuel-card, ev-charger, ITV types
- [x] Placed on precio-gasolina-hoy, precio-diesel-hoy, gasolineras pages
- [ ] Replace placeholder CTAs with real affiliate links (needs partner signups)

### 2.3 — Sponsored Listings
- [ ] "Destacada" badge system for gas stations
- [ ] Featured EV charger networks

---

## Phase 3: Programmatic Scale ✅ MOSTLY COMPLETE (2026-03-25)

### 3.1 — Massive Page Generation ✅
- [x] Per-station pages for 11,742+ gas stations with paginated sitemap
  - Full schema: GasStation + LocalBusiness + GeoCoordinates + Offer
  - Price history chart, 5 nearest alternatives, comparison
  - ISR with 1h revalidation
- [x] Per-municipality pages (~8,000) with paginated sitemap
  - Template: local stats (stations, cameras, radars, incidents, EV chargers)
  - City/Place schema with geo coordinates
  - ISR with 1h revalidation
- [ ] Road segment pages: per-province breakdowns for major roads

### 3.2 — Blog / Editorial ✅ COMPLETE (TSX-based, not MDX)
- [x] `/blog` section with article grid + per-article pages
- [x] 6 articles: Semana Santa 2026, Nuevos radares DGT, Baliza V16, ZBE guía, Diesel o gasolina, Ahorrar gasolina
- [x] Seasonal + evergreen content mix
- [ ] Target: 2-4 articles/month for Google Discover (ongoing)

---

## Phase 4: Product Features ⏳ MOSTLY BUILT

### 4.1 — User Engagement ✅ CORE BUILT
- [x] PWA manifest + offline page
- [x] Price alert subscriptions: API (POST /api/price-alerts) + UI (PriceAlertForm) + unsubscribe
- [ ] Push notifications: browser Web Push API (needs VAPID keys)
- [ ] Saved routes with incident notifications

### 4.2 — Route Cost Calculator ✅ BUILT
- [x] `/calculadora` — fuel cost calculator with vehicle type
- [ ] Toll cost integration (autopistas AP-*)
- [ ] Compare: gasolina vs diesel vs eléctrico per route
- [ ] Export to Google Maps / Waze

### 4.3 — Professional Tier (€19-49/mo)
- [x] `/profesional` portal with fleet-focused pages
- [x] `/profesional/diesel` — diesel monitoring
- [x] `/profesional/restricciones` — circulation restrictions
- [x] `/profesional/areas` — service areas
- [ ] Stripe integration for subscriptions
- [ ] Fleet dashboard (multi-vehicle monitoring)

### 4.4 — API / Data Products ✅ CORE BUILT
- [x] 50+ API routes (fuel prices, stations, incidents, cameras, radars, weather, etc.)
- [x] `/api-docs` documentation page
- [x] Rate limiting (100/60s standard, 30/60s expensive, 10/60s strict)
- [x] API key authentication on all /api/* routes
- [ ] Tiered pricing (Free/Pro/Enterprise) — needs Stripe
- [ ] Embeddable widgets: fuel price ticker, traffic status badge

---

## Phase 5: Growth & Moats (months 4-12)

### 5.1 — AI Features
- [ ] Natural language traffic summaries: "Resumen del tráfico en Madrid ahora"
- [ ] Incident prediction from historical + weather data
- [ ] Google Discover AI summaries

### 5.2 — Mobile
- [ ] PWA with full offline capability
- [ ] Evaluate native app if engagement metrics justify

### 5.3 — Community
- [ ] User-reported incidents (Waze-style, web-based)
- [ ] Verified reporter badges

### 5.4 — Expansion
- [ ] Portugal traffic data
- [ ] Multi-language: English for tourists/expats
- [ ] Andorra, Gibraltar border crossing times

---

## Revenue Projections

| Phase | Timeline | Monthly Revenue | Driver |
|-------|----------|----------------|--------|
| Phase 0 ✅ | Done | €0 | Brand independence |
| Phase 0.5 ✅ | Done | €0 | Legal compliance + repo docs |
| Phase 1 ✅ | Done | €0 | SEO foundation + DGT stolen features |
| Phase 2 ⏳ | Blocked on signups | €0 | Ad slots ready, need Setupad/affiliate accounts |
| Phase 3 ✅ | Done | €0 | 20K+ programmatic pages indexed |
| Phase 4 ⏳ | Core built | €0 | Need Stripe for paid tiers |
| Phase 5 | Months 4-12 | €15,000+ | Community + mobile + expansion |

---

## Key Metrics

- **SEO:** Indexed pages, organic sessions, keyword rankings (precio gasolina, radares DGT, cámaras tráfico)
- **Engagement:** Pages/session, return rate, time on site
- **Revenue:** RPM, affiliate conversions, pro tier signups, API calls
- **Data:** Collector freshness, station coverage, incident latency

---

## Remaining Blitz Sessions

Updated to reflect actual state. Only remaining work listed.

| # | Session | Phase | Depends | Est. |
|---|---------|-------|---------|------|
| S01 | `seo-remaining-fixes` | 1.1 | — | 1h |
| S05b | `ciclistas-page` | 1.3 | — | 1h |
| S06b | `ev-city-schema` | 1.4 | — | 0.5h |
| S07 | `ad-infrastructure` | 2.1 | — | 1h |
| S08 | `affiliate-widgets` | 2.2-2.3 | S07 | 1h |
| S09 | `programmatic-stations` | 3.1a | — | 2h |
| S10 | `programmatic-municipalities` | 3.1b | S09 | 2h |
| S12 | `pwa-notifications` | 4.1 | — | 1.5h |
| S13 | `route-calculator` | 4.2 | — | 2h |
| S14 | `professional-tier` | 4.3 | S13 | 2h |
| S15 | `public-api` | 4.4 | S14 | 1.5h |

### Parallel Groups

- **Group A:** S01, S05b, S06b, S07 (all independent)
- **Group B:** S08 (after S07)
- **Group C:** S09, S12, S13 (independent)
- **Group D:** S10, S14 (after S09/S13)
- **Group E:** S15 (after S14)
