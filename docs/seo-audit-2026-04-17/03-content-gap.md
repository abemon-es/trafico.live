# Content Gap Analysis — trafico.live
**Date:** 2026-04-16 | **Auditor:** Sub3 Agent

---

## 1. Content Inventory by Vertical

### Methodology
Static pages = `page.tsx` files without dynamic `[slug]` segments. Dynamic pages = templates that render DB-driven entity pages. "Evergreen content pages" = guías, inteligencia, análisis, and similar editorial pages with prose, not just tables.

### Inventory table

| Vertical | Static pages | Dynamic templates | Evergreen content pages | ~Word count (sample) |
|---|---|---|---|---|
| **Road / Traffic** | 20+ (trafico, incidencias, atascos, paneles, radares, camaras, carreteras, cortes, restricciones, operaciones, puntos-negros, espana, ciudad, municipio, comunidad-autonoma, estadisticas, mejor-hora, prediccion-trafico, accidentes) | 4 (provincia, carretera, municipio, ciudad dynamic) | 7 (guías: peajes, radares, ZBE, etiqueta, límites, gasolina-vs-diesel; inteligencia: 6 análisis pages) | ~1,200–2,500/page |
| **Fuel / Gas Stations** | 10 (gasolineras, baratas, cerca, historico, mapa, marcas, maritimas, terrestres, precios, gasolineras-24h, precio-gasolina-hoy, precio-diesel-hoy) | 2 (province fuel, city fuel) | 3 (guía gasolina-vs-diesel; calculadora; cuanto-cuesta-cargar) | ~800–1,500/page |
| **Railway** | 5 (trenes, estaciones, lineas, cercanias, mapa) | 1 (cercanias/[network]) | 1 (guía cercanias-madrid only) | ~600–900/page |
| **Maritime** | 7 (maritimo, combustible, meteorologia, puertos, seguridad, mapa, buques, zonas, noticias) | 0 | 0 (no guides, no editorial) | ~500–700/page |
| **Aviation** | 2 (aviacion, mapa) | 0 | 0 | ~400–600/page |
| **Public Transit** | 2 (transporte-publico, mapa) | 0 | 0 | ~350–500/page |
| **Air Quality** | 1 (calidad-aire) | 0 | 0 | ~400–600/page |
| **Weather / Climate** | 3 (alertas-meteo, clima, historico) | 0 | 0 | ~400–500/page |
| **Statistics / Analytics** | 4 (estadisticas-transporte, estadisticas, corredores, inteligencia/*) | 2 (analisis/carreteras, analisis/accidentes/[provincia]) | 6 (inteligencia sub-pages: camiones, ciclistas, coste-desplazamiento, hora-punta, lluvia, motociclistas) | ~1,000–2,000/page |
| **EV / Charging** | 4 (carga-ev, cerca, electrolineras, cuanto-cuesta-cargar) | 0 | 1 (guía puntos-recarga) | ~700–900/page |
| **Blog / Noticias** | CMS-driven, DB articles | 1 (`/noticias/[slug]`) | All articles (categories: DAILY_REPORT, WEEKLY_REPORT, PRICE_ALERT, INCIDENT_DIGEST, WEATHER_ALERT, FUEL_TREND, ROAD_ANALYSIS) | Varies |
| **Guías (pillar)** | 1 index + 8 guides | 0 | 8 standalone guides | ~1,000–2,500/page |
| **Totals** | ~124 static pages | ~10 dynamic templates | ~18 evergreen editorial pages | — |

**Grand total unique URL templates: ~198 page.tsx files. Estimated rendered URLs: 500–1,000+ (entity pages expand to province/city/road).**

---

## 2. Thin Content Audit

| Category | Pages affected | Issue |
|---|---|---|
| New verticals (no narrative) | `/aviacion`, `/transporte-publico`, `/calidad-aire`, `/estadisticas-transporte` | Hub pages with stats widgets + CTA cards only — under 300 words of unique prose |
| Maritime sub-pages | `/maritimo/seguridad`, `/maritimo/zonas`, `/maritimo/noticias`, `/maritimo/buques` | Shell pages with minimal or placeholder editorial content |
| Map-only pages | `/trenes/mapa`, `/maritimo/mapa`, `/aviacion/mapa`, `/trafico/mapa`, `/transporte-publico/mapa` | Purely interactive map with no prose — invisible to crawlers, no text to rank |
| Entity pages (data tables) | `/gasolineras/[province]`, `/carreteras/[road]`, `/municipio/[slug]` | Templated name-swap pages; thin unless narrative injected per entity |
| Seasonal / dated pages | `/semana-santa-2026`, `/puente-mayo-2026`, `/peajes/gratis-2026` | Expire immediately; "2026" in slug/title will be stale without canonical redirect strategy |
| `/sobre/page.tsx` | 1 | About page is thin (~300 words), no team info, no author bios, no contact address |
| `/blog/page.tsx` | 1 | Blog index redirects → `/noticias`; `/blog/[slug]` redirects → `/noticias/[slug]` — duplicate redirect chain |

**Estimated thin-content pages (under 300 words unique prose): 15–25 pages (~12–20% of static total).**

---

## 3. Freshness

| Signal | Status | Detail |
|---|---|---|
| Blog/noticias publication cadence | Unknown (DB-driven, not readable from code) | Auto-generated categories (DAILY_REPORT, PRICE_ALERT, INCIDENT_DIGEST) suggest AI-generated/automated articles; no human editorial schedule evident in codebase |
| Guías last edited | All 8 guías appear in codebase with static content | No `lastModified` date visible on page; no `dateModified` in structured data for guides |
| Dated pages | `/peajes/gratis-2026`, `/semana-santa-2026`, `/puente-mayo-2026` | "2026" hard-coded in URL slugs — will be outdated by Jan 2027 with no redirect |
| Inteligencia pages | Static content with DGT microdata (2019-2023) | Data frozen at 2023 — pages reference historical data without stating last-updated date |
| Sobre page | Mentions "datos oficiales" generically | No publication date, no team section, no editorial standards statement |
| Article schema | `dateModified` is populated from DB `updatedAt` | Good — automatic for noticias; missing for static guías |

---

## 4. Content Types vs. Competitor Rankings

### Research findings from SERPs (7 searches performed)

| Query | Top-10 dominant format | Who ranks | We have | Gap |
|---|---|---|---|---|
| "precio gasolina hoy España" | Real-time price table + provincial map + price alert widget | MiCarburante, dieselogasolina.com, misgasolineras.es, FACUA, autonocion.com | `/precio-gasolina-hoy` with chart + province table | Weak: no price alert capture form prominent; no "cheapest near me" CTA above fold |
| "puertos españoles" | Listicle (top N ports) + interactive map + traffic rankings | Puertos del Estado (official), Wikipedia, moldtrans.com | `/maritimo/puertos` (fuel-only directory) | Missing: port profiles with cargo stats, ferry connections, rankings by traffic volume |
| "aeropuertos españa" | Listicle ranked by passengers + interactive map + individual airport guides | enterat.com, Aena, negocioaeroespacial.com, hosteltur.com | `/aviacion` (positions map + stats table) | Missing: individual airport pages, "top 10 airports" listicle, passenger rankings |
| "mapa tráfico España" | Interactive map (DGT etraffic, RACE, Michelin) | DGT etraffic, RACE, Michelin, Autopista.es | `/` (homepage map) + `/trafico/mapa` | We have the map; missing: editorial explaining how to read DGT map, what signs mean |
| "calidad aire España" | Real-time ICA map + city ranking + health guide | IQAir, aqicn.org, eltiempo.es, counterfog.com | `/calidad-aire` (station grid + ICA index) | Missing: health impact guide, pollutant explainer ("qué es el NO2", "PM2.5 qué significa"), city ranking page |
| "tren cercanías madrid" | Renfe official + Trainline (booking) | Renfe, Trainline | `/guias/cercanias-madrid` (1 guide), `/trenes/cercanias` | Missing: per-network full guides (12 networks), line-by-line pages, "horarios cercanías" content |
| "ferry baleares / canarias" | Booking sites + comparison + route guides | Baleària, directferries, clickferry, muchoturismo.com | No ferry guide content | 100% gap: no ferry comparison page, no route guide, no price overview |

---

## 5. Pillar + Cluster Architecture

### Current state

| Vertical | Pillar page? | Cluster pages? | Entity→Pillar links? | Cross-vertical links? |
|---|---|---|---|---|
| Road / Traffic | Partial (`/carreteras` exists but thin) | `/carreteras/autopistas`, `/autovias`, `/nacionales`, `/regionales` | `/guias/peajes-espana` links to `/peajes` | Some via noticias contextual sidebar |
| Fuel | Strong (`/gasolineras` with pillar links to all fuel types) | 10 sub-pages | Yes (fuel type pages link to `/gasolineras`) | Yes (cross-links to `/precio-gasolina-hoy`, `/precio-diesel-hoy`) |
| Railway | Partial (`/trenes` is map-first, not pillar content) | 4 sub-pages (estaciones, lineas, cercanias, mapa) | No guide for most brands/networks | No horizontal links to transit or aviation |
| Maritime | Partial (`/maritimo` as hub) | 8 sub-pages | Sub-pages link up | No cross-links to aviation or transit |
| Aviation | Thin (`/aviacion` hub only) | 1 sub-page (mapa) | No entity pages | No cross-links |
| Public Transit | Thin (`/transporte-publico` hub) | 1 sub-page (mapa) | No entity pages | No cross-links |
| Air Quality | Orphan (`/calidad-aire`) | 0 sub-pages | No links to weather or traffic | No cross-links |
| EV / Charging | Partial (`/carga-ev` as hub) | 3 sub-pages | Yes (carga-ev, electrolineras, cerca) | Links to `guias/puntos-recarga` |
| Guías | Yes (`/guias` index) | 8 guides | All guides link to relevant data pages | Some, not systematic |

**Critical gaps:**
- Maritime: no pillar content, no guides, no editorial
- Aviation: no individual airport pages, no pillar guide
- Public Transit: no city-level transit guides
- Air Quality: completely isolated — no cluster
- Railway: Cercanías guide only covers Madrid; 11 other networks have no guide

---

## 6. E-E-A-T Signals

| Signal | Present | Notes |
|---|---|---|
| Author pages / bylines | No | `author: { "@type": "Organization", name: "trafico.live" }` — no individual authors |
| Team / about page | Minimal | `/sobre` exists but: ~300 words, no team names, no expertise claims, no credentials |
| Contact information | Not found | No `/contacto` page, no physical address, no phone — only Cloudflare email routing |
| Data source citations | Partial | `/maritimo` has a sources footer; noticias articles show `source` badge when present; guías do not systematically cite sources per claim |
| Last-updated timestamps | Partial | Noticias: yes (DB `publishedAt`). Guías: no timestamp on pages. Inteligencia: no dates. |
| Editorial standards page | Missing | No "metodología", "cómo calculamos los datos", or "política editorial" page |
| Trust signals | Partial | `/politica-privacidad`, `/aviso-legal`, `/politica-cookies` present. Missing: SSL badge in footer (cosmetic), organization registration info |
| Press / media page | Present | `/media` page exists (purpose unclear from slug) |

**E-E-A-T score: 3/8 — below threshold for YMYL-adjacent transport/health (air quality) content.**

---

## 7. Tools / Calculators / Interactive

### Existing tools

| Tool | URL | Status |
|---|---|---|
| Route cost calculator | `/calculadora` | Active — fuel + toll estimate |
| EV charge cost calculator | `/cuanto-cuesta-cargar` | Active — home vs public vs fast |
| Best time to travel | `/mejor-hora` | Active — heatmap by hour/day |
| Route planner | `/ruta` | Active — origin/destination with traffic |
| Fuel price alerts | `/gasolineras` (PriceAlertForm component) | Active |
| Fuel price predictor | `/prediccion/precio-combustible` | Active |
| Train delay predictor | `/prediccion/retrasos-trenes` | Active |
| Transport corridor comparator | `/corredores` | Active — 12 routes, car vs train vs plane |
| Road intensity map | `/estaciones-aforo` | Active — 14,400+ counting stations |
| Real-time traffic map | `/` | Active |

### Missing tools (competitor benchmark)

| Tool | Competitor has it | Target keyword | Effort |
|---|---|---|---|
| Toll calculator with route input (integrate with `/calculadora`) | RACE, TollGuru, ViaMichelin | "calcular peaje ruta España" | M |
| Ferry price comparator | directferries, clickferry | "ferry baleares precio comparar" | L |
| ZBE permit checker ("¿puede circular mi coche?") | No dedicated Spanish tool found | "comprobar si mi coche puede entrar ZBE" | M |
| Air quality health index explainer / calculator | IQAir, counterfog | "calidad aire qué significa ICA" | S |
| Fuel savings calculator (route + fill-up point) | dieselogasolina, Geoportal | "cuánto ahorro en gasolina" | M |
| CO₂ emissions calculator per trip / mode | None dominant in ES | "calculadora emisiones CO2 viaje" | S |

---

## 8. Content Gap Top-20 List

| # | Target keyword | Content type | Vertical | Effort | Impact |
|---|---|---|---|---|---|
| 1 | "ferry baleares precios horarios" | Guide + comparison table | Maritime | L | High — 0% coverage, competitors dominate, high search volume |
| 2 | "aeropuertos españa ranking pasajeros" | Listicle + interactive map | Aviation | M | High — enterat.com ranks top 3; we have data, no article |
| 3 | "calidad del aire explicado: qué es el ICA, NO2, PM2.5" | Evergreen guide | Air quality | S | High — IQAir/aqicn rank via health content; we have data, no explainer |
| 4 | "guía cercanías barcelona / valencia / bilbao" (11 networks) | Guide × 11 | Railway | M×11 | High — Renfe ranks officially; third-party guides rank well |
| 5 | "puertos de españa guía completa: tipos, rankings, tráfico" | Pillar guide | Maritime | M | High — Wikipedia + moldtrans rank; we have 197 ports in DB |
| 6 | "comparar modos de transporte madrid-barcelona" | Interactive tool / calculator | Multi-modal | M | Medium-High — `/corredores` exists but lacks SEO-optimised narrative |
| 7 | "metro madrid guía completa: líneas, precios, zonas" | Guide | Transit | S | Medium-High — CRTM/EMT rank; we have GTFS data |
| 8 | "contaminación atmosférica por ciudad ranking 2026" | Data page + ranking table | Air quality | S | Medium-High — counterfog.com ranks with simple ranking; we have 506 stations |
| 9 | "aeropuerto madrid barajas: terminales, llegadas, salidas" | Individual airport guide × top 5 | Aviation | M | Medium-High — aena.es ranks; opportunity for AENA-sourced data pages |
| 10 | "gasolineras más baratas de españa: cómo encontrarlas" | Evergreen guide + calculator hook | Fuel | S | Medium — MiCarburante/FACUA rank; we have data, need editorial wrapper |
| 11 | "radares de tramo españa 2026: lista completa" | Listicle / table page | Road | S | Medium — multiple sites rank; we have radar data |
| 12 | "cuándo hay menos tráfico en la A-7 / AP-7 / N-II" (per road) | Data-driven article template | Road | M | Medium — no strong competitor; we have IMD + intensity data |
| 13 | "puntos negros carreteras españa mapa" | Map + listicle | Road | S | Medium — RACE, MAPFRE, AEA rank; we have `/puntos-negros` but thin |
| 14 | "precio diesel profesional españa 2026" | Data page + guide | Fuel (profesional) | S | Medium — `/profesional/diesel` exists; needs narrative |
| 15 | "horarios y precio AVE madrid barcelona 2026" | Evergreen hybrid data/guide | Railway | S | Medium — Renfe + Trainline rank; we can provide comparison angle |
| 16 | "quiénes somos / metodología trafico.live" | E-E-A-T about page | Cross-site | S | Medium — critical for trust ranking signals across all verticals |
| 17 | "cómo funciona la etiqueta ambiental DGT 2026" | Guide update | Road | S | Low-Medium — we have the guide; needs "2026" refresh + last-updated date |
| 18 | "estadísticas accidentes de tráfico españa por comunidad" | Data explainer page | Road | S | Medium — DGT stats pages rank; we have microdata, need narrative |
| 19 | "calidad aire madrid / barcelona: estaciones y datos" | City-level air quality pages | Air quality | M | Medium — Madrid/Comunidad de Madrid rank officially; opportunity for data enrichment |
| 20 | "transporte de mercancías por carretera españa: estadísticas" | Statistical explainer | Road / freight | M | Low-Medium — freight angle untapped; we have trucking inteligencia data |

---

## Summary

trafico.live has approximately **124 static pages** and **~198 page templates** generating a large URL surface. However, **~15–25 pages (~12–20%) are thin** (under 300 words of unique prose), concentrated in the four newest verticals: aviation, public transit, air quality, and maritime. The **biggest content vertical gap is maritime**: 8 sub-pages exist but contain zero editorial guides — no ferry comparison, no port guides, no safety explainer, while competitors own these queries completely. The **top three must-create content pieces** by impact are: (1) **ferry Baleares/Canarias guide** (`"ferry baleares precios horarios"` — 0% coverage vs. directferries/clickferry), (2) **aeropuertos España ranking listicle** (`"aeropuertos españa ranking pasajeros"` — we have AENA data, competitors have the article), (3) **ICA/calidad del aire explainer** (`"qué es el ICA calidad del aire"` — IQAir and AQICN rank via health explainer content we don't have). E-E-A-T is the systemic weak point: no named authors, no contact page, no last-updated dates on guides — fix these before or alongside new content creation.
