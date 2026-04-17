# STATUS — TEAM 3 (DATA + ML + INFRA)

**Branch base:** `team3` · **Worktree:** `/private/tmp/trafico-t3` · **Lead:** backend lead
**Last update:** 2026-04-17 (S0 kickoff night) · **Sub-agents:** 9
**Source of truth:** `docs/ROADMAP-TEAM-3-DATA-ML.md` + `docs/ROADMAP-MASTER-2026.md`

> T3 uses a dedicated worktree to avoid branch-switch interference from parallel teams.
> All T3 sub-agents operate strictly on paths listed in the file-ownership matrix below.

---

## Sub-agents

| # | Sub-agent | Branch | Status | Sprint | Owner | Blockers |
|---|---|---|---|---|---|---|
| 3.1 | Heartbeats + `/api/health` + DR + backups | `team3-3.1-heartbeats-dr` | 🚧 in_progress | S0 | lead | — |
| 3.2 | EUMETSAT radar collector | `team3-3.2-eumetsat-radar` | ⏳ pending | S0 vie | — | EUMETCAST creds (fallback NWS GFS) |
| 3.3 | AEMET forecast (+ `/api/meteo/forecast`) | `team3-3.3-aemet-forecast` | ⏳ pending | S0 vie | — | `WeatherForecast` schema firma HS2 vie AM |
| 3.4 | CAMS AQ forecast (+ `/api/calidad-aire/forecast`) | `team3-3.4-cams-aq` | ⏳ pending | S0 vie | — | CAMS API key ✅ |
| 3.5 | Renfe ADIF fallback + air-quality MITECO fix | `team3-3.5-adif-aq-fix` | ⏳ pending | S0 vie | — | MITECO CSV endpoint debug |
| 3.6 | ML service scaffold + 5 predictores + drift | `team3-3.6-ml-service` | ⏳ pending | S2–S4 | — | MLflow hosting S1 |
| 3.7 | `/api/predict/*` + Redis cache | `team3-3.7-predict-api` | ⏳ pending | S3–S4 | — | waits 3.6 |
| 3.8 | Perf + Grafana + APM + k6 + PgBouncer | `team3-3.8-perf-monitoring` | 🚧 in_progress | S0 + ongoing | — | — |
| 3.9 | Datasets enterprise export + EU-ETS | `team3-3.9-datasets-ets` | ⏳ pending | S5 | — | S3 bucket (CF R2) |

## Handshakes T3

| HS | Role | Counterparty | Sprint | Status | Artifact |
|---|---|---|---|---|---|
| HS2 | **producer** | T2.2 (`/meteo` hub) | S0 vie | ⏳ | `WeatherForecast` schema vie AM |
| HS5 | producer | T1.9, T2.4 | S3 | ⏳ | `/api/predict/*` schemas lun S3 |
| HS8 | **producer** | T3.8, T4.8 | S0 | 🚧 | `CollectorHeartbeat` contract (migration `20260417170000` applied en prod) |
| HS7 | consumer | T4.1 (Stripe MW) | S2 | ⏳ | Tier headers para `/api/predict/*` |

## S0+ quick wins (jue 17 noche)

- [x] Branch `team3` creada + pushed
- [x] Worktree `/private/tmp/trafico-t3` creado (aislado de T1/T2/T4)
- [x] STATUS-TEAM3.md publicado
- [x] `/api/movilidad/corredores` date fallback → latest available (3.1a)
- [x] `/api/movilidad` latest-window fallback + `latestFallback` meta (3.1a bonus)
- [x] SASEMAR 30-day filter removed → default full dataset, opt narrow `?year`/`?from`/`?to`/`?limit` (3.1b)
- [ ] `CollectorHeartbeat` migration verify en prod (3.1c) — SQL dice "applied 2026-04-17"
- [ ] `/aviacion/aeropuertos` stub page (3.1d, T2.5 amplía después)
- [ ] `chmod 600` `.env` en compute (3.1e)
- [ ] Verify nightly Postgres backup + restore prueba en hetzner-dev (3.1f)
- [ ] Recharts `dynamic()` en `/trenes` + `/intensidad` (3.8a)
- [ ] Fix `CF-Cache-Status: DYNAMIC` sitewide (3.8b)

## S0 exit criteria (dom 19 abr)

- [ ] 43/43 collectors con heartbeat activo
- [ ] 3 collectors nuevos (EUMETSAT/AEMET/CAMS) con ≥6 h data en prod
- [ ] Grafana dashboard `trafico-live` paneles verdes
- [ ] DR runbook + backup verified restore-able (<2 h RTO)

## File ownership (T3 exclusivo)

```
services/collector/shared/heartbeat.ts              ← 3.1 (existe)
services/collector/tasks/eumetsat-radar/**          ← 3.2
services/collector/tasks/aemet-forecast/**          ← 3.3
services/collector/tasks/cams-aq/**                 ← 3.4
services/collector/tasks/adif-fallback/**           ← 3.5
services/collector/tasks/renfe-ld-realtime/         ← 3.5
services/collector/tasks/air-quality/               ← 3.5
services/collector/tasks/*/index.ts                 ← 3.1 (append-only heartbeat call)
services/ml/**                                      ← 3.6 + 3.7 + 3.9
src/app/api/health/route.ts                         ← 3.1
src/app/api/meteo/forecast/route.ts                 ← 3.3
src/app/api/calidad-aire/forecast/route.ts          ← 3.4
src/app/api/predict/**                              ← 3.7
src/app/api/movilidad/**                            ← 3.1 (fixed this commit)
src/app/api/maritimo/emergencies/**                 ← 3.1 (fixed this commit)
src/app/aviacion/aeropuertos/page.tsx               ← 3.1 stub → T2.5 amplía
src/lib/ml-cache.ts                                 ← 3.7
prisma/schema.prisma                                ← 3.6 (único merger)
docker-compose.ml.yml                               ← 3.6
docker-compose.collectors.yml                       ← 3.1 (único modifier)
next.config.ts                                      ← 3.8
tests/load/                                         ← 3.8
docs/DR-RUNBOOK.md                                  ← 3.1
bin/backup-verify.sh                                ← 3.1
monitoring/grafana-dashboard.json                   ← 3.8
monitoring/alert-rules.yml                          ← 3.8
```

## T3 NO TOCA

- `src/app/**` (excepto paths arriba) — T1 + T2 + T4
- `src/components/**` — T2 + T4
- `src/middleware.ts` — T4.1
- `src/lib/stripe.ts`, `src/lib/auth-client.ts` — T4
- `src/types/routing.ts`, `src/types/multimodal.ts` — T1
