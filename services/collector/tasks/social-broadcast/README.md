# social-broadcast

Cron-driven collector (`TASK=social-broadcast`) that detects new extreme weather alerts and high-severity traffic incidents, then posts them to Bluesky, X (Twitter), and a Telegram public channel.

## Runs every 5 minutes (frequent tier)

Looks back 10 minutes on each run so no events are missed if a run is slow.

## What gets broadcast

| Source | Condition | Limit |
|--------|-----------|-------|
| `WeatherAlert` | `severity IN (VERY_HIGH, HIGH)` + `isActive=true` + `fetchedAt >= now-10m` | All |
| `TrafficIncident` | `severity IN (VERY_HIGH, HIGH)` + `isActive=true` + `firstSeenAt >= now-10m` | Top 2 per run |

Traffic incidents are capped at 2 per run to avoid channel spam during incident bursts.

## Deduplication

Redis `SET NX social:bc:<eventId>` with 24h TTL. Each event is posted at most once every 24 hours regardless of how many runs detect it.

- Weather key: `social:bc:<WeatherAlert.alertId>`
- Incident key: `social:bc:incident:<TrafficIncident.situationId>`

If Redis is unavailable, deduplication is disabled and broadcasts go through unconditionally (with a warning log).

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Entry point — queries DB, loops alerts+incidents, calls broadcast() |
| `compose.ts` | Message templates per platform (Bluesky/X/Telegram) |
| `../../shared/utils.ts` | log/logError helpers |
| `../../../../src/lib/social-broadcast.ts` | Orchestrator: parallel dispatch + dedup |
| `../../../../src/lib/bluesky.ts` | Bluesky AT Protocol poster |
| `../../../../src/lib/x-api.ts` | X API v2 poster (OAuth 1.0a) |
| `../../../../src/lib/telegram.ts` | Telegram Bot API broadcaster (existing, from C5) |

## Message format examples

### Weather alert (VERY_HIGH)

**Bluesky / X:**
```
AVISO ROJO AEMET: lluvias intensas en Cataluña (80 mm/h) hasta 15:00 del 17/04. Evite desplazamientos no imprescindibles. https://trafico.live/alertas-meteo/...
```

**Telegram:**
```
*AVISO ROJO AEMET:* lluvias intensas en Cataluña (80 mm/h) hasta 15:00 del 17/04. Evite desplazamientos no imprescindibles.

Detalles: https://trafico.live/alertas-meteo/...
```

### Traffic incident (HIGH)

**Bluesky / X:**
```
Incidencia grave: accidente en A-7 pk 312.0, Málaga desde las 11:35. https://trafico.live/provincia/29#incidencias
```

**Telegram:**
```
*Incidencia grave DGT:* accidente en A-7 pk 312.0, Málaga desde las 11:35.

Info: https://trafico.live/provincia/29#incidencias
```

## Adding to docker-compose.collectors.yml

Add to the `frequent` service command list or as a dedicated container:

```yaml
social-broadcast:
  <<: *collector-base
  environment:
    - TASK=social-broadcast
    - BLUESKY_HANDLE=${BLUESKY_HANDLE}
    - BLUESKY_APP_PASSWORD=${BLUESKY_APP_PASSWORD}
    - X_API_KEY=${X_API_KEY}
    - X_API_SECRET=${X_API_SECRET}
    - X_ACCESS_TOKEN=${X_ACCESS_TOKEN}
    - X_ACCESS_TOKEN_SECRET=${X_ACCESS_TOKEN_SECRET}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - TELEGRAM_CHANNEL=${TELEGRAM_CHANNEL}
  deploy:
    resources:
      limits:
        memory: 128m
```

Or add `social-broadcast` to the crontab for the `frequent` container:

```cron
*/5 * * * * TASK=social-broadcast node /app/services/collector/index.js >> /var/log/social-broadcast.log 2>&1
```
