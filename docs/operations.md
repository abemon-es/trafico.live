# Operations Runbook

## Infrastructure Access

| Server | SSH | Role |
|--------|-----|------|
| hetzner-prod | `ssh hetzner-prod` | Coolify host, app + collectors |
| hetzner-dev | `ssh hetzner-dev` | PostgreSQL, PgBouncer, Redis |

## Deployment

### Application (Coolify auto-deploy)

Coolify watches the `main` branch. Push triggers rebuild:

```bash
git push origin main
# Coolify builds from Dockerfile, deploys, health-checks on :3000
```

Manual deploy via Coolify UI: `https://server.abemon.es` → trafico-live → Deploy.

### Collector Image Rebuild

When collector code changes, rebuild on the server:

```bash
ssh hetzner-prod
cd /opt/trafico/repo && git pull
docker build -f services/collector/Dockerfile -t trafico-collector:latest .
```

Note: collectors run from the Docker image, not from the repo. The image must be rebuilt after code changes.

## Collector Management

### Cron Schedule

All collectors are in root crontab on hetzner-prod:

```bash
ssh hetzner-prod "crontab -l | grep run-collector"
```

| Task | Schedule | Duration |
|------|----------|----------|
| incident | `*/5 * * * *` | ~20s |
| v16 | `*/5 * * * *` | ~1s |
| panel | `*/5 * * * *` | ~3s |
| weather | `*/30 * * * *` | ~5s |
| gas-station | `0 6,13,20 * * *` | ~30s |
| insights | `15 7,14,21 * * *` | ~2s |
| camera | `0 4 * * *` | ~1s |
| radar | `0 3 * * *` | ~1s |
| charger | `0 6 * * *` | ~3s |
| speedlimit | `0 3 * * 0` | ~2s |

### Run a Collector Manually

```bash
ssh hetzner-prod "/opt/trafico/run-collector.sh incident"
```

### Check Collector Logs

```bash
ssh hetzner-prod "tail -50 /opt/trafico/logs/incident.log"
```

### Collector Env

```bash
ssh hetzner-prod "cat /opt/trafico/collector.env"
# DATABASE_URL, REDIS_URL, AEMET_API_KEY, NODE_ENV, TZ
```

## Database Operations

### Connect to PostgreSQL

```bash
# Via PgBouncer (standard)
ssh hetzner-prod "docker exec coolify-db psql -h 10.100.0.1 -p 6436 -U apps le_trafico"

# Direct PG (for migrations, schema changes)
ssh hetzner-prod "docker exec coolify-db psql -h 10.100.0.1 -p 5435 -U apps le_trafico"
```

### Run Prisma Migrations

```bash
# Locally (with DATABASE_URL pointing to direct PG, not PgBouncer)
DATABASE_URL="postgresql://apps:PASSWORD@hetzner-dev:5435/le_trafico" npx prisma migrate deploy
```

### Prisma Studio

```bash
npm run db:studio
# Opens at http://localhost:5555
```

### Check Data Freshness

```bash
ssh hetzner-prod "docker exec coolify-db psql -h 10.100.0.1 -p 6436 -U apps le_trafico -c \"
  SELECT 'incidents' as table_name, COUNT(*) as total, MAX(\\\"startedAt\\\") as latest FROM \\\"TrafficIncident\\\" WHERE \\\"isActive\\\" = true
  UNION ALL
  SELECT 'v16', COUNT(*), MAX(\\\"activatedAt\\\") FROM \\\"V16BeaconEvent\\\" WHERE \\\"isActive\\\" = true
  UNION ALL
  SELECT 'cameras', COUNT(*), MAX(\\\"lastUpdated\\\") FROM \\\"Camera\\\"
  UNION ALL
  SELECT 'gas_stations', COUNT(*), MAX(\\\"lastPriceUpdate\\\") FROM \\\"GasStation\\\";
\""
```

## Redis Operations

### Flush a Cache Key

```bash
ssh hetzner-prod "docker exec coolify-redis redis-cli -h 10.100.0.1 -p 6385 -a PASSWORD DEL api:fuel-prices:today"
```

### List Cache Keys

```bash
ssh hetzner-prod "docker exec coolify-redis redis-cli -h 10.100.0.1 -p 6385 -a PASSWORD KEYS 'api:*'"
```

## Monitoring

### Health Check

```bash
curl -sf https://trafico.live/api/health
```

### Check Running Containers

```bash
ssh hetzner-prod "docker ps --format '{{.Names}}\t{{.Status}}' | grep trafico"
```

### Check Coolify Logs

```bash
ssh hetzner-prod "docker logs atgqhoy0dfhohmdheh2rd1r5-manual-1774956936 --tail 100"
# Container name changes on each deploy — check with docker ps first
```

## Incident Response

### App is Down

1. Check Coolify: `ssh hetzner-prod "docker ps | grep trafico"`
2. Check app logs: `docker logs <container> --tail 200`
3. Check health: `curl -sf https://trafico.live/api/health`
4. Restart via Coolify UI if needed

### Collectors Not Running

1. Check cron: `ssh hetzner-prod "crontab -l | grep trafico"`
2. Check logs: `tail -50 /opt/trafico/logs/<task>.log`
3. Test manual run: `/opt/trafico/run-collector.sh <task>`
4. Check Docker image exists: `docker images trafico-collector`

### Stale Data

1. Check collector logs for errors
2. Check data freshness query (above)
3. Verify external API is reachable: `curl -sf https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml | head -5`
4. Flush Redis cache if data is fresh in DB but stale in API response

### Database Unreachable

1. Check WireGuard: `ssh hetzner-prod "ping -c1 10.100.0.1"`
2. Check PgBouncer: `ssh hetzner-dev "docker ps | grep pgbouncer"`
3. Check PostgreSQL: `ssh hetzner-dev "docker ps | grep postgres"`
