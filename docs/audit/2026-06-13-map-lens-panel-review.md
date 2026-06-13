# Expert Panel Review — Map Intent-Lens Design — 2026-06-13

Six independent experts (Product/UX, Cartography, Accessibility, Performance,
Growth/SEO, Spanish-mobility domain) reviewed the scoped-lens map design
(branch feat/scoped-map-lenses). All read the actual code.

## Unanimous verdict: the model is right — REFINE, don't rethink.

Every reviewer confirmed: intent lenses + per-page scoping is the correct
abstraction and a major win over 29-layers-at-once. The improvements are
refinements, not a redesign.

## Strongest cross-cutting findings (where ≥2 experts converged)

1. **Single-headline defaults are too sparse** (Cartography #1, Product). "Live
   trains only" = a dozen dots on an empty Spain. Fix: each default carries a
   cheap STATIC anchor (planes+airports, ships+ports+lanes, trains+network
   skeleton). → FOLDED IN.
2. **The lens bar's a11y is broken** (Accessibility P0s, Product). `role=tablist`
   is wrong (no tabpanels) → use `role=toolbar` + `aria-pressed` + roving
   tabindex + Arrow/Home/End. No SR announcement on lens change (the map
   redraws silently) → wire the existing `useAnnouncer`. No focus-visible ring.
   → FOLDED IN.
3. **The "custom" state reads as broken** (Product). When hand-tuned layers
   match no lens, all chips go dark. Add a "Personalizado" marker. → FOLDED IN.

## The big rocks (roadmap, by leverage)

### A. `/mapa/[lens]` as SSG routes — Growth's #1, highest overall ROI
10 clean crawlable URLs (`/mapa/radares`, `/mapa/trenes`…), each with unique
title/meta/JSON-LD + a server-rendered HTML data summary below the map. Wins
SEO (10 high-intent query targets), AI-assistant citations (clean paths
ChatGPT/Bing can link), shareability, AND becomes the foundation for per-lens
analytics + CTAs. Directly serves the indexing-recovery goal. Effort: M.

### B. Basemap GeoJSON → PMTiles — Performance's #1, biggest mobile lever
The Protomaps basemap fetches ~7 MB of GeoJSON (land, states, bathymetry)
UNCONDITIONALLY on every map init, regardless of lens — untouched by scoping.
At z5 over Spain that's ~3.7–4.7s of download on median 4G. Convert to vector
PMTiles (tippecanoe one-shot) → ~50–120 KB range requests. 30–60× reduction.
Effort: S/M, no app code.

### C. Spanish-intent lenses — Domain's picks
- **ZBE on /trafico** (THE highest-value add): low-emission-zone enforcement
  fines millions of B-label drivers daily in Madrid/Barcelona/Zaragoza/Sevilla/
  Valencia. Data exists (`zbe_zones`/`ZBEZone`). A driver checking "tráfico en
  Madrid" should see ZBE beside radares.
- **"Viaje" compound lens on /mapa**: radares+gasolineras+incidencias(+ZBE/
  peajes) — the archetypal Spanish road-trip intent, currently 3 lens taps.
- **"Operación" seasonal lens** (Semana Santa/verano DGT ops) + lead-with-it
  default on operation days. Uses the unused `panels` layer.
- **"Alertas" on /trenes** (Renfe GTFS-RT alerts already collected, unsurfaced).
- Rename "Flujo" → "Sensores urbanos" (it's Madrid+3 cities, not national).

### D. Live-layer refresh — Performance bug
Live layers (trains/ships/planes) never refresh without a pan/zoom — MapLibre
has no auto tile-reload. A static /trenes view shows 2-min-stale trains forever.
Add a per-layer `refreshIntervalMs` reload loop (cleanup on unmount). Effort: M.

### E. Richer analytics schema — Growth
`map_interaction(lens)` is too thin to act on. Add `lens_select` (with
`position`, `previous_lens`, `time_on_previous_ms`), `map_feature_click`,
`lens_escape`, `lens_api_cta_click`, `lens_share`. Unlocks: reorder chips by
real demand, detect missing intents, tie map engagement → API conversion.
Effort: S.

### Secondary
- **Lens→API CTA** (Growth): a dismissable "accede vía API" prompt after dwell
  on a non-default lens — the monetization hook the lens model is missing.
- **Cross-vertical discovery** (Growth): scoping hides other verticals; add a
  popup "Ver más →" to the vertical page + a "También en el mapa" row.
- **Color collision** (Cartography): amber `#d48139` is shared by shipping-lanes,
  maritime-fuel, gas-stations, portugal-gas. Give maritime its own family. S.
- **Zoom-aware LOD** (Cartography): railway-routes/transit-routes are a national-
  zoom hairball; reveal by route type as you zoom. L (tile pipeline).
- **Lens-switch caching/prefetch** (Performance): switching tears down + rebuilds
  sources (300–750ms blank on cellular). Keep recent sources hidden, prefetch
  adjacent TileJSON on idle. M.
- **Bottom bar on mobile** (Product): top-left is the hardest one-handed thumb
  reach for an in-transit app; consider `bottom` placement. S, UX judgment.
- **Compound "Todo" lens** (Product): an explicit all-layers chip per vertical
  for the common En vivo+Estaciones combo.
- **`?lens=radares` / lens-id in URL** (Product): more stable + human-readable
  than `?layers=…`.

## Recommended sequence
1. ✅ Folded in now: a11y toolbar+announce+focus, sparse-default anchors, custom marker.
2. Quick-ROI PR: analytics schema (E) + color-collision (Cartography) + cross-vertical popup links.
3. Pick a big rock: **A** (SEO/SSG routes — best for the traffic-recovery goal) OR **C** (Spanish lenses, esp. ZBE — best for product/Spanish fit) OR **B+D** (perf infra).
