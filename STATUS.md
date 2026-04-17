# trafico.live — Launch Sprint Status

**Updated:** 2026-04-17 (overnight S0 kick-off)
**Source of truth:** `docs/ROADMAP-MASTER-2026.md`

---

## T2 — CONSUMER + UX (branch: `team2`)

**Lead:** frontend-lead (orchestrator)
**Roadmap:** `docs/ROADMAP-TEAM-2-CONSUMER.md`

| # | Sub-agent | Scope | Status | Owner branch |
|---|---|---|---|---|
| 2.1 | TraficoMap unified + LayerRegistry (delete 8 legacy, ~6.2K LOC) | S0 | **in_progress** | `team2-2.1-traficomap` |
| 2.2 | 8 hubs verticales full-feature | S0 | pending | `team2-2.2-hubs` |
| 2.3 | Header+Footer+Design tokens (white-first)+UI canonical components+i18n | S0 | **in_progress** | `team2-2.3-chrome` |
| 2.4 | Live trackers /vuelos /barcos /trenes/live + affiliate widgets | S2-3 | pending | `team2-2.4-trackers` |
| 2.5 | Entity pages SSG batch A (trenes estacion+linea, aeropuertos, puertos) | S0 | pending | `team2-2.5-entity-a` |
| 2.6 | Entity pages SSG batch B (carreteras, buques, gasolineras, meteo, calidad-aire estaciones) | S0 | pending | `team2-2.6-entity-b` |
| 2.7 | Polish GSC pages (camaras, carreteras, estaciones-aforo, noticias) + affiliate disclosure | S0 | pending | `team2-2.7-polish` |
| 2.8 | SEO infra (titles, canonicals, OG, JSON-LD, LLMs.txt, robots, 404) + GDPR cookie banner | S0 | **in_progress** | `team2-2.8-seo-gdpr` |
| 2.9 | a11y + mobile + dark-mode parity + visual QA + 10 E2E tests | S0 QA | pending | `team2-2.9-qa` |

### S0 (now → dom 19 abr)

Priority parallel launch tonight (overnight):

- **2.1** TraficoMap.tsx props API freeze (HS1 producer), LayerRegistry finalize, delete 8 legacy components
- **2.3** Header/Footer navy→white, design tokens white-first in globals.css, canonical `<Button>`/`<StatCard>`/`<VerticalHub>`/`<EmptyState>`/`<LoadingState>`/`<ErrorState>`
- **2.8** 47 double-suffix titles, 32 canonicals, 117 OG images, robots.txt, not-found.tsx, sitemap.ts, LLMs.txt, GDPR cookie banner

### Handshakes

| HS | Role | Partner | Sprint | Contract |
|---|---|---|---|---|
| HS1 | produces | T2 internal (2.2, 2.4, 2.5, 2.6) + T1.9 | S0 vie | TraficoMap props API frozen by vie 18 noche |
| HS2 | consumes | T3.3 | S0 sáb | `WeatherForecast` schema by vie AM |
| HS6 | produces | T1.9 | S4 | `<Offers provider source />` API |
| HS9 | consumes | T4.4 | S3 | MCP tools list for chatbot embed |
| HS10 | produces | T1.9 | S2-3 | `getSlugList()` per SSG template |

### Success metrics

- 27.553 URLs indexables, 90% in GSC within 30d
- LCP <2s on 8 hubs (mobile Slow 3G)
- WCAG AA <5 residual violations
- Bounce <40% on hubs, avg session >300s
- 10 E2E tests green, 32 Playwright visual baselines

---

## File ownership matrix (strict, no overlap)

### 2.1 owns (exclusive)
```
src/components/map/TraficoMap.tsx
src/components/map/TraficoMapControls.tsx
src/components/map/TraficoMapLegend.tsx
src/components/map/IncidentMarker.tsx           # review keep
src/lib/map-layers/**
# DELETE:
src/components/map/InteractiveBaseMap.tsx       (687 LOC)
src/components/map/HistoricalMap.tsx            (525 LOC)
src/components/map/ProvinceHeatmap.tsx          (333 LOC)
src/components/maritimo/VesselLiveMap.tsx
src/components/location/LocationMap.tsx
src/components/location/sections/LocationMapSection.tsx
src/components/gas-stations/StationLocationMap.tsx
# + any UnifiedMap/ComparatorMap if found
docs/TRAFICOMAP-API.md                          (new, HS1 contract)
```

### 2.3 owns (exclusive)
```
src/app/globals.css
src/app/layout.tsx                              (coordinate WCAG attrs with 2.9)
src/components/layout/Header.tsx
src/components/layout/Footer.tsx
src/components/layout/ThemeToggle.tsx
src/components/layout/nav/**
src/components/ui/Button.tsx                    (NEW)
src/components/ui/StatCard.tsx                  (NEW, replaces 11 inline copies)
src/components/ui/VerticalHub.tsx               (NEW template)
src/components/ui/EmptyState.tsx                (exists, polish)
src/components/ui/LoadingState.tsx              (NEW)
src/components/ui/ErrorState.tsx                (NEW)
src/components/ui/TickerStrip.tsx               (NEW)
src/components/ui/FAQAccordion.tsx              (NEW canonical)
src/components/ui/Breadcrumbs.tsx               (NEW canonical)
src/components/ui/RelatedLinks.tsx              (activate cross-vertical)
messages/es.json                                (NEW, prep i18n)
messages/en.json                                (NEW, stub)
```

### 2.8 owns (exclusive)
```
src/app/opengraph-image.tsx                     (NEW root OG)
src/app/{maritimo,aviacion,trenes,trafico,transporte-publico,calidad-aire}/opengraph-image.tsx  (keep/rework existing per vertical)
src/app/llms.txt/route.ts                       (NEW)
src/app/not-found.tsx                           (rework)
src/app/sitemap.ts                              (NEW + shard 27K entities)
src/app/robots.ts                               (NEW - replace static)
public/robots.txt                               (keep, coordinate)
src/components/cookie-consent/**                (NEW - banner + consent API)
src/components/legal/CookieConsent.tsx          (keep existing interface for layout)
src/lib/seo/**                                  (extend)
# Page metadata fixes (site-wide):
# - Remove 47 double-suffix titles
# - Add 32 alternates.canonical
# - Ensure 117 og:image coverage
# - Fix 3 robots.txt GSC errors
```

### Shared but coordinated
- `src/app/layout.tsx` → 2.3 owns structurally, imports `<CookieConsent />` from 2.8's directory
- Page-level `metadata` exports across `src/app/**/page.tsx` → 2.8 owns metadata blocks only, never touches page content/UI
- Hub page files (S0 Saturday) → 2.2 will consume 2.3's `<VerticalHub>` + 2.8's metadata fixes

---

## Merge discipline
- 9 branches `team2-{X.Y}-{slug}`
- Daily merge to `team2` at 23:30 by lead
- Visual QA Playwright regression check per PR (2.9)
- No merge to `main` without 2.9 QA green

