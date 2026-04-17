# transit-realtime

Polls GTFS-RT VehiclePositions from major Spanish urban operators every ~30 seconds. Writes to `TransitVehiclePosition` table.

## Feeds

| Operator | Status | Env vars required |
|---|---|---|
| EMT Madrid (bus) | enabled | `EMT_MADRID_CLIENT_ID`, `EMT_MADRID_PASS_KEY` |
| TMB Barcelona (metro + bus) | enabled | `TMB_APP_ID`, `TMB_APP_KEY` |
| Metro de Madrid | disabled | no public GTFS-RT feed yet |

## Running

```bash
# One-shot pass (dev)
TASK=transit-realtime npx tsx services/collector/index.ts

# With keys
EMT_MADRID_CLIENT_ID=xxx EMT_MADRID_PASS_KEY=yyy TMB_APP_ID=aaa TMB_APP_KEY=bbb \
  TASK=transit-realtime npx tsx services/collector/index.ts
```

## API keys

- EMT Madrid: register at https://opendata.emtmadrid.es/ — get a `clientId` + `passKey`
- TMB Barcelona: register at https://developer.tmb.cat/ — get `app_id` + `app_key`

## Retention

Positions are written with `fetchedAt` timestamp. Add a nightly cleanup:
```sql
DELETE FROM "TransitVehiclePosition" WHERE "fetchedAt" < now() - interval '48 hours';
```

## Docker (for leader)

```yaml
transit-realtime:
  image: trafico-collector
  environment:
    - TASK=transit-realtime
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=${REDIS_URL}
    - EMT_MADRID_CLIENT_ID=${EMT_MADRID_CLIENT_ID}
    - EMT_MADRID_PASS_KEY=${EMT_MADRID_PASS_KEY}
    - TMB_APP_ID=${TMB_APP_ID}
    - TMB_APP_KEY=${TMB_APP_KEY}
  mem_limit: 128m
  restart: unless-stopped
```

Crontab entry (every minute, single-shot mode):
```
* * * * * docker exec trafico-collector-transit-realtime npx tsx index.ts
```

Or schedule via docker-compose cron with `CRON_SCHEDULE=*/1 * * * *`.
