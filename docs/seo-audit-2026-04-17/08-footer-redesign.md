# 08 — Footer Redesign Spec

**Audit date:** 2026-04-17  
**File:** `src/components/layout/Footer.tsx`  
**Data source:** `src/components/layout/nav/NavData.ts` (`footerColumns`, `footerCities`)

---

## 1. Current State Analysis

### Structure

The footer renders four distinct zones inside a `bg-tl-950` (near-black navy) container:

| Zone | Component | Details |
|------|-----------|---------|
| Brand bar | Logo + tagline + data source badges | 4 source badges: DGT NAP, AEMET, MITERD, MINETUR |
| Hub cards | 6 icon cards (grid 3/6 cols) | Mirrors mega menu panel hubs; links to each section hub |
| Link columns | 6-column link grid (2/3/6 cols responsive) | Headers with icon + colour accent bar |
| City strip | 15 pill-link nav | `/trafico/{slug}` links, active state detected via `usePathname` |
| Bottom bar | Live indicator + copyright + legal | Animated green dot, abemon credit, `CookieSettingsButton` |

### Link count (exact)

| Column | Links |
|--------|-------|
| Tráfico | 8 |
| Carreteras | 10 |
| Combustible | 9 |
| Marítimo | 8 |
| Explorar | 11 |
| Profesional | 8 |
| **Subtotal columns** | **54** |
| Hub cards (6 hub links) | 6 |
| City strip pills | 15 |
| Bottom bar (abemon) | 1 |
| **Grand total** | **76** |

### Brand presentation

- Logo: `<Logo variant="horizontal" size="sm" />` — no href (non-clickable)
- Tagline: limited to road traffic ("incidencias, cámaras, radares…") — misses multimodal scope added in 2026-04
- Mission sentence does not match current platform breadth

### Background / theme

- `dark bg-tl-950` — very dark navy (`#000025`)
- Gradient accent bar at top: `tl-600 → tl-400 → tl-amber-400`
- All text: grays on dark (`text-gray-400`, `text-gray-500`, `text-gray-300`)
- Border separators: `border-tl-800/50`

### Font usage

- Column headers: `font-heading` (Exo 2), 11px uppercase + tracking
- Links: `text-sm` DM Sans body, `text-gray-400`
- Badges: `font-data` (JetBrains Mono), 11px

---

## 2. Issues

### Link density
76 total links is excessive. Google's reasonable footer link guidance is ~25-40. The dual hub-card + link-column pattern means every section appears twice (hub card + expanded links), adding visual noise without SEO value.

### Duplicate links
- `/mapa` listed in Tráfico column AND `/estadisticas` appears in both Carreteras and Profesional columns
- `/peajes` appears in both Carreteras and Combustible columns
- `/calculadora` appears in Combustible mega menu and Profesional mega menu
- `/mejor-hora` appears in Tráfico column and Profesional mega menu
- `/informe-diario` appears in Explorar mega menu and Profesional mega menu
- Hub cards + link columns = structural duplication (6 extra links pointing to the same section hubs)

### Missing canonical links
- No `/politica-privacidad` pill (buried in Profesional column but not prominent)
- No `/aviso-legal` prominent link (same)
- No `/sobre` / contact in a dedicated Empresa section
- No `/media` press link surfaced prominently
- Cookie settings exist but rely on JS-only `CookieSettingsButton` with no fallback

### SEO — over-optimization risk
54 link-column links + 15 city pills + 6 hub cards = 76 crawlable anchors in every single page footer. Crawl budget diluted across thin/stub pages (e.g. `/maritimo/noticias`, `/profesional/noticias`). Long-tail pages that are not yet content-complete should not be in the footer.

### Tagline staleness
The brand description references only road traffic features, ignoring trenes, aviación, marítimo, calidad del aire added in 2026-04.

### Responsive behaviour
- Hub card grid: `grid-cols-3 lg:grid-cols-6` — on mobile 3 cards wide is tight at 375px
- Link columns: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` — 10-link columns get very long on 2-col mobile layout
- City strip: `flex-wrap` works but 15 pills can overflow 2-3 rows on small screens
- Bottom bar: `flex-col sm:flex-row` — acceptable but credit + legal is cramped

---

## 3. Redesign Spec — White / Clean

### Concept

Replace dark navy with a near-white surface. The footer becomes a clean information architecture layer, not a visual extension of the dark header. A thin `tl-600` rule at top provides brand continuity.

### Background & surface

| Token | Value | Usage |
|-------|-------|-------|
| `bg-gray-50` | `#f9fafb` | Footer background |
| `border-t-2 border-tl-600` | `#1b4bd5` | Top accent rule |
| `text-gray-900` | `#111827` | Column headers |
| `text-gray-500` | `#6b7280` | Links default |
| `text-gray-700` | `#374151` | Links hover |
| `bg-white` | — | Legal bar background |
| `border-gray-200` | — | Section dividers |

### Layout — 4 rows

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▐▌▐▌  2px tl-600 top rule                                           │
├────────────────────────┬────────────────────────────────────────────┤
│ ROW 1 — Brand + social │ pt-10 pb-6                                 │
│                        │                                            │
│ [Logo]  tagline text   │  [Twitter] [GitHub] [RSS]  [Newsletter →] │
│ (multimodal scope)     │                                            │
├────────────────────────┴────────────────────────────────────────────┤
│ ROW 2 — 5 link columns  pt-8 pb-8  border-t border-gray-200        │
│                                                                     │
│ Productos  │  Datos       │  Empresa     │  Recursos   │ Herram.   │
│ ─────────  │  ─────────   │  ─────────   │  ─────────  │ ───────   │
│ 7 links    │  6 links     │  6 links     │  5 links    │ 6 links   │
├────────────────────────────────────────────────────────────────────┤
│ ROW 3 — Cities strip  pt-4 pb-4  border-t border-gray-200          │
│ Tráfico por ciudad:  [Madrid] [Barcelona] [Valencia] … 15 pills    │
├────────────────────────────────────────────────────────────────────┤
│ ROW 4 — Legal bar  pt-4 pb-6  bg-white border-t border-gray-200    │
│ © 2026 trafico.live · abemon · [DGT NAP] [AEMET] [MITERD]         │
│                                    [Privacidad] [Legal] [Cookies]  │
└────────────────────────────────────────────────────────────────────┘
```

### Row 1 — Brand + Social

```
[Logo horizontal sm]
Plataforma de inteligencia multimodal en tiempo real: tráfico,
trenes, aviación, marítimo, calidad del aire y combustible.
Datos oficiales de DGT, AEMET, Renfe, AENA y MITECO.

                    [X/Twitter]  [RSS]  [————— tu email —————] [Suscribir →]
```

- Logo: `href="/"` (make it clickable — currently missing)
- Tagline: updated to multimodal scope (max 2 lines)
- Social: Twitter `@traficolive`, RSS `/rss.xml`
- Newsletter: `<form>` pointing to `/api/newsletter` (future), placeholder until activated

### Row 2 — 5 Link Columns (max 7 links each)

| Column | Links (7 max) |
|--------|--------------|
| **Productos** | Mapa en vivo, Incidencias, Cámaras DGT, Trenes en vivo, Aviación, Marítimo, Calidad del aire |
| **Datos** | Precio gasolina, Precio diésel, Radares, Estaciones de aforo, IMD (intensidad), Puertos España, Aeropuertos AENA |
| **Empresa** | Sobre nosotros, Prensa / Media, API REST, Aviso legal, Política de privacidad, Cookies |
| **Recursos** | Guías, Noticias, Informe diario, Calculadora ruta, Etiqueta ambiental, Blog |
| **Herramientas** | Zonas ZBE, Cargadores EV, Peajes, Gasolineras baratas, Mejor hora para viajar, Puntos negros, Restricciones |

Total column links: **40**

Removed from columns vs current: hub duplicates, stub pages (`/maritimo/noticias`, `/profesional/noticias`, `/historico`), `/corredores` (unfinished), `/pulso` (thin), `/clima` (low priority).

### Row 3 — Cities strip (unchanged content, restyled)

15 cities kept. Restyled: `bg-white border border-gray-200 text-gray-600 hover:border-tl-600 hover:text-tl-700 rounded-full text-xs px-3 py-1.5`.

Active state: `bg-tl-50 border-tl-600 text-tl-700`.

### Row 4 — Legal bar

```
© 2026 trafico.live · Desarrollado por abemon
[DGT NAP] [AEMET] [MITERD] [MINETUR]     Privacidad · Aviso legal · Cookies
```

- Source badges: monospace `font-mono text-[10px] text-gray-400 bg-gray-100 border border-gray-200`
- Legal links: `text-xs text-gray-500 hover:text-gray-800`
- Live indicator removed from footer (already present in header/map pages)

---

## 4. Component Spec

### Component tree

```
TraficoFooter                        (replaces Footer)
  ├── TraficoFooterBrand             (Row 1 — logo, tagline, social, newsletter)
  ├── TraficoFooterLinks             (Row 2 — 5 columns × ≤7 links)
  ├── TraficoFooterCities            (Row 3 — city pills, active state)
  └── TraficoFooterLegal             (Row 4 — copyright, badges, legal links)
```

### Props

```typescript
// TraficoFooter
interface TraficoFooterProps {
  variant?: "light" | "dark";  // default: "light"
}

// TraficoFooterLinks
interface TraficoFooterLinksProps {
  columns: FooterColumnV2[];
}
interface FooterColumnV2 {
  title: string;
  links: { name: string; href: string }[];
}

// TraficoFooterCities
interface TraficoFooterCitiesProps {
  cities: { name: string; slug: string }[];
}

// TraficoFooterLegal
interface TraficoFooterLegalProps {
  year: number;
  sources: string[];
  legalLinks: { name: string; href: string }[];
}
```

### Dark parity

When `variant="dark"` (e.g. map pages with dark body):

| Light token | Dark equivalent |
|-------------|----------------|
| `bg-gray-50` | `bg-tl-950` |
| `text-gray-900` | `text-gray-100` |
| `text-gray-500` | `text-gray-400` |
| `border-gray-200` | `border-tl-800/50` |
| City pill: `bg-white border-gray-200` | `bg-tl-900 border-tl-800` |
| Legal bar: `bg-white` | `bg-tl-950` |

---

## 5. Link Organisation

### Final link budget

| Zone | Count |
|------|-------|
| Row 2 columns (5 × ≤7) | 37 |
| Row 3 city pills | 15 |
| Row 4 legal links | 3 |
| Row 1 social | 2 |
| **Total** | **57** |

Down from **76** (-25%). Hub card zone eliminated entirely (saves 6 duplicate hub links + visual clutter).

### SEO priority rationale

**Keep** (high traffic / high intent): Mapa en vivo, Incidencias, Cámaras DGT, Precio gasolina, Precio diésel, Radares, Gasolineras baratas, Cargadores EV, Zonas ZBE, Peajes, Trenes en vivo, Aeropuertos AENA, Calidad del aire.

**Keep** (editorial / legal): Aviso legal, Privacidad, Sobre nosotros, API REST, Blog, Noticias.

**Remove from footer** (stub, low-content, or redundant): `/historico`, `/pulso`, `/corredores`, `/maritimo/noticias`, `/profesional/noticias`, `/maritimo/zonas`, `/informa-diario` (keep as resource), `/clima` (thin), hub card links (duplicated by columns), `/restricciones` moved to Herramientas.

---

## 6. Launch Spec

### Files to modify

| File | Change |
|------|--------|
| `src/components/layout/nav/NavData.ts` | Add `footerColumnsV2: FooterColumnV2[]` export (5 columns, no icons needed); keep `footerCities` unchanged |
| `src/components/layout/Footer.tsx` | Replace with 4-row white layout; split into 4 sub-components inline or extracted |
| `src/app/globals.css` | No changes needed — all tokens already exist |
| `src/app/layout.tsx` | No changes needed |

### Extraction of footer data

Add to `NavData.ts` after existing `footerColumns`:

```typescript
export const footerColumnsV2: FooterColumnV2[] = [
  { title: "Productos", links: [ /* 7 links */ ] },
  { title: "Datos",     links: [ /* 6 links */ ] },
  { title: "Empresa",   links: [ /* 6 links */ ] },
  { title: "Recursos",  links: [ /* 6 links */ ] },
  { title: "Herramientas", links: [ /* 7 links */ ] },
];
```

Keep old `footerColumns` during transition (rename to `footerColumnsLegacy` once new footer ships).

### Minimal migration steps

1. Add `footerColumnsV2` to `NavData.ts`
2. Rewrite `Footer.tsx` in place — no new files required
3. Remove `"use client"` if newsletter form deferred (Row 1 can be a server component; `usePathname` for city pills requires client boundary only in `TraficoFooterCities`)
4. Update tagline string
5. Make Logo `href="/"` clickable

### Risk

Low. Footer is isolated; no shared state with other components beyond `usePathname` in city strip and `CookieSettingsButton`.

---

*Audit produced by sub-agent for SEO audit series 2026-04-17.*
