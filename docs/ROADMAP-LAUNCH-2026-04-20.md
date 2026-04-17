# trafico.live — Roadmap Launch 2026-04-20

**Lanzamiento objetivo:** lunes **20 de abril de 2026**, 09:00 CEST
**Ventana de ejecución:** jueves 17 abril tarde → domingo 19 abril noche
**Modalidad:** 4 sesiones de trabajo (~6h cada una) + Sesión 0 de limpieza previa
**Paralelización:** hasta **9 agentes concurrentes** por sesión con file ownership estricto
**Criterio Go/No-Go:** **todo o nada** — si al domingo 23:59 falta cualquier feature del scope, el launch se pospone al **miércoles 22 abril**

---

## 1. Scope confirmado

### IN scope (para lunes)

- **`<TraficoMap>` unificado** — un solo componente de mapa reemplaza los 9 actuales. Hard cutover sesión 1, +20 páginas migradas simultáneamente.
- **7 verticales con hubs pulidos al mismo nivel**:
  - `/maritimo` — existente, rework full
  - `/aviacion` — existente, rework full
  - `/trenes` — existente, rework full
  - `/trafico` — existente, rework full
  - `/transporte-publico` — existente, rework full
  - `/meteo` — **nuevo** (weather radar + AEMET forecast + alertas)
  - `/combustible` — **nuevo** (consolidación terrestre + marítima + histórico + EV)
- Cada hub: hero `<TraficoMap>` + 4-6 stat cards + live ticker + 6-8 quick access tiles + entity directory + FAQ + cross-links.
- **~27K entity pages SSG**:
  - 2.154 estaciones ferroviarias
  - 1.248 líneas ferroviarias
  - 42 aeropuertos AENA
  - 50 puertos estatales
  - 300 carreteras nacionales
  - ~10K buques activos
  - 12.294 gasolineras
  - 900 estaciones meteo AEMET
  - 565 estaciones AQ
- **Live features nuevas**:
  - Weather radar EUMETSAT OPERA como capa de mapa
  - AEMET forecast horario municipal (base para 8131 municipios)
  - CAMS AQ 5-day forecast
  - Renfe GTFS-RT departure boards por estación
  - AENA departures/arrivals por aeropuerto
  - ADIF fallback para Renfe LD
- **P0 fixes del audit completados**: AIS roto, aviación miente, OSRM broken, 18 heartbeats, secrets en URLs, voyage-detector + SASEMAR cron.

### OUT of scope (Fase 2, post-launch)

- ❌ Activación Stripe tiers (FREE/PRO/ENT enforcement en runtime)
- ❌ API pública documentada (OpenAPI)
- ❌ MCP server público
- ❌ Páginas `/profesional`, `/api-docs`, billing, keys
- ❌ Outreach B2B dirigido
- ❌ OpenTripPlanner journey planning
- ❌ Corridor intelligence dashboard
- ❌ Cross-joins analíticos (incidents × weather, accidents × climate, vessel × port dwell time)

---

## 2. Calendario

| Sesión | Fecha | Duración | Foco | Agentes paralelos |
|---|---|---|---|---|
| **S0** | jue 17 abr (hoy) | 1-2h | Limpieza P0 instantáneos | 0 (manual, rápido) |
| **S1** | vie 18 abr | 6h | `<TraficoMap>` + P0 restantes + weather/AEMET/CAMS infra | 9 |
| **S2** | sáb 19 abr | 6h | 7 verticales hubs + departure boards + ADIF | 9 |
| **S3** | dom 19 abr AM | 6h | 27K entity pages SSG | 9 |
| **S4** | dom 19 abr PM | 6h | Polish + QA + deploy + announce | 9 |
| **GO** | lun 20 abr 09:00 | — | 🚀 Production live | — |

---

## 3. Sesión 0 (ahora) — Limpieza P0 instantáneos

**Estimado**: 1-2h, manual, sin agentes.
**Entregables**:

- [ ] Quitar claim "actualización cada 5 minutos" en `/aviacion` (3 lugares) — real es 15 min
- [ ] Quitar claim "tiempo real" en `/maritimo` mientras AIS siga degradado
- [ ] Arreglar `AircraftPosition.updatedAt` field mismatch en `/api/health` (el health-check nunca recupera)
- [ ] Deshabilitar endpoint `/api/route` + componente que lo usa (OSRM no desplegado)
- [ ] Añadir entrada cron para `voyage-detector` (weekly) en `services/collector/crontabs/weekly`
- [ ] Añadir entrada cron para `sasemar` (daily) en `services/collector/crontabs/daily`
- [ ] Decidir AIS: intentar reactivar aisstream.io auth (30 min troubleshoot) → si no, switch a `datalastic.com` free tier (1h integración)

Criterio de salida S0: UI no miente sobre frescura, tablas `Voyage`/`PortCall`/`MaritimeEmergency` empiezan a poblarse en <48h, AIS vuelve a entregar posiciones.

---

## 4. Sesión 1 — Fundamentos + infra weather/AEMET/CAMS

**Foco**: construir `<TraficoMap>` + `LayerRegistry`, migrar 20+ páginas, cerrar P0 restantes, y levantar los 3 collectors nuevos (EUMETSAT, AEMET forecast, CAMS AQ).

### Tracks paralelos (9 agentes)

| # | Agente | Scope | File ownership |
|---|---|---|---|
| 1 | **Core TraficoMap** | `<TraficoMap>` + `LayerRegistry` + `useMapLayers` + presets (peninsula, mundo, canarias…) + entity prop infra | `src/components/map/TraficoMap.tsx`, `src/lib/map-layers/` |
| 2 | **Migración hard cutover** | Reemplaza imports de UnifiedMap / InteractiveBaseMap / HistoricalMap / MapComparator / ProvinceHeatmap / LocationMap / VesselLiveMap / StationLocationMap / route-map → `<TraficoMap>`. Borra componentes viejos (~5300 líneas). | 20+ pages en `src/app/`, `src/components/map/` (solo borrados) |
| 3 | **P0 heartbeats** | Añade heartbeat + last-run tracking a los 18 collectors sin él. Tabla `CollectorRun`. Endpoint `/api/health` extendido. | `services/collector/shared/heartbeat.ts`, `services/collector/tasks/*/collector.ts` (append-only), `prisma/schema.prisma` |
| 4 | **P0 security** | `?key=` → header `X-API-KEY` en cron/admin routes. Secret rotation check. | `src/app/api/cron/*`, `src/app/api/admin/*`, `src/lib/auth.ts` |
| 5 | **Weather radar EUMETSAT** | Collector nuevo `eumetsat-radar` (raster tiles). Capa `weather-radar` en LayerRegistry. Scroll animation opcional. | `services/collector/tasks/eumetsat-radar/`, `src/lib/map-layers/registry.ts` (append-only: 1 layer) |
| 6 | **AEMET forecast horario** | Collector `aemet-forecast` — 8131 municipios, hourly forecast 48h. Tabla `MunicipalityForecast`. API `/api/meteo/forecast`. | `services/collector/tasks/aemet-forecast/`, `prisma/schema.prisma`, `src/app/api/meteo/` |
| 7 | **CAMS AQ forecast** | Collector `cams-aq` — Copernicus Atmospheric Monitoring Service 5-day AQ forecast (NO2, O3, PM2.5, PM10). Tabla `AqForecast`. | `services/collector/tasks/cams-aq/`, `prisma/schema.prisma`, `src/app/api/calidad-aire/` |
| 8 | **Renfe ADIF fallback** | Investigación + adapter para ADIF Mallas data como fallback de Renfe LD unofficial. Fallback automático si Renfe LD 404. | `services/collector/tasks/renfe-ld-realtime/collector.ts`, nuevo `services/collector/tasks/adif-fallback/` |
| 9 | **Nav data + verticales nuevos** | Añadir `/meteo` y `/combustible` al mega menu + footer + sitemap. Preparar skeleton routes `src/app/meteo/` y `src/app/combustible/`. | `src/components/layout/nav/NavData.ts`, `src/app/sitemap.ts`, esqueleto páginas |

**Criterio de salida S1**:
- [ ] `<TraficoMap>` en producción en `/mapa` sin regresiones
- [ ] Todas las páginas mapa renderizan vía `<TraficoMap>`
- [ ] Componentes antiguos borrados
- [ ] 3 collectors nuevos ejecutados al menos 1 vez (weather radar tiles, AEMET forecast, CAMS) — datos en DB
- [ ] Heartbeats en los 18 collectors, `/api/health` reporta 50+ signals
- [ ] Cero P0 abierto

---

## 5. Sesión 2 — 7 verticales hubs + live features por vertical

**Foco**: construir los 7 hubs full-feature con el nuevo `<TraficoMap>`, integrar live features en cada uno.

### Tracks paralelos (9 agentes)

| # | Agente | Scope | File ownership |
|---|---|---|---|
| 1 | **`/maritimo` hub** | Rework full. Hero map: vessels + ports + shipping-lanes + currents + bathymetry + maritime-boundaries activo. Stat cards (buques activos, puertos, emergencias 24h). Ticker SASEMAR. Tiles a buques/puertos/ferries/combustible marítimo. Entity directory. FAQ. | `src/app/maritimo/page.tsx`, `src/app/maritimo/mapa/page.tsx` |
| 2 | **`/aviacion` hub + boards** | Rework full + integración departures/arrivals boards por aeropuerto en hero dashboard. Top 5 aeropuertos con boards live. | `src/app/aviacion/page.tsx`, `src/app/aviacion/mapa/page.tsx`, componente `AirportBoards` |
| 3 | **`/trenes` hub + ADIF** | Rework full. Hero map con live fleet (Renfe + ADIF fallback). Departure boards top 10 estaciones. Delay heatmap. | `src/app/trenes/page.tsx`, `src/app/trenes/mapa/page.tsx`, componente `StationBoards` |
| 4 | **`/trafico` hub** | Rework full. Hero map: incidentes + live-speed + IMD + V16. Stat cards (incidencias activas, velocidad media, radares, cámaras). Ticker incidencias. Tiles a carreteras / incidencias / cámaras / radares / ZBE. | `src/app/trafico/page.tsx`, `src/app/trafico/mapa/page.tsx` |
| 5 | **`/transporte-publico` hub** | Rework full. Hero map: transit-routes + transit-stops + operadores. Stat cards (operadores, líneas, paradas, rutas). Directory 15+ operadores. | `src/app/transporte-publico/page.tsx`, `src/app/transporte-publico/mapa/page.tsx` |
| 6 | **`/meteo` hub (nuevo)** | Hub nuevo. Hero map con weather radar EUMETSAT + alertas AEMET + estaciones climate. Forecast nacional 48h. Tiles a forecast/alertas/estaciones/histórico. | `src/app/meteo/page.tsx`, `src/app/meteo/mapa/page.tsx` |
| 7 | **`/combustible` hub (nuevo)** | Hub nuevo. Hero map: gasolineras (terrestres + marítimas) + EV chargers + precios. Stat cards (gasolinera media, tendencia, ahorro). Tiles a gasolineras/marítimo/EV/histórico. | `src/app/combustible/page.tsx`, `src/app/combustible/mapa/page.tsx` |
| 8 | **`/calidad-aire` hub (secundario)** | Hub ligero. Hero map con estaciones AQ + CAMS forecast overlay. Tiles a estaciones / histórico. | `src/app/calidad-aire/page.tsx`, `src/app/calidad-aire/mapa/page.tsx` |
| 9 | **Nav + footer + home hero** | Actualizar home con los 7 verticales como tiles principales. Mega menu. Footer. Link cards. Cross-vertical navigation. | `src/app/page.tsx`, `src/app/HomeClient.tsx`, `src/components/layout/` |

**Criterio de salida S2**:
- [ ] 7 hubs accesibles + 1 secundario (calidad-aire)
- [ ] Cada hub tiene: hero map + stats + ticker + tiles + entity directory + FAQ
- [ ] 8 páginas `/[vertical]/mapa` en fullscreen funcionando
- [ ] Nav incluye los 7 verticales + calidad-aire
- [ ] Cero regresión visual vs estado pre-S1

---

## 6. Sesión 3 — 27K entity pages SSG

**Foco**: generar las páginas de detalle por entidad. Templates reutilizables + `generateStaticParams` para SSG.

### Tracks paralelos (9 agentes)

| # | Agente | Entity type | Volumen URLs | Template + generación |
|---|---|---|---|---|
| 1 | **Estaciones tren** | `/trenes/estacion/[slug]` | 2.154 | Info + live board + delay history + connections |
| 2 | **Líneas tren** | `/trenes/linea/[slug]` | 1.248 | Origen-destino + paradas + shape + brand + horarios |
| 3 | **Aeropuertos** | `/aviacion/aeropuertos/[iata]` | 42 | Runways + live board + pax stats + tráfico |
| 4 | **Puertos estatales** | `/maritimo/puertos/[slug]` | 50 | Vessels docked + activity + combustible + cargo |
| 5 | **Carreteras nacionales** | `/carreteras/[ref]` | 300 | IMD + live speed + incidentes + cameras + radares + obras |
| 6 | **Buques activos** | `/maritimo/buques/[slug]` | ~10K | Track + voyage + port calls + especificaciones |
| 7 | **Gasolineras** | `/gasolineras/[id]` | 12.294 | Precios + histórico + comparación + ubicación |
| 8 | **Estaciones meteo** | `/meteo/estaciones/[slug]` | 900 | Temperatura + precipitación + forecast + histórico |
| 9 | **Estaciones AQ** | `/calidad-aire/estaciones/[slug]` | 565 | ICA + pollutants + CAMS forecast + histórico |

**Total:** ~**27.553 páginas** indexables SSG.

**Criterio de salida S3**:
- [ ] 9 templates creadas, cada una testeada con 3 muestras
- [ ] `generateStaticParams` devuelve todas las IDs
- [ ] Build local completa en <30 min
- [ ] Sitemap auto-incluye todas
- [ ] Canonical URLs + JSON-LD (Place / SportingGoodsStore / similar) en cada template
- [ ] Spot-check 20 URLs aleatorias por template → 0 errores

---

## 7. Sesión 4 — Polish + QA + deploy + launch day

**Foco**: validación extensiva, fix de bugs acumulados, preparación assets launch, deploy final.

### Tracks paralelos (9 agentes)

| # | Agente | Scope |
|---|---|---|
| 1 | **Visual QA hubs** | Playwright screenshots de los 8 hubs + 8 fullscreens en light/dark. Diff vs mockups. |
| 2 | **Entity pages smoke tests** | 100 URLs random × 9 templates = 900 tests. Verifica carga + SEO + estructura. |
| 3 | **Performance audit** | Lighthouse en home + 7 hubs + 20 entity pages. Bundle size analysis. Core Web Vitals. |
| 4 | **SEO audit** | Sitemap completa, canonicals correctos, JSON-LD válido, robots.txt, meta tags, OG images. |
| 5 | **Accessibility** | Axe audit en home + 7 hubs. Colores contraste. Keyboard navigation. Alt text. |
| 6 | **Dark mode parity** | Cada página en dark. `<TraficoMap>` dark style. Contraste. Labels legibles. |
| 7 | **Mobile responsive** | Breakpoints 375px / 768px / 1024px en las 8 hubs + sample entity pages. |
| 8 | **Monitoring** | Dashboard Grafana con heartbeats + freshness metrics. Alert rules (Loki). Uptime Kuma. |
| 9 | **Launch assets** | Blog post `/blog/lanzamiento-2026`, screenshots, changelog, redes sociales preparadas (borradores, sin publicar). |

**Criterio de salida S4 (Go/No-Go Monday)**:
- [ ] Cero P0 abierto
- [ ] Cero regresión visual vs pre-refactor
- [ ] Build de producción exitoso sin warnings críticos
- [ ] Los 27K entity pages accesibles
- [ ] Los 8 hubs rinden < 2s FCP
- [ ] Monitoring activo con heartbeats de los ~35 collectors
- [ ] Rollback plan documentado (git tag + image tag)
- [ ] Launch announcement borrador listo (no publicado aún)

---

## 8. Plan de contingencia

### Si la sesión 1 va lenta
- **Síntoma**: agentes 1-2 (TraficoMap + migración) no terminan en sesión 1
- **Acción**: extender S1 por 2h más en la noche. No avanzar a S2 hasta TraficoMap operativo.

### Si weather radar / AEMET / CAMS no están listos S2
- **Síntoma**: collectors fallan o data no fluye
- **Acción**: `/meteo` hub se construye sin radar EUMETSAT (usa fallback AEMET alerts + estaciones como mapa). Weather radar se publica al martes si llega.

### Si build de 27K páginas explota (memoria, tiempo)
- **Síntoma**: Next build falla o tarda >60 min
- **Acción**: switch a **ISR** (Incremental Static Regeneration) para los templates de mayor volumen (buques, gasolineras). Queda pre-render bajo demanda + cache en edge.

### Si el domingo 23:59 hay cualquier gap
- **Acción por decisión Q8**: **DELAY al miércoles 22 abril 09:00**. Lunes y martes se usan para cerrar gaps. Anuncio público se adelanta por 48h si ya estaba programado.

### Rollback plan
- Git tag `pre-launch-2026-04-17` antes de sesión 0. Último deploy estable antes del roadmap.
- Docker image `trafico-web:pre-launch` taggeado.
- Si producción rompe el lunes → `docker tag pre-launch latest && docker restart trafico-live` (60s rollback).

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| TraficoMap migration rompe 20+ pages | Media | Alta | Playwright smoke tests post-migración (agente 2 sesión 1) |
| 27K build time > 60min | Media | Media | ISR para 3 templates de mayor volumen (buques, gasolineras, meteo) |
| EUMETSAT / CAMS / AEMET auth falla | Baja-Media | Media | Fallback: vertical meteo sin forecast hasta martes |
| AIS sigue roto al lunes | Media | Alta | Switch a datalastic.com (free tier, 1h integración) |
| Build de Next 16 falla por ssr:false en nuevos agentes | Baja | Alta | Agente 1 sesión 1 define patrones canónicos, docu en `src/lib/map-layers/README.md` |
| /var/lib/docker llena durante build | Baja | Alta | Cron horario docker-prune ya instalado. Monitor disk durante sesiones. |
| OpenSky API rate limit más duro de lo esperado | Baja | Media | Credenciales OpenSky (~gratis, registro) — dame email para dar de alta |
| DB connections se saturan | Baja | Alta | PgBouncer ya wired. Monitor pool. |
| Cloudflare cache no purga correctamente | Baja | Baja | Purge manual + version query param `?v=hash` |

---

## 10. Requisitos de decisiones pendientes (del usuario)

Antes de arrancar Sesión 1:

- [ ] Credenciales **OpenSky Network** (user + password, free en opensky-network.org) — para rate-limit aumentado en aviación
- [ ] Credenciales **CAMS / Copernicus** — registro free en ads.atmosphere.copernicus.eu
- [ ] Decisión final **AIS**: ¿reactivar aisstream.io o switch a datalastic.com? (default: intentar 30m reactivar, si no, switch)
- [ ] Confirmar URLs canónicas: mantener `/aviacion`, `/trenes`, `/trafico`, `/transporte-publico`, `/maritimo`, añadir `/meteo` y `/combustible`

---

## 11. Post-launch (Fase 2, después del miércoles 22)

- Stripe tier enforcement + billing portal
- API pública documentada (OpenAPI 3.1 + `/api-docs` renovado)
- MCP server público (publicar `@trafico/mcp-server` en npm)
- `/profesional` landing B2B con pricing
- Outreach a 20-30 logística + aseguradoras
- OpenTripPlanner para journey planning multimodal
- Corridor intelligence dashboard (Madrid-Bcn, Madrid-Valencia, ...)
- Cross-joins analíticos (incidents × weather, accidents × climate, vessel × port calls)
- Submarine cables overlay
- 3D terrain + hillshade

---

**Firmado**: roadmap cerrado el jueves 17 de abril de 2026 tras 8 decisiones consecutivas del usuario.
**Siguiente acción**: ejecutar Sesión 0 — limpieza P0 instantáneos.
