# MAP-ARCHITECTURE.md — Contrato de unificación de mapas trafico.live

**Fecha:** 2026-04-17  
**Estado:** BLOQUEANTE — ningún código de mapa se escribe sin que este doc esté aprobado  
**Fuente:** `docs/audit-2026-04-17/VERDICT.md` + `docs/audit-2026-04-17/05-map-coverage.md`  
**Alcance:** Sustituir 9 componentes de mapa (~6200 líneas duplicadas) por un único `<TraficoMap>` controlado por un `LayerRegistry`.

---

## 1. Nomenclatura

### Componente principal

| Elemento | Nombre canónico | Ruta |
|----------|----------------|------|
| Componente React | `TraficoMap` | `src/components/map/TraficoMap.tsx` |
| Registro de capas | `LayerRegistry` | `src/lib/map-layers/registry.ts` |
| Grupos de capas | `LayerGroups` | `src/lib/map-layers/groups.ts` |
| Tipos TypeScript | (ver §4) | `src/lib/map-layers/types.ts` |
| Hooks de mapa | `useMapLayers`, `useMapEntity`, `useMapSync` | `src/lib/map-layers/hooks.ts` |

### Alias de tipos

```ts
// Unión literal de todos los IDs de capa canónicos (definidos en §3)
type LayerId =
  | "protomaps-base"
  | "world-countries"
  | "world-country-labels"
  | "road-stations"
  | "cameras"
  | "radars"
  | "panels"
  | "road-segments"
  | "roads-static"
  | "incidents"
  | "intensity-madrid"
  | "intensity-cities"
  | "roadworks"
  | "v16-beacons"
  | "live-speed"
  | "accidents-heatmap"
  | "imd-segments"
  | "mobility-od"
  | "railway-stations"
  | "railway-routes"
  | "railway-fleet"
  | "railway-alerts"
  | "ports"
  | "maritime-fuel"
  | "shipping-lanes"
  | "chokepoints"
  | "maritime-boundaries"
  | "vessels"
  | "maritime-emergencies"
  | "ocean-currents"
  | "maritime-forecast"
  | "transit-operators"
  | "transit-routes"
  | "transit-stops"
  | "transit-vehicles"
  | "ferry-routes"
  | "ferry-stops"
  | "airports"
  | "runways"
  | "aircraft"
  | "weather-alerts"
  | "weather-radar"
  | "climate-stations"
  | "ica-stations"
  | "gas-stations"
  | "ev-chargers"
  | "fuel-trend";

// Los 7 verticales de negocio más los contextos especiales
type VerticalId =
  | "maritimo"
  | "aviacion"
  | "trenes"
  | "trafico"
  | "transporte-publico"
  | "meteo"
  | "combustible";

// Preset = vertical + contextos especiales del componente
type MapPreset = VerticalId | "home" | "all" | "minimal";

// Agrupación funcional de capas
type LayerGroup =
  | "base"
  | "road.static"
  | "road.live"
  | "road.historical"
  | "rail.static"
  | "rail.live"
  | "maritime.static"
  | "maritime.live"
  | "transit.static"
  | "transit.live"
  | "air.static"
  | "air.live"
  | "meteo"
  | "airquality"
  | "fuel";

// Tipos de entidad para comportamiento de foco automático
type EntityType =
  | "road"
  | "vessel"
  | "port"
  | "train-station"
  | "rail-line"
  | "airport"
  | "flight"
  | "gas-station"
  | "weather-station"
  | "aq-station"
  | "radar"
  | "camera";
```

---

## 2. Convención de URLs (7 verticales)

### Estructura canónica

| Ruta | Propósito | Preset |
|------|-----------|--------|
| `/` | Home hero — showcase multimodal | `home` |
| `/mapa` | Dashboard pantalla completa, todas las capas | `all` |
| `/maritimo` | Hub marítimo + hero map + stats | `maritimo` |
| `/maritimo/mapa` | Mapa pantalla completa vertical marítima | `maritimo` + `fullscreen: true` |
| `/aviacion` | Hub aviación + hero map + stats | `aviacion` |
| `/aviacion/mapa` | Mapa pantalla completa vertical aviación | `aviacion` + `fullscreen: true` |
| `/trenes` | Hub ferroviario + hero map + stats | `trenes` |
| `/trenes/mapa` | Mapa pantalla completa vertical ferroviaria | `trenes` + `fullscreen: true` |
| `/trafico` | Hub tráfico + hero map + stats | `trafico` |
| `/trafico/mapa` | Mapa pantalla completa vertical tráfico | `trafico` + `fullscreen: true` |
| `/transporte-publico` | Hub transporte público + hero map | `transporte-publico` |
| `/transporte-publico/mapa` | Mapa pantalla completa transporte público | `transporte-publico` + `fullscreen: true` |
| `/meteo` | Hub meteorología + hero map + estaciones | `meteo` |
| `/meteo/mapa` | Mapa pantalla completa meteorología | `meteo` + `fullscreen: true` |
| `/combustible` | Hub combustible + hero map + precios | `combustible` |
| `/combustible/mapa` | Mapa pantalla completa combustible | `combustible` + `fullscreen: true` |

### Páginas de entidad (patrón existente — no cambian)

| Entidad | Ruta |
|---------|------|
| Buque AIS | `/maritimo/buques/[slug]` |
| Puerto | `/maritimo/puertos/[slug]` |
| Carretera | `/carretera/[ref]` |
| Línea ferroviaria | `/trenes/lineas/[slug]` |
| Estación de tren | `/trenes/estaciones/[slug]` |
| Aeropuerto | `/aviacion/aeropuertos/[iata]` |
| Vuelo | `/aviacion/vuelos/[callsign]` |
| Gasolinera | `/gasolineras/[id]` |
| Estación meteorológica | `/meteo/estaciones/[slug]` |
| Estación calidad aire | `/calidad-aire/estaciones/[slug]` |
| Radar | `/radares/[id]` |
| Cámara | `/camaras/[id]` |

---

## 3. Registro de capas — 42 capas canónicas

La columna **visibilidad por defecto** usa: `ON` = activa al cargar, `OFF` = disponible pero desactivada, `—` = no disponible en ese preset.

### Grupo `base`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `protomaps-base` | `base` | pmtiles | `trafico-planet.pmtiles` (Planetiler) | ON | ON | ON | ON | ON | ON | ON | ON | ON | No |
| `world-countries` | `base` | geojson | `/geo/world/countries.geojson` | ON | ON | ON | ON | ON | ON | ON | ON | ON | No |
| `world-country-labels` | `base` | geojson | `/geo/world/labels.geojson` | ON | ON | ON | ON | ON | ON | ON | ON | ON | No |

### Grupo `road.static`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `road-stations` | `road.static` | pmtiles | `stations.pmtiles` → `TrafficStation` | OFF | — | — | — | ON | — | — | — | ON | No |
| `cameras` | `road.static` | pmtiles | `cameras.pmtiles` → `Camera` | OFF | — | — | — | OFF | — | — | — | ON | Sí (`camera`) |
| `radars` | `road.static` | pmtiles | `radars.pmtiles` → `Radar` | OFF | — | — | — | OFF | — | — | — | ON | Sí (`radar`) |
| `panels` | `road.static` | pmtiles | `panels.pmtiles` → `VariablePanel` | OFF | — | — | — | OFF | — | — | — | ON | No |
| `road-segments` | `road.static` | pmtiles | `road-segments.pmtiles` → `TrafficFlow` | OFF | — | — | — | ON | — | — | — | ON | No |
| `roads-static` | `road.static` | geojson | `/geojson/highways.json` | ON | ON | ON | ON | ON | ON | ON | ON | ON | No |

### Grupo `road.live`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `incidents` | `road.live` | martin | `tile_incidents` → `TrafficIncident` | ON | OFF | OFF | OFF | ON | OFF | OFF | OFF | ON | No |
| `intensity-madrid` | `road.live` | martin | `tile_sensors` → `TrafficIntensity` | OFF | — | — | — | ON | — | — | — | ON | No |
| `intensity-cities` | `road.live` | martin | `tile_city_sensors` → `CityTrafficSensor` | OFF | — | — | — | ON | — | — | — | ON | No |
| `roadworks` | `road.live` | martin | `tile_roadworks` → `RoadworksZone` | OFF | — | — | — | ON | — | — | — | ON | No |
| `v16-beacons` | `road.live` | geojson | `/api/v16` → `V16BeaconEvent` | OFF | — | — | — | ON | — | — | — | ON | No |
| `live-speed` | `road.live` | geojson | `/api/roads/live-speed` → `Road` | OFF | — | — | — | ON | — | — | — | ON | No |

### Grupo `road.historical`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `accidents-heatmap` | `road.historical` | pmtiles | `accidents.pmtiles` → `AccidentMicrodata` | — | — | — | — | OFF | — | — | — | ON | No |
| `imd-segments` | `road.historical` | pmtiles | `road-segments.pmtiles` (IMD attr) → `TrafficFlow` | — | — | — | — | OFF | — | — | — | ON | No |
| `mobility-od` | `road.historical` | geojson | `/api/movilidad` → `MobilityODFlow` | — | — | — | — | OFF | — | — | — | ON | No |

### Grupo `rail.static`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `railway-stations` | `rail.static` | pmtiles | `railway-stations.pmtiles` → `RailwayStation` | OFF | — | — | ON | OFF | OFF | — | — | ON | Sí (`train-station`) |
| `railway-routes` | `rail.static` | pmtiles | `railway-routes.pmtiles` → `RailwayRoute` | OFF | — | — | ON | OFF | — | — | — | ON | Sí (`rail-line`) |

### Grupo `rail.live`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `railway-fleet` | `rail.live` | martin | `tile_fleet` → `RenfeFleetPosition` | OFF | — | — | ON | — | — | — | — | ON | No |
| `railway-alerts` | `rail.live` | geojson | `/api/trenes/alertas` → `RailwayAlert` | OFF | — | — | OFF | — | — | — | — | ON | No |

### Grupo `maritime.static`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ports` | `maritime.static` | pmtiles | `ports.pmtiles` → `SpanishPort` | OFF | ON | — | — | — | — | — | — | ON | Sí (`port`) |
| `maritime-fuel` | `maritime.static` | geojson | `/api/maritime-stations` → `MaritimeStation` | — | OFF | — | — | — | — | — | ON | ON | No |
| `shipping-lanes` | `maritime.static` | pmtiles | `trafico-planet.pmtiles` (capa basemap) | OFF | ON | OFF | — | — | — | — | — | ON | No |
| `chokepoints` | `maritime.static` | pmtiles | `trafico-planet.pmtiles` (capa basemap) | OFF | ON | — | — | — | — | — | — | ON | No |
| `maritime-boundaries` | `maritime.static` | pmtiles | `trafico-planet.pmtiles` (capa basemap) | OFF | ON | — | — | — | — | — | — | ON | No |

### Grupo `maritime.live`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `vessels` | `maritime.live` | martin | `tile_vessels` → `VesselPosition` + `Vessel` | OFF | ON | — | — | — | — | — | — | ON | Sí (`vessel`) |
| `maritime-emergencies` | `maritime.live` | martin | `tile_emergencies` → `MaritimeEmergency` | — | OFF | — | — | — | — | — | — | ON | No |
| `ocean-currents` | `maritime.live` | pmtiles | `trafico-planet.pmtiles` (capa basemap) | — | ON | — | — | — | — | — | — | ON | No |
| `maritime-forecast` | `maritime.live` | geojson | `/api/maritimo/forecast` → `MaritimeWeatherForecast` | — | OFF | — | — | — | — | — | — | ON | No |

### Grupo `transit.static`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `transit-operators` | `transit.static` | geojson | `/api/transporte` → `TransitOperator` | — | — | — | — | — | ON | — | — | ON | No |
| `transit-routes` | `transit.static` | pmtiles | `transit-routes.pmtiles` → `TransitRoute` | — | — | — | — | — | ON | — | — | ON | No |
| `transit-stops` | `transit.static` | pmtiles | `transit-stops.pmtiles` → `TransitStop` | — | — | — | — | — | ON | — | — | ON | No |

### Grupo `transit.live`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `transit-vehicles` | `transit.live` | martin | `tile_transit_vehicles` → `TransitVehiclePosition` | — | — | — | — | — | OFF | — | — | ON | No |
| `ferry-routes` | `transit.live` | pmtiles | `ferry-routes.pmtiles` → `FerryRoute` | — | ON | — | — | — | OFF | — | — | ON | No |
| `ferry-stops` | `transit.live` | pmtiles | `ferry-stops.pmtiles` → `FerryStop` | — | ON | — | — | — | — | — | — | ON | No |

### Grupo `air.static`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `airports` | `air.static` | pmtiles | `airports.pmtiles` → `Airport` | OFF | — | ON | — | — | — | — | — | ON | Sí (`airport`) |
| `runways` | `air.static` | geojson | `/data/runways.json` (estático) | — | — | OFF | — | — | — | — | — | ON | Sí (`airport`) |

### Grupo `air.live`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `aircraft` | `air.live` | martin | `tile_aircraft` → `AircraftPosition` | OFF | OFF | ON | — | — | — | — | — | ON | Sí (`flight`) |

### Grupo `meteo`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `weather-alerts` | `meteo` | geojson | `/api/weather` → `WeatherAlert` | OFF | OFF | ON | OFF | OFF | — | ON | — | ON | No |
| `weather-radar` | `meteo` | geojson | EUMETSAT OPERA (P2, no v1) | — | — | — | — | — | — | OFF | — | ON | No |
| `climate-stations` | `meteo` | pmtiles | `climate-stations.pmtiles` → `ClimateStation` | — | — | — | — | — | — | ON | — | ON | Sí (`weather-station`) |

### Grupo `airquality`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ica-stations` | `airquality` | pmtiles | `air-quality.pmtiles` → `AirQualityStation` | OFF | — | — | — | OFF | — | ON | — | ON | Sí (`aq-station`) |

### Grupo `fuel`

| `LayerId` | Grupo | Tipo fuente | Ref fuente | home | maritimo | aviacion | trenes | trafico | tp | meteo | combustible | all | Contexto entidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `gas-stations` | `fuel` | pmtiles | `gas-stations.pmtiles` → `GasStation` | OFF | — | — | — | — | — | — | ON | ON | Sí (`gas-station`) |
| `ev-chargers` | `fuel` | pmtiles | `chargers.pmtiles` → `EVCharger` | OFF | — | — | — | — | — | — | ON | ON | No |
| `fuel-trend` | `fuel` | geojson | `/api/combustible/tendencia` → `CNMCFuelPrice` | — | — | — | — | — | — | — | OFF | ON | No |

---

## 4. API del componente — props de `<TraficoMap>`

```ts
// src/lib/map-layers/types.ts

export type LayerId = /* unión literal completa — ver §1 */

export type VerticalId =
  | "maritimo" | "aviacion" | "trenes" | "trafico"
  | "transporte-publico" | "meteo" | "combustible";

export type MapPreset = VerticalId | "home" | "all" | "minimal";

export type LayerGroup =
  | "base" | "road.static" | "road.live" | "road.historical"
  | "rail.static" | "rail.live" | "maritime.static" | "maritime.live"
  | "transit.static" | "transit.live" | "air.static" | "air.live"
  | "meteo" | "airquality" | "fuel";

export type EntityType =
  | "road" | "vessel" | "port" | "train-station" | "rail-line"
  | "airport" | "flight" | "gas-station" | "weather-station"
  | "aq-station" | "radar" | "camera";

export interface MapEntity {
  type: EntityType;
  /** Identificador único: slug, MMSI, IATA, id numérico, etc. */
  id: string;
}

export interface MapControls {
  /** Panel de toggles de capas. Default: true */
  layerPanel?: boolean;
  /** Botón light/dark. Default: true */
  themeToggle?: boolean;
  /** Buscador Cmd+K integrado. Default: true */
  search?: boolean;
  /** Leyenda flotante. Default: true */
  legend?: boolean;
  /**
   * Botón de pantalla completa.
   * Default: false — solo true en rutas /[vertical]/mapa y /mapa.
   * En embeds siempre false para no contaminar la URL del host.
   */
  fullscreen?: boolean;
}

export interface MapInitialView {
  center?: [lon: number, lat: number];
  zoom?: number;
  /** Alternativa a center+zoom. El mapa hace fitBounds al cargar. */
  bounds?: [[lon: number, lat: number], [lon: number, lat: number]];
}
```

```ts
// src/components/map/TraficoMap.tsx

interface TraficoMapProps {
  /**
   * Preset de visibilidad inicial.
   * - VerticalId: activa las capas del vertical (ver tabla §5)
   * - "home": showcase multimodal, capas ON mínimas para rendimiento
   * - "all": dashboard, todas las capas disponibles (algunas OFF por defecto)
   * - "minimal": solo basemap + provincias, sin datos. Para embeds en páginas de entidad.
   * Default: "home"
   */
  preset?: MapPreset;

  /**
   * Lista explícita de LayerIds activas al cargar.
   * Cuando se provee, SOBREESCRIBE las capas ON del preset.
   * Las capas en availableLayers pero no en initialLayers quedan OFF.
   * Default: undefined (se usan los defaults del preset)
   */
  initialLayers?: LayerId[];

  /**
   * Qué capas son togglables desde el LayerPanel.
   * Cuando se omite, se exponen todas las capas del preset.
   * Usar para restringir el panel en páginas de entidad.
   * Default: undefined (todas las capas del preset)
   */
  availableLayers?: LayerId[];

  /**
   * Entidad de contexto: auto-zoom, highlight y activación de capas relacionadas.
   * Ver §6 para comportamiento completo por EntityType.
   */
  entity?: MapEntity;

  /**
   * Controles de UI. Cada booleano activa/desactiva un elemento.
   * Ver tipo MapControls para defaults individuales.
   */
  controls?: MapControls;

  /**
   * Vista inicial. Si se provee entity, initialView se ignora y el mapa
   * hace zoom a la entidad.
   * Default: península ibérica completa (center: [-4.0, 39.6], zoom: 5.2)
   */
  initialView?: MapInitialView;

  /**
   * Tema de color del basemap.
   * "auto" sigue prefers-color-scheme del sistema.
   * Default: "auto"
   */
  theme?: "light" | "dark" | "auto";

  /**
   * Sincroniza el estado del mapa con la URL (?layers=x,y&zoom=n&lat=x&lng=y).
   * Default: false
   * Razón: false por defecto porque los embeds (iframes, widgets) no deben
   * contaminar la URL del host. Solo activar en /mapa y /[vertical]/mapa.
   */
  syncUrl?: boolean;

  /**
   * Callback al hacer click en una feature de cualquier capa.
   * Recibe el EntityType inferido + el id de la feature.
   */
  onEntityClick?: (entity: MapEntity) => void;

  /**
   * Slot lateral — sidebar, stats panel, filtros.
   * Se renderiza fuera del canvas de MapLibre pero dentro del contenedor del mapa.
   */
  children?: React.ReactNode;

  /** Clase CSS adicional para el contenedor externo. */
  className?: string;
}
```

---

## 5. Tabla preset → capas activas por defecto

`ON` = activa al cargar | `OFF` = disponible en panel, desactivada | `—` = no disponible

| Capa | home | maritimo | aviacion | trenes | trafico | transp. | meteo | combustible | all | minimal |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **BASE** | | | | | | | | | | |
| `protomaps-base` | ON | ON | ON | ON | ON | ON | ON | ON | ON | ON |
| `world-countries` | ON | ON | ON | ON | ON | ON | ON | ON | ON | ON |
| `world-country-labels` | ON | ON | ON | ON | ON | ON | ON | ON | ON | ON |
| `roads-static` | ON | ON | ON | ON | ON | ON | ON | ON | ON | ON |
| **ROAD STATIC** | | | | | | | | | | |
| `road-stations` | — | — | — | — | ON | — | — | — | ON | — |
| `cameras` | — | — | — | — | OFF | — | — | — | ON | — |
| `radars` | — | — | — | — | OFF | — | — | — | ON | — |
| `panels` | — | — | — | — | OFF | — | — | — | ON | — |
| `road-segments` | — | — | — | — | ON | — | — | — | ON | — |
| **ROAD LIVE** | | | | | | | | | | |
| `incidents` | ON | OFF | OFF | OFF | ON | OFF | OFF | OFF | ON | — |
| `intensity-madrid` | — | — | — | — | ON | — | — | — | ON | — |
| `intensity-cities` | — | — | — | — | ON | — | — | — | ON | — |
| `roadworks` | — | — | — | — | ON | — | — | — | ON | — |
| `v16-beacons` | — | — | — | — | ON | — | — | — | ON | — |
| `live-speed` | — | — | — | — | OFF | — | — | — | ON | — |
| **ROAD HISTORICAL** | | | | | | | | | | |
| `accidents-heatmap` | — | — | — | — | OFF | — | — | — | ON | — |
| `imd-segments` | — | — | — | — | OFF | — | — | — | ON | — |
| `mobility-od` | — | — | — | — | OFF | — | — | — | ON | — |
| **RAIL STATIC** | | | | | | | | | | |
| `railway-stations` | OFF | — | — | ON | OFF | OFF | — | — | ON | — |
| `railway-routes` | OFF | — | — | ON | OFF | — | — | — | ON | — |
| **RAIL LIVE** | | | | | | | | | | |
| `railway-fleet` | OFF | — | — | ON | — | — | — | — | ON | — |
| `railway-alerts` | — | — | — | OFF | — | — | — | — | ON | — |
| **MARITIME STATIC** | | | | | | | | | | |
| `ports` | OFF | ON | — | — | — | — | — | — | ON | — |
| `maritime-fuel` | — | OFF | — | — | — | — | — | ON | ON | — |
| `shipping-lanes` | OFF | ON | OFF | — | — | — | — | — | ON | — |
| `chokepoints` | OFF | ON | — | — | — | — | — | — | ON | — |
| `maritime-boundaries` | OFF | ON | — | — | — | — | — | — | ON | — |
| **MARITIME LIVE** | | | | | | | | | | |
| `vessels` | OFF | ON | — | — | — | — | — | — | ON | — |
| `maritime-emergencies` | — | OFF | — | — | — | — | — | — | ON | — |
| `ocean-currents` | — | ON | — | — | — | — | — | — | ON | — |
| `maritime-forecast` | — | OFF | — | — | — | — | — | — | ON | — |
| **TRANSIT STATIC** | | | | | | | | | | |
| `transit-operators` | — | — | — | — | — | ON | — | — | ON | — |
| `transit-routes` | — | — | — | — | — | ON | — | — | ON | — |
| `transit-stops` | — | — | — | — | — | ON | — | — | ON | — |
| **TRANSIT LIVE** | | | | | | | | | | |
| `transit-vehicles` | — | — | — | — | — | OFF | — | — | ON | — |
| `ferry-routes` | — | ON | — | — | — | OFF | — | — | ON | — |
| `ferry-stops` | — | ON | — | — | — | — | — | — | ON | — |
| **AIR STATIC** | | | | | | | | | | |
| `airports` | OFF | — | ON | — | — | — | — | — | ON | — |
| `runways` | — | — | OFF | — | — | — | — | — | ON | — |
| **AIR LIVE** | | | | | | | | | | |
| `aircraft` | OFF | OFF | ON | — | — | — | — | — | ON | — |
| **METEO** | | | | | | | | | | |
| `weather-alerts` | OFF | OFF | ON | OFF | OFF | — | ON | — | ON | — |
| `weather-radar` | — | — | — | — | — | — | OFF | — | ON | — |
| `climate-stations` | — | — | — | — | — | — | ON | — | ON | — |
| **AIRQUALITY** | | | | | | | | | | |
| `ica-stations` | OFF | — | — | — | OFF | — | ON | — | ON | — |
| **FUEL** | | | | | | | | | | |
| `gas-stations` | OFF | — | — | — | — | — | — | ON | ON | — |
| `ev-chargers` | OFF | — | — | — | — | — | — | ON | ON | — |
| `fuel-trend` | — | — | — | — | — | — | — | OFF | ON | — |

---

## 6. Comportamiento dirigido por entidad

Cuando se pasa `entity` a `<TraficoMap>`, el componente:
1. Activa el subset de capas mínimo necesario para la entidad.
2. Hace zoom automático a la feature.
3. Aplica el estilo de highlight correspondiente.
4. Las capas adicionales del preset siguen disponibles en el panel.

| `EntityType` | Capas auto-activadas | Zoom | Highlight |
|---|---|---|---|
| `road` | `road-segments`, `incidents`, `roadworks` | 10 | Outline pulsante `tl-600` 3px sobre el segmento |
| `vessel` | `vessels`, `ports`, `shipping-lanes` | 9 | Círculo pulsante `tl-amber-400` con halo animado |
| `port` | `ports`, `vessels`, `ferry-routes`, `ferry-stops` | 11 | Outline `tl-300` 2px + fill semitransparente |
| `train-station` | `railway-stations`, `railway-routes` | 13 | Pulse `tl-600` sobre el punto de la estación |
| `rail-line` | `railway-routes`, `railway-stations`, `railway-fleet` | 8 | Línea engrosada `tl-600` con opacity aumentada |
| `airport` | `airports`, `runways`, `aircraft` | 12 | Outline `tl-400` + fill `tl-100/30` sobre polígono |
| `flight` | `aircraft`, `airports` | 8 | Símbolo destacado con sombra + trayectoria si disponible |
| `gas-station` | `gas-stations` | 15 | Marker ampliado `tl-amber-500` con info popup |
| `weather-station` | `climate-stations` | 13 | Pulse `tl-300` sobre el punto |
| `aq-station` | `ica-stations` | 13 | Pulse coloreado según índice ICA (1-6) |
| `radar` | `radars` | 14 | Outline `tl-200` + cobertura radial `tl-100/20` |
| `camera` | `cameras` | 16 | Marker `tl-600` ampliado + thumbnail si disponible |

**Nota:** El highlight nunca usa `linear` en animaciones. Siempre `spring` (Motion) o `easeOut`. Respetar `prefers-reduced-motion`: si está activo, se suprime el pulsado y se usa solo el outline estático.

---

## 7. Plan de migración

Las fases siguen exactamente la recomendación del `VERDICT.md` §3 P1.

### Fase 1 — Este PR (proof of concept)
**Objetivo:** Registry funcional + `<TraficoMap>` que reemplaza `/maritimo/mapa`.

| Tarea | Archivos | Criterio de aceptación |
|---|---|---|
| Definir tipos en `types.ts` | `src/lib/map-layers/types.ts` | `tsc --noEmit` pasa |
| Implementar `registry.ts` con los 42 `LayerId` | `src/lib/map-layers/registry.ts` | Todas las capas de §3 registradas |
| Implementar `groups.ts` con mapping grupo→capas | `src/lib/map-layers/groups.ts` | Lookup bidireccional funciona |
| Implementar `hooks.ts` (`useMapLayers`, `useMapEntity`) | `src/lib/map-layers/hooks.ts` | Hook controla visibilidad sin rerender del canvas |
| Construir `TraficoMap.tsx` (MVP) | `src/components/map/TraficoMap.tsx` | Acepta todas las props de §4 |
| Migrar `src/app/maritimo/mapa/page.tsx` | Borrar `MaritimeMap.tsx` legacy | `/maritimo/mapa` funciona igual |
| Tests unitarios del registry | `src/__tests__/map-layers/` | Preset `maritimo` devuelve las capas ON correctas |

### Fase 2 — Hubs + pantalla completa (5 verticales)
**Objetivo:** `<TraficoMap preset="[vertical]">` en todas las rutas hub + `/[vertical]/mapa`.

Verticales: `maritimo`, `aviacion`, `trenes`, `trafico`, `transporte-publico`.

Acciones por vertical:
- Crear `/[vertical]/mapa/page.tsx` con `<TraficoMap preset="…" controls={{ fullscreen: true }} syncUrl />`.
- Integrar `<TraficoMap>` en el hero del hub (`/[vertical]/page.tsx`) con `controls={{ fullscreen: false }}`.
- Borrar el componente legado específico de ese vertical.

### Fase 3 — Vistas de entidad
**Objetivo:** Todas las páginas de entidad usan `<TraficoMap entity={…} preset="minimal">`.

Entidades a migrar: vessel, port, train-station, rail-line, airport, flight, gas-station, weather-station, aq-station, radar, camera.

Acciones:
- Implementar `useMapEntity` en `hooks.ts` (auto-zoom + highlight vía el registry).
- Instalar `<TraficoMap entity={{ type, id }} preset="minimal">` en cada detail page.
- Conectar `onEntityClick` para navegación between entidades del mismo tipo.

### Fase 4 — Migración completa + borrado de legado
**Objetivo:** Eliminar los 9 componentes de mapa restantes.

Componentes a borrar (tras migrar todos sus usos):
- `UnifiedMap.tsx`
- `TrafficMap.tsx`
- `InteractiveBaseMap.tsx`
- `HistoricalMap.tsx`
- `EmbedMap.tsx`
- `AnimatedFlowOverlay.tsx` (absorber en registry)
- `ProvinceHeatmap.tsx` (absorber como capa `road.historical`)
- `MapComparator.tsx` (feature no crítica, evaluar si se mantiene como wrapper de dos `<TraficoMap>`)
- `WeatherRadarOverlay.tsx` (absorber en capa `weather-radar`)

Criterio: `grep -r "UnifiedMap\|TrafficMap\|InteractiveBaseMap\|HistoricalMap\|EmbedMap" src/` devuelve 0 resultados.

### Fase 5 — Soporte embed + documentación
**Objetivo:** Iframe embeds para medios y B2B.

| Tarea | Detalle |
|---|---|
| Crear `/embed/[vertical]/page.tsx` | `<TraficoMap preset="[vertical]" controls={{ layerPanel: false, search: false, legend: true, fullscreen: false }} syncUrl={false} />` |
| Parámetros de embed vía query string | `?layers=vessels,ports&zoom=7&theme=dark` |
| Documentación de embed | `docs/embed-map.md` |
| Rate limiting por `Referer` | Embeds externos requieren API key en headers |

---

## 8. Lo que explícitamente NO se hace en este refactor

Estas decisiones son definitivas para evitar scope creep:

| Fuera de alcance | Razón |
|---|---|
| Cambiar el basemap (Protomaps) | Ya es el tileset mundial propio; no hay alternativa mejor ni necesaria |
| Reescribir el tile server (nginx + Martin) | Infraestructura sólida; `services/tiles/` y `services/martin/` no se tocan |
| Reescribir la página de buque en tiempo real (`/maritimo/buques/[slug]`) | Es una especialización válida que usará `<TraficoMap entity={{ type: "vessel", id }}>`; no es legado |
| Herramientas de dibujo (draw tools) | No en v1; requiere plugin separado y caso de uso B2B definido |
| Terreno 3D | No en v1; requires `maplibre-gl-terrain` + DEM tiles no generados |
| Planificador de rutas (UI) | No en v1; OpenTripPlanner es P3 en VERDICT.md |
| Migrar fuentes de datos (APIs) | Este refactor solo mueve la capa de visualización; los endpoints no cambian |
| Resolver la duplicación `incidents-circle` vs DOM markers | Se elimina la capa DOM en Fase 1; `TraficoMap` usa solo el tile Martin |

---

## 9. Restricciones no negociables

Todo código que toque `<TraficoMap>` o el `LayerRegistry` debe cumplir:

### Tema
- El prop `theme="auto"` lee `prefers-color-scheme` vía `window.matchMedia`.
- El cambio de tema aplica en caliente sin reinicializar MapLibre: swap del estilo Protomaps (light ↔ dark) vía `map.setStyle()` preservando fuentes de datos.
- Los tokens `tl-*` del estilo CSS se aplican a todos los controles de UI del mapa.

### Accesibilidad y movimiento
- Todas las animaciones de highlight usan `motion/react` con `spring` o `easeOut`.
- Wrapper `useReducedMotion()` de Motion: si el usuario tiene `prefers-reduced-motion: reduce`, se suprimen pulsos y halos animados. El outline estático permanece.
- Las animaciones de flujo (`AnimatedFlowOverlay`) también respetan `prefers-reduced-motion`.

### Labels
- `forceSpanishLabels` se llama al cargar y en cada swap de estilo. Con Planetiler los labels son nativos en español; la función es no-op pero **se mantiene** para garantizar el contrato en futuros cambios de basemap.

### Tokens de color
- Ninguna capa puede usar hex directo. Todos los colores de capa deben referenciar las variables CSS `--tl-*` o las constantes de `MAP_COLORS` en `map-config.ts`.
- Prohibido: colores de Tailwind genéricos (`blue-500`, `green-400`) en props de capas MapLibre.

### Tipografía
- Los controles de UI del mapa (legend, layer panel, tooltips) usan:
  - Exo 2 para encabezados de grupo de capas.
  - DM Sans para labels de capas y tooltips.
  - JetBrains Mono para valores numéricos (velocidades, IMD, ICA, coordenadas).

---

## Apéndice A — Archivos críticos para la implementación

| Archivo | Por qué importa |
|---|---|
| `src/lib/map-tiles.ts` | Define `TILE_SOURCES` y `LAYER_STYLES` — el registry los consume, no los reimplementa |
| `src/lib/map-config.ts` | `MAP_STYLE_PROTOMAPS` / `MAP_STYLE_PROTOMAPS_DARK` — el único basemap permitido |
| `src/lib/map-layers/registry.ts` | Fuente de verdad de los 42 `LayerId` y sus defaults por preset |
| `src/components/map/TraficoMap.tsx` | Único componente de mapa de aquí en adelante |
| `prisma/schema.prisma` | Valida que los modelos referenciados en §3 existen y tienen los campos geométricos esperados |

## Apéndice B — Decisiones que se desvían del brief original

| Punto | Brief | Decisión adoptada | Razón |
|---|---|---|---|
| `accidents-heatmap` en `road.historical` | Brief lo incluye en `road.historical` | Mantenida pero marcada `OFF` en todos los presets excepto `all` | El tile `accidents.pmtiles` aún no está generado (VERDICT §3 P1 #7); activarlo ON causaría un error de fuente hasta que se publique |
| `weather-radar` | Brief no especifica fuente | Fuente: EUMETSAT OPERA, marcada como P2 en VERDICT | No disponible en v1; el layer existe en el registry pero `OFF` en todos los presets hasta Fase 2 |
| `maritime-fuel` | Brief lo pone en `maritime.static` | Incluido en `maritime.static` pero ON solo en preset `combustible`, OFF en `maritimo` | La capa de precios marítimos es relevante para el vertical de combustible, no para la navegación marítima general |
| `mobility-od` | Brief lo pone en `road.historical` | Marcado `OFF` en `trafico`, `ON` (disponible) en `all` | Los datos están en DB pero la visualización de flujo O-D requiere un tipo de layer chord/flow no estándar en MapLibre; se incluye en registry pero la implementación es Fase 3 |
