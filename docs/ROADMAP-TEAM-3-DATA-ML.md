# TEAM 3 — DATA + ML + INFRA

> 📍 Source of truth: `docs/ROADMAP-MASTER-2026.md` · vista parcial T3, ampliada.
> **Rol:** collectors (heartbeats, weather, AEMET, CAMS, ADIF), servicio ML + 5 predictores, monitoring, performance, backups+DR, datasets enterprise.

**Lead role:** Backend lead
**Tamaño team:** 9 sub-agents
**Branch:** `team3`
**Slack channel:** #t3-data-ml

---

## 0. Mission

Garantizar que los **43 collectors** alimentan datos frescos y verificables, construir el **servicio ML** con 5 predictores production-grade, y mantener performance + observability + DR a nivel enterprise. Sin esta capa, T1/T2/T4 trabajan sobre arena.

---

## 1. Sub-agents (9)

| # | Sub-agent | Owns (paths exclusivos) | Sprint principal |
|---|---|---|---|
| **3.1** | Heartbeats + /api/health + DR + backups | `services/collector/shared/heartbeat.ts`, `src/app/api/health/route.ts`, todos los `services/collector/tasks/*/index.ts` (append-only heartbeat), `bin/backup-verify.sh`, `docs/DR-RUNBOOK.md` | S0 |
| **3.2** | EUMETSAT radar collector | `services/collector/tasks/eumetsat-radar/**`, `prisma/schema.prisma` (model `RadarFrame` — coordina 3.6) | S0 |
| **3.3** | AEMET forecast collector | `services/collector/tasks/aemet-forecast/**`, model `WeatherForecast`, `src/app/api/meteo/forecast/route.ts` | S0 |
| **3.4** | CAMS AQ forecast collector | `services/collector/tasks/cams-aq/**`, model `AQForecast`, `src/app/api/calidad-aire/forecast/route.ts` | S0 |
| **3.5** | Renfe ADIF fallback + air-quality fix | `services/collector/tasks/renfe-ld-realtime/`, `services/collector/tasks/air-quality/`, `services/collector/tasks/adif-fallback/**` | S0 |
| **3.6** | ML service scaffold + 5 predictores + drift detection | `services/ml/**`, `docker-compose.ml.yml`, `prisma/schema.prisma` (coordinador único de migraciones) | S2-S4 |
| **3.7** | Predict API + Redis cache | `src/app/api/predict/**`, `src/lib/ml-cache.ts` | S3-S4 |
| **3.8** | Performance + monitoring + APM + load testing | Lighthouse fixes, `next.config.ts`, recharts dynamic, `<img>`→`next/image` (coordinado), Grafana dashboards JSON, alert rules, PgBouncer, k6 scripts `tests/load/`, Sentry tracing setup | S0 + ongoing |
| **3.9** | Datasets enterprise export + EU-ETS | `services/ml/export/**`, `services/ml/ets/**`, S3 batch drops, scripts cliente | S5 |

---

## 2. Sprint plan T3

### S0+ (jue 17 noche, 3-4h) — quick wins

| Sub-agent | Entregable |
|---|---|
| 3.1 | Fix `/api/movilidad/corredores` date fallback (30m) |
| 3.1 | Remove SASEMAR 30-day filter (15m) |
| 3.1 | `prisma migrate deploy` para `CollectorHeartbeat` (5m) |
| 3.8 | Fix recharts sync imports en `/trenes` y `/intensidad` (30m) |
| 3.8 | Fix CF `CF-Cache-Status: DYNAMIC` sitewide (30m) |
| 3.1 | Crear stub `/aviacion/aeropuertos/page.tsx` (1h) — coordina con T2.5 que lo amplía |
| 3.1 | `chmod 600` .env files en compute (5m) |
| 3.1 | Verificar backup nightly Postgres + restore prueba en hetzner-dev (1h) — primer paso DR |

### S0 viernes 18

| Sub-agent | Entregable |
|---|---|
| 3.1 | Heartbeat function en `services/collector/shared/heartbeat.ts` + integración en los 43 collectors (append-only call al final de cada ciclo). Extend `/api/health` para reportar last-heartbeat + age por collector |
| 3.2 | Collector EUMETSAT radar: descarga GRIB cada 15 min, decodifica a PNG/MVT, sirve via `/tiles/radar/{z}/{x}/{y}.png`. Setup credentials EUMETCAST |
| 3.3 | Collector AEMET forecast horario: API key ya existe, fetch 7-day forecast por estación cada 6h. Migration `WeatherForecast` (NO ejecutar — coordina con 3.6) |
| 3.4 | Collector CAMS AQ: usar key proporcionada usuario, fetch 5-day AQ forecast por gridpoint. Migration `AQForecast` |
| 3.5 | Investigar API ADIF fallback (hay alternativa OpenData con horarios estación) — si Renfe LD muere, swap automático. Fix collector air-quality MITECO (currently stale) |
| 3.8 | Recharts dynamic import wrapping en `/trenes` y `/intensidad` (extiende del S0+) + cards `<img>` → `next/image` en `/camaras/*` (50 imgs) |
| 3.6 | Coordinador de migraciones: review schemas propuestas por 3.2/3.3/3.4 + merge final en `prisma/schema.prisma` + `prisma migrate dev` |

### S0 sábado 19

| Sub-agent | Entregable |
|---|---|
| 3.2 | EUMETSAT radar funcional · ≥1 ciclo completo en producción · sirve frame en mapa |
| 3.3 | AEMET forecast funcional · ≥1 ciclo · datos en `WeatherForecast` · `/api/meteo/forecast` responde |
| 3.4 | CAMS AQ funcional · ≥1 ciclo · `/api/calidad-aire/forecast` responde |
| 3.5 | ADIF fallback documentado (no necesario activar aún si Renfe LD vivo) · Air-quality MITECO escribe data fresca |
| 3.8 | Grafana dashboard `trafico-live` con: heartbeats 43 collectors, latencias APIs, error rate, 502/504 al edge, DB connection pool |
| 3.8 | Alert rules: heartbeat >2× cadencia esperada → alerta crítica, error rate >5% → alerta warning |

### S0 domingo (QA + handoff)

| Sub-agent | Entregable |
|---|---|
| 3.8 | PgBouncer pool 25→50, validar bajo carga sintética k6 contra hubs principales |
| 3.8 | Sentry tracing habilitado en server (sample 25%) y client (sample 10%) |
| 3.8 | SENTRY_RELEASE tag config + source maps upload |
| 3.1 | Verify monitoring activo + alert rules disparan en test |
| 3.1 | DR runbook v1: backups verificados + restore step-by-step + RTO/RPO objetivos documentados |

**Criterio salida S0 T3:**
- [ ] 43 collectors con heartbeat activo
- [ ] 3 collectors nuevos (EUMETSAT/AEMET/CAMS) con ≥6h de data en producción
- [ ] Grafana dashboard con todos los paneles verdes
- [ ] DR runbook + backup verificado restore-able

### S1 (lun 21 → dom 27 abr)

**Objetivo:** ML service scaffold + Redis cache layer.

| Sub-agent | Entregable |
|---|---|
| 3.6 | `services/ml/Dockerfile` (Python 3.12 + FastAPI + sklearn + xgboost) + `docker-compose.ml.yml` (puerto :8000, 6 GB RAM) |
| 3.6 | `services/ml/main.py` con FastAPI app + `/health` + `/version` + middleware CORS |
| 3.6 | Setup MLflow tracking server (versionado + comparación modelos) |
| 3.7 | `src/lib/ml-cache.ts` con Redis 1h TTL para predicciones |
| 3.7 | Esqueleto `src/app/api/predict/route.ts` proxy puro a ml service |
| 3.8 | Bundle analyzer en CI · regression check tamaño bundle por commit |

### S2 (lun 28 abr → dom 11 may)

**Objetivo:** Primer predictor (retrasos tren) production-grade.

| Sub-agent | Entregable |
|---|---|
| 3.6 | `services/ml/models/train_delays.py`: dataset desde `RailwayDelaySnapshot` + `RailwayDailyStats` + AEMET + alerts. Train con xgboost, target MAE <4 min |
| 3.6 | Cron noche `services/ml/train_all.sh` re-entrena modelos con últimos 90d data |
| 3.6 | Drift detection con evidently.ai: alerta si distribución features cambia >0.2 PSI |
| 3.7 | `/api/predict/train-delays?train_id=X&date=Y` con cache 1h. Response: `{delayProbability, expectedMinutes, modelVersion, confidence}` |
| 3.8 | k6 load test `tests/load/api-multimodal.js` y `tests/load/api-predict.js` baseline |

### S3 (lun 12 → dom 25 may)

**Objetivo:** 4 predictores más + integración completa con T1+T2.

| Sub-agent | Entregable |
|---|---|
| 3.6 | `flight_delays.py` (input: AircraftPosition + clima aeropuerto, target AUC >0.75) |
| 3.6 | `congestion.py` (input: TrafficIntensity + Incident + HourlyProfile + clima + festivos + partidos, target proba por segmento-hora) |
| 3.6 | `fuel_forecast.py` (input: CNMCFuelPrice + Brent + EUR/USD, output: precio próx semana ±2%) |
| 3.7 | `/api/predict/{flight-delays,congestion,fuel}` endpoints con tests |
| 3.7 | HS5 productor: documentar contracts + publicar a T1.6 + T2.4 |
| 3.8 | APM real con Sentry traces — flamegraphs visibles para `/api/multimodal`, `/api/predict/*`, `/ir` |

### S4 (lun 26 may → dom 8 jun)

**Objetivo:** Riesgo accidente predictor + dataset enterprise.

| Sub-agent | Entregable |
|---|---|
| 3.6 | `accident_risk.py` (input: AccidentMicrodata 500K + TrafficFlow + Road categoría + clima esperado, output: score 0-100 por segmento) |
| 3.7 | `/api/predict/accident-risk?segment=X` (tier ENTERPRISE only — coordina con T4.1) |
| 3.9 | `services/ml/export/weekly.py` genera dataset Parquet + GeoJSON con riesgo segmentos · upload S3 nightly · genera URL firmado para clientes ENTERPRISE |

### S5 (lun 9 → dom 22 jun)

**Objetivo:** EU-ETS compliance pipeline + monitoring ML.

| Sub-agent | Entregable |
|---|---|
| 3.9 | `services/ml/ets/emissions.py`: dado un MMSI buque + ventana fechas, calcula emisiones CO₂ usando AIS + perfil motor naval. Output PDF informe |
| 3.9 | Endpoint admin `/api/admin/ets-report` para generar bajo demanda |
| 3.6 | Grafana dashboard ML: model performance over time (MAE, AUC, drift PSI por modelo) |
| 3.8 | k6 stress test pre-junio con 10× tráfico esperado · valida SLOs |

---

## 3. File ownership T3 (vista resumida)

```
services/collector/
├── shared/heartbeat.ts                ← T3.1
├── tasks/
│   ├── eumetsat-radar/                ← T3.2
│   ├── aemet-forecast/                ← T3.3
│   ├── cams-aq/                       ← T3.4
│   ├── adif-fallback/                 ← T3.5
│   ├── renfe-ld-realtime/             ← T3.5
│   ├── air-quality/                   ← T3.5
│   └── (rest)/index.ts                ← T3.1 append-only heartbeat call

services/ml/                           ← T3.6 + T3.7 + T3.9
├── Dockerfile
├── main.py
├── models/
│   ├── train_delays.py
│   ├── flight_delays.py
│   ├── congestion.py
│   ├── fuel_forecast.py
│   └── accident_risk.py
├── export/                            ← T3.9
└── ets/                               ← T3.9

src/app/api/
├── health/route.ts                    ← T3.1
├── meteo/forecast/route.ts            ← T3.3
├── calidad-aire/forecast/route.ts     ← T3.4
└── predict/                           ← T3.7

src/lib/
└── ml-cache.ts                        ← T3.7

prisma/schema.prisma                   ← T3.6 (coordinador único migraciones)
docker-compose.ml.yml                  ← T3.6
docker-compose.collectors.yml          ← T3.1 (extend de existente)
next.config.ts                         ← T3.8
tests/load/                            ← T3.8
docs/DR-RUNBOOK.md                     ← T3.1
bin/backup-verify.sh                   ← T3.1

monitoring/
├── grafana-dashboard.json             ← T3.8
└── alert-rules.yml                    ← T3.8
```

---

## 4. Handshakes T3

| HS | Rol T3 | Counterparty | Sprint | Contract |
|---|---|---|---|---|
| **HS2** | Productor | T2.2 (`/meteo` hub) | S0 vie | `WeatherForecast` table schema firmada vie mañana |
| **HS5** | Productor | T1.9, T2.4 | S3 | `/api/predict/*` schema firmada lun S3 |
| **HS8** | Productor | T3.8, T4.8 | S0 | `CollectorHeartbeat` table contract |
| **HS7** | Consumidor | T4.1 (Stripe middleware) | S2 | Tier enforcement headers para limitar `/api/predict/*` por tier |

---

## 5. Dependencias externas

| Dependencia | Quién provee | Cuándo |
|---|---|---|
| EUMETCAST credentials | Usuario consigue acceso | S0 vie mañana o fallback a NWS gratuito |
| AEMET API key | Ya en env | live |
| CAMS API key | Usuario provisto ✅ | live |
| ADIF API access | Investigación + signup | S0 sáb |
| MLflow server hosting | Decidir self-host vs Databricks Community | S1 |
| S3 bucket para datasets enterprise | Cloudflare R2 (cuenta Abemon) | S4 |

---

## 6. Métricas éxito T3

### Data freshness SLOs
- AIS: max age 10 min (ya cumple)
- AEMET alerts: max age 1h
- AEMET forecast: max age 6h
- CAMS AQ forecast: max age 12h
- EUMETSAT radar: max age 30 min
- Renfe positions: max age 5 min
- CNMC fuel: max age 24h

### Monitoring
- 43/43 collectors con heartbeat activo
- 0 collectors stale (>2× cadencia) sostenido
- Grafana dashboards live · alert rules configuradas

### ML
- 5 predictores en producción
- MAE/AUC dentro de targets (sección 2)
- Drift PSI <0.2 sostenido
- `/api/predict/*` P95 <500ms

### Performance
- LCP `/` <2s mobile
- LCP hubs <2.5s mobile
- Bundle home <600KB JS parse
- API P95 routing <120ms, multimodal <3s

### DR
- Backup nightly verified · restore <2h documentado
- RTO 4h, RPO 24h

---

## 7. Riesgos T3

| Riesgo | Mitigación |
|---|---|
| EUMETSAT credentials denegadas | Fallback NWS GFS public radar (peor cobertura ES) |
| Predictores con MAE/AUC no alcanzan target | Beta con disclaimer + iterar con más features |
| Drift detection falsos positivos | Calibrar thresholds 1 mes baseline antes alertas |
| Migration `prisma` rompe producción | Coordinador único 3.6 + pre-deploy en hetzner-dev siempre |
| k6 no detecta SLO miss real | Run en producción week-end con 5 min sostenido |
| Backup restore tarda >RTO | Practice quarterly + script automatizado |

---

## 8. Sync interno T3

- 9 sub-agents bastante disjuntos (cada collector = path único)
- Excepción: `prisma/schema.prisma` SOLO 3.6 hace merge final
- Excepción: `docker-compose.collectors.yml` SOLO 3.1 modifica
- Daily merge `team3` por lead
- Demo viernes: Grafana screenshot + 1 predictor live demo + freshness report

---

**Source of truth:** `docs/ROADMAP-MASTER-2026.md`
**Última actualización:** 2026-04-17
