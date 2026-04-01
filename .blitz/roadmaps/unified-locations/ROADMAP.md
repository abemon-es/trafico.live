# Roadmap: Unified Location Pages — Full Data Richness

Created: 2026-04-01
Repo: trafico.live
Branch base: main @ 85b38c8
Estimated sections: 10 (across 5 phases)

## Overview

Transform trafico.live from 121 fragmented pages into a hub-and-spoke architecture where every geographic entity (province, city, municipality, road) shows ALL available data in rich, SSR landing pages. Eliminate 20+ duplicate URLs, surface 6 hidden database models, wire 15 orphaned API endpoints, and display 50+ hidden data fields.

## Phase Dependencies

```
Phase 1 (Quick Wins) → independent, start immediately
  S01: 301 Redirects              → independent
  S02: Surface Hidden Fields      → independent
  S03: Wire Orphaned APIs         → independent

Phase 2 (Schema + Data Layer) → independent of Phase 1
  S04: Schema Migration           → independent
  S05: LocationStats + Caching    → depends on S04

Phase 3 (Unified Page Components) → depends on Phase 2
  S06: GeoEntity + Shared Components → depends on S04, S05
  S07: Province Hub + Spokes         → depends on S06
  S08: City + Municipality Pages     → depends on S06

Phase 4 (New Collectors) → independent of Phase 3
  S09: Enhanced Collectors           → independent

Phase 5 (Iberian Expansion) → depends on Phase 3
  S10: Portugal + Andorra Frontend   → depends on S06
```

## Sections

### Section 1: 301 Redirects (Phase 1)
- **Branch:** `blitz/unified-locations-s01`
- **Files owned:**
  - `next.config.ts` (redirects section only)
- **Depends on:** none
- **Tasks:**
  - Add ~25 permanent redirects for duplicate URLs
  - Remove duplicate page directories (or convert to redirect components)
  - Update sitemap.ts to exclude redirected paths
- **Verification:** `npm run build` passes, curl old URLs returns 301

### Section 2: Surface Hidden Fields (Phase 1)
- **Branch:** `blitz/unified-locations-s02`
- **Files owned:**
  - `src/app/api/incidents/route.ts`
  - `src/app/api/panels/route.ts`
  - `src/app/api/chargers/route.ts`
  - `src/app/api/gas-stations/route.ts`
  - `src/app/api/gas-stations/cheapest/route.ts`
  - `src/components/incidents/` (new/modified components)
  - `src/components/gas-stations/FuelTypeGrid.tsx` (new)
  - `src/components/panels/PanelCard.tsx` (new/modified)
- **Depends on:** none
- **Tasks:**
  - GasStation API: include 6 hidden fuel types (GasoleoB, Gasolina95E10, Gasolina98E10, GNC, GNL, Hidrogeno)
  - TrafficIncident API: include detailedCauseType, managementType, durationSecs, roadType
  - VariablePanel API: include messageType, name, messageStartAt, panelId
  - EVCharger API: include network, isPublic
  - HistoricalAccidents: include vehiclesInvolved, pedestrians in API responses
  - HourlyStats/DailyStats: expose JSON breakdown fields (byProvince, bySeverity, etc.)
  - Create display components for new fields
- **Verification:** API responses include new fields, no breaking changes to existing consumers

### Section 3: Wire Orphaned APIs (Phase 1)
- **Branch:** `blitz/unified-locations-s03`
- **Files owned:**
  - `src/app/carreteras/[roadId]/page.tsx` (add speed limits section)
  - `src/app/intensidad/` (wire /api/trafico/intensidad)
  - `src/app/maritimo/page.tsx` (wire /api/maritimo/stats)
  - `src/app/maritimo/meteorologia/` (wire /api/maritimo/weather)
  - `src/app/maritimo/puertos/page.tsx` (wire /api/maritimo/ports/stats)
  - `src/app/mejor-hora/` (wire /api/trafico/distribucion-horaria)
  - `src/components/roads/RoadSpeedLimits.tsx` (new)
  - `src/components/roads/RoadNetworkStats.tsx` (new)
  - `src/components/traffic/LiveIntensityMap.tsx` (new)
  - `src/components/traffic/HourlyPatternHeatmap.tsx` (new)
- **Depends on:** none
- **Tasks:**
  - Wire /api/trafico/intensidad to the /intensidad page (6,117 Madrid sensors)
  - Wire /api/trafico/distribucion-horaria to /mejor-hora page
  - Wire /api/maritimo/stats + weather + ports/stats to maritime pages
  - Wire /api/roads/stats to /carreteras page
  - Wire /api/roads/[roadId]/speed-limits to road detail page
  - Wire /api/gas-stations/cheapest to province pages
  - Create LiveIntensityMap component for real-time sensor data
  - Create HourlyPatternHeatmap component
- **Verification:** Pages display new data sections, no regressions

### Section 4: Schema Migration (Phase 2)
- **Branch:** `blitz/unified-locations-s04`
- **Files owned:**
  - `prisma/schema.prisma`
  - `prisma/migrations/` (new migration)
  - `scripts/backfill-municipality-codes.ts` (new)
- **Depends on:** none
- **Tasks:**
  - Add municipalityCode to Camera, Radar, EVCharger, VariablePanel, TrafficStation, SpeedLimit, RoadRiskZone
  - Add @@index([municipalityCode]) to each
  - Add @@index([latitude, longitude]) composites
  - Add GIN index on Road.provinces (raw SQL migration)
  - Create LocationStats model
  - Create backfill script for municipalityCode from lat/lon
  - Run migration on dev DB
- **Verification:** `npx prisma validate`, migration applies cleanly, backfill populates data

### Section 5: LocationStats + Caching Layer (Phase 2)
- **Branch:** `blitz/unified-locations-s05`
- **Files owned:**
  - `src/lib/data/location-data.ts` (new — cached data fetchers)
  - `src/lib/data/location-stats.ts` (new — LocationStats CRUD)
  - `src/lib/geo/types.ts` (new — GeoEntity type)
  - `src/lib/redis.ts` (enhance with stampede protection)
  - `services/collector/hooks/refresh-stats.ts` (new — post-collector hook)
- **Depends on:** S04 (needs LocationStats model)
- **Tasks:**
  - Create GeoEntity type system
  - Build getCachedXxx() wrappers for all 15 data types with Redis + Prisma
  - Add stampede protection (lock-based) to Redis helpers
  - Create LocationStats refresh function
  - Wire refresh into collector dispatcher post-hooks
  - Set TTLs per data type (120s incidents → 604800s IMD)
- **Verification:** Unit tests for caching layer, LocationStats populates correctly

### Section 6: Shared Location Components (Phase 3)
- **Branch:** `blitz/unified-locations-s06`
- **Files owned:**
  - `src/components/location/` (new directory — all shared components)
    - LocationShell.tsx
    - SectionNav.tsx
    - SectionSkeleton.tsx
    - LocationMap.tsx (lightweight MapLibre)
    - HeroSection.tsx (Traffic Health Score)
    - StatsBar.tsx
    - sections/ (15 async RSC section components)
      - IncidentsSection.tsx
      - CamerasSection.tsx
      - RadarsSection.tsx
      - GasStationsSection.tsx
      - EVChargersSection.tsx
      - WeatherSection.tsx
      - AccidentsSection.tsx
      - TrafficIntensitySection.tsx
      - RiskZonesSection.tsx
      - ZBESection.tsx
      - RoadsSection.tsx
      - SpeedLimitsSection.tsx
      - PanelsSection.tsx
      - NewsSection.tsx
      - V16Section.tsx
- **Depends on:** S04, S05 (needs GeoEntity type + cached data fetchers)
- **Tasks:**
  - Build LocationShell with streaming Suspense architecture
  - Build SectionNav with scroll-spy (client component)
  - Build 15 async RSC section components using getCachedXxx()
  - Build lightweight LocationMap with IntersectionObserver lazy load
  - Build HeroSection with Traffic Health Score gauge
  - Build SectionSkeleton for loading states
  - Handle empty states per UX spec
- **Verification:** Storybook-like rendering of each section with mock data

### Section 7: Province Hub + Spoke Pages (Phase 3)
- **Branch:** `blitz/unified-locations-s07`
- **Files owned:**
  - `src/app/provincias/[code]/page.tsx` (rewrite)
  - `src/app/provincias/[code]/camaras/page.tsx` (new spoke)
  - `src/app/provincias/[code]/radares/page.tsx` (new spoke)
  - `src/app/provincias/[code]/combustible/page.tsx` (new spoke)
  - `src/app/provincias/[code]/accidentes/page.tsx` (new spoke)
  - `src/app/provincias/[code]/carga-ev/page.tsx` (new spoke)
  - `src/app/provincias/[code]/intensidad/page.tsx` (new spoke)
  - `src/app/provincias/page.tsx` (update index)
- **Depends on:** S06 (needs shared components)
- **Tasks:**
  - Rewrite province page using LocationShell + all sections
  - Create 6 spoke pages with focused full-dataset views
  - Implement proper schema.org (AdministrativeArea, ItemList, FAQPage)
  - Add "hoy" to time-sensitive title tags
  - Cross-link hub ↔ spokes ↔ sibling provinces
  - ISR with revalidate: 300
- **Verification:** Build passes, province pages render all sections, spokes show full data

### Section 8: City + Municipality Pages (Phase 3)
- **Branch:** `blitz/unified-locations-s08`
- **Files owned:**
  - `src/app/ciudad/[slug]/page.tsx` (rewrite)
  - `src/app/municipio/[slug]/page.tsx` (rewrite)
  - `src/app/comunidad-autonoma/[community]/page.tsx` (rewrite)
  - `src/app/espana/page.tsx` (rewrite)
- **Depends on:** S06 (needs shared components)
- **Tasks:**
  - Rewrite city page using LocationShell + all sections
  - Rewrite municipality page with quality gate (noindex if pop < 2000 && no data)
  - Rewrite community page as aggregated dashboard
  - Rewrite /espana as national dashboard
  - On-demand ISR (no generateStaticParams for 8000+ municipalities)
  - Pre-render top 50 cities at build time
  - Province-level fallback for empty municipality sections
- **Verification:** Build passes, city/municipality pages render, quality gate works

### Section 9: Enhanced Collectors (Phase 4)
- **Branch:** `blitz/unified-locations-s09`
- **Files owned:**
  - `services/collector/tasks/incident/parsers/` (enhance DATEX II parsing)
  - `services/collector/tasks/gas-station/index.ts` (add biofuel fields)
  - `services/collector/tasks/charger/index.ts` (populate network field)
  - `services/collector/tasks/imd/` (extend to 2020-2024)
  - `services/collector/tasks/weather-forecast/` (new — AEMET municipal forecasts)
  - `services/collector/tasks/intensity/index.ts` (store Barcelona estatPrevist)
- **Depends on:** none (can run in parallel with Phase 3)
- **Tasks:**
  - Enhance DGT DATEX II parser: extract numberOfLanesRestricted, accidentType, vehicleInvolved, delayBand
  - Enhance gas station collector: parse biofuel prices (Bioetanol, Biodiesel, blend %)
  - Populate EVCharger.network field from feed
  - Extend IMD collector for years 2020-2024
  - Store IMD segment polyline geometry
  - Create AEMET forecast collector (temp, rain %, wind, UV per municipality)
  - Store Barcelona estatPrevist (predicted congestion)
- **Verification:** Collectors run successfully, new data appears in DB

### Section 10: Portugal + Andorra Frontend (Phase 5)
- **Branch:** `blitz/unified-locations-s10`
- **Files owned:**
  - `src/app/portugal/` (new section)
  - `src/app/andorra/` (new section)
  - `src/app/api/portugal/` (new API routes)
  - `src/app/api/andorra/` (new API routes)
- **Depends on:** S06 (needs shared components)
- **Tasks:**
  - Create Portugal fuel pages (3,000+ stations, prices)
  - Create Portugal weather alert display
  - Create Portugal accident history pages
  - Create Andorra traffic section (incidents + cameras)
  - Cross-link with Spanish border province pages
  - Iberian price comparison widgets
- **Verification:** Build passes, new pages render with data from existing models

## Merge Order
1. S01 + S02 + S03 (Phase 1 — independent, merge first)
2. S04 (Phase 2 — schema migration)
3. S05 (Phase 2 — depends on S04)
4. S09 (Phase 4 — independent collectors)
5. S06 (Phase 3 — depends on S04 + S05)
6. S07 + S08 (Phase 3 — depends on S06)
7. S10 (Phase 5 — depends on S06)
8. Final verification on merged result
