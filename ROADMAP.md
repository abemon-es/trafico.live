# trafico.live — Product Roadmap

> Standalone traffic intelligence platform for Spain.
> Domain: trafico.live (Cloudflare) | Infra: Coolify on Hetzner

---

## Phase 0: Brand Independence (current sprint)

### 0.1 — Rebrand & Domain Setup
- [x] Buy domain trafico.live (Cloudflare)
- [x] Create Coolify project "trafico-live"
- [ ] New brand identity: colors (blue/amber), logo, favicon
- [ ] Update all metadata, OG tags, structured data → trafico.live
- [ ] Update middleware: redirect old domains → trafico.live
- [ ] Remove all Logistics Express references
- [ ] DNS: Cloudflare → Hetzner (A record + CNAME www)
- [ ] Deploy on Coolify under new project
- [ ] 301 redirect trafico.logisticsexpress.es → trafico.live
- [ ] New GA4 property for trafico.live

### 0.2 — Fix Broken Features
- [ ] Fix EV charging pages (404s reported)
- [ ] Fix ZBE pages (404s reported)
- [ ] Fix font bug (Geist loaded but body overrides to Arial)
- [ ] Fix broken logo.png reference in structured data
- [ ] Replace hardcoded hex colors with design tokens

---

## Phase 1: SEO Foundation (weeks 1-4)

### 1.1 — Technical SEO
- [ ] Convert homepage from pure CSR → hybrid SSR (hero + stats SSR, map CSR)
- [ ] Add `<link rel="canonical">` on aliased routes (/combustible→/gasolineras, /alertas→/incidencias)
- [ ] Switch `force-dynamic` pages to ISR (`revalidate = 3600`) where data doesn't change per-second
- [ ] Add `hreflang` tags (es-ES, future: en)
- [ ] Improve Core Web Vitals: lazy-load below-fold components, optimize LCP

### 1.2 — High-Volume Landing Pages
- [ ] `/precio-gasolina-hoy` — daily fuel prices with province breakdown + 30d chart (target: "precio gasolina hoy" ~150K/mo)
- [ ] `/precio-diesel-hoy` — same for diesel (target: "precio diesel" ~90K/mo)
- [ ] `/radares` — top-level dedicated radar map page (target: "radares DGT" ~35K/mo)
- [ ] `/camaras/[city]` — per-city camera pages for top 20 cities (target: "cámaras tráfico madrid" etc.)
- [ ] `/zbe/[city]` — per-city ZBE pages for all ZBE cities (target: "zona bajas emisiones madrid" ~30K/mo)
- [ ] `/gasolineras/baratas/[province]` — cheapest stations per province (target: "gasolineras baratas [province]")

### 1.3 — Content & Internal Linking
- [ ] Build internal link mesh: road→cameras, province→fuel, city→ZBE/EV/fuel cross-links
- [ ] Add FAQ sections with `FAQPage` schema on high-value pages
- [ ] Add breadcrumbs to all pages (currently only on road detail)

### 1.4 — Structured Data Expansion
- [ ] `GasStation` + `LocalBusiness` schema on station pages
- [ ] `Place` + `amenityFeature` on EV charger pages
- [ ] `Dataset` with `temporalCoverage` on province fuel pages
- [ ] `City`/`Place` with `geo` on city pages

---

## Phase 2: Monetization (weeks 4-8)

### 2.1 — Programmatic Advertising
- [ ] Integrate Setupad or Ezoic (not vanilla AdSense — Spain CPM too low)
- [ ] Ad placements: sidebar on desktop, between-section on mobile, sticky footer
- [ ] Target: €1,500-3,000/mo at 200-400K pageviews
- [ ] A/B test ad density vs bounce rate

### 2.2 — Sponsored Listings
- [ ] "Destacada" badge system for gas stations (Repsol, Cepsa, BP pay to be highlighted)
- [ ] Featured EV charger networks (Iberdrola, Endesa, Wallbox)
- [ ] Pricing: €200-500/mo per brand

### 2.3 — Affiliate Revenue
- [ ] Car insurance comparison widget on `/profesional` and fleet pages (CPC €4-12 in Spain)
- [ ] Fuel card comparison (Solred, Repsol) on `/profesional/diesel` (€10-30/signup)
- [ ] ITV booking affiliate link on vehicle-related pages
- [ ] EV home charger affiliate (Wallbox, etc.) on `/carga-ev` pages (€15-50/lead)

---

## Phase 3: Programmatic Scale (weeks 8-16)

### 3.1 — Massive Page Generation
- [ ] Per-station pages for 11,742 gas stations: price history, nearest alternatives, route from highway
  - Template: "Gasolinera [Brand] en [City] — Precio hoy €X.XX"
  - Target: 64K+ indexed keywords (match dieselogasolina.com)
- [ ] Per-municipality pages (~8,000): local fuel, nearest cameras, ZBE status, incidents
- [ ] Road segment pages: per-province breakdowns for major roads

### 3.2 — Blog / Editorial Content
- [ ] `/blog` section for seasonal + evergreen content
- [ ] Seasonal: "Tráfico Semana Santa 2026", "Operación salida verano", "Nuevos radares DGT 2026"
- [ ] Evergreen: "Cómo funciona la baliza V16", "Guía zonas ZBE España", "Mejores apps tráfico"
- [ ] Target: 2-4 articles/month, optimized for Google Discover

---

## Phase 4: Product Features (weeks 12-24)

### 4.1 — User Engagement
- [ ] Push notifications / email alerts: "Diesel baja de €1.30 en tu provincia"
- [ ] Price alert subscriptions (free tier: 1 alert, premium: unlimited)
- [ ] Saved routes with incident notifications
- [ ] PWA manifest + offline radar/camera data

### 4.2 — Professional Tier (€19-49/mo)
- [ ] Unlock `/profesional` section
- [ ] Fleet diesel price monitoring dashboard
- [ ] Multi-vehicle ZBE compliance checker
- [ ] Incident notifications via webhook/email for fleet routes
- [ ] Route cost calculator (tolls + fuel + time)

### 4.3 — Route Cost Calculator
- [ ] A→B route planning with real-time fuel costs
- [ ] Toll cost integration (autopistas)
- [ ] Fuel consumption by vehicle type
- [ ] Compare gas vs diesel vs EV cost per route

### 4.4 — API / Data Products
- [ ] Public API tiers: Free (100 req/day), Pro (€99/mo), Enterprise (€499/mo)
- [ ] Embeddable widgets: fuel price ticker, traffic status badge
- [ ] White-label for transport company intranets

---

## Phase 5: Growth & Moats (6-12 months)

### 5.1 — AI Features
- [ ] Natural language traffic summaries: "Resumen del tráfico en Madrid ahora"
- [ ] Incident prediction based on historical + weather data
- [ ] Smart route suggestions avoiding predicted congestion
- [ ] Google Discover-optimized AI summaries

### 5.2 — Mobile
- [ ] PWA with full offline capability
- [ ] Evaluate native app (React Native) if PWA engagement metrics justify it

### 5.3 — Community
- [ ] User-reported incidents (like Waze but web-based)
- [ ] Verified reporter badges for frequent contributors
- [ ] Integration with SocialDrive API if available

### 5.4 — Expansion
- [ ] Portugal traffic data (Via Verde, IMT)
- [ ] Andorra, Gibraltar border crossing times
- [ ] Multi-language: English for tourists/expats

---

## Revenue Projections

| Phase | Timeline | Monthly Revenue | Driver |
|-------|----------|----------------|--------|
| Phase 0-1 | Month 1-2 | €0 | Building SEO foundation |
| Phase 2 | Month 3-4 | €500-2,000 | Ads + first affiliate |
| Phase 3 | Month 5-8 | €2,000-5,000 | Programmatic scale + sponsored |
| Phase 4 | Month 9-12 | €5,000-15,000 | Professional tier + API |
| Phase 5 | Month 12+ | €15,000+ | Community + mobile + expansion |

---

## Key Metrics to Track

- **SEO:** Indexed pages, organic traffic, keyword rankings (precio gasolina, radares DGT, cámaras tráfico)
- **Engagement:** Pages/session, return rate, time on site, push notification opt-in rate
- **Revenue:** RPM, affiliate conversion rate, professional tier signups, API usage
- **Data:** Freshness (time since last DGT sync), coverage (% of stations with today's price)
