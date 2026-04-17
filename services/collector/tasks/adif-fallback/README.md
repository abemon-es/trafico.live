# adif-fallback collector

## Purpose

Provides schedule-based train position data from ADIF OpenData when the primary
Renfe LD real-time fleet API (`tiempo-real.largorecorrido.renfe.com`) is unreachable.

## Activation behavior

On every run the collector first sends a HEAD probe (2s timeout) to the Renfe LD
endpoint. If the primary responds with HTTP 2xx–3xx the fallback exits immediately
with heartbeat `"ok"` + `{ skipped: "renfe-ld-healthy" }` — no data is written.

If the probe fails or times out, the collector fetches ADIF OpenData and upserts
positions into `RenfeFleetPosition` with the fields available from the schedule feed.

## Data source

| Field | Value |
|-------|-------|
| Provider | Administrador de Infraestructuras Ferroviarias (ADIF) |
| Portal | https://data.renfe.com/dataset/adif-apertura-datos-de-circulacion-en-tiempo-real |
| API | CKAN Datastore: `https://data.renfe.com/api/action/datastore_search` |
| License | Licencia de datos abiertos ADIF (compatible CC-BY 4.0) |
| Update cadence | Real-time / near-real-time (ADIF publishes as schedule allows) |

## Known gaps vs. Renfe LD primary

- **Schedule-based only**: positions are interpolated from timetables, not live GPS.
- **No live delay**: `retraso` field may be absent unless ADIF publishes it.
- **Lower accuracy**: position between stations is an estimate based on schedule time.
- **Partial coverage**: only trains with published timetables; charter/special services excluded.
- **No rolling stock info**: `serie`/`mat` fields are not in the ADIF feed.

## TODO: Confirm ADIF resource ID

The `ADIF_RESOURCE_ID` constant in `collector.ts` is currently `null`. Before this
collector can write any data when the primary is down, resolve the correct resource ID:

```bash
# 1. List all resources in the dataset
curl -s "https://data.renfe.com/api/action/package_show?id=adif-apertura-datos-de-circulacion-en-tiempo-real" \
  | jq '.result.resources[] | {id, name, format}'

# 2. Inspect fields for each resource
curl -s "https://data.renfe.com/api/action/datastore_info?id=<resource_id>" \
  | jq '.result.fields'

# 3. Update ADIF_RESOURCE_ID in collector.ts and update field mappings in AdifRecord interface
```

## Heartbeat states

| Status | Condition |
|--------|-----------|
| `"ok"` with `skipped: "renfe-ld-healthy"` | Primary is up — no action taken |
| `"ok"` with `source: "adif"` | Primary down, ADIF data written successfully |
| `"partial"` | Primary down but ADIF returned 0 records |
| `"error"` | Primary down and ADIF fetch also failed |
