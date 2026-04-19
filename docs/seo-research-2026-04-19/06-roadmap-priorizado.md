# Roadmap priorizado — trafico.live ES + PT

**Fecha:** 2026-04-19
**Base:** 26.144 keywords analizadas, 22.213 gap vs. 25 competidores, 52 SERPs radiografiadas, $8,86 gastados de $49,97 en DataForSEO.

---

## Descubrimiento crítico — reencuadre total

**trafico.live rankea para 0 keywords con volumen >50 en Google ES y PT.** El site es funcionalmente invisible para Google. Esto confirma los P0 de la auditoría VERDICT 2026-04-17 (canonical apuntando a `/`, sitemap omitiendo ~4K URLs).

**Consecuencia operativa:** ningún contenido nuevo genera tráfico mientras los P0 no se resuelvan. El orden importa: indexación → foundation → volumen.

---

## El volumen real — top 10 cubos de tráfico ES + PT

| # | Cubo | Vol agregado/mes | Competidor líder | Landing nuestra | Bloqueo |
|---|---|---|---|---|---|
| 1 | **Meteo ES** — "el tiempo / aemet / el tiempo en X" | **~25M** | eltiempo.es, aemet.es | `/meteo` solo hub, sin per-ciudad | No existe `/meteo/[ciudad]` |
| 2 | **Meteo PT** — "tempo / meteorologia / ipma" | **~15M** | ipma.pt | `/meteo` ídem | No existe `/meteo/[distrito]` |
| 3 | **Renfe / estaciones tren** — renfe, ave, atocha, sants, santa justa | **~8M** | renfe.com, adif.es | `/trenes/estacion/[slug]` existe | Landings thin, sin boards live |
| 4 | **Flight radar / aeropuertos** — flight radar, aeropuerto Barajas | **~4M** | flightradar24.com, aena.es | `/aviacion/aeropuertos/[iata]` existe | Contenido thin, no dominios FR24 |
| 5 | **Tráfico urbano + DGT** — atascos, incidencias, baliza V-16 | **~3M** | dgt.es, infocar.dgt.es | `/municipio/[slug]`, `/carreteras/[roadId]` | Sitemap no los incluye |
| 6 | **Combustible ES** — precio gasolina hoy, gasolinera barata | **~2M** | dieselogasolina.com, gasolineras-espana.es | `/gasolineras/[id]` existe | Sin precio/histórico en la página |
| 7 | **Metro Lisboa/Porto** — metro lisboa, oriente, cais do sodré | **~2M** | metrolisboa.pt, metrodoporto.pt | `/transporte-publico` solo hub | No hay per-estación PT |
| 8 | **Ferry** — ferry Mallorca/Ibiza/Ceuta | **~1,5M** | directferries.es (OTA) | `/maritimo/ferries/[slug]` existe | **SERP saturada por OTAs — lucha afiliada, no orgánica** |
| 9 | **Combustible PT** — combustíveis, preço gasolina | **~1M** | precoscombustiveis.pt, viaverde.pt | No hay `/gasolineras` PT | Colector DGEG existe, falta UI |
| 10 | **Calidad aire + alertas** — dana, radar lluvia, calidad aire X | **~1M** | aemet.es, eltiempo.es | `/calidad-aire/estacion/[id]` existe | Falta `/calidad-aire/[ciudad]` |

Total addressable top-10: **~62,5M búsquedas/mes** entre ES y PT.

---

## Hallazgos sobre SERP (52 keywords analizadas)

| Feature | Frecuencia | Implicación |
|---|---|---|
| `related_searches` | 51/52 | Siempre presente, baseline |
| `people_also_ask` | 36/52 | 70% de SERPs — FAQ schema es **obligatorio** en todos los templates |
| `ai_overview` | 10/52 | 19% — Google responde directo, CTR orgánico degradado. Priorizar SGE-friendly data (listas, tablas, entidades) |
| `local_pack` | 5/52 | Keywords locales — Google Business Profile necesario para puertos/estaciones |
| `knowledge_graph` | 5/52 | Necesitamos `Place`, `TrainStation`, `Airport` schema para aparecer |
| `top_stories` | 6/52 | News schema + XML news-sitemap ya existe, aprovecharlo |
| `compare_sites` | 4/52 | Afiliados — listas comparativas funcionan |

**SERP landscape de keywords top:**
- **Ferry keywords**: directferries.es, clickferry.com, omio.es, ferryhopper.com dominan. Son OTAs. **No competimos orgánicos — montamos comparador afiliado**.
- **Combustible**: dieselogasolina.com (pos 1), clickgasoil.com, geoportalgasolineras.es. **Ganable con mejor UX + data viva**.
- **Weather**: eltiempo.es, aemet.es dominan. Ambos con widgets y previsión larga. **Ganable con visual superior + histórico + agregación multimodal**.
- **Puerto / aeropuerto**: dominan wikipedia, tripadvisor, spain.info. **Ganable con data real (buques hoy / aviones hoy / operaciones)**.

---

## Fases priorizadas

### FASE 0 — DESBLOQUEO (1 semana, obligatorio)

Sin esto nada funciona. Ya documentado en VERDICT §P0.

- [ ] Fix canonical en 32 páginas (todas apuntan a `/`)
- [ ] Sitemap: añadir railway stations (2.154), railway routes (1.248), AQ stations (565), climate stations (900), accident hotspots, ports (197), airports (46)
- [ ] Verificar en GSC que empieza a indexar
- [ ] og:image en las 117 páginas que faltan

**Criterio de salida:** GSC muestra >1.000 páginas indexadas en 7 días.

---

### FASE 1 — METEO LANDGRAB (2-3 semanas, ROI máximo)

**Oportunidad:** ~25M búsquedas/mes solo en ES + 15M en PT. Tenemos colector AEMET + IPMA funcional. Falta UI.

#### Rutas a construir
- `/meteo/[slug]` — ES, 8.131 municipios. Top 20 captan 80% del volumen: Madrid, Barcelona, Valencia, Sevilla, Bilbao, Málaga, Zaragoza, Murcia, Palma, Las Palmas, Santa Cruz Tenerife, Córdoba, Valladolid, Alicante, Vigo, Gijón, A Coruña, Granada, Elche, Oviedo.
- `/meteo/pt/[slug]` — PT, ~308 concelhos. Top: Lisboa, Porto, Braga, Coimbra, Aveiro, Faro, Setúbal, Funchal, Ponta Delgada, Guimarães, Évora.
- `/aemet/[ciudad]` — redirect/alias a `/meteo/[slug]` — capturar 2,24M/mes de keyword "aemet"
- `/ipma/[cidade]` — ídem para PT

#### Contenido por landing (template único)
1. **Widget principal** — temperatura ahora + condición + icono (Lucide weather icons)
2. **Gráfico 7 días** — max/min + precipitación + viento (Recharts, datos reales AEMET/IPMA)
3. **Tabla horaria 24h** — temp, viento, humedad, probabilidad lluvia
4. **Alertas AEMET activas** — si las hay (colector `weather` ya las captura)
5. **Calidad del aire ahora** — cruzada con colector `air-quality` (volumen extra de "calidad aire madrid" etc.)
6. **Cross-links** — tráfico en Madrid, gasolineras en Madrid, aeropuerto cercano
7. **FAQ schema** — 5 preguntas ("¿va a llover mañana?", "¿temperatura media?")

#### Schema.org
- `WeatherObservation` + `WeatherForecast` (schema.org extensions)
- `Place` para la ciudad
- `BreadcrumbList`

#### Interlinking
- Hub `/meteo` pasa de info genérica a grid de 50 ciudades + buscador
- Footer añade columna Meteo en lugar de relegar a "Herramientas"
- Header eleva Meteo a panel propio si los volúmenes se confirman

**Volumen potencial desbloqueado:** 40M/mes. Incluso capturando 2% al año 1 = 800K visitas/mes.

---

### FASE 2 — RENFE / ESTACIONES (2 semanas, fit perfecto)

**Oportunidad:** ~8M/mes. Tenemos GTFS + GTFS-RT + LD real-time (115 trenes). Entity pages ya creadas (`/trenes/estacion/[slug]`).

#### Mejoras en landings existentes (no crear nuevas)
- **Departure/arrival boards** real-time en top 15 estaciones: Atocha, Chamartín, Sants, Valencia Joaquín Sorolla, Santa Justa, Zaragoza Delicias, María Zambrano, Alicante Terminal, Bilbao Abando, Córdoba Central, Pontevedra, Murcia del Carmen, Vigo Guixar, Santander estación, Cádiz. Component `<StationBoard>` con SWR polling 30s.
- **FAQ schema** "¿cómo llegar a Atocha?", "¿horarios cercanías desde Atocha?", "¿aparcar en Atocha?"
- **TrainStation schema** con `address`, `geo`, `openingHours`
- **Cross-links**: gasolineras cerca, aparcamiento aeropuerto cercano, metro cercano

#### Keywords target
- "atocha" (1M/mes) — actualmente en adif.es pos 6. Con board real-time y schema podemos ir a top 3.
- "estación santa justa sevilla" (201K), "sants" (550K), "chamartín" (135K)
- "renfe" (3,35M) — ganar es imposible (renfe.com es el brand) — **pero redirigir a buscador interno + deeplink renfe.com con affiliate ID cuando exista**

#### Nueva ruta
- `/renfe/[ciudad]` — alias que agrega estaciones + servicios + precios en una ciudad. Captura "renfe madrid", "renfe barcelona" (~400K/mes agregado).

---

### FASE 3 — MAP CLICK → OVERLAY → ENTITY (1 semana)

Tal como roadmap `ROADMAP-MAP-INTERACTIVE-2026-04-19.md`. Dejarla para después de Fase 0 porque las entity pages son el destino del overlay, y si no están indexadas no aporta SEO.

- Hook `useMapInteraction` + `FeatureOverlay` drawer
- 12 adapters por tipo de entidad
- Capas administrativas (provincia/CCAA/municipio) clickables
- GA4 event tracking `map_entity_click`

---

### FASE 4 — COMBUSTIBLE & PORTUGAL (2 semanas)

**Oportunidad ES:** ~2M/mes | **PT:** ~1M/mes.

#### Combustible ES
- Mejorar `/gasolineras/[id]` — añadir chart precio histórico (CNMC ya importado), comparador provincial, "¿está subiendo?" badge.
- Crear `/gasolinera-mas-barata/[municipio]` — nueva ruta SSG 8.131 municipios, top 10 estaciones más baratas por provincia (6,103 keywords 100-1K/mes según universe).
- Competidor pos 1 "precio gasolina hoy": dieselogasolina.com — diseño 2010, ganable en UX + visualización.

#### Combustible PT (hueco total)
- Crear `/combustiveis` hub + `/combustiveis/[distrito]` y `/combustiveis/[concelho]`.
- Data: DGEG (colector `portugal-fuel` ya existe).
- Capturar "combustíveis" (165K/mes), "preço combustível" (110K), "combustíveis próxima semana" (135K).

---

### FASE 5 — AEROPUERTOS & FLIGHT RADAR (1,5 semanas)

**Oportunidad:** ~4M/mes.

#### Mejoras
- `/aviacion/aeropuertos/[iata]` — añadir **departure/arrival boards** real-time (OpenSky ya integrado), parking rates, cómo llegar, transporte.
- `/aviacion` hub — "radar aviones España" (10K-100K/mes). Rankea flightradar24.com en pos 1 por "flight radar" (301K/mes). Ganable con UX nativa + data gratis + idioma ES.
- Schema `Airport` con `geo`, `openingHours`, `iataCode`, `runway` (runways ya importados).
- **Affiliate opportunity:** parking aeropuerto (parclick, aeroCAR) — añadir comparador en cada landing.

---

### FASE 6 — CIUDAD HUB UNIFICADO (2 semanas)

**Insight clave:** El usuario busca "madrid" (673K/mes), "barcelona", "valencia"... no "tráfico en Madrid". Necesitamos hub-ciudad que agregue TODO.

- `/ciudad/[slug]` — actualmente vacío. Convertir en mega-landing con:
  - Meteo ahora (de Fase 1)
  - Tráfico live (incidencias, cámaras)
  - Gasolineras baratas
  - Estación Renfe principal
  - Aeropuerto cercano
  - Metro/bus si aplica
  - Calidad del aire
- **Schema Place** con sub-entities.
- URL canonical `/ciudad/madrid` para "madrid" con volumen 673K si esa intent pega.

---

### FASE 7 — AFILIADOS (ongoing desde Fase 4)

**Insight crucial de la SERP ferry:** OTAs dominan (directferries, clickferry, omio, ferryhopper). **No competimos orgánicos — somos el aggregator/comparador con data viva + affiliate links.**

#### Programas a activar (ingresos por comisión)
| Vertical | Network | Keyword ancla | Vol/mes | CPC |
|---|---|---|---|---|
| Ferry booking | DirectFerries, Omio, Ferryhopper | "ferry a Mallorca", "ferry a Ibiza" | ~500K | $1-3 |
| Seguro coche | Rastreator, Acierto | "seguro coche comparador" | 60,5K | $10,75 |
| Alquiler coche | Rentalcars.com, DiscoverCars | "alquiler coche barajas" | ~50K | $2-4 |
| Parking aeropuerto | Parclick | "parking aeropuerto Barajas" | ~40K | $1-2 |
| EV charger | Wallbox affiliate | "cargador coche eléctrico" | ~80K | $1 |
| Billetes tren | Omio, Trainline | "billetes renfe baratos" | ~30K | $0,80 |
| Vuelos | Kiwi, Skyscanner | "vuelos baratos" | ~400K | $0,50 |
| Casino PT | ⚠️ alto CPC ($24) pero **OFF-BRAND**, descartar | — | — | — |

#### Landing afiliada ejemplo
- `/ferry/[origen]-[destino]` — genera 50-100 rutas, cada una con comparador de precios Baleària vs. Trasmed vs. Fred Olsen + deeplink afiliado.
- `/alquiler-coche/[aeropuerto]` — comparador en 42 aeropuertos.

---

## Plan de atacar

### Sprint 1 (semana 1) — Indexación
- [x] Análisis SEO completo (hoy)
- [ ] Fase 0: fix canonical + sitemap + og:image (2-3 días)
- [ ] Verificar en GSC

### Sprint 2-3 (semanas 2-4) — Meteo landgrab
- [ ] Fase 1 completa: `/meteo/[slug]` × top 50 ES + top 20 PT
- [ ] Schema, FAQ, interlinking
- [ ] Header refactor para promover Meteo

### Sprint 4 (semana 5) — Renfe boards
- [ ] Fase 2: boards real-time en 15 estaciones top
- [ ] `/renfe/[ciudad]` agregador

### Sprint 5 (semana 6) — Mapa interactivo
- [ ] Fase 3: overlay + adapters

### Sprint 6-7 (semanas 7-8) — Combustible ES+PT + Aeropuertos
- [ ] Fase 4 y 5 en paralelo (agentes independientes)

### Sprint 8 (semana 9) — Ciudad hub + afiliados
- [ ] Fase 6 + primeros 3 programas de Fase 7

---

## Archivos del research

| Archivo | Contenido |
|---|---|
| `00-executive-summary.md` | Resumen cifras |
| `01-site-baseline.md` / `.csv` | (Vacío — confirma invisibilidad) |
| `02-competitors-gap.md` / `.csv` | 22.213 keywords por captar |
| `03-keyword-universe.md` / `.csv` | 26.144 keywords con volumen/CPC |
| `04-serp-features.md` | Radiografía 52 SERPs |
| `05-affiliate-opportunities.md` | 11.237 keywords comerciales ordenadas por Vol×CPC |
| `06-roadmap-priorizado.md` | **Este documento** |
| `raw/wave1-5/*.json` | Respuestas DataForSEO raw |

---

## Qué cambió vs. análisis previo

| Supuesto anterior | Realidad DataForSEO |
|---|---|
| "Meteo y calidad aire son secundarios" | **Es el cubo #1 y #2 por volumen** (40M/mes agregado) |
| "Ferries son oportunidad orgánica 30-300K/mes" | OTAs dominan top 10. **Es oportunidad afiliada, no orgánica** |
| "Banda XL / L / M sin números reales" | Ahora tenemos volumen exacto para 26K keywords |
| "trafico.live rankea parcialmente" | **No rankea para nada con vol>50**. P0 del VERDICT son blocker total |
| "Renfe como brand no ganable" | Cierto, pero estaciones individuales sí (atocha 1M, sants 550K) |
| "Portugal es secundario" | PT tiene 566 keywords >10K — hueco total de combustible/metro LX |

---

## Siguientes queries sugeridas (crédito restante ~$41)

Si quieres profundizar antes de ejecutar:
1. **Bulk keyword difficulty** para top 500 targets (~$1) — filtrar por dificultad <30
2. **SERP completa para ciudades top-20** (Madrid, Barcelona, Valencia...) en cada vertical (~$3)
3. **Backlink profiles** de top 5 competidores (~$2) — entender autoridad vs. dificultad real
4. **Historical SERP** para "el tiempo madrid" y "renfe" (~$1) — ver estacionalidad

Luz verde y lanzo la siguiente ronda.
