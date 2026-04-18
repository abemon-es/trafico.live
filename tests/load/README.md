# trafico.live — Load Tests

## Setup

Install k6: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## api-baseline.js

Exercises the five highest-traffic API routes with realistic weighted distribution.

### Run

```bash
k6 run tests/load/api-baseline.js -e TARGET=https://trafico.live
```

Point at staging instead:

```bash
k6 run tests/load/api-baseline.js -e TARGET=https://staging.trafico.live
```

### Profile

| Stage        | Duration | VUs |
|--------------|----------|-----|
| Warm-up      | 30s      | 10  |
| Ramp-up      | 2m       | 50  |
| Steady state | 5m       | 50  |
| Ramp-down    | 1m       | 0   |

### Route weights

| Route                                  | Weight | Notes                          |
|----------------------------------------|--------|--------------------------------|
| `GET /api/trenes/posiciones`           | 40%    | Redis-cached 15s               |
| `GET /api/maritimo`                    | 20%    | GeoJSON, 48h rolling buffer    |
| `GET /api/aviacion`                    | 15%    | OpenSky, cached 15min          |
| `GET /api/multimodal?origin=28&dest=08`| 15%    | 404 tolerated — endpoint may not be live yet |
| `GET /api/health`                      | 10%    | Auth-exempt health check       |

### Thresholds (CI gate)

| Metric                                      | Limit     |
|---------------------------------------------|-----------|
| `http_req_duration{route:posiciones}` P95   | < 500ms   |
| `http_req_duration{route:maritimo}` P95     | < 1500ms  |
| `http_req_duration{route:health}` P95       | < 300ms   |
| `http_req_failed` rate                      | < 1%      |

### Interpreting results

- **P95 > threshold** — check Redis cache hit rate (posiciones, health) or DB query time (maritimo, aviacion).
- **http_req_failed > 1%** — likely rate limiter kicking in (Redis-backed, per-IP). Use a proxy/VPN pool for sustained load tests.
- **`multimodal` consistently 404** — endpoint not yet deployed; weight can be zeroed until live.

## docker-compose.web.yml — SENTRY_RELEASE (deferred)

The `SENTRY_RELEASE` env var should be added to the `web` service in `docker-compose.web.yml`:

```yaml
environment:
  SENTRY_RELEASE: ${SENTRY_RELEASE:-unknown}
```

This file is coordinator-owned (web stack). Add the line under the existing `environment:` block
when the coordinator merges the web stack changes, or apply manually on the server:

```bash
# On compute, in /opt/trafico:
export $(bin/deploy-set-release.sh)
docker compose -f docker-compose.web.yml up -d --no-deps web
```
