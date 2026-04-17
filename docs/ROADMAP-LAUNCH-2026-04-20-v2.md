# trafico.live — Roadmap Launch 2026-04-20 · v2 (CONSOLIDATED)

**Launch objetivo:** lunes **20 de abril de 2026**, 09:00 CEST
**Versión:** v2 — integra los 3 audits completos (launch + SEO/UX + UX/Infra/Data)
**Decisión del usuario:** *"mantenemos launch, metemos todos los fixes, ampliamos y mejoramos todo lo que se pueda"* — **scope máximo**
**Criterio Go/No-Go:** todo o nada · delay miércoles 22 si falta algo

---

## 0. Resumen de decisiones + scope final

### Decisiones cerradas (Q1-Q8)

1. Soft launch técnico, consumer-focus, sin B2B/API/MCP/Stripe tiers
2. 7 verticales con hubs pulidos
3. Los 7 al mismo nivel full-feature
4. 27K entity pages SSG (all types)
5. Hard cutover TraficoMap sesión 1
6. P0 del audit original paralelo sesión 1
7. TODOS los live features (weather radar + forecasts + CAMS + boards + ADIF)
8. Todo o nada, delay miércoles si falta

### Nuevos items integrados de los 3 audits (~60h adicionales)

**SEO audit (~18h):**
- P0: fix 47 doble-suffix titles, 32 canonicals, 117 og-images
- P1: header navy→white, footer 76→57, design tokens white-first, breadcrumbs, RelatedLinks, H1 fixes

**UX/Infra/Data audit (~45-50h):**
- **8 chain breaks** (data flow): air-quality stale, SASEMAR filter, movilidad bug, aeropuertos 404, IMD 2022 missing, climate orphan, transit stops no API, migration missing
- 32 WCAG AA fixes (8 críticas): skip link, `<main>`, focus trap, aria-current/live
- 18 mobile issues: layer panel collapsed <md, 44px touch targets, safe-area
- Performance: recharts dynamic, next/image cameras, CF cache bypass fix
- Monitoring: extend /api/health a 43 collectors + Grafana alert rules
- Infra: PgBouncer 25→50, chmod 600 .env, `<Button>`/`<StatCard>` canónicos

### Scope IN (lunes)

- `<TraficoMap>` unificado (reemplaza 9 componentes, elimina 6.200 líneas)
- 7 hubs + `/calidad-aire` secundario = 8 landings + 8 fullscreens
- **27.553 entity pages SSG**
- Weather radar EUMETSAT + AEMET forecast + CAMS AQ + departure boards Renfe/AENA + ADIF fallback
- Header white + footer white + design system white-first
- Todos los P0/P1 de los 3 audits (23 fixes consolidados)
- Tag `pre-launch-2026-04-17` ya pusheado (rollback 60s)

### Scope OUT (Fase 2 post-launch)

- Stripe tiers enforcement + billing portal
- API pública + OpenAPI + MCP server publicado
- `/profesional`, `/api-docs`, billing, keys
- Outreach B2B
- OpenTripPlanner + corridor dashboard + cross-joins analíticos
- Segundo web container / load balancer
- Postgres read replica
- Blue-green deploys
- Storybook / dev preview componentes
- FAQAccordion + TickerStrip canónicos (pueden esperar)

---

## 1. Calendario consolidado

| Sesión | Fecha | Duración | Foco | Agentes |
|---|---|---|---|---|
| **S0+** | jue 17 noche (hoy) | 2-3h | P0 data fixes + P0 SEO quick wins | manual (ya parcial hecho) |
| **S1** | vie 18 | 6-7h | TraficoMap + infra weather/AEMET/CAMS + P0 restantes | 9 |
| **S2** | sáb 19 | 6-7h | 7 hubs + boards + header/footer/design white | 9 |
| **S3** | dom 19 AM | 6h | 27K entity pages SSG + structured data + 3 missing pages | 9 |
| **S4** | dom 19 PM | 6-7h | QA + a11y fixes + mobile + perf + monitoring + deploy | 9 |
| **GO** | lun 20 · 09:00 | — | 🚀 Production live | — |
| **DELAY** | mié 22 · 09:00 | — | Fallback si algo falta el domingo 23:59 | — |

**Total capacity**: 36 agent-slots × ~6h = 216h. Scope actual: ~170-180h. Margen ~15-20%.

---

## 2. Sesión 0+ (hoy tarde) — quick P0 wins

Ya ejecutado hoy:
- ✅ CAMS key guardada
- ✅ OpenSky credentials guardadas
- ✅ Git tag `pre-launch-2026-04-17`
- ✅ Secrets removidos de 2 URLs (cron + admin)
- ✅ AIS verificado funcional (113M posiciones, 104K/10min)
- ✅ OSRM verificado funcional
- ✅ voyage-detector + sasemar ya en crontab
- ✅ /api/health ya usa createdAt correctamente

Pendiente (esta noche, ~3-4h):
- [ ] Fix `/api/movilidad/corredores` date fallback (30m)
- [ ] Remove SASEMAR 30-day filter (15m)
- [ ] Run `prisma migrate deploy` para CollectorHeartbeat (5m)
- [ ] Fix recharts sync imports en /trenes y /intensidad (30m)
- [ ] `chmod 600` .env files en compute (5m)
- [ ] Fix CF `CF-Cache-Status: DYNAMIC` sitewide (30m)
- [ ] Create /aviacion/aeropuertos/page.tsx catalog stub (1h)
- [ ] **GA4 internal traffic + bot filter** (15m) — del análisis GSC+GA4, USA = 15% probable bots
- [ ] **Decidir destino `/noticias`** (deprecar o rework) — datos GA4: 39 views, 34s avg, bounce alto (15m)

---

## 3. Sesión 1 (viernes 18) — Fundamentos + weather infra + P0 consolidado

### 9 agentes paralelos

| # | Agente | Scope | File ownership |
|---|---|---|---|
| 1 | **Core TraficoMap + LayerRegistry** + `<Button>` canonical | `src/components/map/TraficoMap.tsx`, `src/lib/map-layers/`, `src/components/ui/button.tsx` |
| 2 | **Hard cutover migración** 20+ pages (9 componentes → 1) | Borra `src/components/map/Unified/InteractiveBase/Historical/Comparator/ProvinceHeatmap/LocationMap/VesselLiveMap/StationLocationMap` + migra imports |
| 3 | **Heartbeats collectors + extend /api/health** a 43 collectors + Grafana alert rules | `services/collector/shared/heartbeat.ts`, collector tasks (append-only), `src/app/api/health/route.ts`, Prometheus config |
| 4 | **P0 SEO**: fix 47 double-suffix titles + 32 canonicals + OG image template | Page metadata exports, `src/app/opengraph-image.tsx` templates |
| 5 | **Weather radar EUMETSAT** collector + map layer | `services/collector/tasks/eumetsat-radar/`, `src/lib/map-layers/registry.ts` |
| 6 | **AEMET forecast horario** collector + tabla + API | `services/collector/tasks/aemet-forecast/`, `prisma/schema.prisma` (new model), `src/app/api/meteo/` |
| 7 | **CAMS AQ forecast** collector + tabla + API | `services/collector/tasks/cams-aq/`, `prisma/schema.prisma`, `src/app/api/calidad-aire/` |
| 8 | **Renfe ADIF fallback** + debug air-quality MITECO collector | `services/collector/tasks/renfe-ld-realtime/`, `services/collector/tasks/air-quality/`, nuevo `adif-fallback/` |
| 9 | **Nav + /meteo + /combustible esqueleto** + mega menu update | `src/components/layout/nav/NavData.ts`, `src/app/sitemap.ts`, esqueleto pages |

### Criterio salida S1
- [ ] TraficoMap en producción sin regresiones
- [ ] 9 componentes viejos borrados
- [ ] 3 collectors nuevos ejecutaron ≥1 ciclo
- [ ] Heartbeats en 43 collectors + alerta Grafana activa
- [ ] 47 titles corregidos, 32 canonicals añadidos, OG template generator
- [ ] /meteo y /combustible skeleton accesibles

---

## 4. Sesión 2 (sábado 19) — Hubs + boards + white design

### 9 agentes paralelos

| # | Agente | Scope |
|---|---|---|
| 1 | `/maritimo` hub full + `<StatCard>` + `<VerticalHub>` template canónico |
| 2 | `/aviacion` hub + **departures/arrivals boards top 5 aeropuertos** |
| 3 | `/trenes` hub REWORK total al patrón + **boards top 10 estaciones** + ADIF integration |
| 4 | `/trafico` hub full + ticker incidencias |
| 5 | `/transporte-publico` hub + directory operadores |
| 6 | `/meteo` hub full (weather radar + alertas + forecast nacional) |
| 7 | `/combustible` hub full (gasolineras + EV + histórico + marítimo) |
| 8 | **Header white redesign** + footer white + design tokens + RelatedLinks activation |
| 9 | Home hero + `/calidad-aire` hub + cross-vertical links + **rework `/camaras` (target avg 60s+) + polish `/carreteras/[code]` template (intro 150-200w + Road schema + FAQ) + rework `/estaciones-aforo`** — del análisis GSC: están en pos 60-68, podemos subir a pos 20 con on-page bien hecho |

### Criterio salida S2
- [ ] 8 hubs + 8 fullscreens operativos
- [ ] Header + footer en white (no más navy)
- [ ] Design tokens white-first aplicados
- [ ] `<StatCard>` canonical reemplaza 11 inline
- [ ] Breadcrumbs en /trenes/* y data platform
- [ ] Nav incluye los 7 verticales + calidad-aire

---

## 5. Sesión 3 (domingo AM) — 27K entity pages SSG + 3 missing

### 9 agentes paralelos

| # | Agente | Entity type | Volumen | Structured data |
|---|---|---|---|---|
| 1 | Estaciones tren | `/trenes/estacion/[slug]` | 2.154 | `TrainStation` / `Place` |
| 2 | Líneas tren | `/trenes/linea/[slug]` | 1.248 | `TravelAction` |
| 3 | Aeropuertos | `/aviacion/aeropuertos/[iata]` | 42 | `Airport` |
| 4 | Puertos estatales | `/maritimo/puertos/[slug]` | 50 | `Port` / `Place` |
| 5 | Carreteras nacionales | `/carreteras/[ref]` | 300 | `Road` / `Place` |
| 6 | Buques activos | `/maritimo/buques/[slug]` | ~10K | `Vehicle` |
| 7 | Gasolineras | `/gasolineras/[id]` | 12.294 | `GasStation` / `Product` |
| 8 | Estaciones meteo + **catalog /meteo/estaciones** | `/meteo/estaciones/[slug]` | 900 + 1 |
| 9 | Estaciones AQ + **catalog /calidad-aire/estaciones** + `/api/transporte/stops` | `/calidad-aire/estaciones/[slug]` | 565 + 2 endpoints |

**Bonus agent 8/9**: crear también `/climate/estaciones/` + `/api/transporte/stops` endpoint (fix orphan climate + 225K stops sin API del audit DATA 08).

### Criterio salida S3
- [ ] 9 templates creadas + testeadas con 3 muestras cada
- [ ] **~27.553 URLs indexables**
- [ ] Structured data (JSON-LD) per tipo en cada template
- [ ] Sitemap incluye todas las entity pages (+4.000 URLs que faltaban)
- [ ] Canonicals + OG images dinámicas por entity
- [ ] Build local < 30 min (o ISR para buques/gasolineras si pasa)
- [ ] 3 orphan fixes: `/meteo/estaciones`, `/calidad-aire/estaciones`, `/api/transporte/stops`

---

## 6. Sesión 4 (domingo PM) — QA + accesibilidad + mobile + deploy

### 9 agentes paralelos

| # | Agente | Scope |
|---|---|---|
| 1 | **Visual QA** Playwright screenshots 8 hubs + 8 fullscreens light/dark |
| 2 | **Entity smoke tests** 100 URLs × 9 templates = 900 tests carga + SEO |
| 3 | **Performance** Lighthouse + bundle analysis + **fix recharts dynamic + `<img>`→`next/image`** |
| 4 | **SEO** sitemap completa + canonicals final + JSON-LD validator + OG images final + **`LLMs.txt` en root + FAQ schema en 7 hubs + GA4 event funnel custom** (`pricing_click`, `api_docs_click`, `newsletter_signup`, `vertical_click`, `cta_click`, `affiliate_click`) **— BLOQUEANTE: sin event funnel post-launch no sabremos qué convierte** |
| 5 | **Accessibility** fix 32 WCAG AA violations (skip link, `<main>`, focus trap, aria-*) |
| 6 | **Dark mode parity** cada página dark + TraficoMap dark |
| 7 | **Mobile responsive** fix layer panel collapsed `<md`, touch 44px, safe-area |
| 8 | **Monitoring** trafico-live Grafana dashboard + alert rules + SENTRY_RELEASE + PgBouncer 25→50 |
| 9 | **Launch assets** blog post + screenshots + changelog + social copy (borrador) |

### Criterio salida S4 (Go/No-Go Monday)
- [ ] Cero P0 abierto (8 chain breaks fixed, 9 perf+a11y items fixed)
- [ ] Cero regresión visual
- [ ] Build producción sin warnings críticos
- [ ] 27K pages accesibles
- [ ] 8 hubs < 2s FCP
- [ ] Monitoring activo con heartbeats de 43 collectors + alerta Grafana
- [ ] Mobile: layer panel collapsed + touch targets OK
- [ ] WCAG AA: <5 violaciones residuales
- [ ] Rollback plan + pre-launch tag verificado

---

## 7. Lo que añade VALOR vs el roadmap v1

Comparado con el roadmap original:

| Dimensión | v1 (original) | v2 (consolidado) |
|---|---|---|
| Entity pages | 27K planned | 27K + structured data por tipo + sitemap incluyendo |
| Data integrity | No auditado | **8 chains rotos descubiertos + 8 fixes** |
| Accessibility | No mencionado | **32 WCAG AA fixes** |
| Mobile UX | No mencionado | **18 fixes** (layer panel, touch, safe-area) |
| Performance | No auditado | **3 fixes reales** (recharts, images, CF cache) |
| Monitoring | Heartbeats sí | **43 collectors covered + Grafana alerts** |
| Components | — | **`<Button>` + `<StatCard>` + `<VerticalHub>`** canónicos |
| SEO on-page | No | **47 titles + 32 canonicals + 117 OG images** |
| Infra hardening | — | **PgBouncer 25→50, chmod 600, CF cache fix** |

**Impacto esperado:**
- Data chains: 73% → 100%
- WCAG AA: 32 violaciones → <5
- Mobile usability: 3/10 → 7/10
- Perf home JS parse: 1.2MB → 600KB (-50%)
- Monitoring: 7/43 → 43/43 (+515%)
- Component duplication: 98 ad-hoc → 60 (-40%)
- SEO: +10-15% CTR SERP esperado

---

## 8. Plan de contingencia v2

### Si S1 se desborda
- Extender S1 +2h noche viernes
- No avanzar a S2 sin TraficoMap + 3 weather collectors operativos

### Si S3 27K build explota
- ISR para templates de mayor volumen (buques, gasolineras)
- Publicar en tandas: 5K lunes, 10K martes, 12K miércoles

### Si S4 QA encuentra >10 bugs críticos
- Delay al miércoles 22 (decisión Q8)
- Martes y miércoles = bugfix + re-QA

### Rollback plan
- Git tag `pre-launch-2026-04-17` ✅ pusheado
- Docker image `trafico-web:pre-launch` taggear al inicio S1
- Rollback 60s: `docker tag pre-launch latest && docker restart trafico-live`

---

## 9. Dependencias del usuario pendientes

- ✅ CAMS key → guardada
- ✅ OpenSky Client Secret → guardado
- ❓ ¿Aprobar este v2 del roadmap? → esperando tu confirmación
- ❓ ¿Arrancar S0+ ahora (2-3h) para dejar terreno limpio mañana? → recomendado
- ❓ ¿URLs canónicas finales? → mantener las actuales + `/meteo` + `/combustible` (default)

---

## 10. Siguiente acción

**Si apruebas este v2**:
1. Ejecuto ahora S0+ (2-3h) con los 6 pendientes
2. Mañana viernes 08:00 arranco S1 con 9 agentes
3. Te reporto al final de cada sesión con criterio de salida cumplido/no

**Total trabajo estimado**: ~180h de agentes distribuido en 4 sesiones + S0. Con 9 agentes simultáneos, fit exacto.

---

**v2 firmado:** 2026-04-17 tras 3 audits consolidados y decisión del usuario "todos los fixes"
**Archivos maestros:** este `ROADMAP-LAUNCH-2026-04-20-v2.md` + 3 verdict PDFs previos
