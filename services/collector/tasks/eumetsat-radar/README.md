# eumetsat-radar collector

Fetches composite precipitation radar imagery for Spain every 15 minutes and writes PNG tiles to disk.

## Data sources

### Primary — EUMETSAT Data Store

- **URL:** https://api.eumetsat.int
- **Auth:** OAuth2 `client_credentials` — requires `EUMETSAT_USER` + `EUMETSAT_KEY` env vars
- **Product:** MSG precipitation composite (dataset `EO:EUM:DAT:MSG:H-SEVI-MSG15-0100-NA`)
- **Coverage:** Full Europe including Iberian Peninsula and Canary Islands
- **Attribution:** © EUMETSAT — https://www.eumetsat.int

To obtain credentials: register at https://eoportal.eumetsat.int and request access to the MSG precipitation product.

### Fallback — RainViewer public API

Used automatically when `EUMETSAT_USER` / `EUMETSAT_KEY` are absent or EUMETSAT fetch fails.

- **Index URL:** `https://api.rainviewer.com/public/weather-maps.json`
- **Auth:** None required
- **Tile format:** PNG 256×256 at zoom 5, XYZ scheme
- **Coverage tiles (z=5):** x=14-16, y=12-13 (Iberia) + x=13, y=14 (Canarias)
- **Attribution:** https://www.rainviewer.com/api.html

## Cadence

Every 15 minutes (`*/15 * * * *`). Cron entry registered by T3.1 coordinator in `docker-compose.collectors.yml`.

## Output directory

All files are written to `/app/public/radar/` (mapped to the web container's `public/` volume):

| File | Description |
|------|-------------|
| `latest.png` | Most recent radar frame (representative tile for RainViewer, full image for EUMETSAT) |
| `{timestamp}.png` | Per-frame archive — `timestamp` is Unix seconds |
| `{timestamp}/` | (RainViewer only) directory with individual tiles `{x}_{y}.png` |
| `latest-meta.json` | Machine-readable metadata for frontend consumption |

### `latest-meta.json` schema

```json
{
  "frame_at": "2026-04-17T10:30:00.000Z",
  "timestamp": 1713347400,
  "source": "rainviewer",
  "coverage_bbox": { "west": -9.5, "east": 4.4, "south": 35.7, "north": 43.8 },
  "tile_zoom": 5,
  "tile_count": 7,
  "bytes": 45123,
  "generated_at": "2026-04-17T10:31:05.000Z"
}
```

`source` is `"eumetsat"` or `"rainviewer"`.

## Retention

Frames older than 24 hours are automatically deleted on each run. `latest.png` is always preserved.

## Heartbeat

On success, emits `CollectorHeartbeat` with `task="eumetsat-radar"`, `status="ok"`, and `{ frame_at, source, bytes }`.
On failure, emits `status="error"` and re-throws so the dispatcher exits with code 1.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EUMETSAT_USER` | Optional | EUMETSAT Data Store username |
| `EUMETSAT_KEY` | Optional | EUMETSAT Data Store API key |

If both are absent, RainViewer fallback is used and a warning is printed once to stdout.

## Map integration (T2 responsibility)

The frontend map overlay (`/mapa`, `/meteo`) should:

1. Read `latest-meta.json` to determine `source`, `timestamp`, and `tile_zoom`
2. For **RainViewer source**: use XYZ tile URL `/radar/{timestamp}/{z}/{x}/{y}.png` via nginx static serving (or a Next.js API route rewriting to the per-frame directories)
3. For **EUMETSAT source**: use `latest.png` as a full-extent raster overlay with `coverage_bbox` as the bounds

## Known limitations

- **EUMETSAT path untested without credentials.** The OAuth2 flow and dataset ID are based on published EUMETSAT API documentation; exact product paths may differ depending on the subscription level. Will fall back to RainViewer automatically.
- **No image stitching.** RainViewer tiles are saved individually; `latest.png` is a single representative tile. Full composite stitching would require `canvas` or `sharp` (native dependencies not added per constraints). T2 should render tiles natively via MapLibre XYZ source.
- **RainViewer rate limits.** Anonymous access; no SLA. If rate-limited, the run produces a heartbeat error and the previous `latest.png` remains intact.
- **EUMETSAT product availability.** MSG precipitation composites have ~15-min latency; some products require specific data subscription tiers.
