# MASTER — Plan intent-driven trafico.live ES+PT

**Fecha:** 2026-04-19
**Fuente:** 11 waves DataForSEO ($20,67) + análisis transversal intent + 4 deep-dives por experto (vuelos, trenes, marítimo, carreteras)
**Tesis:** el diferencial único de trafico.live es **resolver el intent de tiempo real + estadísticas cruzadas** que nadie cubre bien en ES ni PT.

---

## 0. Tesis confirmada por datos

El universo de búsquedas ES+PT tiene **10,8M búsquedas/mes con intent live_tracking** (ahora/hoy/en directo/dónde está). **5,2M son trivialmente ganables** (KD ≤25). Nadie las resuelve con producto real de tiempo real indexable:

- Vuelos: AENA tablón estático, FlightRadar24 en inglés y paywall
- Trenes: visor Renfe es SPA no indexable, positren es hobby sin SEO
- Ferries: Marinetraffic es EN+paywall, nadie tiene tracking ES gratuito
- Carreteras: DGT feed en UI 2008, madrid.es URL 200 chars no linkable
- Cruzado: nadie combina "dónde está + cuánto retrasa + histórico + contexto (meteo/aire/tráfico)"

---

## 1. El patrón atómico — repetible en cada modo

Cada intent de movilidad se descompone en 6 preguntas universales. Resolverlas por vertical × entidad × slot temporal = miles de landings:

| # | Pregunta | Intent cluster | Vol ES+PT/mes |
|---|---|---|---|
| 1 | **¿Dónde está?** | live_tracking individual | ~3M |
| 2 | **¿Cuándo llega/sale?** | arrival_departure + schedule | ~6,5M |
| 3 | **¿Va con retraso? ¿Cancelado?** | delay_cancel + incident_now | ~1,6M |
| 4 | **¿Es habitual que se retrase?** | stats_historical | ~376K |
| 5 | **¿Cuánto cuesta? ¿Cuándo barato?** | how_much + price_intelligence | ~5,6M |
| 6 | **¿Qué opciones tengo A→B?** | route_planner + comparison | ~857K |

**Multiplicador:** 6 preguntas × 4 modos (vuelo/tren/ferry/carretera) × N entidades (aeropuertos × ciudades × rutas × líneas) = **universo programático de ~50K landings de alta intención**, cada una respondiendo exactamente 1 pregunta humana.

---

## 2. Resumen por vertical — hallazgos expertos

### 🛫 Aviación (Experto 1)
- **Universo:** 4.773 kw · 8,98M/mes · 5,05M/mes ganables KD≤20
- **Diferencial único:** cross-ref `callsign ADS-B → número vuelo IATA` + historial puntualidad por ruta. Nadie lo tiene en español.
- **Dependencia:** FlightAware AeroAPI Basic (~$0-150/mes) desbloquea callsign→IATA + cancelaciones + historial 14d. Free tier (1.000 req/día) suficiente para comenzar.
- **Quick wins sin APIs:** `/aviacion` SEO fix (22K/mes), template `/aviacion/aeropuertos/[iata]` × 64, llegadas/salidas por tablón (123K/mes), `/reclamacion-vuelo` (22K + CPC €3-8), `/aviacion/cancelados`.
- **PT:** chegadas/partidas Lisboa/Porto/Madeira con KD 0-8 y vol 14-33K cada uno.

### 🚆 Trenes (Experto 2)
- **Universo:** 3.500 kw ES + 1.000 kw PT · 13,5M/mes
- **Diferencial único:** colector `renfe-ld-realtime` es el **único sistema público** (fuera de app Renfe) con GPS+retraso+ETA por número de tren. Competidor más cercano (`positren.nebulacodex.com` en pos 2) es SPA sin schema.
- **Observatory de puntualidad:** con 90 días de `RailwayDelaySnapshot` creamos el primer observatorio público de puntualidad ferroviaria por ruta en España (Renfe publica solo % genérico anual).
- **Quick wins sin deps:** `/trenes/incidencias` (18K/mes), boards tiempo real en `/trenes/estacion/[slug]` top 20, `/trenes/reclamaciones` (22K + CPC €4,70-12,20 afiliado legaltech).
- **PT gap:** 1,2M/mes, colector CP GTFS construible en 1-2 días. Sin tracking real-time viable (CP no tiene API pública).

### ⛴️ Marítimo (Experto 3)
- **Universo:** 418 kw ES + PT booking + 100+ kw tracking
- **Split crítico:** BOOKING (directferries, clickferry, omio, ferryhopper) **imposible orgánico** → afiliado DirectFerries/Omio. TRACKING **hueco absoluto** → nuestro campo.
- **White space masivo:**
  - `próximo ferry` 14.800/mes, KD LOW, CPC **€2,72** — nadie lo resuelve con tiempo real
  - `radar barcos` + `barcos tiempo real` (~7K combinado) — zero solución española gratuita con AIS interactivo
  - `puerto de Algeciras/Valencia/Barcelona` (22-33K c/u) — autoridades portuarias + Wikipedia sin data AIS
- **Diferencial único:** `ais-stream` (10,9K positions/min, 10M/día) + voyage detector + 197 SpanishPorts. Imbatible.
- **Quick wins 1-2 días:** SEO on-page `/maritimo/mapa` y `/maritimo/buques/[slug]` (ya existen, faltan title/schema).

### 🚗 Carreteras (Experto 4)
- **Universo:** ~350K/mes, 80% del universo KD 0-27
- **Gaps principales:**
  1. **"accidente A-X hoy"** — KD 0, ~25K combinado. Hoy rankean noticias con texto que caduca en 2h. Feed DGT + histórico accidentes = página perenne que los desplaza.
  2. **ZBE cluster** — 230K/mes combinado (madre "zona bajas emisiones" 165K) sin ningún checker dinámico de matrícula. Tabla `Zbe` ya existe.
  3. **Commuter dashboard** — intent recurrente 2×/día por usuario. Datos disponibles (`TrafficIntensity` 6K sensores + `HourlyTrafficProfile`). Ningún competidor lo tiene indexable.
- **AI Overview activo** (async) en `atascos Madrid/Zaragoza/Málaga`: Google busca fuente citable → ventana para `TrafficAction` schema + real-time.
- **Regla DGT brand:** queries con "dgt" KD 57-74 → intocables. Atacar sin-brand: "estado carreteras X", "accidente A-6 hoy", "cámaras navacerrada" (14,8K KD 0).
- **Commuter** específico: `atascos madrid tiempo real` 880/mes KD 0, `tráfico madrid ahora` 590 KD 0, `gran atasco hoy en madrid` 2.4K KD 0.
- **PT carreteras:** no prioritario (~10K vol vs. 350K ES, sin tracking real-time viable).

---

## 3. Quick wins sin dependencias — Semana 1

Listado de landings que se construyen con el stack actual **sin ningún trabajo nuevo de colectores ni APIs externas**. Cada una mapea a keywords KD≤20 con volumen verificado.

| # | Landing | Keyword target | Vol/mes | KD | Data stack | Esfuerzo |
|---|---|---|---|---|---|---|
| 1 | `/aviacion` — fix SEO on-page | `vuelos en tiempo real` | 22.200 | 13 | OpenSky (ya) | 2h |
| 2 | `/maritimo/mapa` — fix SEO on-page | `barcos tiempo real`, `radar barcos` | 7.300 | LOW | AIS stream (ya) | 2h |
| 3 | `/maritimo/buques/[mmsi]` — SEO + schema | vessel tracking long-tail | 5K+ | LOW | VesselPosition (ya) | 4h |
| 4 | `/trenes/incidencias` — feed live GTFS-RT | `incidencias renfe hoy` | 18.100 | LOW | RailwayAlert (ya) | 1d |
| 5 | `/trenes/estacion/[slug]` top 20 — añadir boards | `llegadas atocha` + cluster | 20K+ | 0-15 | RailwayDelaySnapshot (ya) | 3d |
| 6 | `/trenes/reclamaciones` — guía + afiliado | `renfe reclamaciones` | 22.200 | 0 | Editorial, sin data | 1d |
| 7 | `/aviacion/cancelados` — filtro sobre tablón | `vuelos cancelados` + variants | 8K+ | 0 | AircraftPosition (ya) | 4h |
| 8 | `/reclamacion-vuelo` — guía CE 261 + AirHelp | `iberia reclamaciones` + cluster | 22K+ | 0 | Editorial | 1d |
| 9 | `/camaras/[slug]` top 20 — embed + contexto | `cámaras navacerrada` | 14.800 | 0 | Camera (ya) | 2d |
| 10 | `/baliza-v-16` — guía pillar + comparador | `baliza v16` cluster | 18K+ | 0-11 | DgtBeaconV16 (ya) | 2d |
| 11 | `/carreteras/[roadId]/hoy` template real-time | `accidente A-6 hoy` cluster | 25K+ | 0 | TrafficIncident + AccidentMicrodata | 2d |
| 12 | `/aviacao/aeroportos/[iata]/chegadas` LIS/OPO/FNC | `chegadas aeroporto lisboa` | 100K+ | 0-8 | AircraftPosition (ya) | 2d |

**Total impacto semana 1:** ~280K búsquedas/mes capturables con KD≤20, **sin nuevas infraestructuras**.

---

## 4. Fases del roadmap — 12 semanas

### Sprint 1 (sem 1) — INDEXACIÓN P0 + QUICK WINS
**Bloqueante:** fix canonical (32 páginas), sitemap (4K URLs faltantes), og:images (117 páginas). Sin esto nada se indexa.
**En paralelo:** Quick wins #1, #2, #4, #7 (pueden hacerse sin afectar P0).

### Sprint 2 (sem 2) — Vuelos + reclamaciones + ZBE pillar
- Template `/aviacion/aeropuertos/[iata]` × 46 ES + 18 PT
- `/reclamacion-vuelo` con AirHelp afiliado
- `/baliza-v-16` pillar + `/zbe/[ciudad]` × 12 ciudades ZBE (checker matrícula)

### Sprint 3 (sem 3) — Commuter + trenes boards
- `/trafico/[ciudad]` dashboard Madrid + Barcelona + Valencia (cross-vertical: sensors + incidentes + meteo widget + AQ widget)
- `/trenes/estacion/[slug]` top 20 con boards live
- `/aviacion/aeropuertos/[iata]/llegadas` + `/salidas`

### Sprint 4 (sem 4) — FlightAware + per-flight
- Integrar FlightAware AeroAPI (free tier 1.000 req/día)
- `/vuelos/[numero]` template dinámico (tracking individual + historial + ETA predicho)
- `/aviacion/aeropuertos/[iata]/cancelados` PT mirror

### Sprint 5 (sem 5) — Observatorio puntualidad trenes
- `/trenes/puntualidad` observatorio público por ruta (requiere 60d snapshot acumulado)
- `/trenes/linea/[slug]` enriquecida con puntualidad widget
- `/vuelos/puntualidad/[aerolinea]` y `/puntualidad/ruta/[orig]-[dest]`

### Sprint 6 (sem 6) — Marítimo tracking core
- `/maritimo/ferries/proximo` (14.800/mes, KD LOW, CPC €2,72)
- `/maritimo/ferries/[origen]-[destino]/hoy` × 10 rutas top (AIS + ferry GTFS cruzados)
- `/maritimo/puertos/[slug]/movimientos` con buques AIS live en puerto
- Afiliado DirectFerries Partner API activado

### Sprint 7 (sem 7) — Carreteras completas + PT fase 1
- `/carreteras/[roadId]/hoy` × top 50 (AP-7, A-6, M-30...)
- `/atascos/[ciudad]` × 15 ciudades + commuter dashboard
- `/peajes/[autopista]` con calculador + alternativa sin peaje
- PT: colector CP GTFS (1-2d) + `/trenes/pt/estacao/[slug]` top 50

### Sprint 8 (sem 8) — Mapa interactivo overlay
- Hook `useMapInteraction` + `FeatureOverlay` drawer
- 12 adapters por tipo entidad (ya planificado en ROADMAP-MAP-INTERACTIVE-2026-04-19.md)
- Click en cualquier entidad → preview + deep-link a su landing

### Sprint 9 (sem 9) — Stats hub + predictivo
- `/trenes/estadisticas/[marca]` (AVE, Alvia, Intercity con puntualidad 90d)
- `/aviacion/estadisticas/[iata]` (puntualidad por aerolínea en ese aeropuerto)
- Predictive traffic ML básico: "tardarás 25 min en M-30 ahora, media 12 min"

### Sprint 10 (sem 10) — Afiliados integrados
- Component `<AffiliateCTA>` reusable
- 6 programas activos: AirHelp, Parclick, DiscoverCars, DirectFerries, Omio, Trainline
- Landings específicas: `/parking/[aeropuerto]`, `/alquiler-coche/[aeropuerto]`, `/vuelos/baratos-desde-[ciudad]`

### Sprint 11 (sem 11) — Programmatic cola larga
- `/camaras/[id]` × 1.200, `/radares/[id]` × 1.800, `/paneles/[id]` × 700, `/estaciones-aforo/[id]` × 14.400
- Sitemap segmentado con prioridades
- News-sitemap para artículos editoriales

### Sprint 12 (sem 12) — Editorial motor + polish
- `services/content/` arrancando (artículos derivados de triggers de datos)
- CWV green en todas las rutas
- Lighthouse 95+

---

## 5. Data moats — dependencias críticas

### Lo que ya tenemos y es nuestro moat

| Moat | Colector | Valor estratégico |
|---|---|---|
| GPS+retraso trenes LD | `renfe-ld-realtime` | API undocumented, nadie más la explota |
| AIS continuo | `ais-stream` | 10M positions/día, gratis para nosotros (aisstream.io) |
| Voyage detection | `voyage-detector` | Agregación propia de PortCall + Voyage |
| Madrid sensors 6K | `intensity` */5min | Único dataset urbano a esa granularidad |
| RailwayDelaySnapshot acumulando | `renfe-alerts` | 90d → observatorio público único |
| 14.400 aforos + 500K accidentes | `imd` + `historical-accidents` | Data journalism sin rival |
| Cross-vertical cruzado meteo+tráfico+aire+fuel | Todos | Nadie más lo integra |

### Gaps críticos a cerrar

| Gap | Bloqueante para | Solución | Coste | Sprint |
|---|---|---|---|---|
| Callsign→IATA flight mapping | `/vuelos/[numero]`, puntualidad | FlightAware AeroAPI | $0-150/mes | Sprint 4 |
| Historial puntualidad vuelos (14d) | Observatorio vuelos | FlightAware AeroAPI (incluido) | — | Sprint 4 |
| Polling OpenSky 2min (vs 15min) | Llegadas aeropuerto | Auth credenciales OpenSky | Gratis | Sprint 3 |
| CP GTFS Portugal | Landings estaciones PT | Colector `cp-gtfs` (1-2d) | Gratis | Sprint 7 |
| Precios dinámicos AVE | "cuándo más barato" | Trainline Partner API (afiliado) | Gratis+comisión | Sprint 10 |
| DirectFerries Partner API | Booking afiliado ferry | Activar partnership | Gratis+comisión | Sprint 6 |
| FGC real-time (Rodalies) | Rodalies tracking | API privada o scraping | — | Fase 2+ |
| CIAF datos accidentes ferroviarios | `/trenes/accidentes` histórico | Research + import | 3-4d | Sprint 9 |

---

## 6. Afiliados — mapeo completo con CPC verificado

| Programa | Intent cluster | Keywords ancla | Vol/mes | CPC verificado | Landing anclaje |
|---|---|---|---|---|---|
| AirHelp | Reclamación vuelo | iberia reclamaciones, reclamacion vuelo cancelado | 22K+ | €3,34-7,89 | `/reclamacion-vuelo` |
| AirHelp/Reclamador (trenes) | Reclamación tren | renfe reclamaciones, reclamacion renfe retraso | 22K+ | €4,70-12,20 | `/trenes/reclamaciones` |
| Parclick / Parkos | Parking aeropuerto | parking aeropuerto [ciudad] | 100K+ | €0,82-1,62 | `/aviacion/aeropuertos/[iata]/parking` |
| DiscoverCars / Rentalcars | Rental | alquiler coche aeropuerto [ciudad] | 50K+ | €3,70-4,80 | `/aviacion/aeropuertos/[iata]/coches` |
| DirectFerries / Omio | Ferry booking | ferry a Mallorca, ferry Algeciras Ceuta | 500K+ | €0,83-1,83 | `/maritimo/ferries/[ruta]` |
| Trainline / Omio | Billetes tren | billetes renfe baratos, ave madrid barcelona | 150K+ | €0,60-0,84 | `/trenes/linea/[slug]` |
| Skyscanner / Kiwi | Vuelos OTA | vuelos baratos desde [ciudad] | 400K+ | €0,28-0,48 | `/vuelos/baratos-desde-[ciudad]` |
| Rastreator / Acierto | Seguros | seguro coche comparador | 60K+ | €10,75 | `/seguro-coche` |
| Waylet / Galp (CPI) | Fuel app | descuento gasolina, waylet repsol | 10K+ | €0,50-2 | `/gasolineras/[id]` |
| Iberdrola / Wallbox | EV | cargador coche eléctrico | 80K+ | €1-2,18 | `/carga-ev`, `/electrolineras/[ciudad]` |

**Revenue potencial estimado (base casos experts):**
- T+90d: €3K-5K/mes
- T+180d: €15K-25K/mes
- T+365d: €80K-150K/mes

---

## 7. Schema.org — stack obligatorio intent-driven

| Landing type | Schema primario | Schemas secundarios | Rationale |
|---|---|---|---|
| Per-vuelo live | `Flight` | `Airline`, `Airport`, `Place` | Rich result vuelo |
| Aeropuerto hub | `Airport` | `Place`, `Schedule` | Knowledge panel |
| Aeropuerto llegadas/salidas | `Schedule` + lista de `Flight` | `ItemList` | Live data feed |
| Estación tren | `TrainStation` | `Place`, `openingHours`, `departures` | Rich result |
| Tren live | `TransportationTrip` + `Vehicle` | `GeoCoordinates` | Tracking |
| Puerto | `CivicStructure`/`Place` | `GeoShape` | Knowledge panel |
| Buque tracking | `Ship` (schema extension) | `GeoCoordinates` | Unique signal |
| Carretera hoy | `Road` + `TrafficAction` (draft) | Place, `EmergencyEvent` | Traffic citation fit AI Overview |
| Incidente tráfico | `EmergencyEvent` | Place, Duration | — |
| Reclamación legal | `HowTo` + `FAQPage` | — | Best-in-class for legaltech |
| Observatorio puntualidad | `Dataset` + `StatisticalPopulation` | — | Data-authority signal |
| Gasolinera | `GasStation` + `Product` | `AggregateOffer` | Local Pack |
| Comparador afiliado | `Product` + `AggregateOffer` | ItemList | Commercial |

**Obligatorios en 100% de landings:**
- `BreadcrumbList`
- `FAQPage` (PAA en 56% de SERPs ganables)
- `Organization` site-wide

---

## 8. Prioridades intent-driven ordenadas por ROI

Ranking final combinando: volumen × KD × coste construcción × fit stack × intent urgencia.

### Tier S — construir YA (Sprint 1-3)
1. Fix P0 (canonical + sitemap + og) — desbloquea todo
2. `/trenes/incidencias` (18K, KD 0, data ya)
3. `/aviacion` SEO on-page (22K, KD 13, página ya existe)
4. `/maritimo/mapa` SEO on-page (7K, KD LOW, ya existe)
5. `/reclamacion-vuelo` (22K, KD 0, CPC €3-8)
6. `/trenes/reclamaciones` (22K, KD 0, CPC €4-12)
7. `/trenes/estacion/[slug]` top 20 con boards (20K+, KD 0-15)
8. `/aviacion/aeropuertos/[iata]` × 64 template (700K/mes agregado)
9. `/baliza-v-16` pillar (18K+, KD 0-11, CPC comercial)
10. `/camaras/navacerrada` + top 20 cámaras (20K+, KD 0-6)

### Tier A — diferenciadores únicos (Sprint 4-6)
11. `/vuelos/[numero]` tracking individual (requiere FlightAware)
12. `/maritimo/ferries/proximo` (14,8K, KD LOW, CPC €2,72)
13. `/carreteras/[roadId]/hoy` con accidente + obras + cámaras
14. `/aviacion/aeropuertos/[iata]/llegadas` + `/salidas` (123K+ ES + 100K PT)
15. `/trafico/[ciudad]` commuter dashboard Madrid/BCN/Valencia
16. `/trenes/puntualidad` observatorio público (requiere 60d data)
17. `/maritimo/puertos/[slug]/movimientos` con buques AIS live
18. `/zbe/[ciudad]` × 12 ciudades con checker matrícula

### Tier B — expansión PT + afiliado (Sprint 7-10)
19. Colector CP GTFS + `/trenes/pt/estacao/[slug]` × top 50
20. `/aviacao/aeroportos/LIS|OPO|FNC/chegadas` (100K+ PT)
21. `/parking/[aeropuerto]` × 64 con afiliados Parclick/Parkos
22. `/alquiler-coche/[aeropuerto]` × 64 afiliado DiscoverCars
23. `/ferry/[origen]-[destino]` × 100 rutas afiliado DirectFerries
24. `/vuelos/baratos-desde-[ciudad]` × 20 orígenes afiliado Skyscanner

### Tier C — programmatic cola larga (Sprint 11-12)
25. `/radares/[id]` × 1.800, `/paneles/[id]` × 700
26. `/estaciones-aforo/[id]` × 14.400 (data journalism)
27. News-sitemap con motor editorial automático (/noticias/[slug])
28. `/combustiveis/[distrito]` PT hub (hueco maisgasolina.com)

---

## 9. KPIs por milestone

| Milestone | Keywords top-10 | Impresiones/mes | Clicks/mes | Revenue afiliado/mes |
|---|---|---|---|---|
| T+30d (Sprint 1-3) | 300 | 150K | 5K | €200 |
| T+60d (Sprint 4-6) | 1.500 | 700K | 25K | €1.500 |
| T+90d (Sprint 7-9) | 5.000 | 2M | 80K | €5.000 |
| T+120d (Sprint 10-12) | 12.000 | 5M | 250K | €12.000 |
| T+180d | 20.000 | 10M | 500K | €25.000 |
| T+365d | 40.000 | 25M | 1,5M | €100.000 |

---

## 10. Archivos de referencia

- Universo keywords: `03-keyword-universe-full.csv` (70.632 rows)
- Winnable scored: `13-winnable-full.csv` (5.956 rows)
- Gap competidores: `02-competitors-gap.csv` (22.213 rows)
- Reports expertos: `expert-01-vuelos.md`, `expert-02-trenes.md`, `expert-03-maritimo.md`, `expert-04-carreteras.md`
- Query CLI: `query.py stats|winnable|search|gap`
- Data dictionary: `DATA-DICTIONARY.md`

---

## 11. Decisiones pendientes antes de arrancar Sprint 1

1. ✅ Identidad confirmada: movilidad tiempo real ES+PT, carretera como eje naming pero modal-agnostic en producto
2. ✅ Usuario primario: momento viaje (tracking + planning + retraso + histórico)
3. ✅ Real-time + statistics = diferencial core, no meteo
4. ⏳ **¿Arrancamos Sprint 1 (fix P0 + quick wins paralelos)?**
5. ⏳ **¿Activamos FlightAware Free tier ya (Sprint 2) o Sprint 4?** — El free tier no cuesta nada pero requiere verificación de cuenta (1-2 días).
6. ⏳ **¿DirectFerries Partner API ya?** — Activarlo Sprint 1-2 para tener deeplinks listos cuando Sprint 6 llegue.
7. ⏳ **¿Motor editorial en Sprint 12 o en paralelo desde Sprint 9?** — Si paralelo, genera backlog de artículos desde día 1.

---

Este documento es el plan maestro. Sustituye a `06-roadmap-priorizado.md`, `09-estrategia-integral.md` y `10-total-domination.md`. Los 4 informes expertos son su evidencia detallada.
