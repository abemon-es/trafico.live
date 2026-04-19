# Estrategia integral trafico.live — contenido + sitemap + header + footer + internal linking + schema

**Fecha:** 2026-04-19  
**Base:** 2 rondas de DataForSEO ($9,35), 26.144 keywords, 521 ganables con KD conocido, 95 SERPs ciudad×vertical.  
**Estado actual:** 0 keywords rankeadas con vol>50 (confirmado DataForSEO).

---

## Tabla de decisiones ejecutivas

| Decisión estratégica | Ahora | Cambio propuesto | Justificación |
|---|---|---|---|
| **Mercado foco** | ES | ES + **PT como 2º mercado prioritario** | PT KD medio más bajo, competencia más débil (viamichelin, maisgasolina), hueco meteo/fuel/metro |
| **Vertical principal** | Carreteras/Tráfico | **Meteo** (ascenso) | 40M búsq/mes vs. 3M tráfico urbano. Aemet.es y iqair.com dominan con UX pobre |
| **Modelo ferry** | Contenido informativo | **Comparador afiliado** | OTAs (directferries, clickferry, omio) monopolizan top 10. Imposible orgánico |
| **Ciudades foco** | Top 4 (Madrid, BCN, Valencia, Sevilla) | **Top 50 ES medianas** (KD 20-30) | Huelva, Vigo, Valladolid, Málaga, Bilbao = sweet spot. Madrid es KD 52-100 |
| **Plataforma afiliación** | Disperso `/divulgacion-afiliados` | **Sistema integrado** con programas reales | Seguro auto $10,75 CPC, parking $2-4, rental $2-4 |
| **Indexación** | Roto (canonical=`/`, sitemap incompleto) | **Fase 0 obligatoria** antes de nada | Blocker total. Confirmado 0 kw rankeadas |

---

## 1) Estrategia de contenido por vertical

### 1.1 Meteo — el landgrab #1 (40M/mes ES+PT)

**Competencia:** aemet.es (6/9 ciudades), eltiempo.es (3/9), iqair.com (7/9 AQ), ipma.pt (1/5), tempo.pt (4/5).

**Puntos ciegos del competidor:**
- aemet.es: UX institucional fea, lenta, sin mapa interactivo
- eltiempo.es: publicidad invasiva, contenido SEO thin, sin datos estructurados ricos
- tempo.pt: diseño 2015, sin app-quality
- iqair.com: inglés, focal aire, no meteo cruzada

**Nuestra ventaja:**
- Colectores AEMET + IPMA + MITECO ICA funcionales
- Map Protomaps self-hosted → UX superior
- Diseño moderno (Exo 2 / DM Sans, tokens OKLCH)
- Idioma nativo ES + PT
- Cross-vertical: meteo + aire + viento + temperatura marítima en una sola vista

**Rutas a crear (25 sprints-días):**

| Ruta | Nº URLs | Volumen objetivo | Prioridad KD |
|---|---|---|---|
| `/meteo/[slug]` ES | 52 provincias + 2.000 municipios top | 25M | Baja para ciudades medianas (KD 20-30) |
| `/meteo/pt/[slug]` | 18 distritos + 308 concelhos + regiones autónomas | 15M | Muy baja en PT (KD 5-20) |
| `/aemet/[slug]` | alias ES → `/meteo/[slug]` via rewrite | 2,24M ("aemet" solo) | KD 100 para "aemet" puro, pero `aemet madrid` KD 50 |
| `/ipma/[cidade]` | alias PT → `/meteo/pt/[slug]` | 135K ("ipma tempo") | KD 50 |
| `/el-tiempo/[ciudad]` | alias ES captura long-tail | 10M+ variantes | **El tiempo es KD 100, pero "el tiempo en X" ciudad mediana KD 20-30** |

**Template único** (reutiliza para ES y PT):
1. **Hero widget** — temperatura + condición + icono + humedad + viento (arriba del fold)
2. **Gráfico 7 días** — max/min/precipitación (Recharts)
3. **Tabla horaria 24h** — scrollable, con probabilidad de lluvia
4. **Mapa con isotermas** — zoom a 50km alrededor (Protomaps)
5. **Alertas AEMET/IPMA activas** (colector existente)
6. **Calidad del aire ahora** — ICA + pollutants (embed de /calidad-aire/[ciudad])
7. **Tráfico cruzado** — "¿conducir hoy?" con alertas de viento, niebla, lluvia
8. **Histórico mes/año** — agregados ClimateRecord
9. **FAQ schema** — "¿va a llover mañana?", "¿cuándo nieva?", "¿amanece a qué hora?"

**Schema.org stack obligatorio:**
- `WeatherForecast` + `WeatherObservation` (schema.org pending, use JSON-LD experimental)
- `Place` con `geo`, `containedInPlace` (CCAA → Provincia → Municipio)
- `BreadcrumbList`
- `FAQPage`
- `DataFeed` apuntando al endpoint JSON de meteo — **para AI Overview friendliness** (presente en 19% SERPs)

**Interlinking del template:**
- Footer del template: links a 6 ciudades vecinas + hub `/meteo`
- Sidebar: "Otras ciudades de la misma CCAA"
- Breadcrumb: España > CCAA > Provincia > Municipio
- CTA a `/calidad-aire/[ciudad]`, `/carreteras/[slug]` (tráfico), `/gasolineras/[ciudad]`

---

### 1.2 Transporte ferroviario (8M/mes)

**Oportunidad confirmada:** estaciones individuales tienen volumen brutal pero KD bajo (cuando no es la keyword brand).

| Keyword | Vol/mes | KD | Landing |
|---|---|---|---|
| atocha | 1M | - (no KD medido) | `/trenes/estacion/madrid-puerta-atocha` |
| madrid-puerta de atocha-almudena grandes | 450K | **0** | mismo |
| barcelona sants | 550K | - | `/trenes/estacion/barcelona-sants` |
| estacion santa justa sevilla | 201K | - | `/trenes/estacion/sevilla-santa-justa` |
| estacion joaquin sorolla valencia | 60K | **0** | ✓ |
| estación Valencia Joaquín Sorolla | 90K | **0** | ✓ |
| estación madrid-chamartín-clara campoamor | 60K | **1** | ✓ |
| sete rios (PT) | 246K | - | `/trenes/estacao/sete-rios` (crear) |
| cais do sodre (PT) | 246K | - | `/trenes/estacao/cais-do-sodre` (crear) |
| santa apolónia (PT) | 165K | - | `/trenes/estacao/santa-apolonia` (crear) |

**Acciones:**
1. **ES**: Mejorar las 20 landings top con live departure/arrival boards (usando ya GTFS-RT + LD API)
2. **PT**: Crear `/trenes/pt/estacao/[slug]` × 80 estaciones principales (colector CP GTFS ya importado)
3. **Schema `TrainStation`** con `geo`, `openingHours`, `departure`/`arrival` feed
4. **FAQ**: "¿cómo llegar?", "¿horarios?", "¿aparcamiento?", "¿precio del metro/cercanías al centro?"
5. **Cross-links**: aparcamiento + hotel cerca + renta coche cerca + restaurantes = **monetización afiliada**

---

### 1.3 Combustible (ES 2M + PT 1M)

**ES: matar a dieselogasolina.com**

Competidor rank 1 en todas las ciudades. Diseño 2010. Sin mapa real. Sin histórico. Oportunidad clara.

**PT: matar a maisgasolina.com**

5/5 monopolio. Mismo pattern. PT tiene colector `portugal-fuel` (DGEG) ya importado.

| Ruta | Acción | Volumen |
|---|---|---|
| `/gasolineras/[id]` | Mejorar: chart precio, badge "sube/baja", comparador provincial | base |
| `/gasolineras/[ciudad]` | NUEVA, top 10 por ciudad | "gasolineras madrid baratas" etc. |
| `/combustiveis` + `/combustiveis/[distrito]` | CREAR hub PT | 165K "combustíveis", 165K más long-tail |
| `/gasolinera-mas-barata/[municipio]` | alias para intent transaccional | cola larga masiva |

**Contenido template:**
- Mapa con filtro precio + marca + servicios
- Top 10 más baratas hoy (LIVE)
- Tendencia 30d / 90d / 1año
- "¿Sube o baja mañana?" — con Clickgasoil-style prediction
- Comparador provincial + nacional
- Affiliate: "repostar con descuento Waylet/SolRed" (link afiliado)

**Schema:** `GasStation` + `Product` (fuel type) + `AggregateOffer` + `BreadcrumbList`.

---

### 1.4 Aeropuertos (4M/mes)

**Oportunidad SERP baja competencia:**
- `aeropuerto palma de mallorca` KD **9**, 201K/mes
- `aeropuerto de bilbao` KD **10**, 135K/mes  
- `aeropuerto de málaga-costa del sol` KD **13**, 135K/mes
- `aeropuerto adolfo suárez madrid-barajas` KD **23**, 246K/mes
- `aeroporto francisco sá carneiro` KD 34, 165K/mes (Porto)

**Acción:** Mejorar `/aviacion/aeropuertos/[iata]` con:
- Live departure/arrival (OpenSky ya funciona)
- Parking rates + affiliate (Parclick, AeroCAR)
- Cómo llegar (taxi, metro, tren, bus) — con schema `TransitStop`
- Restaurantes + tiendas + amenidades
- Schema `Airport` + `Place`

Crear PT mirror `/aviacao/aeroportos/[iata]` (TAP ya data).

**Flight radar:** `/aviacion` hub — vol "flight radar" 301K, pos 1 flightradar24.com KD alto. Ganable con UX ES nativa + focus Spain/Portugal only.

---

### 1.5 Tráfico & carreteras (3M/mes)

**Oportunidad en ciudades medianas:**
- "tráfico Madrid" ya competido por madrid.es, pero "tráfico Huelva", "tráfico Valladolid" tienen KD <25.

**Acción:**
- Mejorar `/municipio/[slug]` con sección tráfico live (dashboard condensado)
- Crear `/trafico/[provincia]` si volumen agregado lo justifica
- `/atascos/[ciudad]` alias redirigido

**Baliza V-16:** 246K/mes vol, KD no medido pero DGT pos 1. Crear guía `/baliza-v-16` (alias `/v16`) con FAQ completo + comparador + affiliate de marcas homologadas.

---

### 1.6 Calidad del aire (1M/mes, hueco iqair.com)

**iqair.com rankea pos 1 en 7/9 ciudades ES** — foreign domain, inglés primero. Nos comemos esto con:

| Ruta | Acción |
|---|---|
| `/calidad-aire/[ciudad]` | NUEVA (sólo existe `/calidad-aire/estacion/[id]`) |
| `/calidad-aire/provincia/[slug]` | YA existe, mejorar con more ciudades |
| `/ica/[ciudad]` | alias |
| `/qualidade-ar/[cidade]` | PT (hueco absoluto) |

**Contenido:** ICA actual, 48h rolling, PM2.5/PM10/NO2/O3/SO2, ranking peor/mejor del día, salud (FAQ: "¿puedo hacer deporte hoy?"), cross-link meteo.

**Schema:** `EnvironmentalObservation` custom, `Place`, `BreadcrumbList`.

---

### 1.7 Metro + transporte público PT (hueco absoluto)

PT SERP transit: fragmentado + wikipedia rankea. Rutas PT a crear:
- `/transporte-publico/lisboa/metro` (metro lisboa 135K/mes, metro do porto 90K)
- `/transporte-publico/porto/metro`
- `/transporte-publico/[cidade]/[operador]/[paragem]`
- `/metro-lisboa/[estacao]` × 56 estaciones

ES: mantener como está (competencia sólida con operadores oficiales) + crear per-estación × Bilbao, Málaga, Valencia, Sevilla que son ganables.

---

### 1.8 Marítimo — comparador afiliado (NO orgánico)

**SERP ferry saturada por OTAs**: directferries.es, clickferry.com, omio.es, balearia.com, trasmed.com. **Imposible rankear orgánico a 6 meses**.

**Pivot estratégico:**

| Intent usuario | Nuestro rol | Monetización |
|---|---|---|
| "ferry a Mallorca" | Comparador precios LIVE (Baleària + Trasmed + GNV + Fred Olsen) | Affiliate link cada |
| "horario ferry Algeciras Ceuta" | Horario real + comparador | Affiliate |
| "seguimiento buque X" | Data real AIS (YA lo tenemos) | Ad-free, premium |

Ya tenemos `/maritimo/ferries/[slug]` — **añadir comparador con pricing scraped + affiliate deeplinks**.

Nuevas rutas: `/ferry/[origen]-[destino]` → 100 rutas, cada una guía + comparador. Captura cola larga.

**Este es el verdadero vertical afiliado** más allá de parking/rental.

---

## 2) Sitemap — reestructuración completa

### 2.1 Estado actual (del VERDICT)
- 9 sitemaps submitidos a GSC
- **~4.000 URLs faltantes**: railway stations (2.154), railway routes (1.248), AQ stations (565), climate stations (900), airports (46), ports (197), ferry stops, accident hotspots
- Canonical apunta a `/` en 32 páginas → **P0 crítico**

### 2.2 Sitemap propuesto post-estrategia

```
sitemap-index.xml
├── sitemap-core.xml               — hubs (carreteras, trenes, aviacion, maritimo, etc.)
├── sitemap-meteo.xml              — /meteo/[slug] × 2.052 (ES 52 prov + 2000 municipios)  [NUEVO]
├── sitemap-meteo-pt.xml           — /meteo/pt/[slug] × 326 (18 distritos + 308 concelhos)  [NUEVO]
├── sitemap-ciudades.xml           — /ciudad/[slug] × 2000 top municipios
├── sitemap-provincias.xml         — /provincias/[code] × 52 + /comunidad-autonoma/[slug] × 19
├── sitemap-municipios.xml         — /municipio/[slug] × 8.131
├── sitemap-carreteras.xml         — /carreteras/[roadId]
├── sitemap-gasolineras.xml        — /gasolineras/[id]
├── sitemap-gasolineras-pt.xml     — /combustiveis/[id] × ~3000 postos  [NUEVO]
├── sitemap-estaciones-tren.xml    — /trenes/estacion/[slug] × 2.154
├── sitemap-estaciones-tren-pt.xml — /trenes/pt/estacao/[slug] × 200+  [NUEVO]
├── sitemap-lineas-tren.xml        — /trenes/linea/[slug] × 1.248
├── sitemap-aeropuertos.xml        — /aviacion/aeropuertos/[iata] × 46 ES + 18 PT
├── sitemap-puertos.xml            — /maritimo/puertos/[slug] × 197
├── sitemap-ferries.xml            — /maritimo/ferries/[slug] × 50 + /ferry/[route] × 100  [AMPLIAR]
├── sitemap-radares.xml            — /radares/[id] × 1.800  [NUEVO]
├── sitemap-camaras.xml            — /camaras/[id] × 1.200  [NUEVO]
├── sitemap-paneles.xml            — /paneles/[id] × 700  [NUEVO]
├── sitemap-aforos.xml             — /estaciones-aforo/[id] × 14.400  [NUEVO]
├── sitemap-aire.xml               — /calidad-aire/estacion/[id] × 565 + /calidad-aire/[ciudad] × 200  [AMPLIAR]
├── sitemap-meteo-estaciones.xml   — /meteo/estaciones/[slug] × 900
├── sitemap-transporte.xml         — /transporte-publico/[operador]/[parada] × ~8000
├── news-sitemap.xml               — artículos blog/insights con news schema
└── sitemap-images.xml             — og:images indexables
```

**Total:** ~40.000 URLs indexables vs. ~15.000 actuales.

---

## 3) Header + mega menu (informado por SEO)

### 3.1 Panel reorganizado por volumen real

La sesión paralela propuso 5 paneles: Carretera · Trenes · Aviación · Marítimo · Combustible + Profesional. **Con data real hay que añadir Meteo y reordenar:**

```
┌──────────────┬────────────────────────────────────────────────────┐
│  PANEL       │  VOLUMEN MENSUAL ES+PT (agregado)                  │
├──────────────┼────────────────────────────────────────────────────┤
│  Meteo   [1] │  40M — el más grande, debe ir primero               │
│  Trenes  [2] │   8M                                                │
│  Aviación[3] │   4M                                                │
│  Tráfico [4] │   3M                                                │
│  Combust.[5] │   3M                                                │
│  Marítimo[6] │   1,5M — pero afiliado, CTR comercial alto         │
│  Profesnl.[7]│   cross-cutting                                     │
└──────────────┴────────────────────────────────────────────────────┘
```

Geo-picker (provincia/ciudad/CCAA) sigue persistente al lado del logo como se propuso.

### 3.2 Mega menu de cada panel (patrón unificado)

```
┌────────────────────┬─────────────────┬──────────────────┬───────────────────┐
│  HERO (CTA al hub) │ EN DIRECTO      │ EXPLORAR         │ DATOS & ANÁLISIS   │
│  + screenshot mapa │                 │                  │                    │
│  + métrica viva    │ • feed reciente │ • catálogo       │ • rankings         │
│                    │ • mapa          │ • ciudades top   │ • históricos       │
│                    │ • alertas       │ • rutas          │ • informes         │
├────────────────────┴─────────────────┴──────────────────┴───────────────────┤
│  PILLS: ciudades/entidades top según SEO data (volumen × winnability)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pills específicas por panel (datos reales):**

- **Meteo**: Madrid, Barcelona, Valencia, Sevilla, Bilbao, Málaga, Huelva ⭐, Vigo ⭐, Valladolid ⭐ (⭐ = sweet spot KD bajo)
- **Trenes**: Atocha, Sants, Santa Justa, Chamartín, Valencia Joaquín Sorolla, Zaragoza Delicias
- **Aviación**: Barajas, El Prat, Palma ⭐, Bilbao ⭐, Málaga ⭐, Porto
- **Tráfico**: Madrid, Barcelona, AP-7, A-6, Baliza V-16 (informativo)
- **Combustible**: Precio hoy, Gasolinera más barata cerca, EV charging, PT
- **Marítimo**: Ferry Mallorca, Ferry Ceuta, Ferry Canarias, Puerto Algeciras (todos afiliado-friendly)

### 3.3 NavData.ts — archivos a editar

`src/components/layout/nav/NavData.ts` → reordenar y añadir panel Meteo como primero.

---

## 4) Footer reestructurado

```
┌─────────────┬─────────────────┬──────────────┬─────────────┬─────────────┐
│   MODOS     │    CIUDADES     │  PROFESIONAL │   EMPRESA   │    LEGAL    │
│             │                 │              │             │             │
│  Meteo      │  Madrid         │  API & Tarif │  Nosotros   │  Aviso      │
│  Trenes     │  Barcelona      │  Flotas      │  Prensa     │  Privacidad │
│  Aviación   │  Valencia       │  Consultoría │  Status     │  Cookies    │
│  Tráfico    │  Sevilla        │  Afiliados★  │  Blog       │  Divulg.Aff │
│  Combust.   │  Bilbao         │  Casos uso   │  Contacto   │             │
│  Marítimo   │  Lisboa         │              │             │             │
│  Calidad    │  Porto          │              │             │             │
│     aire    │  + Ver todas    │              │             │             │
│  Utilidades │                 │              │             │             │
│  (Ruta, CP) │                 │              │             │             │
└─────────────┴─────────────────┴──────────────┴─────────────┴─────────────┘
```

**Cambios vs. propuesta anterior:**
- Columna **Ciudades** añade enlaces directos a 10-20 ciudades top (interlinking fuerte a landings de mayor volumen)
- **Meteo y Calidad del aire** como modos propios (antes relegados a "Herramientas")
- **Afiliados** como sección con landing propia `/afiliados` (la ruta legal `/divulgacion-afiliados` queda en columna Legal)

---

## 5) Internal linking (el pegamento)

### 5.1 Cluster model

Cada pilar tiene:
- **1 hub** (`/meteo`, `/trenes`, etc.)
- **N landings ciudad/entidad** que linkean al hub
- **Cross-links** entre pilares desde contexto (meteo → tráfico → gasolineras)

### 5.2 Patrones obligatorios

| Lugar | Patrón |
|---|---|
| Landing ciudad meteo | → 5 ciudades vecinas + hub meteo + calidad aire ciudad + tráfico ciudad |
| Landing estación tren | → aparcamiento cercano (afiliado) + hotel cerca + transport al centro + gasolinera cerca |
| Landing gasolinera | → 10 gasolineras más baratas en la ciudad + ciudad hub + precio provincial |
| Landing aeropuerto | → parking (afiliado) + rental (afiliado) + cómo llegar + hotel + aeropuerto similar cerca |
| Landing provincia | → todas las CCAA/municipios + meteo provincial + ranking gasolineras provincial |
| Landing ciudad (hub) | → meteo + tráfico + gasolinera + estación tren + aeropuerto cercano + calidad aire |

### 5.3 Breadcrumb schema estandarizado

```
España > CCAA > Provincia > Municipio > [Vertical]
```

Ej: `España > Comunidad de Madrid > Madrid > Madrid (capital) > Meteo`

---

## 6) Schema.org — stack por tipo de página

| Tipo página | Schema primario | Secundarios |
|---|---|---|
| Hub (`/meteo`) | `WebSite` + `SiteNavigationElement` | `CollectionPage` |
| Ciudad hub (`/ciudad/madrid`) | `Place` (city) | `BreadcrumbList`, `FAQPage`, `ItemList` of sub-pages |
| Meteo ciudad | `WeatherForecast`+`WeatherObservation` (JSON-LD custom) | `Place`, `BreadcrumbList`, `FAQPage`, `DataFeed` |
| Estación tren | `TrainStation` | `Place`, `openingHours`, `departures`/`arrivals` |
| Aeropuerto | `Airport` | `Place`, `iataCode`, `geo`, `openingHours` |
| Puerto | `Port`/`CivicStructure` | `Place`, `geo` |
| Gasolinera | `GasStation` | `Product` (fuel), `AggregateOffer`, `GeoCoordinates` |
| Radar | `Thing` custom | `Place`, `geo` |
| Cámara | `Place` + `VideoObject` | `ImageObject` |
| Artículo | `Article`/`NewsArticle` | `Person`, `Organization` |

**Requisitos transversales:**
- FAQ schema en 70% de landings (PAA en 70% SERPs)
- `DataFeed` en data-pages para AI Overview (presente 19% SERPs)
- `BreadcrumbList` siempre

---

## 7) Estrategia de afiliados (monetización real)

| Programa | Vol keywords | CPC | Comisión esperada | Integración |
|---|---|---|---|---|
| Seguro auto (Rastreator, Acierto) | 60.5K "seguro coche comparador" | $10,75 | 20-40€/lead | Landing + CTA en `/cuanto-cuesta-cargar`, `/carnet` |
| Parking aeropuerto (Parclick) | ~40K agregado | $1-2 | 8-15% comisión | CTA en cada `/aviacion/aeropuertos/[iata]` |
| Alquiler coche (DiscoverCars, Rentalcars) | ~50K | $2-4 | 4-10% | CTA en aeropuertos + `/alquiler-coche/[ciudad]` |
| Ferry booking (DirectFerries, Omio) | ~500K | $1-3 | 3-8% | CTA en `/maritimo/ferries/[slug]` + `/ferry/[ruta]` |
| Billetes tren (Omio, Trainline) | ~30K | $0,80 | 3-6% | CTA en `/trenes/estacion/[slug]` |
| EV charging (Wallbox, Iberdrola) | ~80K | $1 | 5-20€/lead | CTA en `/carga-ev`, `/gasolineras/[ciudad]` |
| Hotel cerca (Booking) | generic | $1 | 25% comisión | Widget en landings de estación/aeropuerto |
| Vuelos (Kiwi, Skyscanner) | ~400K | $0.50 | 2-5% | Landings nuevas `/vuelos/[origen]-[destino]` |

**Landing afiliado template** `/afiliados`:
- Explicación transparente de cómo monetizamos (obligación legal)
- Enlace a `/divulgacion-afiliados` (página legal existente)
- Links a los programas (confianza)

---

## 8) Plan de ejecución (9 sprints = 10 semanas)

### Sprint 1 — Indexación (OBLIGATORIO)
- [ ] Fix canonical en 32 páginas (señalado VERDICT P0)
- [ ] Sitemap: añadir railway+AQ+climate+airports+ports+ferries+accidents (~4K URLs)
- [ ] og:image en 117 páginas
- [ ] GSC: verificar indexación + request re-crawl sitemaps
- **Gate:** >1.000 páginas indexadas nuevas en 7 días.

### Sprint 2-3 — Meteo landgrab ES
- [ ] `/meteo/[slug]` template + 52 provincias + top 100 municipios
- [ ] Schema WeatherForecast + FAQ + Place
- [ ] Header: añadir panel Meteo
- [ ] Footer: columna Ciudades con top 20

### Sprint 4 — Meteo PT
- [ ] `/meteo/pt/[slug]` template + 18 distritos + top 50 concelhos
- [ ] i18n básico
- [ ] Hub `/meteo/pt`

### Sprint 5 — Estaciones tren (ES + PT boards live)
- [ ] `<StationBoard>` real-time componente con SWR polling 30s
- [ ] Top 20 estaciones ES + 80 estaciones PT crear/mejorar
- [ ] Schema TrainStation + FAQ
- [ ] Affiliates: parking + hotel widgets

### Sprint 6 — Combustible ES + PT
- [ ] `/gasolineras/[ciudad]` ES + `/combustiveis` PT completo
- [ ] `/gasolinera-mas-barata/[municipio]` bulk SSG
- [ ] Schema GasStation + AggregateOffer
- [ ] Affiliate Waylet/SolRed/Galp

### Sprint 7 — Aeropuertos completo
- [ ] Live boards + parking affiliate + rental affiliate
- [ ] Schema Airport
- [ ] PT mirror

### Sprint 8 — Mapa interactivo (Fase 3 del roadmap mapa)
- [ ] useMapInteraction hook + FeatureOverlay drawer
- [ ] Adapters por tipo entidad
- [ ] GA4 tracking

### Sprint 9 — Ciudad hub unificado
- [ ] `/ciudad/[slug]` mega-landing agregador
- [ ] Schema Place + sub-entities
- [ ] Internal linking cross-vertical

### Sprint 10 — Afiliados sistema
- [ ] Landing `/afiliados` + activación 3 programas (insurance, parking, car rental)
- [ ] Widget afiliado reusable
- [ ] Tracking conversions
- [ ] Primer reporting mensual

---

## 9) KPIs de éxito a 90 días (post Sprint 1)

| Métrica | Baseline hoy | T+30d | T+60d | T+90d |
|---|---|---|---|---|
| Keywords rankeadas (vol>50) GSC | 0 | 200 | 1.000 | 5.000 |
| Impresiones orgánicas / mes | ~0 | 100K | 500K | 2M |
| Clicks orgánicos / mes | ~0 | 3K | 20K | 100K |
| CTR medio GSC | - | 3% | 4% | 5% |
| Páginas indexadas | ~4K | 15K | 30K | 40K |
| Revenue afiliados / mes | €0 | €0 | €500 | €3.000 |

---

## 10) Archivos críticos para ejecutar

| Archivo | Cambio principal |
|---|---|
| `src/app/sitemap.ts` | Refactor total: 20+ sitemaps en índice |
| `src/app/[layout canonical]` | Fix canonical (devolver URL real, no `/`) |
| `src/components/layout/nav/NavData.ts` | Panel Meteo al inicio, pills por SEO data |
| `src/components/layout/Header.tsx` | Integrar geo-picker persistente |
| `src/components/layout/Footer.tsx` | 5 columnas + ciudades top |
| **`src/app/meteo/[slug]/page.tsx`** | NUEVO — template meteo ciudad |
| **`src/app/meteo/pt/[slug]/page.tsx`** | NUEVO — PT |
| **`src/app/calidad-aire/[ciudad]/page.tsx`** | NUEVO |
| **`src/app/ciudad/[slug]/page.tsx`** | Convertir en hub agregador |
| **`src/app/combustiveis/`** | NUEVO hub PT |
| `src/components/trenes/StationBoard.tsx` | NUEVO — live departure |
| `src/lib/seo/schema-builders.ts` | Helpers JSON-LD |
| `src/components/affiliate/AffiliateCTA.tsx` | NUEVO — widget |

---

## 11) Decisiones pendientes antes de arrancar

1. **¿Fase 0 inmediata?** — Sin indexación arreglada todo es humo. ¿Hago PR con canonical + sitemap fix hoy?
2. **¿ES-only en Sprint 2-3 o ES+PT en paralelo?** — PT tiene KD más bajo, quizá PT primero para "quick wins".
3. **¿Activamos DataForSEO wave 4 extra ($3-5)?** — SERPs específicas de top 200 keywords ganables de wave 6 para ajustar finamente el contenido.
4. **¿Afiliados integrados desde Sprint 2 o esperamos a tener tráfico?** — Mi recomendación: integrarlos en templates desde el inicio (sin tráfico = €0, pero ya es código listo).

---

## Summary de research gastado

- $9,35 / $49,97 budget (19%)
- 26.144 keywords con volumen ES + PT
- 1.347 con KD medido
- 521 marcadas ganables (KD bajo + relevancia alta)
- 147 SERPs analizadas al detalle
- 25 competidores radiografiados

Quedan **$40,62** para olas futuras (cola larga por vertical, backlinks si activamos suscripción, SERPs por ciudad mediana).
