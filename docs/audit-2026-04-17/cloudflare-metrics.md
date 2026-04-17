# Cloudflare Metrics — trafico.live

**Date:** 2026-04-17
**Exporter:** [lablabs/cloudflare-exporter](https://github.com/lablabs/cloudflare-exporter) (Go, maintained)
**Zone:** `trafico.live` (`1cc6b3e049d3b906c7e8d8929c8358ac`)
**Scrape target:** `10.100.0.2:9199` (prometheus job: `cloudflare`)
**Mode:** `FREE_TIER=true` — uses `httpRequests1hGroups` dataset (available on free plans, 1-hour granularity)

---

## Newly Available Metrics

All metrics carry a `zone` label (`trafico.live`). With `FREE_TIER=true` the exporter
uses the Cloudflare GraphQL `httpRequests1hGroups` dataset (hourly buckets).

| Metric | Type | Description |
|--------|------|-------------|
| `cf_zone_requests_total` | Gauge | Total HTTP requests served by Cloudflare edge |
| `cf_zone_requests_cached` | Gauge | Requests served from Cloudflare cache |
| `cf_zone_requests_uncached` | Gauge | Requests forwarded to origin (cache miss) |
| `cf_zone_bandwidth_total` | Gauge | Total bytes transferred via edge (bytes) |
| `cf_zone_bandwidth_cached` | Gauge | Bytes served from cache |
| `cf_zone_bandwidth_uncached` | Gauge | Bytes served from origin |
| `cf_zone_threats_total` | Gauge | Threats blocked (DDoS, WAF, rate-limit) |
| `cf_zone_pageviews_total` | Gauge | Unique pageviews (browser requests) |
| `cf_zone_uniq_visitors_total` | Gauge | Unique visitor IPs |
| `cf_zone_http_status_1xx` | Gauge | Requests resulting in 1xx responses |
| `cf_zone_http_status_2xx` | Gauge | Requests resulting in 2xx responses |
| `cf_zone_http_status_3xx` | Gauge | Requests resulting in 3xx responses |
| `cf_zone_http_status_4xx` | Gauge | Requests resulting in 4xx responses |
| `cf_zone_http_status_5xx` | Gauge | Requests resulting in 5xx responses (origin errors) |

> Note: `cf_zone_edge_response_*` latency percentiles (p50/p95) and per-country/content-type
> breakdowns are available on **Pro plan and above** (`FREE_TIER=false`). The queries below
> include variants for both free and paid tiers where relevant.

---

## Recommended Grafana Panel Queries

All queries assume the Prometheus datasource and `job="cloudflare"` label.
The `cloudflare` scrape job runs at 60 s; use `rate(...[5m])` to smooth over hourly
gauge resets. Because `FREE_TIER=true` yields hourly aggregates (not live counters),
`increase` over longer windows is more meaningful than `rate`.

---

### Panel 1 — Edge Request Rate (req/s)

**Title:** Edge Requests — req/s  
**Panel type:** Time series  
**Threshold:** Alert if avg drops below 0.5 req/s for 10 min (dead zone indicator)

```promql
increase(cf_zone_requests_total{job="cloudflare", zone="trafico.live"}[1h]) / 3600
```

> Converts the hourly cumulative count to a per-second rate. Use `$__rate_interval`
> with dashboard variable `$zone` once multiple zones are scraped.

---

### Panel 2 — Cache Hit Ratio (%)

**Title:** Cloudflare Cache Hit Ratio  
**Panel type:** Gauge (0–100 %)  
**Threshold:** Green ≥ 80 %, Yellow 60–80 %, Red < 60 %

```promql
100 * (
  increase(cf_zone_requests_cached{job="cloudflare", zone="trafico.live"}[1h])
  /
  increase(cf_zone_requests_total{job="cloudflare", zone="trafico.live"}[1h])
)
```

> A healthy static-asset-heavy site should sit above 80 %. Drops signal origin-bypass
> (e.g. `Cache-Control: no-store` regression or purge storm).

---

### Panel 3 — Origin Bandwidth vs Cached Bandwidth

**Title:** Bandwidth Origin vs Cache (bytes/s)  
**Panel type:** Time series (stacked area)  
**Threshold:** Alert if `uncached` exceeds 10 MB/s (unexpected origin load)

```promql
# Cached bytes/s
increase(cf_zone_bandwidth_cached{job="cloudflare", zone="trafico.live"}[1h]) / 3600

# Origin (uncached) bytes/s
increase(cf_zone_bandwidth_uncached{job="cloudflare", zone="trafico.live"}[1h]) / 3600
```

---

### Panel 4 — HTTP 5xx Error Rate (%)

**Title:** Cloudflare 5xx Error Rate  
**Panel type:** Time series  
**Threshold:** Alert > 1 % sustained for 5 min

```promql
100 * (
  increase(cf_zone_http_status_5xx{job="cloudflare", zone="trafico.live"}[1h])
  /
  increase(cf_zone_requests_total{job="cloudflare", zone="trafico.live"}[1h])
)
```

> Catches origin failures that Cloudflare converts to 502/503/504 before blackbox
> probes fire. Complements `blackbox-trafico-health` which only probes `/api/health`.

---

### Panel 5 — Threats Blocked (rate/h)

**Title:** Cloudflare Threats Blocked  
**Panel type:** Bar chart (hourly bars) or Time series  
**Threshold:** Alert if spike > 500 threats/h (potential DDoS / scraper wave)

```promql
increase(cf_zone_threats_total{job="cloudflare", zone="trafico.live"}[1h])
```

> Shows DDoS, WAF rule hits, and rate-limit triggers. A sudden spike on launch days
> (e.g. after press coverage) is normal; sustained high counts warrant WAF review.

---

### Panel 6 — Unique Visitors & Pageviews (hourly)

**Title:** Visitors & Pageviews per Hour  
**Panel type:** Time series (two series)  
**Threshold:** None (informational — correlate with conversion events)

```promql
# Unique visitors
increase(cf_zone_uniq_visitors_total{job="cloudflare", zone="trafico.live"}[1h])

# Pageviews
increase(cf_zone_pageviews_total{job="cloudflare", zone="trafico.live"}[1h])
```

> Ratio `pageviews / visitors` indicates session depth. A ratio < 1.2 may indicate
> bot traffic or very high bounce rate.

---

## Deployment Notes

### Pending manual step — CF_API_EMAIL on compute

The `CLOUDFLARE_API_KEY` (Global API Key) is already in `/opt/server-exit/prod/observability/.env`.
The matching account email (`CF_API_EMAIL`) is not stored on compute. Add it:

```bash
echo "CF_API_EMAIL=<your-cloudflare-account-email>" \
  >> /opt/server-exit/prod/observability/.env
```

**Alternative (recommended):** Create a scoped Cloudflare API token at
`dash.cloudflare.com → My Profile → API Tokens` with permissions:
- Zone → Zone → Read
- Zone → Analytics → Read
- Zone Resources → Include → trafico.live

Then in `.env` replace `CF_API_KEY`/`CF_API_EMAIL` with `CF_API_TOKEN=<token>` and update
the compose service env block accordingly (remove `CF_API_KEY`/`CF_API_EMAIL`, add `CF_API_TOKEN`).

### Upgrade to paid plan (Pro) — additional metrics

With `FREE_TIER=false` the exporter gains access to:
- `cf_zone_edge_response_time_*` — p50/p75/p99 edge latency histograms
- Per-country request breakdown
- Per-content-type bandwidth
- Worker invocation counts

These unlock panels for latency SLA monitoring and geographic traffic distribution.
