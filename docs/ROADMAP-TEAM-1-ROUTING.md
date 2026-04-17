# TEAM 1 — ROUTING CORE

> 📍 Source of truth: `docs/ROADMAP-MASTER-2026.md` · este doc es la **vista parcial T1**, ampliada.
> **Rol:** todo lo que calcula rutas (coche/bici/a pie/tren/bus/multimodal) + meta-buscador `/ir`/`/ruta`/`/viaje` + isócronas + `/calculadora`.

**Lead role:** Routing architect
**Tamaño team:** 9 sub-agents
**Branch:** `team1`
**Slack channel:** #t1-routing
**Standup async:** lunes 09:00 vía PR comment en issue `T1 — sprint N status`

---

## 0. Mission

Construir la capa de cálculo de rutas más completa de España: 4 motores (OSRM × 3 perfiles + Valhalla + OTP2) detrás de APIs internas + UI consumer (`/calculadora`, `/ir`) que combina precios reales y opciones afiliadas. Ser el motor que hace posible la fase de monetización del Master.

---

## 1. Sub-agents (9)

| # | Sub-agent | Owns (paths exclusivos) | Sprint principal |
|---|---|---|---|
| **1.1** | OSRM deploy | `services/osrm/`, `docker-compose.routing.yml` | S0 |
| **1.2** | Routing API | `src/app/api/route/route.ts`, `src/lib/routing.ts`, `src/types/routing.ts` | S0 |
| **1.3** | OSRM profiles compilation | `services/osrm/profiles/*.lua`, `services/osrm/build-graph.sh` | S0 |
| **1.4** | OTP2 service | `services/otp/`, `docker-compose.otp.yml`, `services/otp/Dockerfile` | S1 |
| **1.5** | OTP graph builder | `services/otp/build-graph.sh`, crontab entry, GTFS pull script | S1 |
| **1.6** | Multimodal API | `src/app/api/multimodal/route.ts`, `src/lib/multimodal.ts`, `src/types/multimodal.ts`, sanctions filter | S2 |
| **1.7** | Valhalla isócronas | `services/valhalla/`, `src/app/api/isochrone/route.ts`, `src/types/isochrone.ts` | S3 |
| **1.8** | `/calculadora` motor real | `src/app/calculadora/**`, `src/lib/calculadora/`, `src/lib/tolls.ts`, `src/lib/fuel-cost.ts` | S2 |
| **1.9** | `/ir` + `/ruta` + `/viaje` | `src/app/ir/**`, `src/app/ruta/**`, `src/app/viaje/**`, `src/components/multimodal/**`, `src/lib/od-pairs.ts` | S4-5 |

---

## 2. Sprint plan T1

### S0 (jue 17 → dom 19)

**Objetivo:** OSRM 3 perfiles desplegados, API routing limpia, foundation lista.

| Sub-agent | Días | Entregable |
|---|---|---|
| 1.1 | vie | `services/osrm/docker-compose.yml` + 3 contenedores `trafico-osrm-{car,bike,foot}` corriendo en compute (puertos 5000/5001/5002) |
| 1.2 | vie | `src/app/api/route/route.ts` enruta según `body.profile` → contenedor correcto. Limpia el `_costing` ignorado |
| 1.3 | vie | 3 grafos compilados desde `iberia.osm.pbf` (`car.lua` modificado para España, `bicycle.lua`, `foot.lua`). Build script `services/osrm/build-graph.sh` reutilizable |
| 1.1 | sáb | Healthchecks + monitoring contenedores OSRM en Grafana |
| 1.2 | sáb | Smoke test: 3 rutas por perfil (Madrid→Barcelona, Plaza Mayor→Retiro, La Pedrera→Sagrada) en `tests/routing.test.ts` |
| Todos | dom AM | Demo: panel `/mapa` con 4 selectores funcionando de verdad. Pestaña Isócrona oculta hasta S3. Borra `services/valhalla/` (recuperamos en S3) |
| Todos | dom PM | QA + monitoring + handoff a S1 |

**Criterio salida S0:**
- [ ] 3 OSRM containers `Up` 6h+ sin restart
- [ ] P95 routing < 120 ms para rutas <500 km
- [ ] `/api/route` test 100% green con 3 perfiles
- [ ] Madrid→Bilbao car: 395±5 km, 4h±10min
- [ ] Documento `services/osrm/README.md` con build/redeploy steps

### S1 (lun 21 → dom 27 abr)

**Objetivo:** OTP2 multimodal funcionando con GTFS existentes.

| Sub-agent | Días | Entregable |
|---|---|---|
| 1.4 | lun-mar | `services/otp/Dockerfile` + `docker-compose.otp.yml` (8 GB RAM, 4 threads, opentripplanner:latest) |
| 1.5 | lun-mié | Script `services/otp/build-graph.sh` consume `iberia.osm.pbf` + todos GTFS de `services/collector/tasks/{transit-gtfs,ferry-gtfs,renfe-gtfs}/data/*.zip`. Build inicial ~30 min |
| 1.4 | mié-jue | OTP responde `/otp/routers/default/plan` con prueba Atocha → aeropuerto MAD (espera ≥2 itinerarios) |
| 1.5 | jue-vie | Crontab semanal `0 3 * * 1` rebuild graph en worker separado, hot-swap atomico |
| 1.6 | jue-vie | Esqueleto `src/app/api/multimodal/route.ts` (proxy puro a OTP, sin lógica todavía) |
| Todos | vie | Demo: Sants → Girona devuelve AVE+R1 + alternativas |

**Criterio salida S1:**
- [ ] OTP up sin restart 48h
- [ ] Build graph < 45 min
- [ ] `/api/multimodal?from=X&to=Y` responde JSON OTP normalizado
- [ ] Documento `services/otp/README.md`

### S2 (lun 28 abr → dom 11 may)

**Objetivo:** `/calculadora` con motor real + multimodal API tipada + arrancar `/ir` namespace.

| Sub-agent | Día | Entregable |
|---|---|---|
| 1.6 | sem 2.1 | Tipos `MultimodalItinerary`, `Leg`, `TransitDetail` en `src/types/multimodal.ts`. Sanctions filter (lista zonas excluidas Crimea/Russia/Cuba/etc) |
| 1.6 | sem 2.2 | `/api/multimodal` enriquece OTP con metadata real (operadores GTFS pop. española, headway, brand) |
| 1.8 | sem 2.1 | Autocompletado origen/destino sobre Typesense (8K muni + 42 aero + 197 puertos + 1506 estaciones) |
| 1.8 | sem 2.2 | OSRM car + extracción polyline + cruce con `TollSegment.geometry` (PostGIS `ST_Intersects`) → suma `priceLigeros`/`pricePesados` |
| 1.8 | sem 2.2 | Combustible live: leer `CNMCFuelPrice` día+provincia origen, no fallback genérico |
| 1.8 | sem 2.2 | 3 alternativas: rápida / sin peajes (workaround OSRM) / eco (evitar urbano) |
| 1.9 | sem 2.2 | Reservar namespaces `/ir`, `/ruta`, `/viaje` con `page.tsx` placeholder + redirects coordinados con T2.8 (sitemap) |

**Criterio salida S2:**
- [ ] Madrid→Bilbao en `/calculadora` da 395km / 4h / ~28.50€ peajes (AP-68) / ~45.60€ combustible / total 74€±5%
- [ ] `/api/multimodal` Sevilla→Palma devuelve 3+ opciones
- [ ] Sanctions filter rechaza ruta a Crimea con 422

### S3 (lun 12 → dom 25 may)

**Objetivo:** Isócronas operativas + perfil camión B2B.

| Sub-agent | Días | Entregable |
|---|---|---|
| 1.7 | sem 3.1 | Recupera `services/valhalla/` con config dedicada (sólo isócronas + truck), aislado en puerto 8002 |
| 1.7 | sem 3.1 | `src/app/api/isochrone/route.ts` devuelve polígonos GeoJSON 15/30/60 min |
| 1.7 | sem 3.2 | Capa mapa en `/mapa`: click derecho → "isócrona desde aquí" |
| 1.7 | sem 3.2 | 52 páginas SSG `/isocrona/[capital]` (sólo capitales provincia) — coordina con T2.8 sitemap |
| 1.8 | sem 3.1 | Calculadora: añade modo camión (engancha con `SpeedLimit.vehicleType`) |
| 1.9 | sem 3.2 | Esqueleto `/ir` con autocompletado funcional (no integraciones todavía) |

**Criterio salida S3:**
- [ ] Isócrona 60 min Plaza Cataluña cubre Sitges-Granollers
- [ ] Ruta camión Valencia→Irún evita túneles con limit altura
- [ ] 52 páginas isócrona indexables

### S4 (lun 26 may → dom 8 jun)

**Objetivo:** `/ir` meta-buscador LIVE con afiliados.

| Sub-agent | Días | Entregable |
|---|---|---|
| 1.9 | sem 4.1 | Backend `/api/ir`: en paralelo OSRM + OTP + (HS6) widgets afiliados de T2 |
| 1.9 | sem 4.1 | Tabla comparativa con tiempo · precio · CO₂ · comodidad, ordenable |
| 1.9 | sem 4.2 | 2.000 landings SSG `/ir/[origen]/[destino]` + 2.000 `/ruta/*` + 2.000 `/viaje/*` (canonical → `/ir/*`) |
| 1.9 | sem 4.2 | Deep-link `?from&to&date` + sharing OG image dinámica |
| 1.9 | sem 4.2 | Tracking afiliado: cada click → `AffiliateClick` con `source: "ir-page"` (depende T4.1 schema) |

**Criterio salida S4:**
- [ ] 10 smoke test rutas pasan (Madrid-Barcelona, Valencia-Palma, Sevilla-LasPalmas, Bilbao-SS, Madrid-Toledo, BCN-Andorra, ACoruña-Santiago, Ibiza-Formentera, Granada-Málaga, Murcia-Cartagena)
- [ ] 6.000 landings indexables
- [ ] Primer click afiliado registrado y atribuido

### S5 (lun 9 → dom 22 jun)

**Objetivo:** Iteración + `/ir` con feedback usuario + comparador isócronas 52 capitales.

| Sub-agent | Tareas |
|---|---|
| 1.9 | A/B test orden tabla, mejora UX expandible itinerario, mini-mapa por opción |
| 1.7 | Comparador isócronas 52 capitales: "¿qué hay a 30 min en coche?" con POIs (mejor con TopoJSON Overpass — abre HS con T3 si necesita backend) |
| 1.6 | Mejorar precision OTP (priorizar GTFS-RT sobre estático cuando ambos existen) |

---

## 3. File ownership T1 (vista detallada)

```
services/
├── osrm/                              ← T1.1 + T1.3
│   ├── docker-compose.routing.yml
│   ├── Dockerfile
│   ├── build-graph.sh
│   └── profiles/
│       ├── car.lua
│       ├── bicycle.lua
│       └── foot.lua
├── otp/                               ← T1.4 + T1.5
│   ├── docker-compose.otp.yml
│   ├── Dockerfile
│   ├── build-graph.sh
│   └── config/
└── valhalla/                          ← T1.7
    ├── docker-compose.yml
    └── config/

src/app/
├── api/
│   ├── route/route.ts                 ← T1.2
│   ├── multimodal/route.ts            ← T1.6
│   ├── isochrone/route.ts             ← T1.7
│   └── ir/route.ts                    ← T1.9
├── calculadora/                       ← T1.8
│   ├── page.tsx
│   ├── content.tsx
│   └── components/
├── ir/                                ← T1.9
│   ├── page.tsx
│   ├── [origen]/[destino]/page.tsx
│   ├── opengraph-image.tsx
│   └── components/
├── ruta/                              ← T1.9 (canonical → /ir)
└── viaje/                             ← T1.9 (canonical → /ir)

src/lib/
├── routing.ts                         ← T1.2
├── multimodal.ts                      ← T1.6
├── tolls.ts                           ← T1.8
├── fuel-cost.ts                       ← T1.8
├── od-pairs.ts                        ← T1.9
└── calculadora/                       ← T1.8

src/types/
├── routing.ts                         ← T1.2
├── multimodal.ts                      ← T1.6
└── isochrone.ts                       ← T1.7

src/components/
└── multimodal/                        ← T1.9

tests/
└── routing.test.ts                    ← T1.2
```

**NO escribir en:** cualquier path no listado arriba. Para tocar `prisma/schema.prisma` o `src/middleware.ts` → handshake con T3.6 / T4.1.

---

## 4. Handshakes (HS) que produce/consume T1

| HS | Rol T1 | Counterparty | Sprint | Contract |
|---|---|---|---|---|
| **HS3** | Productor | T1 internal (1.8, 1.9) | S0 | `/api/route` request/response → `src/types/routing.ts` |
| **HS4** | Productor | T1.9, T2.4 | S2 | `MultimodalItinerary` type → `src/types/multimodal.ts` |
| **HS5** | Consumidor (de T3.7) | T3.7 | S3 | `/api/predict/*` schemas para ordenar `/ir` por fiabilidad |
| **HS6** | Consumidor (de T2.4) | T2.4 | S4 | `<Offers provider source />` props para renderizar widgets afiliados en `/ir` |
| **HS10** | Coordinado (con T2.8) | T2.8 | S2-3 | `getSlugList()` para 2.000 OD pairs + redirects + canonical strategy |

**Si bloqueado por counterparty**: reportar en `STATUS.md` con label `cross-team-handshake` y notificar a #t1-routing + lead counterparty.

---

## 5. Dependencias externas

| Dependencia | Para qué | Mitigación si falla |
|---|---|---|
| `iberia.osm.pbf` (~1.7 GB) | OSRM + OTP + Valhalla builds | Mirror local en `compute:/opt/trafico/tiles/build/` |
| GTFS Renfe + 15 transit operators | OTP graph | Si feed roto, OTP omite ruta y log warning |
| Postgres `TollSegment` populated | Calculadora peajes | Bloquea S2.1.8 — confirmar con T3.1 antes de empezar |
| Postgres `CNMCFuelPrice` populated | Combustible live | Bloquea S2.1.8 — verificar collector daily corriendo |
| Sanctions list (manual) | `/api/multimodal` | Hardcoded en S2, mover a config en S5 |

---

## 6. Métricas de éxito T1

### Performance
- OSRM P95 < 120 ms (rutas <500 km)
- OTP P95 < 2 s (multimodal con 3+ legs)
- Valhalla isochrone P95 < 1 s
- `/api/multimodal` P95 < 3 s con 4 APIs paralelas
- `/ir` LCP < 2.5 s

### Calidad
- 100% test coverage en `routing.ts`, `multimodal.ts`, `tolls.ts`, `fuel-cost.ts`
- 10 smoke tests rutas pasan (S4)
- Cero rutas a zonas sancionadas

### Producto (al cierre S5)
- ≥6.000 landings SSG indexables
- ≥100 clicks afiliados/día desde `/ir`
- ≥50 isócronas únicas servidas/día

---

## 7. Riesgos T1

| Riesgo | Mitigación |
|---|---|
| OSRM crash bajo carga | Healthcheck + auto-restart Docker + alerta Grafana |
| OTP graph build falla con un GTFS corrupto | Validate paso previo (otp validate) + skip feed roto |
| Valhalla inestable como en marzo | Usar SOLO para isócronas + truck (no rutas car), proceso aislado |
| Peajes mal calculados (geometry desactualizada) | Sample 50 pares conocidos, MAE €<5%, alerta si no |
| `/ir` SSG explota build > 60 min | ISR para top 500 + on-demand para resto |

---

## 8. Sync interno T1

- **Daily 22:30**: cada sub-agent push a su branch `team1-{X.Y}-{slug}` + abre/actualiza PR
- **Daily 23:00**: lead T1 merge PRs verdes a `team1`
- **Daily 23:30**: `team1` → `integration` automatic (script global)
- **Mié 14:00**: T1 mid-sprint check, identificar bloqueos
- **Vie 17:00**: demo T1 a usuario (10 min), tras OK merge `integration` → `main`

---

**Source of truth:** `docs/ROADMAP-MASTER-2026.md` · este es vista parcial T1.
**Última actualización:** 2026-04-17
