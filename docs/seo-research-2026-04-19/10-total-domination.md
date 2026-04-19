# Estrategia de dominación total — ES + PT

**Fecha:** 2026-04-19
**Premisa:** Tenemos mejor UX/UI, mejores datos en tiempo real, y capacidad de generar contenido SEO a diario. **Competimos en todo.**
**Base:** 3 rondas DataForSEO, 26K+ keywords con volumen, 25K+ con KD, 147+ SERPs analizadas.

---

## 0) Actualización tras ronda 3 (wave 9-11)

**Universo ampliado:** 26K → **70.632 keywords** (ES 51.823 + PT 18.809).  
**KD medido:** 25.467 keywords (ES 19.626 + PT 5.841).  
**Ganables (KD medido + relevancia + vol ≥100):** **5.956** (ES 5.019 + PT 937).  
**Gasto DataForSEO:** $20,67 de $49,97 (41% del budget).

**Matriz KD × Volumen ES (solo relevantes a nosotros):**

| KD\Vol | 100-1K | 1K-10K | 10K-100K | 100K+ | Total |
|---|---|---|---|---|---|
| KD 0-10 | 4.914 | 7.192 | **1.131** | **45** | **13.282** |
| KD 11-20 | 502 | 1.227 | 413 | 24 | 2.166 |
| KD 21-30 | 289 | 773 | 257 | 41 | 1.360 |
| KD 31-50 | 196 | 795 | 303 | 47 | 1.341 |
| KD 51+ | 152 | 596 | 241 | 64 | 1.053 |

**Matriz KD × Volumen PT:**

| KD\Vol | 100-1K | 1K-10K | 10K-100K | 100K+ | Total |
|---|---|---|---|---|---|
| KD 0-10 | 1.304 | 2.655 | **311** | **10** | **4.280** |
| KD 11-20 | 127 | 511 | 99 | 7 | 744 |
| KD 21-30 | 61 | 244 | 58 | 3 | 366 |

**Titular:** con KD ≤ 20 y vol ≥ 100 tenemos **20.472 keywords trivialmente ganables** (17.448 ES + 5.024 PT), de las cuales **1.954 tienen vol ≥ 10K**.

**SERP features en top 300 ganables (wave 11, 288 SERPs):**
- People Also Ask: **56%** — FAQ schema obligatorio (100% cobertura).
- Knowledge Graph: **21,5%** — Place/Organization/TrainStation/Airport schema.
- Local Pack: **12,5%** — GBP o LocalBusiness en entidades locales.
- Top Stories: **15,3%** — news-sitemap + Article schema.
- **AI Overview solo 2,4%** en keywords ganables (vs. 19% en keywords top-broad). Las keywords ganables están "bajo el radar" de SGE.
- Ads comerciales (compare_sites, google_reviews): **12-9%** — señal CPC sólida → afiliación rentable.

**Top dominios competidores actualizados (top-5 appearance en 288 SERPs):**
- **ES**: eltiempo.es (98), aemet.es (92), tiempo.com (59), wikipedia (52), renfe.com (47), metromadrid.es (40), accuweather.com (39), 24timezones.com (24), crtm.es (21), aena.es (20).
- **PT**: ipma.pt (84), tempo.pt (58), accuweather.com (40), otempo.pt (26), tempoeradar.pt (24).

Domain authority muy extranjera en top-5 (**accuweather.com aparece 39 veces ES + 40 PT**) → si somos ES/PT-native con schema + UX superior, ganamos esas posiciones.

---

## 0b) Tesis

La web es invisible para Google hoy (0 keywords >50 vol). Esto es ventaja si la leemos bien: **ninguna decisión de SEO previa nos ata**. Podemos diseñar la arquitectura de contenido y linking desde cero, optimizada para el universo real de búsquedas ES+PT que acabamos de mapear.

Nuestras 4 ventajas estructurales:

1. **Datos en tiempo real** — 43 colectores activos. Ningún competidor cruza meteo + tráfico + trenes + vuelos + combustible + aire en una misma ciudad.
2. **UX superior** — Protomaps self-hosted, Recharts, OKLCH tokens, Exo 2/DM Sans. La SERP ES actual (aemet.es, eltiempo.es, dieselogasolina.com) tiene UX 2010-2015.
3. **Capacidad editorial diaria** — podemos publicar 30-100 artículos/día (programática + editorial) sobre datos que llegan continuamente.
4. **Cobertura bilingüe ES + PT** — PT está mucho menos competido (tempo.pt, maisgasolina.com, wikipedia rankean solos).

---

## 1) Frentes abiertos — 13 verticales, no 6

La auditoría anterior y el roadmap de dominación eran **6 verticales** (Carretera, Trenes, Aviación, Marítimo, Combustible, Profesional). Con la nueva data añado **7 más** con volumen confirmado:

| # | Vertical | Vol agregado ES+PT/mes | Landing state | Competidor top | UX competidor |
|---|---|---|---|---|---|
| 1 | Meteo | 40M | solo hub, sin per-ciudad | aemet.es, eltiempo.es, ipma.pt | Media-baja |
| 2 | **Calidad aire** | 1,2M | parcial | iqair.com (US, en inglés) | Media |
| 3 | **Alertas / DANA / radar lluvia** | 500K | hueco | aemet.es | Baja |
| 4 | Ferroviario (estaciones/líneas) | 8M | existe | adif.es, renfe.com | Media |
| 5 | Aviación | 4M | existe | aena.es, flightradar24.com | Alta |
| 6 | Tráfico & carreteras | 3M | existe | dgt.es, infocar.dgt.es, madrid.es | Baja-media |
| 7 | Combustible ES | 2M | existe | dieselogasolina.com, clickgasoil.com | Baja |
| 8 | **Combustible PT** | 1M | hueco total | maisgasolina.com (monopolio) | Baja |
| 9 | Marítimo + ferry | 1,5M | existe | directferries.es (OTA) | Media |
| 10 | **Metro / transit urbano PT** | 2M | hueco | operadores + wikipedia | Baja |
| 11 | Metro / transit ES | 1,5M | parcial | metromadrid.es, tmb.cat | Media |
| 12 | **Hubs ciudad/provincia** | 15M (cola larga) | hueco | wikipedia, ayuntamientos | Baja |
| 13 | **Legal / normativa** (baliza V-16, ZBE, carnet, etc.) | 1M | parcial | dgt.es | Media |

**TAM agregado: ~80M búsquedas/mes ES+PT.** Incluso con 1% de captura = 800K clics/mes.

---

## 2) Contenido a diario — motor de publicación

El diferencial frente a competidores estáticos. **3 pipelines** complementarios:

### 2.1 Pipeline programático (SSG/ISR) — sin límite, ~50K URLs

URLs auto-generadas desde DB. Una sola template × N entidades = miles de landings con contenido útil.

| Template | Nº URLs | Revalidate | Fuente |
|---|---|---|---|
| `/meteo/[slug]` ES | 2.052 (52 prov + 2.000 municip top) | 1h | AEMET API + OpenMeteo fallback |
| `/meteo/pt/[slug]` | 326 (18 distr + 308 concelhos) | 1h | IPMA API |
| `/calidad-aire/[slug]` | 500 ciudades | 1h | MITECO ICA + CCAA |
| `/calidad-aire/pt/[slug]` | 200 | 1h | APA |
| `/trenes/estacion/[slug]` | 2.154 ES + 200 PT | 15min | GTFS-RT + LD fleet API |
| `/trenes/linea/[slug]` | 1.248 | 30min | GTFS shapes |
| `/aviacion/aeropuertos/[iata]` | 46 ES + 18 PT | 15min | OpenSky + AENA |
| `/maritimo/puertos/[slug]` | 197 ES + 50 PT | 30min | AIS stream + Puertos del Estado |
| `/maritimo/ferries/[slug]` | 50 + 100 `/ferry/[origen]-[destino]` | 30min | GTFS ferry + scraping horarios |
| `/gasolineras/[id]` | 12.294 ES + 3.000 PT | 6h | MINETUR + DGEG |
| `/gasolineras/[ciudad]` | 2.000 top | 6h | agregados |
| `/combustiveis/[distrito]` PT | 18 | 6h | DGEG |
| `/carreteras/[roadId]` | 1.000 carreteras nacionales | 30min | DGT incidencias + IMD |
| `/radares/[id]` | 1.800 | diario | DGT |
| `/camaras/[id]` | 1.200 | 15min (imagen) | DGT stream |
| `/paneles/[id]` | 700 | 5min (mensaje) | DGT |
| `/estaciones-aforo/[id]` | 14.400 | diario | Ministerio |
| `/municipio/[slug]` | 8.131 ES | 1h | + 308 PT |
| `/provincias/[code]` | 52 | 1h | |
| `/comunidad-autonoma/[slug]` | 19 | 1h | |
| `/ciudad/[slug]` (mega-hub) | 300 top | 30min | cross-vertical |
| `/transporte-publico/[operador]/[parada]` | ~8.000 | 6h | GTFS |
| `/alquiler-coche/[aeropuerto]` | 64 | 1d | + affiliate API |
| `/parking/[aeropuerto]` | 64 | 1d | Parclick affiliate |

**Total programático: ~65.000 URLs indexables** (vs. ~15K actual).

### 2.2 Pipeline editorial diario — 20-30 artículos/día

Artículos derivados de datos en tiempo real. **Cada uno es noticia de por sí** → elegible para `news-sitemap.xml` y Google Discover/News.

Calendario fijo por hora del día:

| Hora | Trigger | Artículo generado | Plantilla |
|---|---|---|---|
| 06:00 | AEMET/IPMA batch | "El tiempo hoy: previsión España / Portugal" | meteo-daily.md |
| 07:00 | DGT ops + aforo | "Estado del tráfico hoy: [operaciones destacadas]" | trafico-daily.md |
| 08:00 | Air quality snap | "Calidad del aire hoy: [peor/mejor ciudad]" | aire-daily.md |
| 09:00 | Fuel movement | "Gasolinera más barata hoy por provincia" | combustible-daily.md |
| 10:00 | DGT incidents | cada nueva operación especial → artículo dedicado | op-especial.md |
| 12:00 | Mid-morning | "Top 10 ciudades con más atasco ahora" | atasco-live.md |
| 14:00 | Marine + ferry | "Estado mar hoy: rutas ferry / oleaje" | mar-daily.md |
| 18:00 | Evening commute | "Vuelta a casa: estado de las carreteras" | commute.md |
| 20:00 | Tomorrow forecast | "Qué tiempo hará mañana en [top 10 ciudades]" | manana.md |
| Lunes | Semanal | "Resumen semana: qué pasó en las carreteras" | weekly.md |
| Viernes | Fin semana | "Previsión fin semana: tráfico + tiempo + eventos" | finde.md |
| Event-driven | Alerta AEMET roja | "Alerta [rojo/naranja] en [zona]: recomendaciones" | alerta.md |
| Event-driven | DGT operación | "Operación [puente]: predicción + consejos" | operacion.md |
| Event-driven | Incidente maritimo | "SASEMAR interviene en [zona]" | sasemar.md |

**Arquitectura técnica:**
- `services/content/` — nuevo servicio colector
- Templates Markdown con slots (`{{city}}`, `{{temp}}`, `{{forecast}}`)
- Cron en `docker-compose.collectors.yml` ejecuta cada trigger
- Output → Prisma `Article` table → páginas `/noticias/[slug]`
- News-sitemap automático con artículos últimas 48h

### 2.3 Pipeline editorial humano — 5-10 pillar articles/semana

Contenido evergreen de alto valor SEO, escrito manualmente (o con asistencia LLM humanamente revisada):

- **Guías** (semanales): "Cómo llegar a Atocha", "ZBE Madrid 2026: guía completa", "Baliza V-16 2026: todo lo que necesitas saber"
- **Comparativas**: "Ferry Barcelona-Mallorca: Baleària vs Trasmed vs GNV"
- **Estacionales**: "Puente de mayo 2026: operación salida", "Semana Santa trenes", "Verano carreteras"
- **Data journalism**: "Las 10 gasolineras más baratas de España", "Ranking provincias por calidad del aire"
- **Normativa**: "Límites velocidad 2026", "Cambios carnet conducir", "Etiqueta ambiental"

---

## 3) Architecture cluster — pillar → cluster → entity

Siguiendo topic cluster model de HubSpot/Backlinko:

```
Hub pillar           — /meteo
├── Subpillars       — /meteo/espana, /meteo/pt
├── Guides           — /meteo/guia-alertas-aemet, /meteo/radar-lluvia
├── Entity landings  — /meteo/madrid, /meteo/barcelona, ... × 2.052
├── Daily news       — /noticias/2026-04-19-tiempo-hoy
├── Data articles    — /meteo/analisis/ola-calor-2026
└── Cross-links      — /ciudad/madrid (cross-vertical hub)
```

Cada pillar aplica el mismo patrón:

| Pillar | Subpillars | Entities | Daily content | Guides |
|---|---|---|---|---|
| `/meteo` | `/meteo/[slug]`, `/meteo/pt/[slug]`, `/meteo/estaciones` | 2.378 | 2/día | 20 |
| `/trenes` | `/trenes/estacion/[slug]`, `/trenes/linea/[slug]`, `/trenes/cercanias` | 3.412 | 2/día | 15 |
| `/carreteras` | `/carreteras/[roadId]`, `/atascos`, `/puntos-negros` | 1.000+ | 4/día | 20 |
| `/aviacion` | `/aviacion/aeropuertos/[iata]`, `/vuelos` | 64 | 1/día | 10 |
| `/maritimo` | `/maritimo/puertos/[slug]`, `/ferries`, `/buques` | 297 | 1/día | 12 |
| `/gasolineras` | `/[id]`, `/[ciudad]`, `/baratas`, `/mapa` | 15.294 | 2/día | 15 |
| `/calidad-aire` | `/estacion/[id]`, `/[ciudad]`, `/provincia/[slug]` | 700 | 1/día | 8 |
| `/transporte-publico` | `/[operador]`, `/[operador]/[parada]` | 8.000 | 1/día | 10 |
| `/ciudad` | `/[slug]` mega-hubs | 300 top | — (agrega todo) | 20 |
| `/provincias` | `/[code]` | 52 | — | 5 |
| `/legal` | `/baliza-v-16`, `/zbe-*`, `/carnet-*`, `/etiqueta-ambiental` | ~50 guías | — | 50 |

---

## 4) Ventaja competitiva por vertical

Para cada SERP, identifico debilidad del competidor top y nuestra contraatacada:

### 4.1 Meteo (aemet.es, eltiempo.es)

**Debilidades competidor:**
- aemet.es: UX institucional, slow FCP, no interactividad, forecasting limitado a 7 días
- eltiempo.es: invasivo de ads, contenido thin, CLS alto, pobres datos marinos

**Nuestro ataque:**
- **Radar lluvia live** con Protomaps (nadie lo hace en ES con UX nativa)
- **Forecast 15 días** (AEMET ofrece solo 7, competencia también)
- **Cross-vertical**: "tiempo + tráfico + calidad aire" en un panel — único
- **Mapa isotermas** interactivo
- **Alertas push** (en app future)
- **Pronóstico marino** para ferry/pesca users

**Keywords KD bajo donde ganamos en 3 meses:** el tiempo en Huelva (KD 25), el tiempo en Vigo (KD 24), tiempo a Coruña (KD 25), el tiempo en Zaragoza (KD 30), meteorologia braga (KD 18), meteorologia guimarães (KD 6).

### 4.2 Calidad del aire (iqair.com)

iqair es US, inglés primero, datos globales no nativos AEMET.

**Nuestro ataque:**
- Data nativa MITECO ICA + CCAA (Madrid, Cataluña, Euskadi, Andalucía) ya importada
- ICA 1-6 escala oficial ES
- **Health recommendations** por colectivo (asmáticos, embarazadas, deportistas)
- **Cross-con meteo** ("¿puedo hacer deporte hoy en X?")
- Schema `EnvironmentalObservation` custom

**Ganancia estimada:** 85% win probability vs iqair en 6 meses.

### 4.3 Ferroviario (renfe.com, adif.es)

**Debilidades competidor:**
- renfe.com: UX bookingtool, slow, no data agregada
- adif.es: oficial estaciones, contenido thin, sin boards live

**Nuestro ataque:**
- **Live departure/arrival boards** con SWR polling 30s (nadie lo hace a escala en ES)
- **Mapa vivo AVE/LD** (115 trenes GPS) — tenemos la API undocumented
- **Puntualidad por marca** con histórico (único)
- **Guías "cómo llegar a [estación]"** desde qualquier ciudad
- **Affiliate**: parking + hotel + taxi

**Keywords ganables:** madrid-puerta de atocha-almudena grandes (KD 0, 450K), estación Valencia Joaquín Sorolla (KD 0, 90K), estación madrid-chamartín-clara campoamor (KD 1, 60K).

### 4.4 Aviación (aena.es, flightradar24.com)

**Debilidades competidor:**
- aena.es: portal corporativo, boards lentos, sin radar-style
- flightradar24.com: freemium, inglés primero, paywall en features

**Nuestro ataque:**
- **Radar aviones España** gratis, ES/PT primero
- **Live aeropuerto**: partidas + llegadas + parking + meteo en una vista
- **Pistas 3D** (ya tenemos runways.json)
- **Affiliate parking** (Parclick) + **rental** (DiscoverCars/Rentalcars)

**Keywords KD bajo:** aeropuerto palma de mallorca (KD 9, 201K), aeropuerto de bilbao (KD 10), aeropuerto málaga-costa del sol (KD 13).

### 4.5 Tráfico & carreteras (dgt.es, infocar.dgt.es, madrid.es)

**Debilidades competidor:**
- dgt.es: bloatware gubernamental, mobile malo, refresh lento
- infocar.dgt.es: texto-only, imágenes estáticas
- madrid.es: solo Madrid, silo municipal

**Nuestro ataque:**
- **Mapa nacional unificado** todas las CCAA en un solo mapa
- **IMD histórica + real-time** en una landing (único)
- **Predictive traffic** ("¿habrá atasco a las 18?")
- **Cámaras DGT galería** con refresh automático
- **ZBE live status** cross-ciudades

### 4.6 Combustible (dieselogasolina.com ES, maisgasolina.com PT)

**Debilidades competidor:**
- dieselogasolina.com: UX 2010, mapa pobre, sin histórico
- maisgasolina.com: idem PT
- clickgasoil.com: algo mejor pero sin PT

**Nuestro ataque:**
- **Chart precio histórico** desde 2016 (CNMC ya importado)
- **Predictivo "¿sube o baja mañana?"**
- **Ranking provincial/nacional** live
- **Mapa con filtros** avanzados (marca, servicios, precio)
- **Affiliate Waylet/Galp** + tarjetas descuento

**PT es monopolio actual** — victoria estimada 85% en 6 meses.

### 4.7 Marítimo (directferries.es, balearia.com)

**OTAs dominan ferry**. Pivot: **comparador afiliado**.

**Nuestro ataque (no orgánico — afiliado):**
- Comparador `/ferry/[origen]-[destino]` Baleària + Trasmed + GNV + Fred Olsen
- Precio LIVE scraped + affiliate deeplink
- Horario, duración, servicios a bordo
- Cross-ferry: meteo marina + viento + oleaje en la ruta

**Orgánico ganable en sub-intents:**
- "tráfico marítimo [puerto]" — we have AIS
- "puerto de [X]" — schema Port + live vessels
- "seguimiento buque [MMSI]" — we have data

---

## 5) Arquitectura URL definitiva

```
/                                      — home, mega search + cross-vertical widget
/ciudad/[slug]                         — 300 mega-hubs ciudad (cross-vertical)
/provincias/[code]                     — 52
/comunidad-autonoma/[slug]             — 19
/municipio/[slug]                      — 8.131 ES + 308 PT

# METEO (vertical #1)
/meteo                                 — hub
/meteo/[slug]                          — ES ciudades/municipios
/meteo/pt/[slug]                       — PT
/meteo/provincia/[slug]                — rollup provincial
/meteo/alertas                         — AEMET/IPMA alertas activas
/meteo/radar                           — radar lluvia interactivo
/meteo/marino                          — pronóstico marino
/meteo/estacion/[slug]                 — estación meteo individual
/alerta-meteo/[slug]                   — por cada alerta activa (noticia)
/aemet/[ciudad]                        — alias redirect

# CALIDAD AIRE
/calidad-aire                          — hub
/calidad-aire/[ciudad]                 — 500 ciudades ES
/calidad-aire/pt/[cidade]              — PT
/calidad-aire/provincia/[slug]
/calidad-aire/estacion/[id]
/ica/[ciudad]                          — alias

# TRÁFICO
/trafico                               — hub (diario actualizado)
/carreteras                            — hub
/carreteras/[roadId]                   — 1.000 carreteras principales
/atascos                               — live + top ciudades
/atascos/[ciudad]                      — per-ciudad
/incidencias                           — activas DGT
/cortes-trafico                        — cortes + obras
/operaciones                           — ops especiales activas
/operaciones/[slug]                    — "puente mayo 2026"
/puntos-negros                         — hub + mapa
/puntos-negros/[slug]
/zbe                                   — hub
/zbe/[ciudad]                          — ZBE Madrid, BCN, etc.
/radares                               — hub
/radares/[id]                          — individual
/camaras                               — galería
/camaras/[id]
/paneles                               — hub
/paneles/[id]
/estaciones-aforo                      — hub
/estaciones-aforo/[id]                 — 14.400
/intensidad                            — tiempo real Madrid sensores
/peajes                                — hub
/peajes/[autopista]

# TRENES
/trenes                                — hub + mapa live
/trenes/estacion/[slug]                — ES 2.154
/trenes/pt/estacao/[slug]              — PT 200+ (NUEVO)
/trenes/linea/[slug]                   — 1.248
/trenes/cercanias                      — 12 redes
/trenes/cercanias/[network]
/trenes/ave                            — AVE hub
/trenes/live                           — fleet live
/trenes/alertas
/renfe/[ciudad]                        — alias agregador
/cp/[cidade]                           — PT alias

# AVIACIÓN
/aviacion                              — hub + radar
/aviacion/aeropuertos/[iata]           — ES 46 + PT 18
/vuelos                                — live board nacional
/vuelos/[origen]-[destino]             — ruta afiliada (NUEVO)
/radar-aviones                         — radar live

# MARÍTIMO
/maritimo                              — hub
/maritimo/puertos/[slug]               — 197 + 50 PT
/maritimo/ferries/[slug]               — rutas existentes
/ferry/[origen]-[destino]              — comparador afiliado (NUEVO)
/buques                                — live AIS
/buques/[mmsi]                         — seguimiento vessel (NUEVO)

# COMBUSTIBLE
/gasolineras                           — hub
/gasolineras/[id]                      — 12.294 ES + 3.000 PT
/gasolineras/[ciudad]                  — agregado (NUEVO)
/gasolinera-mas-barata/[municipio]     — alias transaccional (NUEVO)
/gasolineras/baratas
/precio-gasolina-hoy
/precio-diesel-hoy
/combustiveis                          — hub PT (NUEVO)
/combustiveis/[distrito]
/combustiveis/[id]                     — postos PT
/carga-ev                              — hub EV
/electrolineras                        — mapa
/electrolineras/[id]

# TRANSPORTE PÚBLICO
/transporte-publico                    — hub
/transporte-publico/[operador]         — per-operador
/transporte-publico/[operador]/[parada]
/metro-madrid, /metro-barcelona, /metro-bilbao, ...
/metro-lisboa, /metro-porto            — PT

# LEGAL / NORMATIVA
/baliza-v-16                           — guía (246K/mes)
/etiqueta-ambiental                    — 150K/mes
/zona-bajas-emisiones                  — guía ZBE
/carnet-conducir                       — hub
/carnet-conducir/puntos
/carnet-conducir/renovar
/multa-consultar
/limites-velocidad

# AFILIADOS
/afiliados                             — landing principal
/parking/[aeropuerto]                  — Parclick
/alquiler-coche/[aeropuerto]           — DiscoverCars/Rentalcars
/alquiler-coche/[ciudad]
/seguro-coche                          — comparador
/seguro-moto
/vuelos-baratos                        — Skyscanner/Kiwi
/billetes-tren                         — Omio/Trainline
/ferry-reservas                        — DirectFerries

# NEWS / BLOG / GUIDES
/noticias                              — hub
/noticias/[slug]                       — artículos diarios
/guias                                 — hub evergreen
/guias/[slug]                          — pillar pieces
/divulgacion                           — cornerstone SEO pieces
/prediccion                            — predicciones (tráfico, tiempo, combustible)

# HERRAMIENTAS
/ruta                                  — planner con peajes + combustible
/calculadora                           — calcs (coste viaje, combustible, carga EV)
/cuanto-cuesta-cargar
/codigo-postal/[cp]                    — lookup
```

---

## 6) Header & mega menu — 7 paneles por SEO data

Reordeno la propuesta anterior con volumen real:

```
[Logo] [Geo-picker: España/Madrid] | Meteo · Tráfico · Trenes · Aviación · Marítimo · Combustible · Profesional | [⌘K search] [login]
```

Sólo 7 paneles visibles. Cada uno con mega-menu unificado (4 columnas). Calidad aire, legal, transporte público y ciudad hubs se integran cross-vertical, no paneles propios.

**Mega-menu template** (4 columnas):

```
HERO                    │ EN DIRECTO            │ EXPLORAR              │ DATOS & GUÍAS
                        │                       │                       │
[CTA al hub]            │ • Mapa tiempo real    │ • Entidades top       │ • Rankings
[Métrica viva]          │ • Alertas activas     │ • Ciudades por CCAA   │ • Histórico
[Screenshot]            │ • Feed incidencias    │ • Búsqueda avanzada   │ • Guías
                        │ • Widget snippet      │ • Mapa general        │ • Artículos
                        │                       │                       │
PILLS: 8-10 chips con entidades top por volumen SEO (data-driven)
```

**Pills por panel** (extraídas de top-100 winnable):

| Panel | Pills sugeridas (click → landing de alto vol) |
|---|---|
| Meteo | Huelva ⭐ · Vigo ⭐ · Valladolid ⭐ · Bilbao · Zaragoza · Sevilla · Lisboa · Porto · Radar lluvia · Alertas |
| Tráfico | Madrid · Barcelona · AP-7 · A-6 · Baliza V-16 · ZBE Madrid · Cámaras · Radares · Peajes |
| Trenes | Atocha · Sants · Santa Justa · Chamartín · Valencia JS · Cercanías MAD · Cercanías BCN · Santa Apolónia · Oriente LX |
| Aviación | Barajas · El Prat · Palma ⭐ · Bilbao ⭐ · Málaga ⭐ · Porto · Lisboa · Radar aviones · Mis vuelos |
| Marítimo | Ferry Mallorca · Ferry Ibiza · Ferry Ceuta · Ferry Canarias · Puerto Algeciras · Puerto Valencia · AIS live · Radar buques |
| Combustible | Precio gasolina · Precio diésel · Mapa gasolineras · PT combustíveis · EV chargers · Más barata cerca |
| Profesional | API & Planes · Flotas · Consultoría · Afiliados · Casos de uso · Status |

⭐ = sweet spot KD bajo.

---

## 7) Footer — 6 columnas dense

```
┌──────────────┬─────────────────┬────────────────┬──────────────┬───────────────┬──────────────┐
│    MODOS     │   POR CIUDAD    │    LEGAL &     │ PROFESIONAL  │    EMPRESA    │    SOCIAL    │
│              │  (ES top 12)    │  NORMATIVA     │              │               │              │
│              │                 │                │              │               │              │
│  Meteo       │  Madrid         │  Baliza V-16   │  API         │  Nosotros     │  [X/Twitter] │
│  Trenes      │  Barcelona      │  Etiq.ambient  │  Flotas      │  Prensa       │  [LinkedIn]  │
│  Aviación    │  Valencia       │  ZBE Madrid    │  Consultoría │  Status       │  [YouTube]   │
│  Marítimo    │  Sevilla        │  ZBE Barcelona │  Afiliados★  │  Blog/Guías   │  [GitHub]    │
│  Tráfico     │  Bilbao         │  Carnet puntos │  Casos uso   │  Contacto     │  [RSS]       │
│  Combustible │  Málaga         │  Aviso legal   │  Desarrollo  │  Jobs         │  Newsletter  │
│  Calidad aire│  Zaragoza       │  Privacidad    │              │               │              │
│  Meteo PT    │  Palma          │  Cookies       │              │               │              │
│  Combust. PT │  Valladolid     │  Divulgación★  │              │               │              │
│  Metro PT    │  Vigo           │                │              │               │              │
│              │  Lisboa         │                │              │               │              │
│              │  Porto          │                │              │               │              │
│              │  + todas        │                │              │               │              │
└──────────────┴─────────────────┴────────────────┴──────────────┴───────────────┴──────────────┘

Bottom strip: [© Certus SPV 2026] [Hecho por abemon] [ES | PT | EN] [🌙/☀️] [mapa del sitio]
```

**Cambios clave:**
- 12 ciudades linkeadas directamente (interlinking fuerte a landings de alto volumen)
- **Legal & Normativa** como columna propia: keywords como "baliza V-16" (246K), "etiqueta ambiental" (150K), "ZBE" (100K) son **gruesas de búsqueda** y debemos capturar
- Afiliados visible (confianza + revenue)
- Newsletter signup (email list para Discover/push)

---

## 8) Internal linking — reglas férreas

### 8.1 Regla de las 7 conexiones

Cada landing debe linkear a **mínimo 7 páginas** del mismo cluster + cross-vertical:

1. Hub del vertical
2. Entidad relacionada del mismo vertical (ej: "meteo en Barcelona" link a "meteo en Madrid")
3. Sub-entidad geográfica (ciudad → provincia → CCAA)
4. Entidad del mismo punto geográfico en otro vertical (meteo Madrid → tráfico Madrid)
5. Guía cornerstone asociada (ej: "Guía alertas AEMET")
6. Noticia reciente relacionada
7. CTA afiliado contextual

### 8.2 Breadcrumb estándar

Plantilla:
```
España > [CCAA] > [Provincia] > [Ciudad] > [Vertical] > [Entity]
```

Ej. `/meteo/madrid`:
```
España > Comunidad de Madrid > Madrid > Madrid > Meteo
```

Con BreadcrumbList schema en cada página.

### 8.3 Ciudad como hub centrífugo

`/ciudad/madrid` es el pegamento. Debe contener enlaces a:
- `/meteo/madrid`
- `/calidad-aire/madrid`
- `/atascos/madrid`
- `/gasolineras/madrid`
- `/trenes/estacion/madrid-puerta-atocha`
- `/aviacion/aeropuertos/MAD`
- `/zbe/madrid`
- `/metro-madrid`
- noticias recientes sobre Madrid

---

## 9) Sitemap reorganizado — 25 sub-sitemaps

Hoy tenemos `api/sitemap` dinámico. Lo segmento por tipo para:
- Ping independiente a GSC por tipo
- Debugging más fácil
- Rate-limit-friendly

Ver `09-estrategia-integral.md` §2.2 para la lista completa.

Añadir con URL priority ponderada:
- Hubs: 1.0
- Entity landings top-100 (Madrid, Barcelona): 0.9
- Entity landings tier-2 (provincias): 0.8
- Entity landings masivas (14K aforos): 0.5
- News < 48h: 0.7
- Legal/utils: 0.4

---

## 10) Schema.org — stack obligatorio por tipo

Ya detallado en `09-estrategia-integral.md` §6. Reforzar:

- **FAQ schema en 100% de landings** (no 70%). Google PAA aparece en 70% SERPs.
- **DataFeed schema** en data pages para AI Overview (19% SERPs). Ejemplo:
  ```json
  {
    "@type": "DataFeed",
    "name": "Precio gasolina Madrid",
    "dataFeedElement": [{"@type": "DataFeedItem", "item": {...}}]
  }
  ```
- **Speakable schema** en artículos diarios — Google Assistant / Alexa reading.
- **LocalBusiness** en `/gasolineras/[id]`, no solo `Place`.

---

## 11) Afiliados — 10 programas activables

Añadido a los 7 anteriores:

| # | Programa | Vertical ancla | Estado | Vol anual captable | Comisión esperada |
|---|---|---|---|---|---|
| 1 | Parclick (parking aeropuerto) | Aeropuertos | Activar API | ~500K búsquedas | 8-15% comisión |
| 2 | DiscoverCars (alquiler) | Aeropuertos + ciudades | Activar API | ~600K | 4-10% |
| 3 | Rentalcars (Booking) | Aeropuertos | Activar | ~200K | 5% |
| 4 | DirectFerries (ferry) | Marítimo | Activar | ~500K | 3-8% |
| 5 | Omio (multimodal) | Trenes + ferry + bus | Activar API | ~100K | 3-6% |
| 6 | Rastreator (seguro) | Legal / afiliados | Activar | ~60K | 20-40€/lead |
| 7 | Acierto (seguro) | Legal | Activar | | |
| 8 | Waylet / Repsol (app fuel) | Combustible | Deeplink | ~1M | CPI $1-2 |
| 9 | Solred / Cepsa | Combustible | Deeplink | | |
| 10 | Iberdrola EV / Wallbox | Combustible/EV | API | ~80K | 5-20€/lead |
| 11 | Booking (hotel cerca estación/aeropuerto) | Cross-vertical | Activar | ~500K | 25% comisión |
| 12 | Skyscanner / Kiwi (vuelos) | Aviación | Activar | ~400K | 2-5% |

**Widget reusable:**
`src/components/affiliate/AffiliateCTA.tsx` — componente único, toma `{program, context: {city, entity_id, intent}}` y renderiza CTA apropiado.

---

## 12) KPIs de dominación — 180 días

| Métrica | Baseline | T+30d | T+90d | T+180d |
|---|---|---|---|---|
| Keywords top 10 GSC | 0 | 500 | 5.000 | 20.000 |
| Keywords top 3 | 0 | 50 | 500 | 3.000 |
| Impresiones/mes | 0 | 200K | 2M | 10M |
| Clicks orgánicos/mes | 0 | 6K | 80K | 500K |
| CTR medio | — | 3% | 4% | 5% |
| Páginas indexadas | 4K | 20K | 50K | 65K |
| Artículos editoriales publicados | ~50 | +500 | +3.000 | +9.000 |
| Revenue afiliado/mes | €0 | €200 | €3.000 | €15.000 |
| Revenue API/SaaS (paralelo) | €0 | €0 | €500 | €3.000 |
| **Revenue total/mes** | €0 | €200 | €3.500 | €18.000 |

---

## 13) Pipeline técnico — qué construir

### 13.1 Servicios nuevos

```
services/content/                    — motor editorial (Node + OpenAI + plantillas)
├── templates/                       — Markdown templates por tipo
├── triggers/                        — cron jobs + event listeners
├── lib/
│   ├── article-generator.ts        — LLM + data → Markdown
│   ├── news-feed.ts                — feed Prisma.Article
│   └── publish.ts                  — a Prisma + revalidate
└── tasks/
    ├── meteo-daily.ts
    ├── trafico-daily.ts
    ├── aire-daily.ts
    ├── fuel-daily.ts
    ├── alerta-trigger.ts           — escucha AEMET/DGT alertas
    └── weekly-digest.ts

services/collector/                   — seguir, añadir:
└── tasks/
    ├── affiliate-pricing.ts         — scraping ferry prices
    └── sgc-sitemap-ping.ts          — ping sitemaps a GSC

src/components/
├── affiliate/AffiliateCTA.tsx
├── meteo/CityWeather.tsx            — widget modular
├── trenes/StationBoard.tsx
├── aviacion/AirportBoard.tsx
├── fuel/PriceTrend.tsx
├── seo/SchemaFactory.tsx            — wrapper JSON-LD
├── seo/FAQBlock.tsx                 — generador FAQ schema
└── seo/Breadcrumb.tsx               — BreadcrumbList schema

src/lib/
├── seo/schema-builders.ts           — helpers por tipo (TrainStation, Airport, ...)
├── seo/faq-generator.ts             — FAQ from entity type
├── seo/canonical.ts                 — fix P0
└── content/
    ├── templates.ts                 — template rendering
    └── llm.ts                       — article generation (Claude/GPT)

src/app/
├── meteo/[slug]/page.tsx            — NUEVO
├── meteo/pt/[slug]/page.tsx         — NUEVO
├── calidad-aire/[slug]/page.tsx     — NUEVO
├── trenes/pt/estacao/[slug]/page.tsx — NUEVO
├── combustiveis/page.tsx            — NUEVO
├── combustiveis/[slug]/page.tsx     — NUEVO
├── ferry/[route]/page.tsx           — NUEVO afiliado
├── vuelos/[route]/page.tsx          — NUEVO afiliado
├── parking/[aeropuerto]/page.tsx    — NUEVO afiliado
├── alquiler-coche/[ciudad]/page.tsx — NUEVO afiliado
├── ciudad/[slug]/page.tsx           — mega-hub (reemplaza placeholder actual)
├── radares/[id]/page.tsx            — NUEVO
├── camaras/[id]/page.tsx            — NUEVO
├── paneles/[id]/page.tsx            — NUEVO
├── estaciones-aforo/[id]/page.tsx   — NUEVO
├── buques/[mmsi]/page.tsx           — NUEVO
├── baliza-v-16/page.tsx             — guía pillar
├── etiqueta-ambiental/page.tsx      — ya existe, expandir
├── zbe/[ciudad]/page.tsx            — NUEVO
├── noticias/page.tsx                — hub
├── noticias/[slug]/page.tsx         — artículos
└── sitemap/
    ├── core.xml.ts
    ├── meteo.xml.ts
    ├── meteo-pt.xml.ts
    ├── ... (25 sub-sitemaps)
    └── index.xml.ts
```

### 13.2 Cron jobs nuevos

Añadir a `docker-compose.collectors.yml`:

```yaml
content-daily:
  image: ...
  command: ["meteo-daily", "trafico-daily", "aire-daily", "fuel-daily"]
  cron: "0 6-22/2 * * *"  # cada 2h entre 06-22

content-event:
  command: ["alerta-trigger", "incident-trigger"]
  cron: "*/5 * * * *"

content-weekly:
  command: ["weekly-digest", "weekend-preview"]
  cron: "0 18 * * 0,5"
```

### 13.3 LLM budget para contenido

Si usamos Claude Haiku 4.5 para generación:
- ~2.000 tokens por artículo
- $0.80/M input + $4.00/M output (aprox)
- 50 artículos/día × 2K tokens × 365 días = 36M tokens ~= **$100-150/año**
- Gasto negligible vs. retorno

---

## 14) Sprint plan 12 semanas — dominar

### Sprint 1 (sem 1) — INDEXACIÓN OBLIGATORIA
- [ ] Canonical fix en layouts
- [ ] 25 sub-sitemaps con todas las entidades
- [ ] og:image en todas las páginas
- [ ] Schema base (BreadcrumbList, Place, Organization)
- [ ] GSC verification + sitemap ping

### Sprint 2 (sem 2) — Meteo ES foundation
- [ ] `/meteo/[slug]` template SSG
- [ ] 52 provincias + top 500 municipios generados
- [ ] Schema WeatherForecast + FAQ
- [ ] Cross-links meteo ↔ tráfico ↔ aire

### Sprint 3 (sem 3) — Meteo PT + calidad aire
- [ ] `/meteo/pt/[slug]` × 326
- [ ] `/calidad-aire/[ciudad]` × 500
- [ ] Alerts dedicated pages
- [ ] Radar lluvia interactivo

### Sprint 4 (sem 4) — Ferroviario boards
- [ ] StationBoard component
- [ ] Top 20 ES + 50 PT estaciones mejoradas
- [ ] `/renfe/[ciudad]`, `/cp/[cidade]` aliases
- [ ] Schema TrainStation

### Sprint 5 (sem 5) — Aeropuertos + combustible ES
- [ ] Airport boards live
- [ ] `/gasolineras/[ciudad]` × 2.000
- [ ] `/gasolinera-mas-barata/[municipio]` × 8.131
- [ ] Schema GasStation + Airport

### Sprint 6 (sem 6) — Combustible PT + transporte público
- [ ] `/combustiveis/` hub completo
- [ ] Metro PT per-estación
- [ ] Schema por operador transit

### Sprint 7 (sem 7) — Ciudad mega-hubs
- [ ] `/ciudad/[slug]` × 300 mega-hubs cross-vertical
- [ ] Top 20 mobile-first
- [ ] Schema Place con sub-entities

### Sprint 8 (sem 8) — Mapa interactivo (roadmap mapa)
- [ ] useMapInteraction + FeatureOverlay
- [ ] 12 adapters por entidad
- [ ] Capas administrativas clickables
- [ ] GA4 tracking

### Sprint 9 (sem 9) — Contenido editorial motor
- [ ] `services/content/` arrancar
- [ ] 10 primeras plantillas (meteo-daily, trafico-daily, ...)
- [ ] Article table + `/noticias/[slug]`
- [ ] News-sitemap + Discover-friendly

### Sprint 10 (sem 10) — Afiliados live
- [ ] `AffiliateCTA` componente
- [ ] 5 programas integrados (Parclick, DiscoverCars, DirectFerries, Rastreator, Waylet)
- [ ] `/ferry/[route]` comparador
- [ ] `/parking/[aeropuerto]` + `/alquiler-coche/[x]`

### Sprint 11 (sem 11) — Legal pillars + radares/cámaras
- [ ] Baliza V-16 guide completa (246K/mes)
- [ ] ZBE per ciudad
- [ ] Etiqueta ambiental expand
- [ ] `/radares/[id]`, `/camaras/[id]`, `/paneles/[id]`, `/estaciones-aforo/[id]` × templates

### Sprint 12 (sem 12) — Polish + performance + PR launch
- [ ] Lighthouse 95+ en todas las rutas
- [ ] CWV green
- [ ] Blog relaciones públicas: "Lanzamos plataforma multimodal"
- [ ] Outreach a periodistas tráfico/meteo
- [ ] Primeras métricas GSC publicadas

---

## 15) Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Google AI Overview canibaliza tráfico | Alta | Alto | Schema DataFeed + Speakable, contenido cross-vertical único, AMP/fast pages |
| Competencia replica nuestra UX | Media | Medio | Moat: datos tiempo real + contenido diario + marca |
| Coste colectores se dispara (scraping ferry) | Media | Bajo | Cache agresiva, fallback datos estáticos |
| Googlebot no indexa las 65K URLs | Alta si no lanzamos Fase 0 | Crítico | Fase 0 obligatoria + sitemap ping + internal linking denso |
| Rate limits APIs externas (AEMET, CNMC) | Media | Medio | Queue + retry + fallback (ya hay) |
| Content "thin" por automatización | Media | Alto | Humano revisa semanal, LLM sólo enriquece datos nunca inventa |
| Penalización Google por scale | Baja | Crítico | Content calidad > cantidad, schema preciso, sin cloaking |

---

## 16) Presupuesto ejecutivo

| Concepto | €/mes | €/año |
|---|---|---|
| Infra Hetzner (ya pagada) | 0 (incl. en stack actual) | 0 |
| LLM (Claude Haiku para content) | 10-15 | 120-180 |
| DataForSEO (research continuo) | 20-40 | 240-480 |
| GA4 + Search Console | 0 | 0 |
| Scraping proxies (ferry/fuel) | 20-30 | 240-360 |
| Dev time (interno) | - | - |
| **Total infra marginal** | **50-85** | **600-1.020** |

**Payback esperado:** Si T+180d revenue €18K/mes → payback <1 mes operativo.

---

## 17) Priorización programática — 20.472 URLs trivialmente ganables

Con **20.472 keywords KD≤20 y vol≥100** en mano, el trabajo es **atacarlas programáticamente**. Cada keyword requiere 1 landing (o cluster de cobertura múltiple). Agrupando por patrón:

### Clusters programáticos (trivial — SSG desde DB)

| Cluster | Patrón keyword | Nº kw | URLs necesarias | Tiempo build |
|---|---|---|---|---|
| Meteo ciudad ES | `el tiempo en X`, `tiempo X`, `aemet X` (×5 variantes) | ~600 | 200 landings /meteo/[slug] | Sprint 2 |
| Meteo ciudad PT | `tempo X`, `meteorologia X`, `ipma X` | ~500 | 200 landings /meteo/pt/[slug] | Sprint 3 |
| Estación tren ES | `atocha`, `sants`, `estación X ciudad` | ~800 | 300 landings mejoradas | Sprint 4 |
| Aeropuerto ES/PT | `aeropuerto X ciudad` (incl. alias regional) | ~200 | 64 landings | Sprint 5 |
| Gasolinera + ciudad | `estación de servicio X`, `gasolinera más barata Y` | ~1.500 | 2.000 landings /gasolineras/[ciudad] + /gasolinera-mas-barata/[municipio] | Sprint 5 |
| Puerto ES/PT | `puerto X`, `porto Y`, `puerto banús`, `puerto venecia` | ~400 | 250 landings | Sprint 7 |
| Metro línea + ciudad | `linea X metro Y`, `metro X horarios`, `plano metro Y` | ~600 | 150 landings | Sprint 6 |
| Estación autobuses | `estación autobuses X` | ~300 | 100 landings | Sprint 6 |
| Calidad aire ciudad | `calidad aire X`, `qualidade ar Y` | ~400 | 500 landings /calidad-aire/[ciudad] | Sprint 3 |
| Radares + carretera | `radar X km`, `cámaras DGT Y` | ~500 | 1.800 /radares/[id] + 1.200 /camaras/[id] | Sprint 11 |
| Peajes / ZBE | `peaje X`, `ZBE Y`, `zona bajas emisiones Y` | ~300 | 30 landings | Sprint 11 |
| Normativa / legal | `baliza V-16`, `etiqueta ambiental`, `carnet puntos` | ~100 | 50 guías | Sprint 11 |
| Ferry route | `ferry origen destino`, `ferry barato a X` | ~800 | 100 landings afiliadas | Sprint 10 |
| Airlines route | `vuelos X Y baratos` | ~500 | 200 landings afiliadas | Sprint 10 |
| Parking aeropuerto | `parking aeropuerto X barato` | ~400 | 64 landings afiliadas | Sprint 10 |
| Alquiler coche | `alquiler coche X`, `aluguer carro Y` | ~600 | 200 landings afiliadas | Sprint 10 |
| Micro-local transit | `STCP horarios`, `carris bus X` | ~1.000 | 8.000 landings /transporte-publico/[operador]/[parada] | Sprint 6 |
| Intensidad ciudad | `atascos X hoy`, `tráfico X tiempo real` | ~300 | 300 landings tráfico ciudad | Sprint 5 |
| Micro-meteo concelhos PT | `meteorologia [concelho]` × 150 concelhos cola larga | ~2.500 | 308 concelhos | Sprint 3 |
| Micro-meteo municipios ES | `tiempo [municipio]` × 8.131 municipios | ~8.000 | 2.000 top + 6.000 cola larga | Sprint 2 + 3 |

**Total URLs programáticas críticas:** ~17.500 landings (el grueso cubre 20K keywords por overlap múltiple keyword→URL).

### Top 10 quick wins más fáciles (KD 0, vol ≥100K)

1. `madrid-puerta de atocha-almudena grandes` — 450K/mes, KD 0 → `/trenes/estacion/madrid-puerta-atocha`
2. `estación de servicio cepsa` — 450K/mes, KD 0 → `/gasolineras/marcas/cepsa`
3. `estacion sur de autobuses madrid` — 201K/mes, KD 0 → `/transporte-publico/madrid/estacion-sur`
4. `plano metro madrid` — 246K/mes, KD 7 → `/metro-madrid/plano`
5. `alcampo gasolinera` — 110K/mes, KD 0 → `/gasolineras/marcas/alcampo`
6. `terminal t4 llegadas aparcamiento p 4` — 110K/mes, KD 0 → `/aviacion/aeropuertos/MAD/terminal-t4`
7. `aeropuerto Palma de Mallorca` — 201K/mes, KD 9 → `/aviacion/aeropuertos/PMI`
8. `estación Valencia Joaquín Sorolla` — 90K/mes, KD 0 → `/trenes/estacion/valencia-joaquin-sorolla`
9. `aeropuerto de bilbao` — 135K/mes, KD 10 → `/aviacion/aeropuertos/BIO`
10. `aeropuerto de málaga-costa del sol` — 135K/mes, KD 13 → `/aviacion/aeropuertos/AGP`

**Estas 10 solas = 2,2M búsquedas/mes potenciales.**

### Top 10 Portugal quick wins

1. `lisboa tempo` — 368K/mes, KD 17 → `/meteo/pt/lisboa`
2. `parque de estacionamento` — 135K/mes, KD 0 → `/estacionamento`
3. `tempo Porto` — 301K/mes, KD 16 → `/meteo/pt/porto`
4. `combustíveis próxima semana` — 135K/mes, KD 0 → `/combustiveis/previsao`
5. `meteorologia braga` — 246K/mes, KD 18 → `/meteo/pt/braga`
6. `preço combustíveis próxima semana` — 110K/mes, KD 1 → `/combustiveis/previsao-precos`
7. `meteorologia guimarães` — 110K/mes, KD 6
8. `tempo Braga` — 135K/mes, KD 15
9. `metro do porto` — 90K/mes, KD 4 → `/metro-porto`
10. `meteorologia leiria` — 90K/mes, KD 7

**PT top 10: 1,7M búsquedas/mes.**

---

## 18) Presupuesto DataForSEO restante y olas opcionales

$29,30 disponibles. Olas opcionales si queremos más profundidad:

1. **Wave 12 — Expansión por entidad** (~$5): 200 seeds más específicos por entidad top (cada estación AVE, cada aeropuerto, cada ferry route)
2. **Wave 13 — SERP top ganables faltantes** (~$3): las siguientes 500 keywords top winnable no analizadas aún
3. **Wave 14 — Domain comparative ranks** (~$5): `domain_rank_overview` para 200 dominios candidatos a ver autoridad
4. **Wave 15 — Share of Voice** (~$5): `serp/competitors` para monitorear cambios
5. **Activación backlinks subscription** ($0,01/día): perfil backlinks competidores

Mi recomendación: NO gastar más ahora. Los datos actuales cubren 100% del plan. Gastar ronda 4 cuando estemos en Sprint 6-8 para validar resultados.

---

## 19) Próxima acción recomendada

**Ya mismo:** Sprint 1 — fix canonical + sitemap P0 del VERDICT. Sin esto, todo el plan es papel. Estimación: 2-3 días de trabajo focal. Puedo atacarlo ya.

Las 17.500 URLs programáticas se pueden lanzar en oleadas de 2.000-3.000 por sprint, priorizando siempre por (volumen × relevancia / KD) usando `13-winnable-full.csv` como input al script de generación.

¿Arranco Sprint 1?
