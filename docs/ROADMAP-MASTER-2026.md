# trafico.live — ROADMAP MASTER 2026

> 🎯 **SINGLE SOURCE OF TRUTH.** Cualquier conflicto con otro doc se resuelve por ESTE.
> Los demás roadmap docs (`ROADMAP-LAUNCH-2026-04-20-v2.md`, `ROADMAP-ROUTING-AFFILIATE.md`) están **archivados** — se conservan por traza histórica pero no se actualizan.

**Última actualización:** 2026-04-17
**Modelo de ejecución:** 4 teams × 9 subagents = **36 agentes simultáneos**
**Horizonte:** jueves 17 abril (S0+) → mediados junio (producto completo operativo)
**Launch consumer:** lunes 20 abril 09:00 CEST · **Launch monetización (`/ir`):** ~10 junio

---

## ÍNDICE

1. [Datos pre-launch (GSC+GA4)](#1-datos-pre-launch-real)
2. [Visión + 6 productos](#2-visión-de-producto)
3. [Los 4 teams](#3-los-4-teams)
4. [File ownership matrix](#4-file-ownership-matrix)
5. [Sprint plan](#5-sprint-plan)
6. [Integration points](#6-integration-points)
7. [Sync protocol](#7-sync-protocol-cómo-no-pisarse)
8. [Status board](#8-status-board)
9. [Infrastructure](#9-infrastructure-consolidada)
10. [Decisiones del usuario](#10-decisiones-confirmadas)
11. [Riesgos + mitigación](#11-riesgos--mitigación)

---

## 1. Datos pre-launch (real)

**Detalle:** `docs/seo-audit-2026-04-17/10-gsc-ga4.md`

| Métrica | Valor 90d | Lectura |
|---|---|---|
| GSC clicks/impr/pos | 1 / 115 / 31.4 | Pre-launch puro, property 24d |
| GSC trend last-7d | +4400% impr | **Google indexando ahora** |
| GA4 users/sessions/pageviews | 90 / 200 / 1.600 | 8 pv/sess |
| GA4 avg duration | **638s** | Engagement excelente |
| GA4 bounce | 37% | Muy bueno |
| GA4 trend last-7d | **-75%** sessions | 🚨 sin distribución decae |
| Source mix | direct 99%, **chatgpt 1**, organic 1 | AI discovery activo |
| Device | Desktop 85% / Mobile 14% | Mantener mobile fixes igual |

**Hipótesis validadas:** entity SSG funciona (gasolineras pos 3 sin optimizar) · hubs enganchan (`/trenes` 703s avg) · LLMs ya leen (1 referral ChatGPT).

---

## 2. Visión de producto

Una sola infra (43 collectors, 78 modelos Prisma, 121 endpoints) alimenta **6 productos que se potencian**:

| # | Producto | Monetización |
|---|---|---|
| 1 | **`/ir` meta-buscador multimodal** (Rome2Rio-ES) | Afiliados (vuelos, trenes, ferries, bus, coche) |
| 2 | **Live trackers** (`/vuelos`, `/barcos`, `/trenes/live`) | SEO + ads + upsell |
| 3 | **Predicciones ML** (retrasos, atascos, gasolina, riesgo) | Premium + venta enterprise |
| 4 | **B2B API + dashboards** (Stripe tiers + flotas + ayuntamientos) | SaaS recurrente 19-499€/mes + enterprise 2-20K€/año |
| 5 | **Travel Assistant AI** (chatbot + MCP público + Alexa) | Brand + upsell |
| 6 | **Comunidad + alertas + contenido** | Suscripción 4,99€/mes |

**Revenue objetivo 12 meses:** 200-500K€/año · **24 meses:** 1-1.5M€/año.

---

## 3. Los 4 teams

| Team | Charter | Lead role | Sub-agents |
|---|---|---|---|
| **T1 — ROUTING CORE** | Todo lo que calcula rutas + meta-buscador `/ir`/`/ruta`/`/viaje` + isócronas | Routing architect | 9 |
| **T2 — CONSUMER + UX** | Hubs, entity pages, live trackers, header/footer, design system, accesibilidad, SEO on-page | Frontend lead | 9 |
| **T3 — DATA + ML + INFRA** | Collectors, ML predictors, monitoring, weather/AEMET/CAMS, performance | Backend lead | 9 |
| **T4 — PLATFORM + MONEY** | Stripe, API premium, MCP, chatbot, flotas, alertas, ayuntamientos, analytics, distribution | Platform lead | 9 |

**Cada team trabaja en su propia branch git** (`team1`, `team2`, `team3`, `team4`). Merges al `integration` diariamente, a `main` en demo viernes.

---

## 4. File ownership matrix

**Regla absoluta:** ningún path en >1 team. Si un sub-agent necesita escribir fuera de su zona, abre issue + espera handshake (sección 6).

### TEAM 1 — Routing Core

| Sub-agent | Owns | Sprint principal |
|---|---|---|
| 1.1 OSRM deploy | `services/osrm/`, `docker-compose.routing.yml` | S1 |
| 1.2 Routing API | `src/app/api/route/route.ts`, `src/lib/routing.ts` | S1 |
| 1.3 OSRM profiles | `services/osrm/profiles/*.lua`, `services/osrm/build-graph.sh` | S1 |
| 1.4 OTP2 service | `services/otp/`, `docker-compose.otp.yml` | S2 |
| 1.5 OTP graph builder | `services/otp/build-graph.sh`, crontab entry | S2 |
| 1.6 Multimodal API | `src/app/api/multimodal/route.ts`, `src/lib/multimodal.ts`, `src/types/multimodal.ts` | S2 |
| 1.7 Valhalla isócronas | `services/valhalla/`, `src/app/api/isochrone/route.ts` | S3 |
| 1.8 `/calculadora` motor | `src/app/calculadora/**`, `src/lib/calculadora/`, `src/lib/tolls.ts` | S2 |
| 1.9 `/ir` + `/ruta` + `/viaje` | `src/app/ir/**`, `src/app/ruta/**`, `src/app/viaje/**`, `src/components/multimodal/**` | S4-5 |

### TEAM 2 — Consumer + UX

| Sub-agent | Owns | Sprint principal |
|---|---|---|
| 2.1 TraficoMap unified | `src/components/map/TraficoMap.tsx`, `src/lib/map-layers/**`, **borra** `src/components/map/{Unified,InteractiveBase,Historical,Comparator,ProvinceHeatmap,LocationMap,VesselLiveMap,StationLocationMap}.tsx` | S0 (launch) |
| 2.2 Hubs verticales (8) | `src/app/{maritimo,aviacion,trenes,trafico,transporte-publico,meteo,combustible,calidad-aire}/page.tsx` y `**/content.tsx` | S0 |
| 2.3 Header + footer + design tokens | `src/components/layout/{Header,Footer,Nav}*`, `src/app/globals.css`, `src/components/ui/{Button,StatCard,VerticalHub}.tsx` | S0 |
| 2.4 Live trackers `/vuelos` `/barcos` `/trenes/live` | `src/app/vuelos/**`, `src/app/barcos/**`, `src/app/trenes/live/**` | S2-3 |
| 2.5 Entity pages SSG batch A | `src/app/trenes/estacion/[slug]/**`, `src/app/trenes/linea/[slug]/**`, `src/app/aviacion/aeropuertos/[iata]/**`, `src/app/maritimo/puertos/[slug]/**` | S0 |
| 2.6 Entity pages SSG batch B | `src/app/carreteras/[ref]/**`, `src/app/maritimo/buques/[slug]/**`, `src/app/gasolineras/[id]/**`, `src/app/meteo/estaciones/[slug]/**`, `src/app/calidad-aire/estaciones/[slug]/**` | S0 |
| 2.7 Polish páginas existentes (GSC data) | `src/app/{camaras,carreteras,estaciones-aforo,noticias}/**` (rework templates) | S0 |
| 2.8 SEO infra (titles+canonicals+OG+JSON-LD+LLMs.txt) | Page metadata exports site-wide, `src/app/opengraph-image.tsx`, `src/app/llms.txt/route.ts`, `src/lib/seo/` | S0 |
| 2.9 a11y + mobile + dark mode + visual QA | `src/components/ui/SkipLink.tsx`, `src/app/layout.tsx` (WCAG attrs), responsive fixes site-wide en `*.tsx` ya owned por 2.1-2.7 (coordinado por handshake) + Playwright `tests/visual/` | S0 |

### TEAM 3 — Data + ML + Infra

| Sub-agent | Owns | Sprint principal |
|---|---|---|
| 3.1 Heartbeats + /api/health | `services/collector/shared/heartbeat.ts`, `src/app/api/health/route.ts`, todos los `services/collector/tasks/*/index.ts` (append-only de heartbeat call) | S0 |
| 3.2 EUMETSAT radar collector | `services/collector/tasks/eumetsat-radar/**`, schema models for `RadarFrame` | S0 |
| 3.3 AEMET forecast collector | `services/collector/tasks/aemet-forecast/**`, schema model `WeatherForecast`, `src/app/api/meteo/forecast/route.ts` | S0 |
| 3.4 CAMS AQ forecast collector | `services/collector/tasks/cams-aq/**`, schema model `AQForecast`, `src/app/api/calidad-aire/forecast/route.ts` | S0 |
| 3.5 Renfe ADIF fallback + air-quality fix | `services/collector/tasks/renfe-ld-realtime/`, `services/collector/tasks/air-quality/`, `services/collector/tasks/adif-fallback/**` | S0 |
| 3.6 ML service scaffold + 5 predictores | `services/ml/**`, `docker-compose.ml.yml` | S2-3 |
| 3.7 Predict API + Redis cache | `src/app/api/predict/**`, `src/lib/ml-cache.ts` | S3 |
| 3.8 Performance + monitoring | Lighthouse fixes, `next.config.ts`, recharts dynamic imports, `<img>` → `next/image` site-wide (coordinado), Grafana dashboard JSON, alert rules, PgBouncer config | S0 + ongoing |
| 3.9 Data exports enterprise + EU-ETS | `services/ml/export/**`, `services/ml/ets/**`, S3 batch drops | S5 |

### TEAM 4 — Platform + Money

| Sub-agent | Owns | Sprint principal |
|---|---|---|
| 4.1 Stripe tiers + webhooks + middleware enforcement | `src/app/api/billing/**`, `src/lib/stripe.ts`, `src/lib/api-tiers.ts`, `src/middleware.ts` (auth+tier enforcement) | S2 |
| 4.2 `/api` landing + playground + Swagger | `src/app/api-landing/**`, `src/app/api-docs/**`, `public/openapi.json` | S2 |
| 4.3 Dashboard cliente | `src/app/dashboard/**`, auth flow, key management UI | S3 |
| 4.4 MCP npm publish | `src/mcp/**`, `packages/mcp-server/**`, npm release pipeline | S3 |
| 4.5 Chatbot widget | `src/components/chat/**`, `src/app/api/chat/route.ts`, Claude API integration | S3 |
| 4.6 Alexa + Google skill | `services/alexa/**`, `services/google-action/**` | S4 |
| 4.7 Flotas SaaS | `src/app/flotas/**`, `prisma/schema.prisma` (`FleetVehicle`, `FleetPosition`), `src/app/api/flotas/**` | S4 |
| 4.8 Alertas push + suscripción + analytics | `src/app/alertas/**`, `prisma/schema.prisma` (`UserAlert`), `src/app/api/alerts/**`, GA4 event funnel custom (`pricing_click`, `api_docs_click`, `newsletter_signup`, `vertical_click`, `cta_click`, `affiliate_click`), GA4 bot filter | S0 (eventos) + S4 (alertas) |
| 4.9 Distribution loop + ayuntamientos | `services/collector/tasks/weekly-digest/**`, `src/app/ayuntamiento/[slug]/**`, Resend integration, Bluesky/X auto-post, monthly PDF report | S5 |
| **4.10 NUEVO Auth + accounts + status page + i18n EN** | `src/app/(auth)/**` (login/signup/forgot/verify), `src/lib/auth-client.ts`, NextAuth config, `src/app/account/**`, `src/middleware.ts` (auth coordinated con 4.1), `src/app/status/page.tsx` + cron checker, `messages/{es,en}.json` + next-intl setup | S1 |

### Archivos compartidos / read-only

Estos archivos los lee cualquier team pero **solo escribe el owner explícito**:

| Path | Owner único | Quién más puede leer |
|---|---|---|
| `prisma/schema.prisma` | T3.6 (coordinador) | Todos. Cambios via PR a T3 con migración nombrada |
| `package.json` | T3.8 | Todos. Cambios via PR coordinado |
| `src/lib/db.ts` | T3.1 | Todos |
| `src/lib/redis.ts` | T3.1 | Todos |
| `src/lib/auth.ts` | T4.1 | Todos |
| `src/middleware.ts` | T4.1 | Todos |
| `src/components/layout/nav/NavData.ts` | T2.3 | Todos |
| `src/app/sitemap.ts` | T2.8 | Todos |
| `src/app/layout.tsx` | T2.3 | Todos |
| `next.config.ts` | T3.8 | Todos |
| `docker-compose.web.yml` | T3.8 | Todos |
| `docker-compose.collectors.yml` | T3.1 | Todos |

**Cualquier conflicto en estos archivos** → handshake síncrono (sección 6).

---

## 5. Sprint plan

### S0 (LAUNCH) — jue 17 noche → lun 20 abril 09:00 CEST

**Objetivo:** Plataforma consumer pulida, 27.553 entity pages SSG, 8 hubs full-feature, infra hardening, todos los P0/P1 audits.

#### S0.1 — jue 17 noche (3-4h)

**T1**: idle (descansa para sprint largo S1)
**T2**: nada
**T3 quick wins (3.1, 3.8)**:
- Fix `/api/movilidad/corredores` date fallback
- Remove SASEMAR 30-day filter
- `prisma migrate deploy` para `CollectorHeartbeat`
- Recharts dynamic en `/trenes` y `/intensidad`
- Fix CF `CF-Cache-Status: DYNAMIC` sitewide
- Stub `/aviacion/aeropuertos/page.tsx`

**T4 quick wins (4.8)**:
- GA4 bot filter + internal traffic
- Decisión `/noticias`: rework o deprecar (recomendación: rework con diseño "live news ticker")
- `chmod 600` .env files en compute

#### S0.2 — vie 18 (6-7h, los 4 teams todo el día en paralelo)

| Team | Foco viernes |
|---|---|
| **T1** | 1.1+1.2+1.3 — OSRM 3 perfiles compilados y deployados (sólo car en producción aún). Setup branches y tooling. |
| **T2** | 2.1 (TraficoMap unified + borra 8 componentes) + 2.3 (header/footer white start) + 2.8 (P0 SEO: 47 titles + 32 canonicals + OG template) |
| **T3** | 3.1 (heartbeats 43 collectors + /api/health extend) + 3.2-3.4 (EUMETSAT + AEMET forecast + CAMS arranque) + 3.5 (ADIF + air-quality fix) |
| **T4** | 4.1 (Stripe sandbox + middleware tier base) + 4.8 (GA4 event funnel custom) + esqueleto routes `/api`, `/dashboard`, `/flotas`, `/alertas` |

#### S0.3 — sáb 19 (6-7h)

| Team | Foco sábado |
|---|---|
| **T1** | 1.8 (`/calculadora` con OSRM motor real, peajes PostGIS, CNMC live) |
| **T2** | 2.2 (8 hubs full) + 2.3 finish (header+footer+tokens) + 2.7 (rework `/camaras`, `/carreteras/[code]`, `/estaciones-aforo`) |
| **T3** | 3.2-3.4 finish (3 collectors weather/AQ ya escribiendo) + 3.8 perf (recharts, images, CF cache) |
| **T4** | 4.2 (`/api` landing + Swagger UI) + 4.8 (LLMs.txt + FAQ schema 7 hubs) |

#### S0.4 — dom 19 AM (6h)

| Team | Foco domingo AM |
|---|---|
| **T1** | Demo `/calculadora` end-to-end + cleanup |
| **T2** | 2.5+2.6 (entity pages SSG batch A+B = **27.553 URLs**) + structured data por tipo |
| **T3** | Demo 3 collectors weather + monitoring Grafana dashboard activo |
| **T4** | 4.5 esqueleto chatbot widget (placeholder UI hasta S3 con Claude API) |

#### S0.5 — dom 19 PM (6-7h, QA + deploy)

| Team | Foco domingo PM |
|---|---|
| **T1** | QA `/calculadora` + smoke tests rutas (10 trayectos conocidos) |
| **T2** | 2.9 visual QA Playwright + 32 WCAG AA fixes + 18 mobile fixes + dark mode parity |
| **T3** | 3.8 monitoring final (Grafana JSON + alert rules) + PgBouncer 25→50 + bundle analysis |
| **T4** | 4.8 GA4 events tracking en producción + sitemap submission GSC + Sentry RELEASE tag |

**GO/NO-GO domingo 23:59:** todos los teams reportan criterio salida. Decisión final 00:30 lunes.

**Plan B**: si ≥1 P0 abierto → delay miércoles 22 09:00. Tag `pre-launch-2026-04-17` para rollback 60s.

---

### S1 (sem 1 post-launch) — lun 21 → dom 27 abril

**Objetivo:** Foundations post-launch en paralelo. Aprovechar momentum del lanzamiento.

| Team | Sprint 1 |
|---|---|
| **T1** | 1.4+1.5 OTP2 deploy + graph builder con GTFS existentes |
| **T2** | 2.4 `/vuelos` y `/barcos` esqueletos (live trackers fase 1) + páginas SEO por-ruta vuelo (200 landings) |
| **T3** | 3.6 ML service scaffold (FastAPI + Docker) + 3.7 Redis cache layer |
| **T4** | 4.1 Stripe live mode (cuando consigues partner agreement) + 4.2 playground iterar + **distribución semanal arranque** (newsletter primer envío manual) |

**Demo viernes 24:** `/calculadora` con peajes en producción · OTP2 respondiendo Sants→Girona · ML service `/health` ok · Stripe checkout live.

---

### S2 (sem 2-3) — 28 abr → 11 may

**Objetivo:** Multimodal funcionando + trackers 80% + ML primer predictor + B2B API tier enforcement.

| Team | Sprint 2 |
|---|---|
| **T1** | 1.6 `/api/multimodal` con OTP2 integrado + 1.8 calculadora con alternativas (rápida/sin peajes/eco) |
| **T2** | 2.4 `/trenes/live` reworking + entity pages live por tren/avión/barco + páginas SEO billete-tren (300) |
| **T3** | 3.6 train_delays predictor (MAE < 4 min) + 3.7 `/api/predict/train-delays` integrado |
| **T4** | 4.1 tier enforcement live + 4.3 dashboard cuenta cliente (sólo PRO/ENTERPRISE) + outreach 50 leads B2B |

**Demo viernes 8 may:** `/api/multimodal` Sevilla→Palma con 3+ opciones · predictor retrasos AVE en producción · primer cliente PRO de prueba.

---

### S3 (sem 3-4) — 12 → 25 may

**Objetivo:** Trackers FULL + 4 predictores live + chatbot + MCP npm.

| Team | Sprint 3 |
|---|---|
| **T1** | 1.7 Valhalla isócronas + 1.9 `/ir`+`/ruta`+`/viaje` namespace prep |
| **T2** | 2.4 `/vuelos` y `/barcos` FULL (panel detalle + filtros + widgets embebibles) + comparadores evergreen (AVE vs AVLO vs Iryo) |
| **T3** | 3.6 flight_delays + congestion + fuel_forecast predictors + 3.7 endpoints `/api/predict/*` |
| **T4** | 4.4 publish `@trafico/mcp-server` en npm + 4.5 chatbot widget con Claude API + MCP tools (live en site) |

**Demo viernes 22 may:** 3 trackers en vivo · 4 predictores integrados · MCP package en npm · chatbot respondiendo en site.

---

### S4 (sem 5-6) — 26 may → 8 jun

**Objetivo:** `/ir` meta-buscador LIVE con afiliados integrados.

| Team | Sprint 4 |
|---|---|
| **T1** | 1.9 `/ir` meta-buscador full (origen→destino + tabla comparativa + 2.000 landings SSG) + redirects `/ruta` y `/viaje` |
| **T2** | 2.4 widgets afiliados integrados en `/ir` (Skyscanner+Trainline+DirectFerries+FlixBus) + landings `/vuelo/[ruta]`, `/billete-tren/[ruta]`, `/ferry/[ruta]`, `/autobus/[ruta]` |
| **T3** | 3.6 accident_risk predictor + 3.9 dataset enterprise export semanal a S3 |
| **T4** | 4.6 Alexa/Google skill stubs + 4.7 flotas onboarding flow + 4.8 alertas push (Web Push + Resend) live |

**Demo viernes 5 jun:** `/ir` Sevilla→Palma con 4 opciones + precios reales + botones afiliados + tracking · primer click afiliado registrado en `AffiliateClick`.

---

### S5 (sem 7-8) — 9 → 22 jun

**Objetivo:** Consolidación + enterprise launch + ayuntamientos pilot.

| Team | Sprint 5 |
|---|---|
| **T1** | Iteración `/ir` con feedback + página comparador isócronas 52 capitales |
| **T2** | Embeds widget público `<iframe src="https://trafico.live/embed/*">` + comparadores SEO data-driven (5-10 artículos) |
| **T3** | 3.9 EU-ETS compliance pipeline (1 piloto naviera) + Grafana ML model performance dashboards |
| **T4** | 4.7 flotas dashboard FULL (3 pilotos activos) + 4.9 ayuntamiento template + primer piloto + monthly state-of-traffic PDF report |

**Demo viernes 19 jun:** `/ir` con tracking analítico semanal · 3 flotas pilotando · 1 ayuntamiento firmado · 1 informe EU-ETS vendido.

---

## 6. Integration points

Cuando un team necesita lo de otro, hay **handshake explícito**:

| # | Productor | Consumidor | Sprint | Contract |
|---|---|---|---|---|
| **HS1** | T2.1 (TraficoMap) | T2.2 (hubs), T2.4 (live trackers), T2.5+2.6 (entity pages) | S0 | TraficoMap props API congelada vie 18 noche |
| **HS2** | T3.2-3.4 (weather collectors) | T2.2 (`/meteo` hub) | S0 | Tabla `WeatherForecast` schema firmada vie 18 mañana |
| **HS3** | T1.2 (routing API) | T1.8 (calculadora), T1.9 (`/ir`) | S0/S2 | `/api/route` request/response types en `src/types/routing.ts` |
| **HS4** | T1.6 (multimodal API) | T1.9 (`/ir`), T2.4 (widgets) | S2 | `MultimodalItinerary` type firmada lun S2 |
| **HS5** | T3.7 (predict API) | T1.9 (`/ir` ordering), T2.4 (panels live) | S3 | `/api/predict/*` schema firmada lun S3 |
| **HS6** | T2.4 (widgets afiliados) | T1.9 (`/ir`) | S4 | `<Offers provider source />` props firmada lun S4 |
| **HS7** | T4.1 (Stripe tier middleware) | T4.3 (dashboard), T4.5 (chatbot rate limit), todos los `/api/*` | S2 | Headers `x-tier` en requests autenticados |
| **HS8** | T3.1 (heartbeats schema) | T3.8 (Grafana), T4.8 (alerts) | S0 | `CollectorHeartbeat` table contract |
| **HS9** | T4.4 (MCP npm) | T4.5 (chatbot tools) | S3 | MCP tools list firmada vie S2 |
| **HS10** | T2.8 (sitemap+canonicals) | T2.5+2.6 (entity pages) | S0 | `getSlugList()` per template + `revalidate` policy firmada vie 18 |

**Si un consumidor no tiene su contract a tiempo** → bloquea su sub-agent y reporta al integration channel (ver sección 7).

---

## 7. Sync protocol — cómo no pisarse

### 7.1 Branch strategy

```
main                ← producción, deploy automático vía webhook
└── integration     ← merge target diario, los 4 teams pushean aquí
    ├── team1       ← T1 trabaja aquí, sub-agents en sub-branches
    │   ├── team1-1.1-osrm-deploy
    │   ├── team1-1.2-routing-api
    │   └── ...
    ├── team2       ← T2
    ├── team3       ← T3
    └── team4       ← T4
```

- Cada sub-agent abre branch `team{N}-{X.Y}-{slug}` desde `team{N}`
- PR del sub-agent → `team{N}` (revisor: lead T{N})
- Daily merge `team{N}` → `integration` cada noche 23:00 (script `bin/daily-integrate.sh`)
- Demo viernes: tras OK de los 4 leads, merge `integration` → `main`

### 7.2 Conflict resolution

1. Si un sub-agent encuentra conflicto en archivo NO-owned: **abandona el cambio**, abre issue con label `cross-team-handshake`, espera respuesta del owner en ≤4h.
2. Si dos sub-agents del mismo team pisan el mismo archivo: **el que llegó después rebase**.
3. Conflictos en `prisma/schema.prisma`: SOLO T3.6 hace merge final, los demás abren PR de propuesta de migración.

### 7.3 Sync cadence

| Cuándo | Qué | Quién |
|---|---|---|
| **Diario 23:00** | Merge `team{N}` → `integration` automatic | Script |
| **Diario 23:30** | Test suite full en `integration` | CI |
| **Lunes 09:00** | Standup async — cada team reporta status sub-agents | 4 leads |
| **Miércoles 14:00** | Mid-sprint check — bloqueos pendientes | 4 leads |
| **Viernes 17:00** | Demo cada team (10 min) + integration merge to main | Todos |
| **Domingo 19:00** | Sprint retro + plan próxima semana | Todos |

### 7.4 Issue labels

- `cross-team-handshake` — bloquea equipo, requiere otro team
- `integration-conflict` — conflicto en daily integration
- `dependency-external` — espera proveedor externo (Stripe approval, Trainline aprobación, etc.)
- `data-quality` — bug en datos de un collector que afecta UI
- `regression` — algo que funcionaba se rompió

### 7.5 Status tracking

Status de los 36 sub-agents en `STATUS.md` en root del repo (auto-actualizado por `bin/daily-status.sh`):

```markdown
# STATUS — Sprint S2 — día 3/14
## T1
- 1.1 ✅ done  | 1.2 🟢 in progress (PR #234)  | 1.3 ✅ done
- 1.4 🟢 in progress  | 1.5 🔴 blocked by HS2  | 1.6 ⚪ pending
...
```

---

## 8. Status board

**`STATUS.md`** en root del repo es el dashboard. Estados:
- ⚪ pending — no empezado
- 🟢 in_progress — sub-agent activo
- 🟡 review — PR abierto esperando merge
- ✅ done — merged a `team{N}`
- ✅✅ shipped — merged a `main` y desplegado
- 🔴 blocked — espera dependencia (especificar HS o issue)

**Comando para regenerar `STATUS.md`:** `bin/daily-status.sh` lee branches y PRs vía `gh` CLI, output markdown table.

---

## 9. Infrastructure consolidada

| Componente | RAM | Disco | Sprint deploy |
|---|---|---|---|
| Web Next.js (HA par compute+compute2) | 16 GB | 80 GB | S0 |
| Postgres+PostGIS+PgBouncer 50 (primary) | 64 GB | 2 TB | S0 patch |
| Redis | 4 GB | — | live |
| Typesense 28 collections | 8 GB | 100 GB | live |
| OSRM × 3 perfiles | 18 GB | 300 GB | S0-S1 |
| Valhalla isócronas+truck | 6 GB | 60 GB | S3 |
| OpenTripPlanner 2 | 8 GB | 20 GB | S1 |
| ML service (FastAPI+sklearn) | 6 GB | 40 GB | S1-S5 |
| Tile server (nginx+Martin) | 4 GB | 200 GB | live |
| Collectors (7 containers) | 5 GB | — | live + S0 ext |
| Chatbot worker + MCP | 2 GB | — | S3 |
| **TOTAL** | **~141 GB / 256 GB** | **~2.8 TB** | — |

**Conclusión:** todo cabe en hetzner AX102 actual. No escalado hardware en 2026.

---

## 10. Decisiones confirmadas

- **D1** ✅ Roadmap aprobado
- **D2** ✅ Mixto agresivo — TODO en paralelo desde día 1 con 4 teams × 9 subagents
- **D3** ✅ Aplicar HOY a Skyscanner Partners, Trainline Partners, DirectFerries, FlixBus, BlaBlaCar Bus, Awin, Rakuten (ver `docs/AFFILIATE-APPLICATIONS.md` — TODO crear)
- **D4** ✅ S0+ esta noche (3-4h con 9 quick wins, ahora incluye GA4 bot filter y `/noticias` decision)
- **D5** ✅ Los 3 namespaces `/ir` + `/ruta` + `/viaje` con landings duplicadas SEO (canonical → `/ir`)

---

## 11. Riesgos + mitigación

| Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|
| Launch S0 se cae de calidad | Media | Alta | Delay miércoles 22 (decisión Q8), criterio todo o nada |
| Conflicts entre 36 agentes en archivos shared | Alta | Alta | File ownership matrix sección 4 + handshakes sección 6 + branches por team |
| Afiliados rechazan (sitio nuevo) | Media | Alta | Aplicar YA en S0+ paralelo, Awin/Rakuten puente, fase E plan B = AdSense temporal |
| Predicciones con baja precisión erosionan marca | Media | Alta | Beta con disclaimer, validation strict pre-launch H, AUC > 0.7 mínimo |
| `/ir` performance pobre con 4 APIs en paralelo | Media | Media | Streaming responses + Redis cache 15 min + degradación graceful |
| **Decay -75% sessions sin distribución** | Alta | Media | Distribution loop semanal arranca S1 (newsletter, RRSS auto, Reddit) |
| B2B outreach tarda en convertir | Alta | Media | Pricing inbound bueno + free tier + case studies primeros 3 PROs |
| APIs externas cambian | Alta | Media | Abstraction layer + fallback (ej. ADIF si Renfe LD muere) |
| Daily integration tests rojos | Media | Media | Cada team arranca con tests de integración + revert automático si CI rojo |

---

## 11.5 Gap analysis 2026-04-17 (integrado)

Tras revisión de "perfect final product", estos items se han integrado:

### Bloqueantes pre-launch (S0)
- ✅ T2.8 — GDPR cookie banner + consent management (added)
- ✅ T2.8 — `robots.txt` fix 3 critical errors + 404 page custom (added)
- ✅ T4.8 — T&C / Privacy / Cookies pages updated para afiliados+API+flotas+alertas (added)
- ✅ T2.9 — E2E Playwright 10 flujos críticos (added a S0.5 además del visual QA existente)
- ✅ T3.1 — Backup verified + DR runbook documentado (added a S0+)

### Bloqueantes pre-monetización (S1-S2)
- ✅ T4.10 NUEVO — User accounts (NextAuth + login/signup/forgot/verify) + status page `status.trafico.live` + i18n EN base (added)
- ✅ T4.5 — Customer support: `support@trafico.live` + auto-reply + Crisp widget en `/api`+`/dashboard`+`/flotas` (added a S2)

### Bloqueantes pre-`/ir` (S4)
- ✅ T2.7 — Affiliate disclosure footer + `/divulgacion-afiliados` page (added)
- ✅ T4.8 — Affiliate revenue dashboard interno (added)
- ✅ T1.6 — Sanctions/embargo filter en routing (lista zonas excluidas) (added)
- ✅ T4.1 — Refund + dispute flow Stripe + VAT por país (Stripe Tax) (added)

### Quality + observability (distribuidos)
- ✅ T3.8 — Load testing k6 contra `/api/multimodal` y `/api/predict/*` (added a S3)
- ✅ T3.8 — APM real (Sentry tracing + flamegraphs site-wide) (added)
- ✅ T3.6 — ML drift detection + model versioning (added)
- ✅ T2.3 — Loading/empty/error states sistemáticos en design system (added)

### Nice-to-have post-launch (Fase 2)
- 📌 Press kit `/prensa` page (T4.9 puede tomarlo)
- 📌 Demo video B2B 90s (manual user)
- 📌 Discord/Slack comunidad API users (T4.4)
- 📌 Onboarding tour first-time visitors (T2.3 con react-joyride)

---

## 12. Próxima acción

**Esta noche (jue 17, 21:00):**
1. Crear branches `team1`, `team2`, `team3`, `team4`, `integration` desde `main`
2. Crear `STATUS.md` inicial con los 36 sub-agents en estado ⚪ pending
3. Ejecutar S0+ 9 quick wins (todos a `integration` directo, no team-branch)
4. Tag `pre-launch-2026-04-17` confirmado en `main`

**Viernes 18, 08:00:** arrancan los 4 teams en paralelo. Standup async 09:00.

---

**Source of truth firmada:** 2026-04-17 23:30
**Owner del doc:** Manuel Jiménez · revisión cualquier viernes en demo
**Docs derivados (archivados):** `docs/ROADMAP-LAUNCH-2026-04-20-v2.md`, `docs/ROADMAP-ROUTING-AFFILIATE.md` — pueden contener detalle granular pero NO sobrescriben este master.
