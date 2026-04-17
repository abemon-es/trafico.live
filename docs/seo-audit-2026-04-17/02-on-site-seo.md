# On-Site SEO Audit — trafico.live
_Date: 2026-04-17 | Scope: 198 page.tsx files, src/app/ + src/components/seo/_

---

## 1. Title + Description

### 1.1 Sampled Title Lengths (target 50–60 chars)

| Page | Title | Chars | Status |
|------|-------|-------|--------|
| Home (`/`) | Tráfico en Tiempo Real en España — Mapa, Incidencias, Cámaras DGT | 65 | OVER |
| Marítimo (`/maritimo`) | Información Marítima en España — Combustible, Meteorología y Puertos | 68 | OVER |
| Aviación (`/aviacion`) | Tráfico Aéreo en España — Vuelos y Aeropuertos AENA \| trafico.live | 66 | OVER + double suffix |
| Trenes (`/trenes`) | Red Ferroviaria de España — Mapa de trenes en tiempo real \| trafico.live | 72 | OVER + double suffix |
| Gasolineras (`/gasolineras`) | Gasolineras y Precios de Combustible \| Tráfico España | 53 | OK |
| Calidad del aire (`/calidad-aire`) | Calidad del Aire en España — Índice ICA en tiempo real \| trafico.live | 69 | OVER + double suffix |
| Noticias (`/noticias`) | Noticias de Tráfico en España — Informes, Guías y Alertas | 57 | OK |
| Carreteras (`/carreteras`) | Carreteras de España \| Tráfico en Tiempo Real | 45 | SHORT |
| Transporte público | Transporte Público en España — Metro, Autobús, Tranvía \| trafico.live | 69 | OVER + double suffix |
| Radares (`/radares`) | Radares DGT en España — Mapa Completo 2026 | 42 | SHORT |

**Key observations:**
- The root layout uses `template: "%s | trafico.live"`. Any page that already includes `| trafico.live` in its `title:` string gets a **double brand suffix** (e.g. `"Title | trafico.live | trafico.live"`). **47 pages** are affected.
- No pages use `title: { absolute: "..." }` to escape the template when needed.
- 9 pages with `"— trafico.live"` get `"Title — trafico.live | trafico.live"`.
- Descriptions are multiline strings — all sampled descriptions are well-formed and in range.

### 1.2 Sampled Description Lengths

| Page | Description | Chars |
|------|-------------|-------|
| Home | Consulta el estado del tráfico en España ahora: incidencias activas… Datos oficiales actualizados cada 60 segundos. | 151 | OK |
| Marítimo | Consulta precios de combustible marítimo, meteorología costera, puertos y seguridad marítima en España. Datos oficiales actualizados. | 131 | SHORT |
| Trenes | Mapa interactivo de la red ferroviaria española. Estaciones, líneas de Cercanías, AVE, Larga y Media Distancia. Alertas e incidencias en tiempo real de Renfe. | 157 | OK |
| Gasolineras | Consulta los precios de combustible actualizados en más de 12.000 gasolineras de España. Encuentra la gasolinera más barata cerca de ti. | 136 | SHORT |

### 1.3 Brand Suffix Inconsistency

The site uses **three different separator conventions** in page titles:
- `— trafico.live` (em dash, 9 occurrences)
- `| trafico.live` (pipe, 47 occurrences)
- No suffix, relying on template (majority)

When template is applied: `%s | trafico.live`. Pages that embed a suffix become `Title | trafico.live | trafico.live` or `Title — trafico.live | trafico.live`. **Recommendation:** Strip all `| trafico.live` and `— trafico.live` from individual `title:` fields and rely on the template exclusively, or switch to `title: { absolute: "..." }` on pages where the brand should appear in a specific position.

### 1.4 Duplicate Titles

**57 duplicate static title strings** detected. Notable duplicates across multiple files:

| Duplicated Title | Count |
|-----------------|-------|
| Cámaras de Tráfico | 6 |
| Carreteras de España | 5 |
| Carreteras | 5 |
| Calculadora de Coste de Ruta — Combustible y Peajes | 2 |
| Cercanías de España — 12 redes \| trafico.live | 2 |
| Buques - Directorio de embarcaciones AIS \| trafico.live | 2 |
| Alertas Meteorológicas para Carreteras — AEMET | 2 |
| Estadísticas de accidentes / de tráfico / de incidencias | 3 (variants) |

The `Cámaras de Tráfico` title appears on 6 different pages (`/camaras`, city sub-pages, carretera sub-page). Each needs a city/road qualifier appended.

### 1.5 Missing Accents in Titles

**20 guide/intelligence pages** have unaccented titles (likely copy-pasted from plain ASCII contexts):
- `/guias/radares-espana` → "Radares en Espana 2026" (missing tilde)
- `/guias/zonas-bajas-emisiones` → "Zonas de Bajas Emisiones en Espana"
- `/guias/puntos-recarga-electrico` → "Coches Electricos en Espana"
- `/inteligencia/lluvia-y-accidentes` → "trafico en Espana"
- Buque detail, vessel breadcrumb items → "Aviacion", "Trafico.live"

---

## 2. H1 Discipline

| Metric | Count |
|--------|-------|
| Pages with exactly 1 H1 | ~138 |
| Pages with 0 H1 (page.tsx only, confirmed static) | **30** |
| Pages with 2 H1 | **2** |
| Total page.tsx files | 198 |

### 2.1 Pages with 0 H1 (selected)

These pages render no `<h1>` tag in their page.tsx. Some delegate to a `content.tsx` (e.g. `/trenes` uses `content.tsx` which has H1 — acceptable). But these are confirmed missing:

| Page | Notes |
|------|-------|
| `/estaciones-aforo` | Map-only, no H1 in content |
| `/estadisticas-transporte` | Data dashboard, no H1 |
| `/trenes/estaciones` | Catalog, no H1 |
| `/trenes/lineas` | Grid, no H1 |
| `/trenes/cercanias` | Overview, no H1 |
| `/transporte-publico` | No H1 |
| `/transporte-publico/mapa` | Map page, no H1 |
| `/explorar`, `/explorar/carreteras`, `/explorar/territorios`, `/explorar/infraestructura` | 4 pages, no H1 |
| `/prediccion-trafico` | Has OG image but no H1 |
| `/ruta` | Interactive tool, no H1 |
| `/calculadora` | Interactive tool, no H1 |
| `/incidencias/estadisticas`, `/incidencias/analytics` | No H1 |
| `/intensidad` | IMD data page, no H1 |
| `/historico` | No H1 |
| `/trenes/mapa`, `/trafico/mapa` | Map pages, no H1 |
| `/blog`, `/insights` | Index pages with no H1 |

### 2.2 Pages with 2 H1 (hierarchy violation)

- `/inteligencia/radiografia-carretera/[roadId]` — 2 H1 tags
- `/prediccion/precio-combustible` — 2 H1 tags

### 2.3 Heading Hierarchy

Maritimo (`/maritimo`): H1 → H2 → H3 — clean hierarchy.
Trenes content: H1 → H2 → H3 — clean.
No H1→H3 jumps detected in sampled pages with proper H1. The main risk is the 30 pages with **no H1** where H2 becomes the de-facto first heading.

---

## 3. Internal Linking

### 3.1 Inbound Links to Main Verticals (from all .tsx files)

| Page | Inbound Links |
|------|--------------|
| `/gasolineras` | 8 |
| `/trenes` | 5+ (nav + footer) |
| `/maritimo` | 5 (nav + footer) |
| `/aviacion` | 5 (nav + footer) |
| `/carreteras` | 10+ |
| `/calidad-aire` | 2 (footer only) |
| `/transporte-publico` | 1 (footer only) |
| `/estadisticas-transporte` | 0 direct links |
| `/prediccion-trafico` | 1 |
| `/analisis/*` | 0 direct nav links |
| `/historico` | 2 (nav) |
| `/puntos-negros` | 2 (nav) |

### 3.2 Orphan / Near-Orphan Pages (no or 1 inbound link from src/)

| Page | Inbound Links | Risk |
|------|--------------|------|
| `/estadisticas-transporte` | 0 | Orphan — exists in SiteNav schema only |
| `/analisis/accidentes/[provincia]` | 0 | Orphan |
| `/analisis/carreteras/[roadId]` | 0 | Orphan |
| `/accidentes` | 0 nav links | Near-orphan (linked from SiteNav schema) |
| `/municipio` | 1 | Near-orphan |
| `/prediccion-trafico` | 1 | Near-orphan |
| `/puntos-negros` | 1 (footer only) | Near-orphan |
| `/restricciones` | 2 | Near-orphan |
| `/ciudad` | 2 | Near-orphan (city drill-downs not linked from content pages) |

### 3.3 Cross-Vertical Linking (content pages linking between major verticals)

| Link | Count |
|------|-------|
| `/maritimo` → `/aviacion` | 1 |
| `/aviacion` → `/maritimo` | 1 |
| `/maritimo` → `/trenes` | 0 |
| `/trenes` → `/maritimo` | 0 |
| `/maritimo` → `/calidad-aire` | 0 |
| `/calidad-aire` → any other vertical | (via breadcrumbs only) |

Cross-vertical linking is near-zero. The site's verticals are islands — linked from the global nav but not from each other's content. This is the **biggest internal linking blind spot**: no "related verticals" sections linking, e.g., `/trenes` pages to `/estadisticas-transporte`, or `/maritimo/puertos` to `/calidad-aire`.

### 3.4 Pages Receiving Most Internal Links (authority concentration)

The nav and footer create the most link equity. Pages NOT in the nav/footer and with no content-page links include `/estadisticas-transporte`, `/analisis/*`, `/accidentes`, `/siniestralidad/*`, `/insights/*`, `/blog/*`.

### 3.5 Breadcrumb Coverage

| Vertical | Breadcrumb Usage |
|----------|-----------------|
| Gasolineras | 15 |
| Marítimo | 16 |
| Carreteras | 9 |
| Trenes | 5 |
| Calidad del aire | 3 |
| Transporte público | 3 |
| Aviación | 2 |
| Radares | 4 |

**Biggest gap:** `/trenes` hub page, `/trenes/estaciones`, `/trenes/lineas`, `/trenes/cercanias`, `/estadisticas-transporte`, `/intensidad`, `/estaciones-aforo`, `/explorar/*`, `/prediccion-trafico`, and all `/analisis/*` pages have **no breadcrumbs**. These are high-content pages where structured BreadcrumbList schema and visible path-back links are completely absent.

---

## 4. URL Semantics

### 4.1 Pattern Consistency

| Pattern | Example | Note |
|---------|---------|------|
| Plural collection | `/maritimo/buques`, `/trenes/estaciones`, `/aviacion/aeropuertos` | Consistent |
| Singular entity | `/maritimo/buques/[slug]`, `/trenes/estacion/[slug]`, `/aviacion/aeropuertos/[iata]` | INCONSISTENT: `/trenes/estacion` (singular) vs `/aviacion/aeropuertos/[iata]` (plural parent, singular implied) |
| Ferry | `/maritimo/ferries/[slug]` | OK |
| Port | `/maritimo/puertos/[slug]` | OK |
| Air quality station | `/calidad-aire/estacion/[id]` | ID-based, not slug |
| Transit stop | `/transporte-publico/[operator]/parada/[stopId]` | ID-based |
| Gas station | `/gasolineras/terrestres/[id]` | UUID-based — not human-readable |

**Inconsistency:** `/trenes/estacion/[slug]` (singular) but `/trenes/estaciones` (plural listing). The Renfe station entity page uses `/estacion/` while the airport entity uses `aeropuertos/[iata]` (nested under plural). Recommend normalizing: all entity detail pages under `/[plural]/[slug]`.

### 4.2 Slug Quality

| Entity type | Slug example | Quality |
|-------------|-------------|---------|
| Vessel | `/maritimo/buques/ever-given-123456789` | Human-readable (MMSI embedded) |
| Railway line | `/trenes/linea/ave-madrid-barcelona` | Human-readable |
| Gas station | `/gasolineras/terrestres/clf_1234` | Opaque ID |
| Air quality station | `/calidad-aire/estacion/ES0001A` | Code-based (acceptable for technical data) |
| Transit stop | `/transporte-publico/metro-madrid/parada/1:23456` | Colon in ID — URL-encoding risk |

### 4.3 URL Depth

| Depth | Example | Count (dirs) |
|-------|---------|-------------|
| 4 levels | `/transporte-publico/[operator]/parada/[stopId]` | 6 paths |
| 4 levels | `/espana/[community]/[province]/[topic]` | 6 paths |
| 4 levels | `/maritimo/buques/tipo/[category]` | 2 paths |
| 3 levels | `/trenes/linea/[slug]`, `/maritimo/puertos/[slug]` | ~20 paths |

Maximum depth is 4 levels — borderline. The `/espana/[community]/[province]/[topic]` pattern reaches `/espana/andalucia/almeria/calidad-aire` which is 4 levels. Acceptable but watch for deeper expansions.

### 4.4 Trailing Slash

No `trailingSlash: true` in `next.config.ts`. Next.js default: no trailing slash. Confirmed by absence of any trailing-slash redirect rules. Consistent throughout.

---

## 5. Open Graph + Twitter Cards

### 5.1 OG Image Coverage

| Scope | Status |
|-------|--------|
| Site-wide default | `/og-image.webp` set in root layout — all pages inherit this |
| Per-vertical dynamic OG image | **Only 4 verticals** have `opengraph-image.tsx` |

| Path | opengraph-image.tsx |
|------|---------------------|
| `/noticias/[slug]/` | Yes — dynamic per article |
| `/precio-gasolina-hoy/` | Yes — static branded |
| `/precio-diesel-hoy/` | Yes — static branded |
| `/prediccion-trafico/` | Yes — static branded |
| `/maritimo/` and all sub-pages | No — uses site default |
| `/aviacion/` and all sub-pages | No — uses site default |
| `/trenes/` and all sub-pages | No — uses site default |
| `/calidad-aire/` | No — uses site default |
| `/gasolineras/terrestres/[id]` | No — uses site default |
| `/maritimo/buques/[slug]` | No — uses site default |

All 10 major verticals (maritime, aviation, trains, air quality, transit, roads, radars, EV chargers, etc.) share the same generic site OG image. This significantly reduces click-through from social sharing. Dynamic OG images for vessel, airport, and gas station detail pages would provide meaningful previews.

### 5.2 Twitter Cards

Root layout declares `card: "summary_large_image"` with `@traficolive` handle. All pages inherit this. No per-page Twitter card overrides found. The single global OG image covers all Twitter shares.

---

## 6. Rich Snippets Readiness

| Schema Type | Pages Using It | Coverage |
|-------------|---------------|---------|
| `WebSite` + `SearchAction` | Root layout | Global |
| `Organization` | Root layout | Global |
| `SiteNavigationElement` | Root layout | Global |
| `BreadcrumbList` | Via `Breadcrumbs` component (~170 instances) | Good, but missing on 30+ static pages |
| `FAQPage` | `/radares`, `/radares/[road]`, `/radares/provincia/[province]`, `/gasolineras-24-horas` | 4 pages |
| `Road` | `/carreteras/[roadId]` | Good |
| `Article` | All `/guias/*` pages (8 pages) | Good |
| `NewsArticle` | `/noticias/[slug]` (conditional), `/noticias` list | Good |
| `GasStation` + `LocalBusiness` + `Offer` | `/gasolineras/terrestres/[id]` | Excellent — includes `UnitPriceSpecification` |
| `LocalBusiness` | `/carga-ev/punto/[id]` | Basic |
| `Place` | `/radares/radar/[id]` | Basic |
| `Dataset` | Used for open data endpoints | Present |
| `Service` | Used in some pages | Present |

**Missing rich snippet opportunities:**

| Opportunity | Affected Pages | Priority |
|-------------|----------------|---------|
| `Airport` schema | `/aviacion/aeropuertos/[iata]` | HIGH — AENA airports have all required fields |
| `NewsArticle` | `/maritimo/noticias`, `/profesional/noticias` | MEDIUM |
| `Event` for weather alerts | `/alertas-meteo` | LOW — alerts have start/end times |
| `Product`/`Offer` for maritime fuel | `/gasolineras/maritimas/[id]` | MEDIUM — partial `Offer` present |
| `Place`/`TouristAttraction` for province pages | `/espana/[community]/[province]` | LOW |
| `FAQPage` | `/guias/*` pages (8 guides) | MEDIUM — guides have Q&A structure |
| `HowTo` | `/calculadora`, `/ruta` | LOW |

---

## 7. Alt Text Audit

| Metric | Count |
|--------|-------|
| `<img>` tags in app/ | 6 |
| `<img>` with empty `alt=""` | 0 |
| `<img>` missing `alt=` attribute | 0 |
| `<Image>` (Next.js) with empty `alt=""` | 0 |
| `<Image>` (Next.js) missing `alt=` | 0 |

Alt text coverage is clean for HTML `<img>` and Next.js `<Image>` components. The site relies heavily on map tiles and SVG icons (Lucide) rather than decorative images, minimizing the alt text surface area. No issues found.

---

## 8. Anchor Text

| Metric | Count |
|--------|-------|
| Generic "ver más" / "leer más" / "más información" occurrences in .tsx | 26 |
| Generic ">ver más<" / ">Más información<" link text | 4 |
| ">aquí<" / ">Aquí<" in links | 0 |
| "click aquí" / "haz clic" / "pulsa aquí" | 0 |

The 26 occurrences include non-link UI text (button labels, section headers). Only 4 are actual anchor text. This is acceptable. The nav links throughout use fully semantic anchor text (`"Cámaras DGT"`, `"Precio gasolina hoy"`, etc.). No systemic generic anchor text problem.

---

## Summary

**Duplicate title count:** 57 duplicate static title strings; the double-brand-suffix issue (`title | trafico.live | trafico.live`) affects **47 pages** due to the layout template not being accounted for in page-level metadata.

**H1 issues count:** **30 pages** with no H1 (including major data pages: `/estaciones-aforo`, `/trenes/estaciones`, `/trenes/lineas`, `/trenes/cercanias`, `/estadisticas-transporte`, `/intensidad`, `/explorar/*`). **2 pages** with double H1.

**Orphan page count:** **3 confirmed orphans** with 0 inbound src/ links (`/estadisticas-transporte`, `/analisis/accidentes/[provincia]`, `/analisis/carreteras/[roadId]`); **6 near-orphans** with 0–1 links outside nav/footer (including `/accidentes`, `/municipio`, `/prediccion-trafico`).

**Biggest breadcrumb gap:** The entire trenes sub-tree (`/trenes`, `/trenes/estaciones`, `/trenes/lineas`, `/trenes/cercanias`) and the `/estadisticas-transporte`, `/intensidad`, `/estaciones-aforo`, and all `/explorar/*` pages have zero breadcrumb component usage — high-value content pages completely lacking structured navigation context.

**Internal linking blind spot:** Cross-vertical content links are near-zero. Verticals (/maritimo, /aviacion, /trenes, /calidad-aire, /transporte-publico) do not link to each other from within their content pages. Authority flows only from the global nav/footer template, not from topically related content. Adding `RelatedLinks` (already built in `src/components/seo/`) to each vertical hub page targeting 2–3 related verticals would significantly improve crawl depth and topical authority signals.
