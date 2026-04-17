# Phase 4 — Legacy Map Cleanup Plan

Generated: 2026-04-17  
Branch: `feat/og-images-vertical-hubs`

Follow-up commit after the Phase 4 parallel migration to delete legacy map components whose references were fully removed.

---

## Summary

| Bucket | Files | LOC |
|--------|------:|----:|
| DELETE — zero external refs after Phase 4 | 12 | ~5 380 |
| KEEP (valid specialization) | 1 | 405 |
| MIGRATE IN PHASE 5 | 5 | ~1 570 |
| AUXILIARY — delete together with UnifiedMap | 7 | ~1 340 |

---

## Components to DELETE (zero external refs after Phase 4 completes)

These files are used **only** by other legacy components. Once the chain is severed (UnifiedMap + TrafficMap removed) they become orphans with no remaining callers.

| File | Lines | Last significant caller | Risk |
|------|------:|------------------------|------|
| `src/components/map/UnifiedMap.tsx` | 1 048 | `HeroMapUnified` (home); `EmbedMap` — both are themselves legacy | Low after Phase 4: HomeClient + DashboardClient already use `TraficoMap` |
| `src/components/map/TrafficMap.tsx` | 2 515 | `LocationMap` (comment only, no import); `CorridorView` (sub-component); `MapControls` (type import) | Low: no live page imports it post-Phase 4 |
| `src/components/map/EmbedMap.tsx` | 79 | None — zero callers in src/app | Safe to delete immediately |
| `src/components/map/AnimatedFlowOverlay.tsx` | 136 | `TrafficMap` only (hook import) | Absorb `useAnimatedFlow` hook into registry Phase 5 if needed |
| `src/components/map/WeatherOverlays.tsx` | 93 | `TrafficMap` only (hook import) | Functionality moves to `weather-alerts` / `weather-radar` layers |
| `src/components/map/WeatherRadarOverlay.tsx` | 58 | `TrafficMap` only (hook import) | Functionality becomes `weather-radar` layer in registry |
| `src/components/map/CorridorView.tsx` | 203 | `UnifiedMap` only (dynamic import) | Props typed against `TrafficMap` types — delete together |
| `src/components/map/ZoneInsights.tsx` | 100 | `UnifiedMap` only (dynamic import) | Feature not exposed in TraficoMap v1 API |
| `src/components/map/MapComparator.tsx` | 221 | `UnifiedMap` only (dynamic import) | Evaluate as a future `<TraficoMap>` + `<TraficoMap>` wrapper if needed |
| `src/components/home/HeroMapUnified.tsx` | 61 | Wrapper for `UnifiedMap` — called by nobody after Phase 4 | Phase 4 already uses `TraficoMap preset="home"` in HomeClient directly |

**Subtotal: 10 files, ~4 514 lines**

---

## Auxiliary UI components (delete together with UnifiedMap)

These components are sub-elements of `UnifiedMap` (or `TrafficMap`). They have no external callers outside the legacy map tree. Once their parents are deleted, they are also dead code.

| File | Lines | External ref count (excluding legacy map files) | Action |
|------|------:|------------------------------------------------:|--------|
| `src/components/map/MapControls.tsx` | 785 | 0 | Delete with UnifiedMap; type `ActiveLayers` only used by EmbedMap |
| `src/components/map/MapStats.tsx` | 110 | 0 | Delete with UnifiedMap |
| `src/components/map/RadarHUD.tsx` | 297 | 0 | Delete with UnifiedMap |
| `src/components/map/TimeSlider.tsx` | 198 | 0 | Delete with UnifiedMap |
| `src/components/map/LayerToggle.tsx` | 76 | 0 | Delete with UnifiedMap + MapControls |
| `src/components/map/InfrastructureDetailPanel.tsx` | 301 | 1 (`src/hooks/useDetailPanel.ts` — type import only) | Delete with UnifiedMap; update `useDetailPanel.ts` to inline the type |
| `src/hooks/useDetailPanel.ts` | 16 | 1 (only caller is UnifiedMap) | Delete with UnifiedMap |

**Subtotal: 7 files, ~1 783 lines**

> **Note on `InfrastructureDetailPanel`:** `src/hooks/useDetailPanel.ts` imports `type InfrastructureDetail` from it. Before deleting, either inline the type or move it to `src/lib/map-layers/types.ts`. The hook itself (`useDetailPanel`) is only called by `UnifiedMap`, so it too is deletable.

---

## Components to KEEP (valid specializations)

These are **not** in `src/components/map/` and are **not** targeted by Phase 4. They use MapLibre directly (not wrapping any legacy component) and serve narrow, well-defined use cases.

| File | Lines | Why keep |
|------|------:|----------|
| `src/components/maritimo/VesselLiveMap.tsx` | 405 | Shows a single vessel track with animated position history. Per `MAP-ARCHITECTURE.md` §8: "valid specialization — `/maritimo/buques/[slug]`". Future: accept `entity={{ type: 'vessel', id }}` via TraficoMap Phase 3. Keep until `useMapEntity` hook fully implements vessel track overlay. |

---

## Components still referenced — MIGRATE IN PHASE 5

These components have at least one **app-level caller that has not yet been migrated** to `TraficoMap`. They cannot be deleted until those callers are rewritten.

| File | Lines | Referenced by | Suggested migration action |
|------|------:|---------------|---------------------------|
| `src/components/map/InteractiveBaseMap.tsx` | 687 | `src/app/estaciones-aforo/station-map.tsx`, `src/app/incidencias/content.tsx`, `src/app/intensidad/intensity-map.tsx` | Replace with `<TraficoMap preset="trafico" initialLayers={[…]} />` in each page |
| `src/components/map/IncidentMarker.tsx` | 338 | `src/app/incidencias/content.tsx` (DOM marker helper functions) | Move `createIncidentMarkerElement` / `getIncidentIcon` into a `src/lib/map-layers/incident-markers.ts` util consumed by the `incidents` layer in registry |
| `src/components/map/HistoricalMap.tsx` | 525 | `src/app/historico/content.tsx`, `src/app/estadisticas/content.tsx` | Replace with `<TraficoMap preset="trafico" initialLayers={["accidents-heatmap","imd-segments"]} />` |
| `src/components/map/ProvinceHeatmap.tsx` | 333 | `src/app/estadisticas/accidentes/AccidentesClient.tsx` | Absorb as a named layer variant (`accidents-heatmap` + province choropleth style) in `registry.ts`; replace call site with `<TraficoMap preset="trafico" />` |
| `src/components/home/HeroMapUnified.tsx` | 61 | Still present on disk; HomeClient already uses `TraficoMap` directly | Safe to delete once `grep -rln HeroMapUnified src/` returns 0 (currently 1 self-reference) |

---

## Command sequence for the cleanup commit

Run this **after all Phase 5 callers have been migrated** and the grep criterion passes:

```bash
# Verify zero external callers first
grep -rl "UnifiedMap\|TrafficMap\|InteractiveBaseMap\|HistoricalMap\|EmbedMap\|IncidentMarker\|ProvinceHeatmap" src/app src/components/home 2>/dev/null
# Expected output: empty

# Step 1 — delete Phase 4 orphans (zero external refs today)
git rm src/components/map/UnifiedMap.tsx
git rm src/components/map/TrafficMap.tsx
git rm src/components/map/EmbedMap.tsx
git rm src/components/map/AnimatedFlowOverlay.tsx
git rm src/components/map/WeatherOverlays.tsx
git rm src/components/map/WeatherRadarOverlay.tsx
git rm src/components/map/CorridorView.tsx
git rm src/components/map/ZoneInsights.tsx
git rm src/components/map/MapComparator.tsx
git rm src/components/home/HeroMapUnified.tsx

# Step 2 — delete auxiliaries (bundled with UnifiedMap)
git rm src/components/map/MapControls.tsx
git rm src/components/map/MapStats.tsx
git rm src/components/map/RadarHUD.tsx
git rm src/components/map/TimeSlider.tsx
git rm src/components/map/LayerToggle.tsx
git rm src/components/map/InfrastructureDetailPanel.tsx
git rm src/hooks/useDetailPanel.ts

# Step 3 — delete Phase 5 targets (after migrating their callers)
git rm src/components/map/InteractiveBaseMap.tsx
git rm src/components/map/IncidentMarker.tsx
git rm src/components/map/HistoricalMap.tsx
git rm src/components/map/ProvinceHeatmap.tsx

git commit -m "chore(map): delete legacy components after Phase 4+5 migration (~7300 lines)"
```

---

## Immediate safe deletes (no callers today)

These can be deleted **right now** without waiting for Phase 5:

- `src/components/map/EmbedMap.tsx` — zero callers in src/app
- `src/components/home/HeroMapUnified.tsx` — wrapper with no callers (HomeClient uses TraficoMap directly)

---

## Estimated total LOC reduction

| Scope | Files | LOC |
|-------|------:|----:|
| Phase 4 orphans (delete now) | 10 | ~4 514 |
| Auxiliary components (delete with UnifiedMap) | 7 | ~1 783 |
| Phase 5 targets (delete after migration) | 4 | ~1 883 |
| **Total** | **21** | **~8 180** |

> LOC estimates are from `wc -l` on the current branch. Actual reduction may vary slightly based on comment/blank lines.
