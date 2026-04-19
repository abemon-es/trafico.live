# Expert SEO Ferroviario — trafico.live
**Fecha:** 2026-04-19 | **Scope:** ES + PT | **Universo:** ~3.500 keywords ES · ~1.000 keywords PT

---

## 1. Intent Cartography Ferroviario

### Cluster 1 — Tracking individual de tren ("¿dónde está el AVE X?")
**Intent:** Micromomental real-time. El viajero está en el trayecto o esperando a alguien.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| ave en tiempo real | 140 | 0 |
| posición trenes en tiempo real | 2.400 | 0 |
| seguimiento trenes tiempo real | 260 | 0 |
| mapa tren cercanías madrid | 390 | 0 |

**Landing:** `/trenes/live` (ampliar con permalink por número de tren `/trenes/live/[codTren]`)

**Diferenciador:** Nadie fuera de la propia Renfe expone tracking individual con número de tren + retraso en tiempo real en interfaz pública indexable. `positren.nebulacodex.com` rankea #2 para "ave en tiempo real" pero es un proyecto hobby sin SEO estructurado, sin schema, sin páginas crawleables por tren. `mytrainpal.com` aparece #8 pero es un directorio de horarios estáticos. Nuestro colector `renfe-ld-realtime` captura GPS + retraso + próxima parada + ETA para ~115 trenes LD activos cada 2 minutos — esto es **único fuera de la app oficial de Renfe**.

---

### Cluster 2 — Puntualidad histórica por ruta
**Intent:** Decisional. El usuario quiere saber si merece la pena coger el AVE o si ese trayecto concreto suele llegar tarde.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| compromiso puntualidad renfe | 6.600 | 0 |
| retrasos ave | 2.900 | 0 |
| retrasos ave madrid barcelona | 260 | 0 |
| ave madrid barcelona puntualidad | <100 | 0 |

**Landing:** `/trenes/puntualidad` + `/trenes/linea/[slug]#puntualidad`

**Diferenciador crítico:** Renfe publica solo un porcentaje genérico de puntualidad por producto (ej. "AVE 97,2%"). Nadie ofrece puntualidad histórica desglosada por ruta concreta ni por franja horaria. Tenemos `RailwayDelaySnapshot` con snapshots de ~115 trenes LD cada 2 minutos — construible en semanas. Potencial de crear el único observatory público de puntualidad ferroviaria en España.

---

### Cluster 3 — Retrasos en vivo ("retrasos renfe hoy")
**Intent:** Urgente. El usuario tiene un tren en los próximos minutos.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| retrasos renfe | 8.100 | 0 |
| incidencias renfe hoy | 18.100 | 0 |
| incidencias renfe | 3.600 | 0 |
| ave retrasos | 2.900 | 0 |

**Landing:** `/trenes` (ya existente, ampliar con feed live) + `/trenes/incidencias`

**Análisis SERP:** Top 1-2 son renfe.com y adif.es con páginas estáticas de "compromiso de puntualidad" o "estado de la red". Ninguno da una vista operacional de retrasos en curso. El slot #3+ lo ocupa prensa (rtve.es, 20minutos.es) con noticias de incidencias puntuales. Hay hueco claro para una página de estado en tiempo real que Google trataría como recurso de referencia.

---

### Cluster 4 — Incidencias cercanías por línea
**Intent:** Urgente/contextual. Buscan mientras están en el andén.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| incidencias rodalies | 4.400 | 0 |
| incidencias rodalies r2 hoy | 2.900 | 0 |
| incidencias metro madrid hoy | 3.600 | 0 |
| incidencias cercanias madrid | ~800 | 0 |

**Landing:** `/trenes/cercanias/[network]/incidencias` + `/trenes/cercanias/madrid`

**Diferenciador:** Los colectores `renfe-alerts` (GTFS-RT) y `renfe-positions` ya nutren las alertas en tiempo real. Rodalies tiene su web gencat.cat que sí rankea pero sin estructura de páginas por línea. La oportunidad es crear páginas por red + línea (C-1, C-3, R-2…) con estado en vivo embebido + histórico de incidencias.

---

### Cluster 5 — Horarios estación ("llegadas atocha hoy")
**Intent:** Transaccional/urgente. Buscado desde móvil en la estación.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| llegadas atocha | 4.400 | 0,05 |
| horarios cercanias madrid | 74.000 | 1,03 |
| horario renfe cercanias | 110.000 | 1,16 |
| proximos trenes atocha | ~100 | 0 |

**Landing:** `/trenes/estacion/[slug]` (ya existe, ampliar con panel de llegadas/salidas en tiempo real)

**Análisis SERP:** Renfe.com domina con su buscador de horarios pero las páginas de estación de Adif (adif.es) tienen contenido estático sin datos en tiempo real. `redtransporte.com` rankea #3-4 con páginas informativas básicas. Nadie indexa un tablón de llegadas/salidas en tiempo real para una estación concreta.

---

### Cluster 6 — Precio AVE / mejor momento para comprar
**Intent:** Investigación previa a compra. Tráfico de planificación, no urgente.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| billetes renfe baratos | 90.500 | 0,60 |
| ave madrid barcelona | 27.100 | 0,84 |
| trenes baratos | 22.200 | 0 |
| billetes de ave baratos | 1.600 | 0,56 |

**Landing:** `/trenes/linea/ave-madrid-barcelona` + `/trenes/precios` (nuevo)

**Diferenciador:** Nadie en el mercado español ofrece análisis público del precio dinámico del AVE (cuándo baja, qué días son más baratos, cuánta antelación). Trainline y Omio tienen comparadores de compra pero no análisis de tendencias. Requiere scraping de precios (ver §6).

---

### Cluster 7 — Reclamación por retraso (CPC alto)
**Intent:** Transaccional post-incidente. CPC elevado por afiliados de legaltech.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| renfe reclamaciones | 22.200 | 4,70 |
| reclamacion renfe retraso | 2.400 | 12,20 |
| reclamar retraso renfe | 1.900 | 0 |
| indemnizacion renfe | 14.800 | 0 |

**Landing:** `/trenes/reclamaciones` (nueva, guía + deeplink a servicios legaltech)

**Análisis SERP:** Posiciones 1-5 son renfe.com (formulario), ocu.org, bankinter.com/blog y bufetes de abogados. Hay espacio para un recurso informativo + comparador de servicios de reclamación automatizada (AirHelp para trenes, ClaimCompass). CPC de 12€ indica afiliación viable.

---

### Cluster 8 — Comparador modal AVE vs avión
**Intent:** Decisional largo plazo. Vol bajo en el universo capturado pero intención cualificada.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| ave vs avion madrid barcelona | ~500 est. | ~0,5 |
| cuanto tarda el ave madrid barcelona | 1.300 | 0 |
| tren o avion madrid barcelona | ~300 est. | 0 |

**Landing:** `/trenes/linea/ave-madrid-barcelona#comparativa` o artículo SEO dedicado

**Diferenciador:** Podemos construir el comparador con datos reales: duración media AVE (desde `RailwayDailyStats`) vs vuelo (~1h15 + 2h llegada aeropuerto). Ninguna web española lo hace con datos actualizados.

---

### Cluster 9 — Plano metro + línea
**Intent:** Navegacional/referencia. Búsquedas masivas, SERP dominada por metromadrid.es.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| plano metro madrid | 246.000 | 0,07 |
| mapa metro madrid | 135.000 | 0,07 |
| metro madrid | 301.000 | 0,23 |
| linea 6 metro madrid | 90.500 | 0 |

**Landing:** `/trenes/metro/madrid` (nueva) → embed mapa interactivo + info líneas

**Estrategia:** metromadrid.es es imbatible para las queries de marca. La oportunidad está en las queries long-tail de línea individual + estado de la línea: "metro madrid línea 6 incidencias hoy" — nadie lo hace bien. Nuestro colector `transit-gtfs` ya tiene Metro Madrid vía MobilityData.

---

### Cluster 10 — Metro/cercanías horarios por estación
**Intent:** Micromomental, mobile-first.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| metrovalencia horarios | 201.000 | 0 |
| metro bilbao horarios | 49.500 | 0,81 |
| horario metro bilbao | 14.800 | 0 |
| horarios metro porto | 14.800 | 0 |

**Landing:** `/trenes/metro/[ciudad]` + `/trenes/metro/[ciudad]/estacion/[slug]`

**Diferenciador:** Buscas "metrovalencia horarios" y caes en Metrovalencia.es. El diseño es inaccesible en móvil. Podemos hacer un wrapper con UX superior + datos GTFS ya importados.

---

### Cluster 11 — Accidente tren hoy (queries de ansiedad/noticia)
**Intent:** Informacional urgente. Alto vol. pero naturaleza de news, no rankeable con contenido estático.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| accidente tren | 165.000 | 0 |
| accidente tren hoy | 49.500 | 0 |
| accidente tren córdoba | 49.500 | 0 |

**Landing:** `/trenes/accidentes` (histórico con datos DGT) — no competir en breaking news.

**Estrategia:** Crear página de estadísticas históricas de accidentes ferroviarios en España usando datos `AccidentMicrodata` (DGT). Captura tráfico informacional cuando la noticia se enfría (semanas posteriores al evento).

---

### Cluster 12 — Redes y hubs cercanías
**Intent:** Orientación/navegación. El usuario quiere explorar la red, no una consulta urgente.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| cercanias madrid | 110.000 | 0,88 |
| rodalies | 110.000 | 0,77 |
| horarios cercanias madrid | 74.000 | 1,03 |
| cercanias sevilla | 60.500 | 0 |

**Landing:** `/trenes/cercanias` (ya existe) + `/trenes/cercanias/[network]` (ya existe)

**Estado actual:** Páginas ya construidas. Ampliar con mapa interactivo + estado en tiempo real + frecuencia real (desde GTFS).

---

### Cluster 13 — Station hubs transversales (Atocha, Sants, Chamartín)
**Intent:** Navegacional + informacional. Queries de orientación en la estación.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| madrid-puerta de atocha-almudena grandes | 450.000 | 0,40 |
| atocha madrid | 60.500 | 0,91 |
| barcelona sants | 550.000 | 0,47 |
| estacion de atocha | 165.000 | 0,10 |

**Landing:** `/trenes/estacion/madrid-atocha`, `/trenes/estacion/barcelona-sants` (ya en `/trenes/estaciones/`)

**Estrategia:** Las páginas de estación son el entry point más voluminoso. Adif.es rankea #2 pero con contenido estático y sin datos en tiempo real. Nuestras páginas de estación deben incluir: tablón de llegadas/salidas live, mapa de instalaciones, conexiones con transporte público local, y estado de incidencias.

---

### Cluster 14 — Portugal: CP, Fertagus, Alfa Pendular
**Intent:** Horarios + compra de billete. Mercado más pequeño pero contiguo.

| Keyword ejemplo | Vol | CPC |
|---|---|---|
| comboios (general) | 49.500 | 0 |
| fertagus horario | 40.500 | 0 |
| horários comboios | 14.800 | 0 |
| alfa pendular | ~10.000 est. | 0 |

**Landing:** `/trenes/portugal` (nueva) — ver §5 Gap PT

---

## 2. Análisis SERP por Cluster

### Brand keywords — imposibles de competir directamente

Renfe.com domina todas las queries de marca con contenido first-party. Ocupan posiciones 1-3 para: "renfe", "cercanias madrid", "horarios renfe", "billetes ave". El dominio `tiempo-real.renfe.com` (Cercanías) y `tiempo-real.largorecorrido.renfe.com` (LD) rankean directamente para queries de tracking.

**Regla:** No atacar estas keywords con contenido idéntico. Atacar los ángulos que Renfe no cubre: puntualidad histórica, análisis, comparativas, tracking permalink por número de tren.

### Information keywords — oportunidad

| Query cluster | Top 3 actuales | Hueco visible |
|---|---|---|
| "retrasos renfe hoy" | renfe.com (compromiso), adif.es (estado red), rtve.es | Dashboard en tiempo real con todos los retrasos activos |
| "ave en tiempo real" | tiempo-real.largorecorrido.renfe.com, positren.nebulacodex.com, renfe.com info | Página indexable con estado por número de tren + histórico |
| "incidencias rodalies" | renfe.com, rodalies.gencat.cat, es.wikipedia.org | Página estado por línea (R-1, R-2…) con histórico |
| "llegadas atocha" | renfe.com (buscador), adif.es (info estática), esmadrid.com | Tablón live indexable |
| "reclamacion renfe retraso" | renfe.com, OCU, bufetes | Guía + comparador legaltech |
| "puntualidad ave" | renfe.com (genérico), prensa | Observatory puntualidad por ruta |

### Competidores informativos

- **positren.nebulacodex.com** — Hobby project, rankea #2 para "ave en tiempo real". Sin schema, sin páginas por tren, sin SEO estructurado. Vulnerable.
- **redtransporte.com** — Directorio estático de líneas cercanías con planos PDF. Rankea para "cercanias madrid" y variaciones de línea. Sin datos en tiempo real. CMS antiguo.
- **mytrainpal.com** — Horarios estáticos internacionales. Sin datos Renfe específicos de calidad.
- **truecalia.com / blog.truecalia.com** — Startup de compra de billetes. Tiene artículo "¿Dónde está mi tren?" que rankea para tracking. Sin datos reales propios.
- **trenes.com** — OTA de billetes, domina compra pero no contenido informacional.
- **thetrainline.com** — OTA internacional, posiciones 4-6 para billetes pero sin contenido en español de calidad para queries informacionales.

---

## 3. White Space Específico

### 3a. Puntualidad histórica por ruta — hueco sin ocupar
Renfe publica un solo número anual: "AVE 97,2% puntualidad". Nadie en el ecosistema español ofrece desglose por ruta concreta, hora del día, ni evolución mensual.

**Evidencia:** Query "retrasos ave madrid barcelona" (260/mes) — SERP muestra solo foros y artículos de prensa sin datos estructurados. `RailwayDelaySnapshot` en trafico.live ya captura retraso en minutos + tren + timestamp cada 2 minutos para todos los LD activos. Con 90 días de datos tendríamos el primer observatory público de puntualidad ferroviaria de España.

### 3b. Tracking permalink por número de tren — único en el mercado
El visor oficial de Renfe (`tiempo-real.largorecorrido.renfe.com`) no tiene URLs indexables por tren — es una SPA sin deep links. Un recurso como `trafico.live/trenes/live/02082` (AVE nº 02082) sería la única página indexable de seguimiento por número de tren en España.

**Datos disponibles:** El API `flotaLD.json` expone `codTren`/`codComercial`, GPS, retraso, velocidad, estacionSiguiente y ETA — todo lo necesario para una página completa.

### 3c. Incidencias cercanías por línea con histórico — solo existe en formato push (Twitter/X)
Los tweets de @CercaniasMadrid son la única fuente pública de incidencias por línea. No están indexados ni archivados de forma estructurada. Crear `/trenes/cercanias/madrid/c-3/incidencias` con histórico GTFS-RT abriría un vertical completamente nuevo.

### 3d. Reclamaciones — CPC 12€, nadie tiene recurso neutral de calidad
Hay OTAs y bufetes, pero no hay ninguna guía neutral actualizada con calculadora de indemnización que enlace a servicios especializados. CPC de 12,20€ para "reclamacion renfe retraso" indica mercado afiliado maduro.

---

## 4. Landings Prioritizadas

### L1 — `/trenes/live/[codTren]` ★★★ PRIORIDAD MÁXIMA
- **Keyword principal:** "ave en tiempo real" (140/mes directo, ~10K long-tail estimado)
- **Intent:** Micromomental urgente
- **Data stack:** `renfe-ld-realtime` → `RailwayDelaySnapshot` (GPS, retraso, ETA, próxima parada)
- **Schema:** `TransportationTrip` + `Vehicle` con `currentLocation` (GeoCoordinates)
- **Diferenciador único:** NADIE más tiene páginas indexables por número de tren. Positren es SPA no indexada.
- **Blocker:** Necesita SSR con `generateStaticParams` para trenes activos + ISR 2 minutos. Pendiente de diseñar slug estable (codComercial vs codTren cambia).
- **Afiliados:** N/A para tracking; sí para reserva en la misma página.

### L2 — `/trenes/puntualidad` + `/trenes/linea/[slug]#puntualidad`
- **Keyword:** "compromiso puntualidad renfe" (6.600), "retrasos ave" (2.900)
- **Intent:** Decisional investigación
- **Data stack:** `RailwayDelaySnapshot` agregado → `RailwayDailyStats`. Requiere 60+ días de snapshots acumulados para ser significativo.
- **Schema:** `Dataset` + `StatisticalVariable`
- **Blocker:** Necesita función de agregación en Prisma/SQL para percentil p50/p90 de retraso por ruta. No disponible todavía, estimado 2-3 días de desarrollo.
- **Afiliados:** Deeplinks a Trainline/Omio para compra del trayecto analizado.

### L3 — `/trenes/incidencias` (feed tiempo real)
- **Keyword:** "incidencias renfe hoy" (18.100), "retrasos renfe" (8.100)
- **Intent:** Urgente
- **Data stack:** `RailwayAlert` (GTFS-RT alerts via `renfe-alerts` collector)
- **Schema:** `EmergencyEvent` o `Event` con status
- **Blocker:** Revalidación frecuente (ISR 60s). Ya tenemos los datos; falta la página.

### L4 — `/trenes/cercanias/[network]/linea/[lineSlug]`
- **Keyword:** "incidencias rodalies r2 hoy" (2.900), "linea c3 cercanias madrid" (880)
- **Intent:** Urgente contextual
- **Data stack:** `RailwayRoute` + `RailwayAlert` filtrado por red/línea
- **Schema:** `TrainTrip` + alertas `EmergencyEvent`
- **Blocker:** Necesita mapeo slug de línea → `RailwayRoute.gtfsRouteId` para filtrar alertas.

### L5 — `/trenes/estacion/[slug]` AMPLIADA (tablón arrivals/departures)
- **Keyword:** "llegadas atocha" (4.400), "salidas sants" (~2K est.), "horario estacion tren" (amplio)
- **Intent:** Urgente / navegacional
- **Data stack:** `RailwayStation` + join con `RailwayDelaySnapshot` por codEstSig (próxima parada)
- **Schema:** `TrainStation` con `amenityFeature`, schedule
- **Blocker:** El API LD solo da próxima parada de trenes LD. Para cercanías necesitamos `renfe-positions` (GTFS-RT vehicle_positions) que ya existe.

### L6 — `/trenes/reclamaciones`
- **Keyword:** "renfe reclamaciones" (22.200 CPC 4,70€), "reclamacion renfe retraso" (2.400 CPC 12,20€)
- **Intent:** Transaccional post-incidente
- **Data stack:** Sin datos propios — contenido editorial + calculadora de indemnización (art. 17 Reglamento UE 1371/2007)
- **Schema:** `HowTo` + `FAQPage`
- **Afiliados:** AirHelp (extensión trenes), ReclamaVuelo u equivalentes para trenes
- **Blocker:** Puramente editorial; sin dependencias técnicas.

### L7 — `/trenes/linea/ave-madrid-barcelona` (y otras rutas AVE)
- **Keyword:** "ave madrid barcelona" (27.100), "ave madrid valencia" (18.100), "ave madrid sevilla" (18.100)
- **Intent:** Investigación + compra
- **Data stack:** `RailwayRoute` con shapes + puntualidad de `RailwayDelaySnapshot`
- **Schema:** `TrainTrip` con origen/destino/duración
- **Afiliados:** Trainline/Omio deeplink, CPC justifica inversión de contenido
- **Blocker:** Ninguno técnico; páginas parcialmente existentes en `/trenes/lineas`.

### L8 — `/trenes/metro/madrid` y `/trenes/metro/[ciudad]`
- **Keyword:** "metro madrid línea 6 incidencias" (long-tail ~500/mes), "metro bilbao horarios" (49.500)
- **Intent:** Referencia + urgente
- **Data stack:** `TransitRoute` + `TransitStop` de `transit-gtfs` (Metro Madrid ya importado)
- **Schema:** `SubwayStation`, `BusOrCoach`… → `TransitStation`
- **Blocker:** La marca "metro madrid" es imposible de superar, por lo que el foco es long-tail de estado por línea e incidencias.

### L9 — `/trenes/comparativa/ave-vs-avion`
- **Keyword:** "cuanto tarda el ave madrid barcelona" (1.300), "tren o avion madrid barcelona" (~500 est.)
- **Intent:** Decisional
- **Data stack:** `RailwayDailyStats` para duración media + datos aviación de `AirportStatistic`
- **Schema:** `HowTo` + tabla comparativa
- **Afiliados:** Doble: Trainline + Skyscanner/Google Flights deeplinks
- **Blocker:** Necesita datos de duración media por ruta AVE (calculable desde `RailwayDelaySnapshot` + horario previsto).

### L10 — `/trenes/accidentes` (estadísticas históricas)
- **Keyword:** "accidente tren" (165.000 pico), "accidente ferroviario españa" (~2K evergreen)
- **Intent:** Informacional post-noticia
- **Data stack:** `AccidentMicrodata` de DGT (aunque mayoritariamente carretera, hay categoría ferroviaria)
- **Schema:** `Dataset`
- **Afiliados:** N/A
- **Blocker:** Los datos DGT de accidentes en `AccidentMicrodata` son de carretera. Para ferroviario se necesitaría una fuente específica (CIAF, Comisión de Investigación de Accidentes Ferroviarios).

### L11 — `/trenes/horarios` (hub de horarios consultable)
- **Keyword:** "horarios renfe" (110.000), "horario renfe cercanias" (110.000)
- **Intent:** Transaccional
- **Data stack:** `RailwayRoute` + `RailwayStation` (GTFS estático)
- **Schema:** `Schedule` + `TrainTrip`
- **Afiliados:** Deeplinks a renfe.com o Trainline para compra
- **Blocker:** Renfe.com es imbatible aquí; la estrategia es posicionarse en long-tail de ruta concreta, no en la query genérica.

---

## 5. Gap PT — Portugal

### Volumen total capturado
- PT ferroviario (CP, Fertagus, Alfa Pendular): **981 keywords, ~1,2M vol/mes**
- Top queries: `metro lisboa` (135K), `metro porto` (90,5K), `fertagus` (74K), `comboios` (49,5K), `fertagus horario` (40,5K)

### SERP PT — quién domina
- `cp.pt` domina todas las queries de Comboios de Portugal con posiciones 1-4.
- `metrolisboa.pt` domina metro de Lisboa (KD 93).
- `metrodoporto.pt` domina metro do Porto.
- `fertagus.pt` domina horarios Fertagus.
- Hay hueco solo en long-tail informacional: "próximos comboios" (27.100), estado en tiempo real de CP, "greve comboio" (12.100 — queries de huelga que no cubre bien nadie).

### ¿Merece la pena construir el colector CP GTFS?

**Análisis:** CP publica GTFS en `cp.pt/cp/r/Site/Viajar/Documents/CP-GTFS.zip`. No requiere autenticación. El volumen de 1,2M vol/mes PT es significativo pero el mercado está más concentrado (cp.pt es monopolio). El ROI depende del posicionamiento.

**Recomendación:** Sí, merece la pena — pero como **fase 2**, no inmediata.

- **Construir primero:** Páginas de estaciones principales (Lisboa Oriente, Lisboa Santa Apolónia, Porto Campanhã) que ya aparecen en el universo de keywords con volumen 165K-450K (aunque parte es tráfico genérico de lugar, no solo ferroviario).
- **Colector CP GTFS:** Estimado 1-2 días de desarrollo (mismo patrón que `renfe-gtfs`). Daría acceso a 800+ estaciones, rutas Alfa Pendular + Intercidades + Urbanos + Regional.
- **Fertagus:** Tiene GTFS propio en MobilityData (ya tenemos `mobilitydata-sync`). Puede importarse sin colector nuevo.
- **Gap real-time CP:** CP no tiene API pública de posiciones GPS. Sí hay GTFS-RT de alertas limitado. Sin tracking en tiempo real, la propuesta de valor PT es menor que ES.

---

## 6. Dependencias de Datos

| Necesidad | Estado actual | Esfuerzo | Prioridad |
|---|---|---|---|
| **Snapshots puntualidad agregados** (60+ días `RailwayDelaySnapshot`) | En producción, acumulando | 0 (ya corre) | CRÍTICA para L2 |
| **Slug estable por número de tren** (L1 tracking) | `codComercial` existe en collector | 1 día (normalización) | ALTA |
| **Tablón arrivals LD por estación** | Parcialmente: `codEstSig` en snapshots | 2 días | ALTA |
| **GTFS-RT Rodalies/FGC** | No existe colector FGC | 3-5 días (acuerdo + API) | MEDIA |
| **Precios históricos AVE** (scraping) | No existe | 5-7 días + riesgo ToS | MEDIA-BAJA |
| **Booking API deeplink Trainline** | No configurado (afiliados) | 1 día | MEDIA |
| **CP GTFS Portugal** | No existe colector | 1-2 días | MEDIA |
| **Estadísticas accidentes ferroviarios** (CIAF) | No existe (DGT es carretera) | 3-4 días research + import | BAJA |

### Nota sobre precios históricos AVE
El scraping de precios Renfe está en zona gris de ToS. Alternativa viable: usar la API de Trainline (afiliado) que expone precios + disponibilidad sin riesgo legal. No daría histórico propio pero sí permite mostrar "precio actual" con deeplink de compra.

### Nota sobre Rodalies/FGC real-time
FGC (Ferrocarrils de la Generalitat de Catalunya) gestiona algunas líneas de Rodalies. Tienen API de posiciones pero no es pública. Las líneas gestionadas por Renfe sí están en `renfe-positions` (GTFS-RT vehicle_positions). El gap es FGC-gestionadas (L7, L9 de Rodalies BCN).

---

## 7. Roadmap Ferroviario (3 Fases)

### Fase 1 — Quick wins (semanas 1-3)
**Goal:** Posicionamiento en clusters de información y estado que ya tenemos datos.

1. **`/trenes/incidencias`** — Feed en tiempo real de alertas GTFS-RT (`RailwayAlert`). Sin bloqueadores técnicos. Schema `EmergencyEvent`. Target: "incidencias renfe hoy" (18.100/mes).

2. **`/trenes/estacion/[slug]` ampliada** — Añadir tablón de llegadas/salidas LD usando `RailwayDelaySnapshot.codEstSig`. Actualización cada 2 min via ISR. Target: "llegadas atocha" (4.400/mes), amplio long-tail de estaciones.

3. **`/trenes/reclamaciones`** — Página editorial pura. Calculadora de indemnización (Reglamento UE 1371/2007: 25% del precio de billete en retraso 60-119 min, 50% a partir de 120 min). Afiliados legaltech. Target: "renfe reclamaciones" (22.200, CPC 4,70€).

4. **Enriquecer `/trenes/cercanias/[network]`** — Añadir estado en tiempo real de alertas + mapa de líneas interactivo. Ya existen páginas, solo necesitan data layer real-time.

**Archivos clave para Fase 1:**
- `src/app/trenes/incidencias/page.tsx` (nuevo)
- `src/app/trenes/estacion/[slug]/page.tsx` (ampliar tablón)
- `src/app/trenes/reclamaciones/page.tsx` (nuevo)
- `src/app/api/trenes/alertas/route.ts` (ya existe, ampliar filtros)

---

### Fase 2 — Diferenciación por datos únicos (semanas 4-8)
**Goal:** Explotar el colector `renfe-ld-realtime` que nadie más tiene.

1. **`/trenes/live/[codTren]`** — Página SSR con ISR 2 min. Estado actual del tren (GPS en mapa, retraso, próxima parada, ETA destino). SEO: title = "AVE [codTren] [origen]→[destino] — Estado en tiempo real". Schema `TransportationTrip`. Target: long-tail "ave [número] tiempo real" (colectivamente ~5K/mes estimado).

2. **`/trenes/puntualidad`** — Tablero de puntualidad histórica por marca y ruta. Requiere función SQL de agregación P50/P90 sobre `RailwayDelaySnapshot` (necesita 60+ días de datos acumulados). Schema `Dataset`. Target: "compromiso puntualidad renfe" (6.600) + SEO de confianza editorial.

3. **`/trenes/linea/[slug]`** mejoradas con **puntualidad en vivo** — Añadir a páginas ya existentes el widget de puntualidad calculada desde snapshots. Target: "ave madrid barcelona" (27.100), "ave madrid sevilla" (18.100).

4. **Colector CP GTFS Portugal** — `services/collector/tasks/cp-gtfs/` (nuevo, patrón idéntico a `renfe-gtfs`). Desbloquea páginas de estaciones PT.

**Archivos clave para Fase 2:**
- `src/app/trenes/live/[codTren]/page.tsx` (nuevo)
- `src/app/trenes/puntualidad/page.tsx` (nuevo)
- `services/collector/tasks/cp-gtfs/collector.ts` (nuevo)
- SQL agregation function en `services/martin/migrations/` o query util en `src/lib/`

---

### Fase 3 — Expansión vertical (semanas 9-16)
**Goal:** Consolidar metro ES+PT y comparativas modales.

1. **`/trenes/metro/[ciudad]`** — Madrid, Barcelona, Bilbao, Sevilla, Valencia, Lisboa, Porto. Datos desde `transit-gtfs` (MobilityData, ya importados). Foco en long-tail de línea + estado, no en competir con metromadrid.es en queries de marca.

2. **`/trenes/comparativa/ave-vs-avion`** — Contenido editorial con datos propios de duración media AVE vs tiempo real de vuelo + traslados. Afiliados dobles (Trainline + Skyscanner). Target: "cuanto tarda ave madrid barcelona" (1.300) + comparativas de sostenibilidad.

3. **Afiliados configurados** — Integrar Trainline Partner API o Omio widget en páginas de ruta y estación. CPC orgánico 0,84€ en "ave madrid barcelona" indica tráfico cualificado para conversión.

4. **Portugal** — `/trenes/portugal/estacao/[slug]` con datos CP GTFS (importado en Fase 2). Target: "comboio lisboa porto" (9.900), "fertagus horario" (40.500).

---

## Resumen Ejecutivo

El universo ferroviario ES+PT capturado asciende a **~13,5M de búsquedas mensuales**. Los 3 activos que nos diferencian radicalmente del mercado son:

1. **`renfe-ld-realtime`** — El único colector externo a Renfe con posición GPS + retraso en tiempo real por número de tren. Positren (principal competidor hobby) no tiene páginas indexables ni schema. Oportunidad de crear el primer tracking público por tren indexado en Google.

2. **`RailwayDelaySnapshot` acumulando** — Con 90 días de datos tendremos el primer observatory público de puntualidad ferroviaria por ruta en España. Renfe no lo publica a este nivel de detalle.

3. **`renfe-alerts` GTFS-RT** — Base para páginas de incidencias por línea que actualmente no existen en ningún competidor con estructura SEO adecuada.

El gap PT es real (~1,2M vol/mes) pero secondary: construir CP GTFS (1-2 días) desbloquea páginas de estaciones de alto vol. El tracking en tiempo real de CP no es viable sin API pública.

**Prioridad inmediata sin bloqueadores técnicos:** `/trenes/incidencias` + ampliar `/trenes/estacion/[slug]` + `/trenes/reclamaciones`.
