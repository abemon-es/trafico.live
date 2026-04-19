# Expert Analysis: Aviacion SEO — ES+PT Intent Map
**Fecha:** 2026-04-19 | **Scope:** vuelos, aeropuertos, aerolíneas, flight tracking ES+PT  
**Fuentes:** `03-keyword-universe-full.csv` (4.773 kws aviación), `raw/wave4/*.json`, `raw/wave11/*.json`, `raw/wave1/ranked_es_*.json`, `raw/wave1/ranked_pt_ana.pt.json`

---

## 1. Intent Cartography Aviación

### Universo total aviación
- 4.773 keywords | volumen potencial ~8,98M/mes  
- Ganable (KD ≤20): 1.280 kws, vol 5,05M/mes  
- Premium (KD 21-50): 101 kws, vol 1,03M/mes  
- Imposible (KD >50): 35 kws, vol 1,12M/mes  
- ES: 3.467 kws | PT: 1.306 kws

---

| # | Intent cluster | Keywords ejemplo (vol / KD / CPC) | Landing resolvedora | Diferenciador trafico.live |
|---|----------------|-----------------------------------|---------------------|---------------------------|
| C1 | **Tracking vuelo individual** — ¿dónde está el vuelo IB1234? | `estado vuelos` 4.400/0/€6,33 · `seguimiento vuelo iberia` 1.600/19/€1,52 · `estado vuelos ryanair` 880/0/€2,82 | `/vuelos/[numero]` | Estado ADS-B actual + historial puntualidad de esa ruta + ETA predicho |
| C2 | **Llegadas/salidas aeropuerto** — tablón en tiempo real | `llegadas aeropuerto barcelona` 12.100/11/€0,02 · `llegadas aeropuerto malaga` 8.100/0/€0,14 · `llegadas aeropuerto bilbao` 8.100/9/€0,10 · `llegadas aeropuerto alicante` 6.600/14/€0,19 | `/aviacion/aeropuertos/[iata]/llegadas` | Tablón en tiempo real + contexto (parking, tiempo en aeropuerto, alertas AEMET) |
| C3 | **Aeropuerto hoy** — info operacional de aeropuerto | `aeropuerto Palma de Mallorca` 201.000/9/€1,35 · `aeropuerto de bilbao` 135.000/10/€1,22 · `aeropuerto de málaga` 135.000/13/€0,40 · `aeropuerto alicante` 22.200/2/€1,40 | `/aviacion/aeropuertos/[iata]` | Info operacional + calidad aire cercana + parking comparado + clima AEMET |
| C4 | **Puntualidad histórica** — ¿este vuelo suele retrasarse? | `puntualidad` cluster: `iberia retraso vuelo` 320/0/€3,09 · `reclamar retraso vuelo` 1.300/0/€6,78 · `reclamar retraso vuelo ryanair` 320/0/€2,86 | `/vuelos/puntualidad/[aerolinea]` + `/vuelos/[numero]/historial` | Stats históricos por número de vuelo/ruta — nadie los agrega en España |
| C5 | **Vuelos cancelados hoy** — disrupciones activas | `vuelos cancelados` 1.900/0/€2,24 · `voos cancelados madeira hoje` 1.900/0/€1,52 · `voos cancelados hoje` 1.600/0/€1,23 · PT: `voos cancelados tap hoje` 590/0/€1,71 | `/aviacion/cancelados` + `/aviacion/aeropuertos/[iata]/cancelados` | Agregado cross-aeropuerto + causa (meteorológica via AEMET, huelga, etc.) |
| C6 | **Reclamación retraso/cancelación** — legal/CPC alto | `iberia reclamaciones` 12.100/0/€3,34 · `vueling reclamaciones` 5.400/0/€3,56 · `reclamacion vuelos` 1.300/0/€5,93 · `reclamacion vuelo cancelado` 210/0/€7,89 | `/reclamacion-vuelo` (guía + afiliado) | Guía CE 261/2004 + formularios oficiales AESA + afiliado (AirHelp/Reclamador) CPC €3-8 |
| C7 | **Radar aviones en tiempo real** — mapa vuelos | `vuelos en tiempo real` 22.200/13/€0,50 · `radar aviones` 9.900/26/€0 · `voos em tempo real` 12.100/7/€0,45 | `/aviacion` (mapa ya existente) | Mapa sobre Iberia+PT ya funcional con OpenSky — problema: actualización 15min insuficiente |
| C8 | **Vuelos baratos desde X** — OTA comparison intent | `vuelos baratos desde barcelona` 22.200/0/€0,42 · `vuelos baratos desde madrid` 22.200/10/€0,48 · `vuelos a tenerife` 33.100/0/€0,48 | Afiliado directo a Skyscanner/Ryanair | Dominado por Google Flights + OTAs. **No atacar como landing propia** |
| C9 | **Parking aeropuerto** — afiliado alta intención | `parking aeropuerto alicante` 18.100/12/€1,62 · `parking aeropuerto malaga` 18.100/19/€1,36 · `parking aeropuerto sevilla` 14.800/12/€1,07 · `parking aena` 18.100/4/€0,09 | `/aviacion/aeropuertos/[iata]/parking` | Comparador AENA oficial + Parkos/ParkVia afiliados — CPC €0,78-1,62 |
| C10 | **Alquiler coche aeropuerto** — alta CPC | `alquiler coche aeropuerto malaga` 4.400/0/€4,20 · `alquiler coche barcelona aeropuerto` 5.400/18/€4,07 · `alquiler coche aeropuerto sevilla` 3.600/0/€3,83 | `/aviacion/aeropuertos/[iata]/coches` | Afiliado Rentalcars/DiscoverCars — CPC €3,7-4,8, posicionable con KD=0 |
| C11 | **Huelga aeropuerto/aerolínea** — news + derechos | `huelga aeropuertos` 6.600/0/€0 · `huelga aeropuerto madrid` 4.400/0/€0 · `huelga aeropuerto bilbao` 590/0/€0 | `/aviacion/alertas` (actualizable) | Agrega DGT + AENA + noticias con contexto impacto en vuelos |
| C12 | **Estadísticas ruta/aeropuerto** — long-tail analítico | `trafico aereo tiempo real` 1.300/33/€0,34 · `pasajeros aeropuerto` — sin vol CSV | `/aviacion/aeropuertos/[iata]/estadisticas` | Eurostat AVIA_PAOA ya integrado — nadie hace páginas por aeropuerto con gráficos |
| C13 | **PT aeroporto chegadas/partidas** | `aeroporto lisboa chegadas` 33.100/3/€0,55 · `chegadas aeroporto porto` 33.100/0/€0,27 · `chegadas aeroporto madeira` 33.100/0/€8,17 | `/aviacao/aeroportos/[iata]/chegadas` | Mapa vuelos PT ya en stack (OpenSky) + ANA.pt solo da tablón estático |

---

## 2. Análisis SERP por Cluster

### C1 — Tracking vuelo individual
**Fuente:** `ranked_es_aena.es.json`, `ranked_es_flightradar24.com.json`

Top 3 ES: (1) AENA infovuelos.html — tablón genérico SIN búsqueda por número; (2) FlightAware `live/airport/[ICAO]` — técnicamente superior pero UX en inglés; (3) Skyscanner flights/status — formulario metabúsqueda.  
SERP features: sin Featured Snippet ni AI Overview. `estado vuelos` KD=0 — la SERP está prácticamente vacía de respuesta directa.  
**Gap:** Nadie en ES resuelve "vuelo IB2605, ¿cuándo llega?" con ETA predicho + historial. AENA muestra estado binario (A tiempo/Retrasado) sin datos históricos.

### C2 — Llegadas/salidas aeropuerto
**Fuente:** `wave4/serp_es_aeropuerto_barajas_salidas_hoy.json`, `wave4/serp_es_aeropuerto_el_prat_salidas.json`

Barajas salidas hoy: pos1=aeropuertomadrid-barajas.com (sitio afiliado), pos2=AENA, pos3=Skyscanner, pos6=FlightAware. Sin `google_flights` box, sin AI Overview. Solo `related_searches`.  
El Prat salidas: pos1=AENA, pos2=aeropuertobarcelona-elprat.com (afiliado), pos4=Skyscanner, pos5 PAA. Sin box especial.  
**Gap:** KD 9-14 en todos los aeropuertos principales. El top-3 son o AENA (tablón estático sin contexto) o sitios afiliados de baja calidad con datos scrapeados. Una landing con tablón real + AEMET + parking supera el contenido actual.

### C3 — Aeropuerto info (hub page)
**Fuente:** `wave11/serp_es_aeropuerto_adolfo_suárez_madrid-barajas.json`, `wave11/serp_es_aeropuerto_barcelona.json`, `wave11/serp_es_aeropuerto_de_bilbao.json`

Todos: pos1=AENA, pos2=Wikipedia o sitio afiliado, PAA presente, Knowledge Graph lateral (solo para Barajas). `top_stories` aparece en Barajas. No hay AI Overview en ninguno.  
KD entre 8-20 para aeropuertos medianos (Bilbao KD=10, Málaga KD=13-16, Alicante KD=2). Oportunidad real en los 12+ aeropuertos con KD ≤15 que AENA cubre con páginas genéricas sin datos operacionales enriquecidos.

### C4 — Puntualidad histórica
Sin SERP propia en el CSV (no se crawleó "puntualidad iberia" directamente). FlightAware ES y FlightStats son los únicos que agregan datos históricos en inglés. En español no hay nadie con datos de puntualidad por número de vuelo/ruta en una UI usable. **White space total.**

### C5 — Vuelos cancelados hoy
KD=0 para todos. Actualmente resuelto de forma incompleta: AENA muestra el estado pero no agrega por causa ni permite filtrar. En PT, ANA.pt lo mismo. El "vuelos cancelados hoy en Madeira" con 1.900 búsquedas/mes y CPC €8,17 (Madeira, repatriación urgente) es una oportunidad inmediata sin coste de datos — solo requiere un filtro sobre el tablón existente.

### C6 — Reclamación vuelo
SERP dominada por: AirHelp.com (pos1-2 casi siempre), Reclamador.es, OCU.org y los propios formularios de IBERIA/Vueling/Ryanair. CPC €3,34-7,89 — es el cluster con mayor CPC de toda la vertical. Contenido informacional + formulario AESA es ganable (KD=0 en todos), pero el valor real está en el afiliado AirHelp (comisión 35% del importe recuperado por pasajero).

### C7 — Radar aviones (mapa real-time)
**Fuente:** `wave4/serp_es_radar_aviones_españa.json`

Top ES: pos1=meteovigo.es (embed básico), pos2=AirNavRadar, pos3=FlightAware ES, pos4=YouTube, pos5-6=App Store/Play Store. FlightRadar24 domina "radar aviones" con KD=26 (PREMIUM). Features SERP: PAA + imágenes. No hay AI Overview.  
"Vuelos en tiempo real" KD=13 (GANABLE) — trafico.live ya tiene `/aviacion` con mapa OpenSky. Problema: 15min de retraso es demasiado para el intent de tracking real. Meteovigo.es rankea en pos1 con un embed estático — calidad bajísima, superarla es factible.

### C8 — Vuelos baratos desde X
**Fuente:** `wave11/serp_es_vuelos_baratos.json`, `wave11/serp_es_vuelos_a_tenerife.json`

Google Flights box aparece en pos5 (vuelos baratos) y pos3 (vuelos a tenerife). KD=95 para "vuelos baratos". Top: vuelosbaratos.es, Skyscanner, Google Flights, Ryanair, eDreams. Imposible competir orgánicamente. **Conclusión: solo como afiliado saliente, no como landing SEO propia.**

### C9 — Parking aeropuerto
**Fuente:** `wave4/serp_es_parking_aeropuerto_barajas.json`

SERP tiene `compare_sites` feature (comparador integrado de Google), `local_pack` masivo (14 resultados local). Top orgánico: AENA oficial (pos1), Parkos.es (pos6), reservarparking.com. **El compare_sites box reduce CTR orgánico significativamente.** KD 3-19 pero SERP está competida por afiliados de parking. Táctica: landing de aeropuerto con tabla de precios AENA + widget afiliado, no landing standalone.

### C12 — PT chegadas/partidas
ANA.pt tiene tablón estático. Skyscanner PT en pos5-6. "Chegadas aeroporto madeira" KD=0, CPC €8,17 — audiencia de emergencia (vuelos cancelados Madeira, muy buscado en context de disrupciones). "Chegadas aeroporto porto" 33.100/mes KD=0.

---

## 3. White Space Específico

### 3.1 Query: "vuelo IB2605 / vuelo VY1291 — ¿va retrasado?"
- Evidencia CSV: `vuelo ib2605` 50/mes, `vuelo vy1291` 70/mes — volúmenes unitarios bajos pero representan miles de números de vuelo en cola larga (~500K búsquedas/mes en conjunto estimado).
- AENA infovuelos: estado binario sin historial. FlightAware da historial pero en inglés y sin ETA inteligente. **Nadie en español ofrece: posición actual ADS-B + historial últimas 30 llegadas de este vuelo + ETA predicho + contexto meteorológico**.
- Nuestro stack: `AircraftPosition` (OpenSky 15min) + `AirportStatistic` + AEMET en la misma DB. Lo que falta: cross-ref callsign→número de vuelo IATA.

### 3.2 Query: "llegadas aeropuerto bilbao hoy" (8.100/mes, KD=9)
- Todos los competidores en top-5 muestran un tablón básico de llegadas sin contexto. Ninguno muestra: temperatura actual en aeropuerto, estado parking, alertas AEMET activas, tiempo de desplazamiento desde ciudad.
- trafico.live tiene: AEMET, parking via AENA, calidad del aire. Landing integrada = win.

### 3.3 "voos cancelados madeira hoje" (1.900/mes, KD=0, CPC €8,17)
- Intent de máxima urgencia — audiencia atrapada. ANA.pt no da vista "cancelados hoy" directa; hay que navegar por toda la web.
- Un filtro de cancelados sobre el tablón PT es trivial técnicamente y capta el CPC más alto del cluster.

### 3.4 "vuelos en tiempo real" (22.200/mes, KD=13)
- Pos1 actual: meteovigo.es con un embed mínimo. Trafico.live ya tiene el mapa OpenSky funcional en `/aviacion`. La página necesita: H1 correcto, schema, tiempo de carga < 3s con lazy map, y la KW "vuelos en tiempo real" en el title.

### 3.5 Puntualidad por aerolínea/ruta — sin competidor en ES
- Cluster puntualidad: 10 keywords, vol 3.190/mes, KD=0. Pero el intent latente es enorme (búsquedas antes de elegir vuelo). FlightStats y AviationHerald en inglés. En español: **cero competencia** para `/vuelos/puntualidad/iberia` o `/vuelos/puntualidad/ruta/mad-bcn`.
- Requiere datos históricos que OpenSky solo da parcialmente (necesitamos FlightAware/Aviationstack — ver sección 5).

---

## 4. Landings Prioritizadas

| # | URL sugerida | Keyword principal | Vol capturable | Intent | Datos del stack | Schema | Afiliado | Esfuerzo |
|---|--------------|-------------------|----------------|--------|-----------------|--------|----------|----------|
| L1 | `/aviacion/aeropuertos/[iata]` (46 ES + 18 PT) | `aeropuerto de bilbao` 135K · `aeropuerto málaga` 135K · `aeropuerto alicante` 22K | ~700K/mes (cluster aeropuerto_info) | Info operacional + llegadas | `Airport`, `AirportStatistic`, `AirQualityStation`, AEMET | `Airport`, `BreadcrumbList` | Parking afiliado (Parkos), coche (Rentalcars) | MEDIO — generable con template |
| L2 | `/aviacion/aeropuertos/[iata]/llegadas` | `llegadas aeropuerto barcelona` 12.100 · `llegadas aeropuerto malaga` 8.100 | ~123K/mes | Tablón real-time | `AircraftPosition`, `Airport`, tablón OpenSky | `Event` por vuelo, `Dataset` | Banner parking contextual | BAJO — vista ya implícita |
| L3 | `/aviacion` (mejorar meta + H1) | `vuelos en tiempo real` 22.200 · `voos em tempo real` 12.100 | ~34K/mes ganables | Mapa real-time | `AircraftPosition` (OpenSky ya funcional) | `Map` | — | MUY BAJO — solo SEO on-page |
| L4 | `/vuelos/[numero]` (template dinámico) | `estado vuelos` 4.400 · `seguimiento vuelo iberia` 1.600 | ~20K/mes | Tracking individual | `AircraftPosition` + cross-ref callsign | `Flight` | CPC afiliado si retraso → reclam | ALTO — requiere API externa |
| L5 | `/reclamacion-vuelo` | `iberia reclamaciones` 12.100 · `vueling reclamaciones` 5.400 | ~22K/mes | Legal + derechos | Estático + links AESA | `FAQPage`, `HowTo` | AirHelp afiliado (35% comisión) | BAJO — contenido informacional |
| L6 | `/aviacion/cancelados` | `vuelos cancelados` 1.900 · `voos cancelados madeira hoje` 1.900 | ~8K/mes | Disrupciones activas | Filtro sobre tablón existente + AEMET causa | `Dataset` | — | MUY BAJO |
| L7 | `/aviacion/aeropuertos/[iata]/parking` | `parking aeropuerto alicante` 18.100 · `parking aeropuerto malaga` 18.100 | ~200K/mes | Comparador parking | `Airport.parking` via AENA + Parkos widget | `Product` (precios) | Parkos/ParkVia (CPC €1,36-1,62) | BAJO — embedding widget |
| L8 | `/aviacion/aeropuertos/[iata]/coches` | `alquiler coche aeropuerto malaga` 4.400 · `alquiler coche barcelona aeropuerto` 5.400 | ~20K/mes | Alquiler coche | Estático + iframe Rentalcars | `Product` | Rentalcars/DiscoverCars CPC €3,7-4,8 | MUY BAJO |
| L9 | `/vuelos/puntualidad/[aerolinea]` | `iberia retraso vuelo` 320 · `reclamar retraso vuelo ryanair` 320 | ~3K/mes pero CPC €3-7 | Puntualidad histórica | `RailwayDailyStats` modelo (clonar para vuelos) | `Dataset`, `FAQPage` | AirHelp al final del funnel | ALTO — requiere datos históricos |
| L10 | `/aviacao/aeroportos/[iata]/chegadas` (PT) | `chegadas aeroporto porto` 33.100 · `chegadas aeroporto madeira` 33.100 | ~100K/mes PT | Tablón PT | `AircraftPosition` filtrado por aeropuerto PT | `Event` por vuelo | — | BAJO — reusa L2 con locale PT |
| L11 | `/aviacion/huelga` | `huelga aeropuertos` 6.600 · `huelga aeropuerto madrid` 4.400 | ~19K/mes | News + derechos | Estático actualizable + links BOE | `NewsArticle`, `FAQPage` | AirHelp contextual | MUY BAJO — solo en evento |
| L12 | `/aviacion/aeropuertos/[iata]/estadisticas` | `trafico aereo` + Eurostat | Long-tail analítico | Stats pasajeros | `AirportStatistic` (Eurostat ya integrado) | `Dataset`, `Table` | — | BAJO — ya tenemos datos |

---

## 5. Dependencias de Datos

### Lo que ya tenemos
- `AircraftPosition`: posiciones ADS-B OpenSky cada 15 min sobre España. Cubre C7 (mapa) y parcialmente C1.
- `Airport` + `AirportStatistic`: 46 aeropuertos AENA ES + 18 ANA PT + estadísticas Eurostat anuales. Cubre L1, L12.
- `AirQualityStation` / AEMET: contexto ambiental en aeropuertos. Diferenciador en L1-L2.
- Colector `opensky` ya funcional — solo falta página `/aviacion` con SEO correcto para C7.

### Gaps críticos

**GAP 1 — Callsign → número de vuelo IATA (BLOQUEANTE para C1, C4)**  
OpenSky da callsign (p.ej. `IBE2605`) pero la búsqueda del usuario es por número (`IB2605`). El mapeo requiere:
- **FlightAware AeroAPI** (~$150/mes plan básico, 1.000 req/día gratuitas) — da número IATA + horario programado + historial.
- **Aviationstack API** (freemium, 100 req/mes gratis, $50/mes para 10K) — alternativa más barata para datos básicos.
- Sin este mapeo, `/vuelos/IB2605` no puede funcionar. **Bloqueante para L4 y L9.**

**GAP 2 — Datos puntualidad histórica (BLOQUEANTE para C4, L9)**  
OpenSky da posición en tiempo real pero no archiva historial de llegadas con hora real vs. programada.  
- FlightAware AeroAPI incluye historial de últimos 14 días (`/flights/{ident}/history`).
- Alternativa: scraping permitido de FlightStats o acuerdo AENA (improbable).
- Sin datos históricos, la propuesta de valor "¿este vuelo suele retrasarse?" no se sostiene.

**GAP 3 — Tablón en tiempo real con polling frecuente (C2)**  
OpenSky tiene rate limit sin auth (~100 req/10min). Para un tablón de llegadas por aeropuerto necesitamos:
- Credenciales OpenSky (gratis, da 4.000 req/día): suficiente para actualizar cada 2 min.
- Alternativa: FlightAware AeroAPI `/airports/{id}/flights/arriving` — incluido en plan básico.
- **El colector `opensky` actual corre cada 15min — insuficiente para UX de tablón**. Debe subir a 2-5min para aeropuertos principales.

**GAP 4 — Estado de vuelos de aerolíneas LCC (Ryanair, Vueling)**  
Ryanair y Vueling no participan en GDS estándar para status de vuelos. FlightAware los cubre via ADS-B. No hay gap adicional si se usa FlightAware.

**GAP 5 — GTFS-RT cancelaciones (C5)**  
Las cancelaciones no aparecen en ADS-B (el vuelo no despega). Fuentes:
- AENA Infovuelos API (no pública, pero se puede parsear su web — HTML scraping).
- FlightAware AeroAPI incluye estado `cancelled`.
- Para PT: ANA.pt similar situación.

### Resumen dependencias
| Gap | Bloqueante para | Solución | Coste estimado |
|-----|----------------|----------|----------------|
| Callsign→IATA mapping | L4, L9, C1 | FlightAware AeroAPI Basic | $0-150/mes |
| Historial puntualidad | L9, C4 | FlightAware AeroAPI 14d history | Incluido en Basic |
| Polling frecuente (2min) | L2, L6, C2 | OpenSky auth account | Gratis |
| Cancelaciones | L6, C5 | FlightAware AeroAPI + OpenSky auth | Idem arriba |

**Conclusión dependencias:** FlightAware AeroAPI Basic ($0 hasta 1.000 req/día, luego ~$150/mes) desbloquea el 80% de los gaps. Es la única suscripción necesaria. Evaluar primero con el free tier.

---

## 6. Roadmap Vuelos (3 Fases, 6-12 Semanas)

### Fase 1 — Quick wins sin nuevas APIs (Semanas 1-3)
**Objetivo:** Capturar volumen con stack actual.

1. **SEO on-page `/aviacion`** — Cambiar title/H1 a "Vuelos en tiempo real sobre España · Radar ADS-B" + `<meta description>` con "vuelos en tiempo real", "radar aviones en tiempo real". Añadir schema `Map`. Acelerar frecuencia colector opensky a cada 5min.  
   Target: `vuelos en tiempo real` 22.200/mes KD=13. Tiempo: 2h.

2. **Template `/aviacion/aeropuertos/[iata]`** — 46 páginas ES generadas con SSG. Incluye: info operacional, llegadas recientes (últimas 4h OpenSky), clima AEMET, calidad aire, parking (widget Parkos afiliado), alquiler coche (widget Rentalcars afiliado), estadísticas Eurostat. Schema `Airport`.  
   Target: ~700K/mes vol. KD 2-20 en 12+ aeropuertos. Tiempo: 1 semana.

3. **Vista llegadas `/aviacion/aeropuertos/[iata]/llegadas`** — Tablón filtrado de AircraftPosition por aeropuerto destino. Polling 5min via SWR. Schema por vuelo individual.  
   Target: 123K/mes vol (llegadas+salidas cluster). KD 0-14. Tiempo: 3 días.

4. **`/reclamacion-vuelo`** — Guía CE 261/2004, plazos por aerolínea, formularios AESA enlazados, CTA afiliado AirHelp. Schema FAQPage + HowTo.  
   Target: `iberia reclamaciones` 12.100 + `vueling reclamaciones` 5.400 + cluster 22K/mes KD=0. Tiempo: 1 día.

5. **`/aviacion/cancelados`** — Filtro sobre tablón existente. Actualización automática.  
   Target: ~8K/mes KD=0 (ES+PT). Tiempo: 4h.

### Fase 2 — Tablón operacional avanzado (Semanas 4-7)
**Objetivo:** Resolver C1, C2 a nivel de producto.

6. **Integrar FlightAware AeroAPI (free tier → Basic)** — Colector nuevo `flightaware-status` que enriquece `AircraftPosition` con: número IATA, hora llegada programada vs. real, estado (en ruta/retrasado/cancelado). Crea tabla `FlightStatus`.  
   Tiempo: 5 días. Prioridad: desbloqueante para todo lo demás.

7. **`/vuelos/[numero]`** — Template dinámico. Lookup por número IATA: posición actual en mapa, hora programada/real de llegada, estado, historial últimas 30 operaciones (% puntualidad, retraso medio). CTA reclamación si retraso.  
   Target: `estado vuelos` 4.400/mes KD=0. Long-tail enorme. Tiempo: 1 semana.

8. **Polonización tablas llegadas** — Subir frecuencia a 2min para MAD, BCN, AGP, ALC, PMI. Cache Redis por aeropuerto. Añadir filtros por aerolínea/terminal/hora.  
   Tiempo: 2 días.

9. **Páginas PT `/aviacao/aeroportos/[iata]`** — Reusa template L1 con locale PT. Prioridad: LIS, OPO, FNC (Madeira).  
   Target: ~100K/mes KD 0-3 PT. Tiempo: 2 días.

### Fase 3 — Inteligencia y SEO defensivo (Semanas 8-12)
**Objetivo:** Crear moat de datos que nadie puede replicar fácil.

10. **`/vuelos/puntualidad/[aerolinea]`** y **`/vuelos/puntualidad/ruta/[orig]-[dest]`** — Agregados históricos de FlightAware 14 días (escalable con archivo propio). % puntualidad, retraso medio, distribución hora, peor día de la semana.  
    Target: cluster puntualidad 3K/mes KD=0. CPC referido a AirHelp: €3-7. Tiempo: 1 semana.

11. **Schema `Flight` en todas las páginas de vuelo individual** — Habilita rich results. AeroAPI ya da todos los campos necesarios.

12. **Huelga aeropuerto** — Página `/aviacion/huelga` activable en eventos. Template + webhook que la publica cuando se detecta keyword en Google Trends/alertas.  
    Target: `huelga aeropuertos` 6.600/mes KD=0, CPC €0 (intent informacional).

13. **Parking comparador** — Integrar API Parkos/ParkVia en páginas de aeropuerto para comparativa de precios en tiempo real. Afiliado CPC €0,82-1,62.

---

### KPIs objetivo por fase
| Fase | Semanas | Volumen objetivo ganado | Fuente de ingresos |
|------|---------|------------------------|-------------------|
| 1 | 1-3 | +50K sesiones/mes | Afiliado AirHelp + Rentalcars |
| 2 | 4-7 | +150K sesiones/mes adicionales | FlightAware cost ~$0-150/mes, afiliados €CPC |
| 3 | 8-12 | +200K sesiones/mes adicionales | Premium API data + afiliados parking |

---

*Datos: `03-keyword-universe-full.csv` (4.773 kws aviación, fecha universo 2026-04-19). SERPs: `raw/wave4/` (4 queries aviación) + `raw/wave11/` (14 queries aviación). Rankings competidores: `raw/wave1/ranked_es_aena.es.json` (1.000 kws), `ranked_es_flightradar24.com.json` (1.000 kws), `ranked_pt_ana.pt.json` (1.000 kws).*
