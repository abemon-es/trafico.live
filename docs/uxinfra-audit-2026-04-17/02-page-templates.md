# Page Templates & Layouts Audit — trafico.live
**Date:** 2026-04-17 | **Scope:** `src/app/` pages + layouts + `src/components/layout/`

---

## 1. Layout Catalog

### Root Layout (`src/app/layout.tsx`)

```
<html lang="es">
  <head>  preconnect tiles / GA / fonts </head>
  <body  fonts: Exo2 + DM Sans + JetBrains Mono >
    <StructuredData>  org + website + siteNav schemas
    <SWRProvider>
      <Header />
      {children}
      <StickyFooterAd />
      <Footer />
    </SWRProvider>
    <WebVitals /> <CookieConsent />
    GA scripts (consent-default, gtag) + SW registrations
  </body>
</html>
```

Fonts loaded as CSS custom properties (`--font-heading`, `--font-body`, `--font-mono`).
**Every page** gets Header + StickyFooterAd + Footer unless explicitly overridden.

### Nested Layouts

| Layout file | Purpose | Renders extra UI? |
|---|---|---|
| `maritimo/layout.tsx` | OG metadata scope | No — `<>{children}</>` |
| `maritimo/combustible/layout.tsx` | OG metadata scope | No |
| `maritimo/meteorologia/layout.tsx` | OG metadata scope (template title) | No |
| `maritimo/puertos/layout.tsx` | OG metadata scope | No |
| `gasolineras/terrestres/layout.tsx` | OG metadata scope | No |
| `gasolineras/maritimas/layout.tsx` | OG metadata scope | No |
| `api-docs/layout.tsx` | Full OG + twitter metadata | No — `<>{children}</>` |
| `informes/layout.tsx` | Pass-through | No — returns `children` directly |
| `explorar/layout.tsx` | Tab navigation UI | **YES** — adds sticky tab bar for `territorios / carreteras / infraestructura`; root `/explorar` renders bare |

**Route groups:** None found (no `(group)` directories).

**Total layouts:** 10 (1 root + 9 nested). 8 of 9 nested are metadata-only wrappers. Only `explorar/layout.tsx` injects actual UI.

---

## 2. Page Archetype Patterns

198 total page files identified. Distribution across archetypes:

| Archetype | Count (approx) | Example routes |
|---|---|---|
| VerticalHub | ~18 | `/maritimo`, `/aviacion`, `/trenes`, `/calidad-aire`, `/accidentes`, `/estadisticas-transporte`, `/gasolineras` |
| EntityDetail | ~48 | `/maritimo/buques/[slug]`, `/aviacion/aeropuertos/[iata]`, `/trenes/estacion/[slug]` |
| FullscreenMap | ~7 | `/mapa`, `/trenes/mapa`, `/maritimo/mapa`, `/aviacion/mapa`, `/transporte-publico/mapa`, `/trafico/mapa`, `/gasolineras/mapa` |
| Catalog/Listing | ~25 | `/trenes/estaciones`, `/camaras`, `/radares`, `/gasolineras/terrestres` |
| GeoDetail (LocationShell) | ~15 | `/espana/[community]/[province]`, `/comunidad-autonoma/[community]` |
| StaticContent/Legal | ~8 | `/aviso-legal`, `/politica-privacidad`, `/politica-cookies`, `/sobre` |
| Blog/Article | ~5 | `/noticias`, `/noticias/[slug]`, `/guias/[slug]` |
| Utility/Tool | ~6 | `/ruta`, `/calculadora`, `/gasolineras/cerca`, `/carga-ev/cerca` |
| Redirect stubs | ~4 | `/blog` → `/noticias`, `/blog/[slug]` → `/noticias/[slug]` |

### Hub Pages — Structural Pattern

Followed consistently by: `/maritimo`, `/aviacion`, `/calidad-aire`, `/accidentes`, `/estadisticas-transporte`.

```
[breadcrumbs outside max-w container]
<section hero — full-width gradient>
  icon + breadcrumb label
  h1 (4xl/5xl Exo 2)
  p (lg/xl, max-w-2xl)
  CTA buttons (primary + ghost)
</section>
<div max-w-7xl space-y-12>
  <section> stats grid (2×4 cards, font-mono numbers) </section>
  <section> hero map / live data widget (500-600px) </section>
  <section> tile-card navigation (2-4 cols) </section>
  <section> data tables / lists </section>
  <section> related links / footer CTA </section>
</div>
```

**Inconsistency:** `/trenes/page.tsx` does NOT follow this pattern. Uses `<main class="max-w-7xl">` + inline breadcrumb `<nav>` + `<TrainesContent />`. The hero is a 85vh full-bleed map overlay rendered inside a client component (`content.tsx`), not a separate `<section>` with gradient — diverges from every other hub.

`/transporte-publico/page.tsx` also diverges: no hero gradient section, goes straight to `<main max-w-7xl>` + Breadcrumbs + `<TransportePublicoContent />`.

### Detail Pages — Structural Pattern

Followed by: `/maritimo/buques/[slug]`, `/aviacion/aeropuertos/[iata]`, `/trenes/estacion/[slug]`, `/carreteras/[roadId]`, `/maritimo/puertos/[slug]`.

```
<Breadcrumbs items=[Inicio > Hub > Entity]>
<section hero — entity info card>
  badges (IATA, type, flag)
  h1 (entity name, 2xl/3xl)
  metadata row (location, last seen, status)
</section>
<div max-w-7xl grid>
  left-col (main data, charts, history)
  right-col (map, related entities)
</div>
```

All detail pages use `<Breadcrumbs>` component. Consistent.

### Map Pages (Fullscreen)

All 7 map pages follow an identical minimal pattern:

```
page.tsx:
  export const metadata = { ... }
  return <MapaClient />

MapaClient.tsx (client component):
  className="w-full h-[calc(100dvh-64px)]"
  <MapLibreGL ...>
```

The 64px offset subtracts the sticky header height — relies on an undocumented constant. Footer and StickyFooterAd from root layout are still rendered (the map fills the visual viewport, but HTML structure includes them below the fold).

**Exception:** `/ruta/page.tsx` renders `<RutaContent />` — fullscreen tool, no map, but also no hero section. Fits neither FullscreenMap nor VerticalHub.

### Catalog / Listing Pages

```
<StructuredData />
<div max-w-7xl pt-8>
  <Breadcrumbs />
  <h1> + description text
  [filter bar — client component]
</div>
<ClientContent />  — infinite scroll or paginated grid
<div max-w-7xl pb-10>
  [RelatedLinks]
</div>
```

Inconsistency: `/trenes/estaciones/page.tsx` uses a **manual `<nav>` breadcrumb** (`<ol>` with hardcoded text) instead of `<Breadcrumbs>` component. Same pattern in `/trenes/page.tsx` and `/trenes/lineas/page.tsx`.

### GeoDetail Pages (LocationShell)

Province, community, municipality pages use a shared component system:

```
<LocationShell entity={entity}>
  <HeroSection />      — entity name + coat of arms + key stats
  <StatsBar />         — 5 KPI pills
  <Suspense> <IncidentsSection />
  <Suspense> <GasStationsSection />
  <Suspense> <CamerasSection />
  ... 15+ lazy sections
</LocationShell>
```

Fully consistent within this family. Clean pattern.

---

## 3. Hero Section Patterns

| Variant | Used in | Height | Background |
|---|---|---|---|
| Gradient text hero | `/maritimo`, `/aviacion`, `/calidad-aire`, `/accidentes` | `py-16 md:py-20` (auto) | `linear-gradient(135deg, brand-dark → brand-mid → brand-light)` |
| Full-bleed map hero | `/trenes/content.tsx`, `HomeClient` | `85vh` min 600px max 900px | MapLibre tile layer |
| Embedded map card | `/maritimo` (below gradient hero), `/trafico/page.tsx` | `500px / 600px` | rounded-xl, inside `max-w-7xl` |
| Fullscreen map | `*/mapa/` pages | `calc(100dvh - 64px)` | MapLibre tile layer |
| No hero | `/transporte-publico`, `/estadisticas-transporte`, listing pages | — | `bg-gray-50 / gray-950` |

**Alignment:** All gradient heroes: icon top-left, h1 `text-4xl md:text-5xl font-bold text-white`, subtitle `text-lg/xl max-w-2xl`. Consistent typography.

**Dark decorative blobs:** `/maritimo` and `/aviacion` both add 2 `absolute` circular divs with `opacity-10` for depth. `/calidad-aire` does not. Minor inconsistency.

---

## 4. Section Patterns Inside Hubs

### Card Sections (stats grids)
```
<section aria-label="...">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="rounded-xl border p-5 bg-white dark:bg-gray-900 border-{accent}">
      icon + label + font-mono stat + subtext
    </div>
  </div>
</section>
```
Used in: all 5 conforming hubs. Consistent.

### Data Story Sections (lists / tables)
```
<section>
  <div class="flex items-center justify-between mb-4">
    <h2> section title </h2>
    <Link> Ver todos <ArrowRight> </Link>
  </div>
  <div class="divide-y"> items </div>
</section>
```
Present in hubs with live data (cheapest stations, recent aircraft, active alerts).

### Tile Navigation Sections
```
<section>
  <h2> section title </h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <Link class="rounded-xl border p-5 ... group hover:border-{accent}">
      icon + title + description + ChevronRight
    </Link>
  </div>
</section>
```
Present in: `/maritimo`, `/aviacion`, `/calidad-aire`. Missing in: `/transporte-publico`, `/trenes`.

### Related Links / Footer CTA
`<RelatedLinks>` component used in: `/estaciones-aforo`, `/intensidad`, `/radares`, carretera pages.
`<AdSlot>` used in: `/gasolineras`, `/noticias/[slug]`, radar pages.
**Most hub pages have no explicit footer CTA.** Footer hub cards (global) provide navigational fallback but no conversion CTAs (no newsletter, no API upsell inline).

---

## 5. Consistency Issues

| Issue | Severity | Affected pages |
|---|---|---|
| Trenes hub diverges from hub pattern | High | `/trenes` — no gradient hero, no stats grid, 85vh map hero instead |
| Transporte publico missing hero entirely | High | `/transporte-publico` — straight to content, no section hero |
| Manual breadcrumb `<nav>/<ol>` instead of `<Breadcrumbs>` | Medium | `/trenes`, `/trenes/estaciones`, `/trenes/lineas`, `/trenes/cercanias` |
| Breadcrumbs missing entirely | Medium | `/mapa`, `/ruta`, `/trafico/mapa`, all mapa sub-pages, `/gasolineras/cerca`, `[catchAll]` |
| Decorative blobs inconsistent | Low | `/maritimo` + `/aviacion` have them; `/calidad-aire` + `/accidentes` do not |
| Legal pages use `max-w-3xl`; guias use `max-w-5xl`; hubs use `max-w-7xl` | Low | Intentional width difference but undocumented |
| No inline API upsell / pro CTA on data-heavy pages | Low | All hub pages — premium tier not promoted inline |
| `gasolineras/cerca` + `transporte-publico/mapa` strip breadcrumbs due to geolocation state | Medium | Geolocation utility pages |
| Trenes pages use hardcoded `https://trafico.live` instead of `BASE_URL` env var | Low | `/trenes`, `/trenes/estaciones`, `/trenes/lineas` |

**Biggest outlier:** `/trenes` is the highest-traffic railway page and deviates most from the hub pattern — it is a standalone client component with no server-rendered hero section, no stats grid, and no breadcrumb component.

---

## 6. Canonical Template Proposals

### `<VerticalHub>` — used by maritime, aviation, air quality, accidents

```
+--------------------------------------------------+
| [Breadcrumbs max-w-7xl]                          |
+--------------------------------------------------+
| HERO SECTION (full-width gradient)               |
|  [icon]  trafico.live / Dominio                  |
|  H1 — 4xl/5xl white Exo 2                        |
|  Subtitle — lg/xl white/75                        |
|  [CTA Primary]  [CTA Ghost]                      |
+--------------------------------------------------+
| max-w-7xl px-4 space-y-12                        |
|  STATS GRID 2×4 (font-mono, branded border)      |
|  HERO MAP CARD 500/600px (rounded-xl)            |
|  TILE NAV GRID 3-cols (sub-sections)             |
|  DATA LIST (cheapest / live / alerts)            |
|  RELATED LINKS                                   |
+--------------------------------------------------+
| [Global Footer]                                  |
+--------------------------------------------------+
```

### `<EntityDetail>` — vessel, airport, station, gas station

```
+--------------------------------------------------+
| [Breadcrumbs]                                    |
| ENTITY HERO CARD                                 |
|  type badge + name H1 + status + coordinates    |
+--------------------------------------------------+
| max-w-7xl grid lg:grid-cols-3                    |
|  col-span-2: timeline / stats / history tabs    |
|  col-span-1: mini-map + related entities        |
+--------------------------------------------------+
| [Global Footer]                                  |
+--------------------------------------------------+
```

### `<FullscreenMap>` — all /mapa sub-pages

```
+--------------------------------------------------+
| [Header sticky 64px]                             |
+--------------------------------------------------+
| MAP CLIENT  h-[calc(100dvh-64px)]                |
|  sidebar panel (collapsible)                    |
|  layer controls (top-right)                     |
|  legend (bottom-left)                           |
+--------------------------------------------------+
| [StickyFooterAd + Footer — below fold, ok]       |
+--------------------------------------------------+
```

Define `MAP_HEADER_HEIGHT = 64` as a shared constant.

### `<StaticContent>` — legal, about, guias

```
+--------------------------------------------------+
| [Breadcrumbs]                                    |
| max-w-3xl (legal) / max-w-5xl (guides) mx-auto  |
|  H1 + last-updated date                         |
|  prose sections                                 |
|  [AdSlot mid-article — guides only]             |
+--------------------------------------------------+
| [Global Footer]                                  |
+--------------------------------------------------+
```

### `<Catalog>` — stations, cameras, radars, gas stations

```
+--------------------------------------------------+
| [Breadcrumbs]                                    |
| max-w-7xl                                        |
|  H1 + description + count badge                 |
|  FILTER BAR (client island)                     |
|  RESULTS GRID / TABLE (virtualized)             |
|  PAGINATION or infinite scroll                  |
|  [RelatedLinks]                                  |
+--------------------------------------------------+
| [Global Footer]                                  |
+--------------------------------------------------+
```

---

## 7. Pages Needing Rework to Match Canonical Templates

| Page | Required change |
|---|---|
| `/trenes` | Add gradient hero section, move stats grid above map, use `<Breadcrumbs>` component |
| `/transporte-publico` | Add `<VerticalHub>` hero section (operators count, routes, stops stats) |
| `/trenes/estaciones` | Replace manual `<nav>/<ol>` with `<Breadcrumbs>` component |
| `/trenes/lineas` | Same as above |
| `/trenes/cercanias` | Same as above |
| `/trenes/cercanias/[network]` | Same as above |
| `/gasolineras/cerca` | Add breadcrumbs (SEO) |
| `/ruta` | Add breadcrumbs (SEO) |
| `/mapa` | Extract `MAP_HEADER_HEIGHT` constant shared with all mapa pages |
| All `/*/mapa` pages | Same constant extraction; verify Footer not visually overlapping |
