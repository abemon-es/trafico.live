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

### 0.2 — Fix Broken Features
- [x] Fix font bug (Geist Sans now properly used)
- [x] Fix broken logo.png reference in structured data
- [x] Replace hardcoded hex colors with design tokens (tl-* palette)
- [x] Fix collector Docker network (logistics)
- [x] Rebuild collector images for new repo
- [x] Fix Coolify env var encryption (recreated cleanly)
- [ ] Fix EV charging pages (some routes may 404)
- [ ] Fix ZBE pages (some routes may 404)

---

## Phase 1: SEO Foundation (weeks 1-2)

### 1.1 — Technical SEO Fixes
- [ ] Add `<link rel="canonical">` on all pages + aliased routes
- [ ] Convert homepage from pure CSR → hybrid SSR (hero + stats SSR, map CSR)
- [ ] Switch `force-dynamic` pages to ISR (`revalidate = 3600`) where data is slow-changing
- [ ] Improve Core Web Vitals: lazy-load below-fold, optimize LCP

### 1.2 — High-Volume Landing Pages
- [ ] `/precio-gasolina-hoy` — daily prices, province breakdown, 30d chart (~150K/mo searches)
- [ ] `/precio-diesel-hoy` — same for diesel (~90K/mo)
- [ ] `/radares` — top-level dedicated radar map page (~35K/mo)
- [ ] `/camaras/[city]` — per-city camera pages for top 20 cities
- [ ] `/zbe/[city]` — per-city ZBE pages for ZBE cities (~30K/mo)
- [ ] `/gasolineras/baratas/[province]` — cheapest per province

### 1.3 — DGT-Stolen Features (high SEO impact)
- [ ] `/operaciones` — Operaciones especiales: Semana Santa, puentes, operación salida/retorno calendar
- [ ] `/restricciones` — Heavy vehicle + seasonal circulation restrictions by date/road
- [ ] `/puntos-negros` — Accident black spots map (we have HistoricalAccidents + RiskZone data)
- [ ] `/ciclistas` — Safe cycling routes from DGT data

### 1.4 — Internal Linking & Structured Data
- [ ] Build internal link mesh: road→cameras, province→fuel, city→ZBE/EV/fuel
- [ ] Add breadcrumbs to all pages (currently only road detail)
- [ ] Add FAQ sections with `FAQPage` schema on high-value pages
- [ ] `GasStation` + `LocalBusiness` schema on station pages
- [ ] `Place` + `amenityFeature` on EV charger pages
- [ ] `City`/`Place` with `geo` on city pages

---

## Phase 2: Monetization Foundation (weeks 3-4)

### 2.1 — Ad Infrastructure
- [ ] Integrate Setupad or Ezoic (not vanilla AdSense)
- [ ] Ad placements: sidebar desktop, between-section mobile, sticky footer
- [ ] Lazy-load ads below fold for CWV

### 2.2 — Affiliate Widgets
- [ ] Car insurance comparison widget on `/profesional` pages (CPC €4-12)
- [ ] Fuel card comparison (Solred, Repsol) on `/profesional/diesel` (€10-30/signup)
- [ ] EV home charger affiliate (Wallbox) on `/carga-ev` pages (€15-50/lead)

### 2.3 — Sponsored Listings
- [ ] "Destacada" badge system for gas stations
- [ ] Featured EV charger networks

---

## Phase 3: Programmatic Scale (weeks 5-8)

### 3.1 — Massive Page Generation
- [ ] Per-station pages for 11,742+ gas stations
  - Template: "Gasolinera [Brand] en [City] — Precio hoy €X.XX"
  - Each page: price history chart, 5 nearest alternatives, route from highway
  - Target: 64K+ indexed keywords
- [ ] Per-municipality pages (~8,000): local fuel, nearest cameras, ZBE, incidents
- [ ] Road segment pages: per-province breakdowns for major roads

### 3.2 — Blog / Editorial
- [ ] `/blog` section with MDX support
- [ ] Seasonal: "Tráfico Semana Santa 2026", "Operación salida verano", "Nuevos radares DGT 2026"
- [ ] Evergreen: "Cómo funciona la baliza V16", "Guía ZBE España", "Mejores apps tráfico"
- [ ] Target: 2-4 articles/month for Google Discover

---

## Phase 4: Product Features (weeks 8-16)

### 4.1 — User Engagement
- [ ] PWA manifest + offline radar/camera data
- [ ] Push notifications: "Diesel baja de €1.30 en tu provincia"
- [ ] Price alert subscriptions (free tier: 1 alert)
- [ ] Saved routes with incident notifications

### 4.2 — Route Cost Calculator
- [ ] A→B planning with real-time fuel cost by vehicle type
- [ ] Toll cost integration (autopistas AP-*)
- [ ] Compare: gasolina vs diesel vs eléctrico per route
- [ ] Export to Google Maps / Waze

### 4.3 — Professional Tier (€19-49/mo)
- [ ] Fleet diesel price monitoring dashboard
- [ ] Multi-vehicle ZBE compliance checker
- [ ] Incident notifications via webhook/email
- [ ] Route cost API for fleet planning
- [ ] Stripe integration for subscriptions

### 4.4 — API / Data Products
- [ ] Public API: Free (100 req/day), Pro (€99/mo), Enterprise (€499/mo)
- [ ] Embeddable widgets: fuel price ticker, traffic status badge
- [ ] White-label for transport company intranets

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
| Phase 1 | Weeks 1-2 | €0 | SEO foundation + DGT stolen features |
| Phase 2 | Weeks 3-4 | €500-2,000 | Ads + first affiliate |
| Phase 3 | Weeks 5-8 | €2,000-5,000 | Programmatic scale + sponsored |
| Phase 4 | Weeks 8-16 | €5,000-15,000 | Professional tier + API |
| Phase 5 | Months 4-12 | €15,000+ | Community + mobile + expansion |

---

## Key Metrics

- **SEO:** Indexed pages, organic sessions, keyword rankings (precio gasolina, radares DGT, cámaras tráfico)
- **Engagement:** Pages/session, return rate, time on site
- **Revenue:** RPM, affiliate conversions, pro tier signups, API calls
- **Data:** Collector freshness, station coverage, incident latency

---

## Blitz Session Plan

Each row = one `/blitz` session, sized for ~1-2 hours.

| # | Session | Phase | Depends | Est. |
|---|---------|-------|---------|------|
| S01 | `seo-technical-fixes` | 1.1 | — | 1h |
| S02 | `fuel-price-pages` | 1.2a | — | 1.5h |
| S03 | `radar-camera-zbe-pages` | 1.2b | — | 1.5h |
| S04 | `dgt-operaciones-restricciones` | 1.3a | — | 2h |
| S05 | `dgt-puntos-negros-ciclistas` | 1.3b | — | 1.5h |
| S06 | `internal-linking-schema` | 1.4 | S01 | 1h |
| S07 | `ad-infrastructure` | 2.1 | S01 | 1h |
| S08 | `affiliate-widgets` | 2.2-2.3 | S07 | 1h |
| S09 | `programmatic-stations` | 3.1a | S02 | 2h |
| S10 | `programmatic-municipalities` | 3.1b | S09 | 2h |
| S11 | `blog-engine` | 3.2 | — | 1h |
| S12 | `pwa-notifications` | 4.1 | — | 1.5h |
| S13 | `route-calculator` | 4.2 | S02 | 2h |
| S14 | `professional-tier` | 4.3 | S13 | 2h |
| S15 | `public-api` | 4.4 | S14 | 1.5h |

### Parallel Groups (independent, can run simultaneously)

- **Group A:** S01, S02, S03, S04, S05, S11 (all independent)
- **Group B:** S06, S07 (after S01)
- **Group C:** S08, S09 (after S07/S02)
- **Group D:** S10, S12, S13 (after S09)
- **Group E:** S14, S15 (after S13/S14)
