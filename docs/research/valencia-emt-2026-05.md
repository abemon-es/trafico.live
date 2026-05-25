# Valencia EMT Real-Time Bus Positions — Replacement Endpoint Research

**Date:** 2026-05-25  
**Context:** `valencia.opendatasoft.com` is dead. Need replacement for the `fetchValencia()` ODS block in `services/collector/tasks/city-traffic/collector.ts`.

---

## Dead Endpoint (removed)

```
https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/
  estat-transit-temps-real-estado-trafico-tiempo-real/records
```

This was **road traffic state** (congestion levels), not bus positions. The current code fetches traffic segment state for `CityTrafficSensor` / `CityTrafficReading`. There is already a working ArcGIS fallback (`fetchValenciaArcGIS`) hitting:

```
https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/192/query
```

That ArcGIS source already covers the same road traffic state use case — so the ODS block can simply be dropped and `fetchValenciaArcGIS` promoted to primary.

---

## New Capability Found: Real-Time EMT Bus Positions

The geoportal ArcGIS MapServer has a separate service providing live bus GPS positions.

### Primary Endpoint

```
https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384/query
```

- **Layer 384:** "Buses EMT" — aggregate of all 40+ lines
- **Auth:** None (public, no API key)
- **Format:** JSON / GeoJSON / PBF
- **Spatial reference:** EPSG:25830 (UTM Zone 30N) by default; add `outSR=4326` for WGS84
- **Features today:** ~275 active buses (count confirmed live 2026-05-25)
- **MaxRecordCount:** 2,000
- **Update cadence:** Real-time tracking; the `fecha` field (ms timestamp) differs by seconds between buses
- **License:** Valencia City Council open data (geoportal.valencia.es); no explicit CC license stated on the service page, but the VLCi EMT dataset carrying the same data is CC BY 4.0

### Schema

| Field     | Type             | Notes                        |
|-----------|------------------|------------------------------|
| `gid`     | OID              | Auto-increment feature ID    |
| `linea`   | String (30)      | Line number, e.g. `"72"`, `"N1"` |
| `trayecto`| String (50)      | Route description, e.g. `"Sant Isidre - Est.del Nord"` |
| `fecha`   | Date (ms epoch)  | Last GPS update timestamp    |
| geometry  | esriGeometryPoint| X/Y in EPSG:25830 (→ 4326 via `outSR=4326`) |

### Sample Query (WGS84 output)

```
GET https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384/query
  ?where=1%3D1
  &outFields=gid,linea,trayecto,fecha
  &outSR=4326
  &f=json
```

Sample response feature:
```json
{
  "attributes": {
    "gid": 12345,
    "linea": "72",
    "trayecto": "Sant Isidre - Est.del Nord",
    "fecha": 1779725708000
  },
  "geometry": { "x": -0.403, "y": 39.451 }
}
```

### Secondary (per-line) Endpoint

```
https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/{layerId}/query
```

Layer IDs exist per line (4, 6, 7, 8, 9, 10–19, 23–32, 35, 40, 60–73, 81–99, N1–N10, C1–C3). The aggregate layer 384 is preferred.

### Alternative: `Seguimiento_Coches_EMT`

```
https://geoportal.valencia.es/arcgis/rest/services/EMT/Seguimiento_Coches_EMT/MapServer
```

Also public, same schema. Older endpoint path (`/arcgis/` not `/server/`). Use `Seguimiento_EMT` as primary.

---

## GTFS-RT Status

No GTFS-RT vehicle positions feed found for EMT Valencia. Transitland (`f-ezp8-emtvalencia`) only catalogues the static GTFS (available via NAP at `nap.transportes.gob.es`). The geoportal ArcGIS is the only real-time positions source.

---

## Integration Plan

### 1. Fix dead ODS block (drop it)

The ODS road-traffic block can be removed entirely. `fetchValenciaArcGIS()` already covers the same data. Just remove `"Valencia (ODS)"` from the `cities` array in `run()`.

### 2. Add new EMT bus positions collector

This goes in `transit-gtfs` task or a new `fetchValenciaEMT()` function. The data is *bus positions*, not road segments, so it maps to `TransitOperator` / vehicle tracking — **not** `CityTrafficSensor`. Best integrated into `services/collector/tasks/transit-gtfs/` or a new `services/collector/tasks/transit-emt-valencia/` task.

### Code snippet (TypeScript, drop-in fetch)

```typescript
const EMT_VLC_URL =
  "https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384/query" +
  "?where=1%3D1&outFields=gid,linea,trayecto,fecha&outSR=4326&f=json";

interface EmtBusFeature {
  attributes: {
    gid: number;
    linea: string;
    trayecto: string;
    fecha: number; // ms epoch
  };
  geometry: { x: number; y: number }; // WGS84 lon/lat
}

async function fetchValenciaEMTBuses(): Promise<EmtBusFeature[]> {
  const resp = await fetch(EMT_VLC_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`EMT Valencia API error: ${resp.status}`);

  const json = await resp.json() as {
    features?: EmtBusFeature[];
    error?: { message?: string };
    exceededTransferLimit?: boolean;
  };

  if (json.error) throw new Error(`EMT Valencia error: ${json.error.message}`);

  const features = json.features ?? [];

  // Validate coordinates (Valencia bounding box)
  return features.filter(
    (f) => f.geometry?.y >= 39.3 && f.geometry?.y <= 39.7 &&
           f.geometry?.x >= -0.6 && f.geometry?.x <= 0.1
  );
}
```

Note: `exceededTransferLimit` will be `true` if >2000 buses active. Unlikely for Valencia (fleet ~275 active). If it ever triggers, paginate with `resultOffset`.

---

## Recommendation

| Option | Data | Auth | Format | Reliability |
|--------|------|------|--------|-------------|
| Geoportal ArcGIS layer 384 | Real-time bus positions ~275 vehicles | None | JSON/GeoJSON | Live, confirmed 2026-05-25 |
| ODS `valencia.opendatasoft.com` | Road traffic state (DEAD) | None | JSON | Dead |
| EMT GTFS-RT | Not available | N/A | N/A | N/A |

**Use geoportal layer 384** for bus positions. It is the only live, no-auth, real-time source for EMT Valencia vehicles.

For the dead ODS road-traffic block: simply promote `fetchValenciaArcGIS()` (already in the codebase) as the sole Valencia road-traffic source.

---

## Sources

- [EMT/Seguimiento_EMT MapServer](https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer) — Valencia Geoportal, live 2026-05-25
- [Layer 384: Buses EMT](https://geoportal.valencia.es/server/rest/services/EMT/Seguimiento_EMT/MapServer/384) — field schema
- [EMT bus stops dataset (VLCi)](https://opendata.vlci.valencia.es/dataset/emt) — CC BY 4.0, geoportal-backed
- [Transitland EMT Valencia feed](https://www.transit.land/feeds/f-ezp8-emtvalencia) — static GTFS only, no RT
- [EMT Valencia Geoportal](https://www.emtvalencia.es/geoportal/) — official agency geoportal page
