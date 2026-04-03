# trafico.live Tile Server

Self-hosted map tile server for all trafico.live maps. Serves Protomaps PMTiles basemap with Spanish labels, font glyphs, and dynamic vector tiles via Martin.

## Architecture

```
Browser (MapLibre GL JS)
  │
  ├─ pmtiles://https://tiles.trafico.live/spain.pmtiles   ← Static basemap tiles
  ├─ https://tiles.trafico.live/fonts/{fontstack}/{range}.pbf  ← Font glyphs
  ├─ https://tiles.trafico.live/sprites/v4/light.json     ← Sprite assets
  └─ https://tiles.trafico.live/dynamic/{table}/{z}/{x}/{y} ← Live PostGIS (future)
```

## URLs

| Endpoint | Purpose | Cache |
|----------|---------|-------|
| `https://tiles.trafico.live/health` | Health check | none |
| `https://tiles.trafico.live/spain.pmtiles` | Basemap PMTiles (range requests) | 24h |
| `https://tiles.trafico.live/fonts/{fontstack}/{range}.pbf` | Font glyphs | 7d |
| `https://tiles.trafico.live/sprites/v4/{theme}.json` | Sprite metadata | 7d |
| `https://tiles.trafico.live/dynamic/*` | Martin live tiles (future) | 60s |

## Stack

- **Server:** hetzner-prod (168.119.34.248)
- **Container:** `trafico-tiles` (nginx:alpine + custom config)
- **Network:** Coolify's `coolify` Docker network
- **Routing:** Traefik v3.6 via file provider (`/data/coolify/proxy/dynamic/tiles.yaml`)
- **SSL:** Let's Encrypt via Traefik ACME
- **DNS:** `tiles.trafico.live` → A → 168.119.34.248 (Cloudflare, DNS-only)

## Data

| File | Path on server | Size | Source |
|------|---------------|------|--------|
| `spain.pmtiles` | `/opt/trafico/tiles/tiles/spain.pmtiles` | ~460MB | Protomaps build 20260401 |
| Font glyphs | `/opt/trafico/tiles/fonts/` | ~5MB | protomaps/basemaps-assets |

### PMTiles extract details

- **Bbox:** -18.2, 27.5, 4.5, 43.9 (Iberian Peninsula + Canarias + Baleares)
- **Zoom:** 0–14 (z12 version also available at ~150MB)
- **Tiles:** 556k entries, 494k unique
- **Format:** MVT (Mapbox Vector Tiles), gzip compressed
- **Source:** `https://build.protomaps.com/20260401.pmtiles`

## Operations

### Update tiles (monthly)

```bash
# On local machine with pmtiles CLI
pmtiles extract \
  "https://build.protomaps.com/YYYYMMDD.pmtiles" \
  /tmp/spain-iberia.pmtiles \
  --bbox="-18.2,27.5,4.5,43.9" \
  --maxzoom=14

# Upload to server
rsync -avP /tmp/spain-iberia.pmtiles hetzner-prod:/opt/trafico/tiles/tiles/spain.pmtiles

# No container restart needed — nginx serves static files
```

### Restart container

```bash
ssh hetzner-prod "docker restart trafico-tiles"
```

### View logs

```bash
ssh hetzner-prod "docker logs trafico-tiles --tail 20"
```

### Check Traefik routing

```bash
ssh hetzner-prod "docker logs coolify-proxy 2>&1 | grep tiles | tail -5"
```

### Verify endpoints

```bash
curl -I https://tiles.trafico.live/health
curl -I -H "Range: bytes=0-1023" https://tiles.trafico.live/spain.pmtiles
curl -I "https://tiles.trafico.live/fonts/Noto%20Sans%20Regular/0-255.pbf"
```

## Codebase integration

### Style generator

`src/lib/map-style.ts` generates branded MapLibre styles:

```typescript
import { getTraficoMapStyle, getMapStyleWithFallback } from "@/lib/map-style";

// Direct (assumes tile server is up)
const style = getTraficoMapStyle("light"); // or "dark"

// With CartoDB fallback (recommended)
const style = await getMapStyleWithFallback("light");
```

### Shared config

`src/lib/map-config.ts` has constants used by all 13 maps:

```typescript
import { MAP_STYLE_DEFAULT, forceSpanishLabels, SPAIN_CENTER, SPAIN_ZOOM } from "@/lib/map-config";
```

### PMTiles protocol

Maps using PMTiles need to register the protocol:

```typescript
import { Protocol } from "pmtiles";

// Once per page, before creating any map
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
```

## Files

| File | Purpose |
|------|---------|
| `services/tiles/Dockerfile` | Container image (nginx:alpine + config) |
| `services/tiles/nginx.conf` | nginx config with CORS, range requests, Martin proxy |
| `services/tiles/docker-compose.yml` | Coolify-compatible compose |
| `services/tiles/deploy.sh` | Manual deploy script |
| `services/tiles/README.md` | This file |
| `src/lib/map-style.ts` | Branded MapLibre style generator |
| `src/lib/map-config.ts` | Shared map constants and forceSpanishLabels() |
| `public/geo/spain-provinces.geojson` | Province boundaries |
| `public/geo/territories.geojson` | Portugal/Andorra/Gibraltar boundaries |

## Traefik config

Located at `/data/coolify/proxy/dynamic/tiles.yaml` on hetzner-prod:

```yaml
http:
  routers:
    tiles-http:
      rule: Host(`tiles.trafico.live`)
      entryPoints: [http]
      middlewares: [redirect-to-https]
      service: tiles
    tiles-https:
      rule: Host(`tiles.trafico.live`)
      entryPoints: [https]
      tls:
        certResolver: letsencrypt
      service: tiles
  services:
    tiles:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:8088
```
