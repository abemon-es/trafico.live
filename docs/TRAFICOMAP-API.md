# `<TraficoMap>` — Unified Map Component API (HS1 contract)

> **Status:** FROZEN (baseline) 2026-04-17 · produced by T2.1 · consumers: T2.2, T2.4, T2.5, T2.6, T1.9
> **Source:** `src/components/map/TraficoMap.tsx`

`<TraficoMap>` is the single map primitive used across all consumer surfaces (8 hubs, 27K entity pages, 3 live trackers, admin views). It wraps MapLibre GL + self-hosted Protomaps basemap + a declarative LayerRegistry so callers never touch `maplibre-gl` directly.

This doc is the **HS1 contract**: signature, props, events, lifecycle — frozen so consumers can build against it in parallel without waiting for 2.1 to finish the legacy deletion pass.

---

## 1. Import

```tsx
import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-ink-50 animate-pulse" /> },
);
```

`ssr: false` is required because MapLibre and PMTiles registration run in `window`.

---

## 2. Props

```ts
import type { MapPreset, EntityType } from "@/lib/map-layers/types";

export interface TraficoMapProps {
  /** Preset group — activates a curated layer set (e.g. "trafico", "aviacion", "maritimo") */
  preset?: MapPreset;

  /** Which layers to mount on initial render. Overrides preset defaults if provided. */
  initialLayers?: string[];

  /** Whitelist of layers the user can toggle in the layer panel. If omitted, all preset-eligible layers are available. */
  availableLayers?: string[];

  /** Fly-to + highlight an entity when map loads. Phase-2 rendering (pulse outline) arrives in S1. */
  entity?: { type: EntityType; id: string };

  /** Which controls to render. All default on except fullscreen. */
  controls?: {
    layerPanel?: boolean;   // default true
    themeToggle?: boolean;  // default true
    legend?: boolean;       // default true
    fullscreen?: boolean;   // default false
  };

  /** Initial camera. If `bounds` given, it wins over `center`+`zoom`. */
  initialView?: {
    center?: [number, number];                    // [lng, lat], default [-4.0, 39.6]
    zoom?: number;                                // default 5.2
    bounds?: [[number, number], [number, number]]; // [[sw-lng, sw-lat], [ne-lng, ne-lat]]
  };

  /** Theme source: "auto" follows system, "light"/"dark" force. */
  theme?: "auto" | "light" | "dark";

  /** Read/write active layers from `?layers=` URL param. Use for shareable map state. */
  syncUrl?: boolean;

  /** Wrapper class. Map fills 100% of parent. */
  className?: string;

  /** Sidebar / overlay slot — rendered inside the map wrapper (positioned by consumer). */
  children?: React.ReactNode;
}
```

---

## 3. Presets (MapPreset)

Defined in `src/lib/map-layers/types.ts` + `src/lib/map-layers/registry.ts`. A preset selects a coherent set of layers for a vertical.

`MapPreset = VerticalId | "home" | "all" | "minimal"` where `VerticalId = "maritimo" | "aviacion" | "trenes" | "trafico" | "transporte-publico" | "meteo" | "combustible"`.

| Preset | Surface | Default layers (illustrative) |
|---|---|---|
| `trafico` | `/trafico`, `/`, province/city pages | `dgt-incidents`, `roads-ref`, `cameras`, `radars`, `variable-panels`, `traffic-sensors` |
| `maritimo` | `/maritimo`, `/barcos` | `ais-vessels`, `ferry-routes`, `ports`, `maritime-stations` |
| `aviacion` | `/aviacion`, `/vuelos` | `aircraft-positions`, `airports`, `airport-runways` |
| `trenes` | `/trenes`, `/trenes/live`, entity station/line pages | `railway-fleet-ld`, `railway-cercanias-positions`, `railway-routes`, `railway-stations` |
| `transporte-publico` | `/transporte-publico`, city transit | `transit-routes`, `transit-stops`, `transit-operators` |
| `meteo` | `/meteo`, `/calidad-aire/estaciones/[slug]` | `weather-stations`, `air-quality`, `weather-alerts`, `radar-composite` (S1) |
| `combustible` | `/combustible`, `/gasolineras`, `/gasolineras/cerca` | `gas-stations`, `ev-chargers`, `fuel-prices-choropleth` |
| `home` | `/` homepage | curated cross-vertical highlights |
| `all` | admin / debug views | every layer in registry |
| `minimal` | entity-focus views | basemap only; consumer passes `entity` + custom `initialLayers` |

**Preset → layer resolution** happens in `useMapLayers` hook. Consumers may override with `initialLayers` (force set) or `availableLayers` (whitelist what's toggleable).

---

## 4. EntityType

```ts
export type EntityType =
  | "road"              // by ref
  | "vessel"            // MMSI
  | "port"
  | "train-station"
  | "rail-line"
  | "airport"           // by IATA
  | "flight"
  | "gas-station"
  | "weather-station"
  | "aq-station"        // air quality
  | "radar"
  | "camera";
```

**Note:** `ev-charger`, `variable-panel`, `traffic-station` (counting), `maritime-station`, `incident` surface as layer toggles within presets rather than entity-focus targets. Add a new type to `types.ts` + coord resolution if you need entity focus on those.

When `entity` is supplied the map will, on load:
1. Look up coords via the appropriate layer or API fallback
2. `fitBounds` or `flyTo` with zoom tuned per entity type
3. (S1) draw a pulse outline around the feature

Coord lookup fallback order: (a) cached layer tile feature query, (b) `/api/search` Typesense hit, (c) REST lookup via `/api/{entity-plural}/[id]`.

---

## 5. Events / imperative API

Phase 1 is **declarative only**. No `ref` handle is exposed. If you need imperative `flyTo`, request it via props (`initialView`) and re-mount.

Future (S2+, non-blocking): expose `useTraficoMap()` hook that returns `{ flyTo, fitBounds, toggleLayer }` when parent is inside `<TraficoMap>`. Will not break current API.

---

## 6. URL sync

When `syncUrl={true}`:
- `?layers=a,b,c` reflects `activeLayers`
- User toggles update URL (replaceState) — Back button restores prior set
- `initialLayers` is used only when `?layers=` is absent
- No other state is synced (view, theme) — explicit decision to keep URLs short

---

## 7. Theme behaviour

- `theme="auto"` reads `prefers-color-scheme` and listens for changes
- Basemap swaps via `map.setStyle()` — layer state preserved across swap
- Consumers should **not** pass different MapLibre styles; use the theme prop

---

## 8. Accessibility contract

- Fullscreen button has `aria-label`
- Layer panel entries are `role="switch"` with `aria-checked`
- Legend is `role="region"` with `aria-label="Leyenda del mapa"`
- Map canvas itself exposes `role="application"` (MapLibre default) — consumers **should** provide context text adjacent to the map for screen readers (e.g. `<p className="sr-only">Mapa interactivo de {preset}</p>`)

---

## 9. Performance contract

- Initial render under 150 KB JS (gzipped) excluding MapLibre runtime
- `initPMTilesProtocolAsync()` is singleton — no double registration
- Layer add/remove is O(n) over `availableLayers`, safe up to 60 layers
- Martin (dynamic) layers have 60s nginx cache in front — assume eventual consistency

---

## 10. Deprecations (removed in S0)

The following legacy components are REMOVED. All call sites migrate to `<TraficoMap>` with the preset/entity pattern:

| Legacy | Replacement |
|---|---|
| `InteractiveBaseMap` | `<TraficoMap preset="..." />` |
| `HistoricalMap` | `<TraficoMap preset="trafico" />` + time-slider overlay (phase 2) |
| `ProvinceHeatmap` | `<TraficoMap preset="trafico" initialLayers={["province-choropleth"]} />` |
| `VesselLiveMap` | `<TraficoMap preset="maritimo" entity={{ type: "vessel", id: mmsi }} />` |
| `LocationMap` / `LocationMapSection` | `<TraficoMap preset="minimal" entity={...} initialView={...} />` |
| `StationLocationMap` | `<TraficoMap preset="combustible" entity={{ type: "gas-station", id }} />` |

Consumers **must not** import maplibre-gl directly. If a use case isn't covered, open a ticket for a new `preset` or `EntityType`.

---

## 11. Version & change policy

- Semver `v1.0` frozen 2026-04-17 for S0 launch
- Breaking changes require lead T2 + lead T1 sign-off (T1.9 `/ir` is a consumer)
- Additive props (new presets, new entity types, new controls) are non-breaking — ship freely
- Removals go through a one-sprint deprecation path

---

## 12. Smoke test (consumer-side)

```tsx
import { render } from "@testing-library/react";
import dynamic from "next/dynamic";

const TraficoMap = dynamic(() => import("@/components/map/TraficoMap").then(m => m.TraficoMap), { ssr: false });

// Minimal mount — should not crash, should render fullscreen-capable container
render(<TraficoMap preset="trafico-live" controls={{ fullscreen: true }} />);
```

Full visual test in `tests/visual/traficomap-presets.spec.ts` (owned by 2.9).
