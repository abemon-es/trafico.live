# Component Library Audit — trafico.live
**Date:** 2026-04-17 | **Scope:** `src/components/` (113 files) + `src/app/` pages (299 TSX files)

---

## 1. Component Inventory

### UI Primitives

| Component | Location | Status |
|---|---|---|
| EmptyState | `src/components/ui/EmptyState.tsx` | Canonical — exists, has icon+title+desc+action |
| StaleDataBanner | `src/components/ui/StaleDataBanner.tsx` | Canonical — SWR-backed health poll |
| SectionSkeleton | `src/components/location/SectionSkeleton.tsx` | Semi-canonical — only used inside location shell |
| Badge / Pill | **None** | Ad-hoc only — inline `rounded-full text-xs` in ~40 pages |
| Button (primary) | **None** | Ad-hoc only — see §3 |
| Card | **None** | Ad-hoc — at least 5 different shell patterns |
| Modal | `src/components/incidents/IncidentModal.tsx`, `src/components/cameras/CameraModal.tsx` | Domain-specific, not generic |
| Drawer | **None** | Does not exist |
| Tooltip | **None** | Does not exist |
| Input / Select | **None** | Ad-hoc per form |

### Data Display

| Component | Location | Status |
|---|---|---|
| StatCard | `src/components/stats/EnhancedStatsCards.tsx` (private fn), `src/components/location/StatsBar.tsx` (private fn) | **NOT canonical** — 11 independent definitions across app pages |
| FuelPriceChart | `src/components/charts/FuelPriceChart.tsx` | Domain-specific |
| StationPriceHistory | `src/components/charts/StationPriceHistory.tsx` | Domain-specific |
| TrafficHeatmap | `src/components/charts/TrafficHeatmap.tsx` | Domain-specific |
| TimeSeriesChart | `src/components/stats/TimeSeriesChart.tsx` | Generic-ish, single consumer |
| BreakdownCharts | `src/components/stats/BreakdownCharts.tsx` | Domain-specific |
| TrafficComparison | `src/components/stats/TrafficComparison.tsx` | Domain-specific |
| Heatmap | `src/components/map/ProvinceHeatmap.tsx` | Map-layer, not table |
| Table | **None** | Ad-hoc per page |

### Navigation

| Component | Location | Status |
|---|---|---|
| Breadcrumbs | `src/components/seo/Breadcrumbs.tsx` | **Canonical** — used on 30+ pages, includes JSON-LD |
| Header | `src/components/layout/Header.tsx` | Canonical |
| DesktopNav | `src/components/layout/nav/DesktopNav.tsx` | Canonical |
| MobileMenu | `src/components/layout/nav/MobileMenu.tsx` | Canonical |
| MegaMenuPanel | `src/components/layout/nav/MegaMenuPanel.tsx` | Canonical |
| Footer | `src/components/layout/Footer.tsx` | Canonical |
| SectionNav (in-page tabs) | `src/components/location/SectionNav.tsx` | Semi-canonical — location shell only |
| Tabs | **None** | Ad-hoc — 5+ pages use local `activeTab` state + inline button rows |
| Pagination | **None** | Ad-hoc — 6+ pages inline (`Página N de M`) |

### Forms

| Component | Location | Status |
|---|---|---|
| PriceAlertForm | `src/components/fuel/PriceAlertForm.tsx` | Domain-specific |
| DigestForm | `src/components/seo/DigestForm.tsx` | SEO utility |
| ApiKeyForm | `src/app/api-docs/ApiKeyForm.tsx` | Ad-hoc page component |
| SearchFilters | `src/components/search/SearchFilters.tsx` | Domain-specific |
| Field / Input | **None** | Ad-hoc per page |

### Feedback

| Component | Location | Status |
|---|---|---|
| EmptyState | `src/components/ui/EmptyState.tsx` | Canonical — but **~25 pages ignore it** and inline their own |
| StaleDataBanner | `src/components/ui/StaleDataBanner.tsx` | Canonical (home only) |
| SectionSkeleton | `src/components/location/SectionSkeleton.tsx` | Semi-canonical |
| Toast / Notification | **None** | Does not exist |
| Alert / Banner (generic) | **None** | Ad-hoc per page |
| Inline skeleton divs | `src/app/*/content.tsx` (many) | Ad-hoc `animate-pulse` blocks, ~20 instances |

### Layout

| Component | Location | Status |
|---|---|---|
| Header / Footer | `src/components/layout/` | Canonical |
| ThemeToggle | `src/components/layout/ThemeToggle.tsx` | Canonical |
| LocationShell | `src/components/location/LocationShell.tsx` | Canonical (province/city pages) |
| HeroSection | `src/components/location/HeroSection.tsx` | Semi-canonical (location only) |
| Container / Section | **None** | Ad-hoc `max-w-7xl mx-auto px-4` repeated everywhere |
| ProvinceContextBanner | `src/components/location/ProvinceContextBanner.tsx` | Domain-specific |

### Domain-Specific

| Component | Location | Notes |
|---|---|---|
| CameraCard / CameraSection | `src/components/cameras/` | Used in location sections |
| GasStationCard / FuelPriceTable | `src/components/gas-stations/` | Multi-consumer |
| IncidentMarker | `src/components/map/IncidentMarker.tsx` | Map layer |
| TraficoMap | `src/components/map/TraficoMap.tsx` | Primary map wrapper |
| TraficoMapControls | `src/components/map/TraficoMapControls.tsx` | Layer toggle (canonical version) |
| VesselLiveMap / VesselOverview | `src/components/maritimo/` | Maritime hub |
| PortActivity / VoyagesList | `src/components/maritimo/` | Maritime hub |
| IncidentTicker | `src/components/home/IncidentTicker.tsx` | Home only — not reusable |
| LiveCounterStrip | `src/components/home/LiveCounterStrip.tsx` | Home only — not reusable |
| AccidentTrendChart | `src/components/inteligencia/AccidentTrendChart.tsx` | Single consumer |

---

## 2. Canonical vs Ad-hoc

| Category | Canonical | Ad-hoc |
|---|---|---|
| UI Primitives | EmptyState, StaleDataBanner, SectionSkeleton | Badge/Pill, Button, Card, Tooltip, Drawer, Input, Select |
| Data Display | FuelPriceChart (domain), TimeSeriesChart | StatCard (11 copies), inline tables, skeleton divs |
| Navigation | Breadcrumbs, Header, Footer, Nav stack | Tabs (5+ pages), Pagination (6+ pages) |
| Forms | PriceAlertForm, DigestForm | Field/Input, Submit states |
| Feedback | EmptyState (exists but ignored) | ~25 inline empty states, ~20 inline skeletons |
| Layout | Header, Footer, LocationShell | Container/Section wrapper (missing) |

**Key duplications:**

- **StatCard** — 11 independent local definitions (`function StatCard`) across: `incidencias/estadisticas`, `incidencias/analytics`, `transporte-publico/[operator]`, `prediccion/precio-combustible`, `trenes/cercanias/[network]`, `historico`, `estadisticas`, `estadisticas/accidentes`, `estadisticas/accidentes/[provincia]`, `stats/EnhancedStatsCards.tsx`, `location/StatsBar.tsx`.
- **LayerPanel** — 2 implementations: `src/app/mapa/layer-panel.tsx` (uses raw hex + inline styles, left-anchored) vs `src/components/map/TraficoMapControls.tsx` (uses brand tokens, right-anchored, richer API). Only `TraficoMap` uses the canonical version; `/mapa` uses its own fork.
- **FAQAccordion** — 3 implementations: `components/v16/V16InfoSection.tsx` (stateful per-item), `app/gasolineras/maritimas/MaritimasClient.tsx` (FAQSection), `app/maritimo/combustible/MaritimasClient.tsx` (FAQSection). Plus 29 pages with inline `faqItems` arrays and raw `map()` rendering.
- **EmptyState** — canonical component exists at `components/ui/EmptyState.tsx` but ~25 pages bypass it with inline JSX (`<h3>No hay...</h3>` + `<p>` + optional icon).
- **Primary CTA button** — 23+ ad-hoc inline strings (6 in components, 17+ in app pages). No canonical `<Button>` component.

---

## 3. Consistency Audit

### Button Variants
No canonical Button component. Primary CTAs are inline strings with at least **4 distinct shape patterns**:

| Pattern | Example location |
|---|---|
| `bg-tl-600 hover:bg-tl-700 text-white ... rounded-lg px-5 py-2.5` | `home/TwoMaps.tsx:78`, `home/ProfessionalBanner.tsx:68` |
| `bg-tl-600 hover:bg-tl-700 text-white ... rounded-lg px-4 py-2` | `camaras/[city]/page.tsx:303` |
| `px-6 py-3 bg-tl-600 hover:bg-tl-700 text-white ... rounded-lg` | `camaras/content.tsx:245`, `alertas-meteo/content.tsx:565` |
| `bg-tl-amber-700 text-white ... px-3 py-1.5 rounded-lg` | `semana-santa-2026/page.tsx:660` |

Secondary/ghost variants are equally inconsistent: `bg-white border border-tl-200`, `bg-tl-50 border border-tl-200`, `bg-gray-50 border border-gray-200` — no shared class string.

### Card Patterns
At least **5 shell variants** found in components alone:

| Variant | Token |
|---|---|
| `bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4` | Most common (home, stats) |
| `bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4` | Fuel/roads sections |
| `bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm` | `home/LiveTrafficFlow.tsx` |
| `rounded-2xl border … p-5 shadow-sm` (dynamic border/bg) | `fuel/PriceAlertForm.tsx` |
| `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6` | `insights/ReportSummary.tsx` |

Radius: `rounded-lg` (140 uses in components), `rounded-xl` (79), `rounded-2xl` (50) — no consistent tier.
Shadow: `shadow-sm` dominates, `shadow-md` on hover only; no semantic naming.

### Text Sizes
5,343 Tailwind text-size classes across app pages — covers full scale `text-[10px]` → `text-4xl`. No fluid typography via `tailwind-utopia` — all hardcoded breakpoint sizes. Brand convention says Exo 2 headings / DM Sans body / JetBrains Mono stats, but several pages use font-family strings directly (`font-['DM_Sans']`, `font-['JetBrains_Mono']`) instead of `font-heading` / `font-body` / `font-mono` utilities.

### Color Usage
- `tl-*` / `tl-amber-*` tokens: correct usage on primary interactive elements.
- `bg-gray-*` / `text-gray-*` / `border-gray-*`: **8,312 occurrences** — expected for structural gray; generally acceptable.
- Generic semantic colors violating token rules: **687 occurrences** of `bg-blue-*`, `bg-green-*`, `bg-red-*`, `bg-yellow-*`, `bg-purple-*`, `bg-indigo-*`, `bg-emerald-*`.
- Raw hex literals in `className`/`style`: **131 occurrences** — concentrated in `mapa/layer-panel.tsx` (hardcoded `#1b4bd5`, `#e2e8f0`, `#7da4f0`, etc.) and map popup HTML strings.
- `bg-amber-*` / `bg-orange-*` (non-token): **70 occurrences** in components — should use `tl-amber-*`.

---

## 4. Missing Components

| Component | Gap | Impact |
|---|---|---|
| **LayerToggle (canonical)** | `TraficoMapControls` exists and is correct, but `mapa/layer-panel.tsx` is a parallel fork (raw hex, left-anchored). `/mapa` must be migrated. | Map page shows brand regression |
| **StatCard (canonical)** | 11 local copies, no shared export. Props differ: some have sparkline, some have subLabel, none are identical. | Any styling fix requires 11 edits |
| **TickerStrip (canonical)** | `IncidentTicker` is home-only hardcoded. `LiveCounterStrip` is also home-only. No reusable marquee/ticker primitive. | Cannot reuse for trains, maritime, airports |
| **FAQAccordion (canonical)** | 3 implementations + 29 pages with inline data. Only `V16InfoSection.tsx:FAQAccordion` is stateful. CityFAQ renders static HTML (no expand/collapse). | SEO + a11y fragmented |
| **CTA Button system** | Zero canonical Button component. 23+ ad-hoc inline variants across 4 shape/size combos. | Brand consistency broken on every new page |
| **Pagination** | 6+ pages each build their own prev/next + page N of M. No shared Pagination component. | Duplicate work on every paginated list |
| **Skeleton (generic)** | `SectionSkeleton` covers location pages. All other pages (`incidencias`, `estadisticas`, maps, transit) inline their own `animate-pulse` divs. | ~20 ad-hoc skeletons |
| **Toast / Alert** | No system. Success/error feedback only exists inside form components (PriceAlertForm uses inline state). | Cannot give feedback outside forms |

---

## 5. Proposed Canonical Library Structure

```
src/components/ui/
├── Button.tsx            # primary / secondary / ghost / danger; sm / md / lg
├── Badge.tsx             # Pill with color prop (uses tl-* tokens only)
├── Card.tsx              # shell: rounded-xl shadow-sm border — single variant
├── StatCard.tsx          # icon + value + label + optional sparkline + delta
├── EmptyState.tsx        # (exists — keep, remove dark:bg-tl-50 bug on line 25)
├── Skeleton.tsx          # generic shimmer block with w/h props
├── Alert.tsx             # info / warning / error / success (replaces StaleDataBanner + inline banners)
├── Pagination.tsx        # prev / next / page N of M
├── Tabs.tsx              # controlled tab bar, no routing
├── FAQAccordion.tsx      # item list, animated expand, JSON-LD optional
├── TickerStrip.tsx       # marquee with items[] + speed prop
└── StaleDataBanner.tsx   # (exists — keep as-is)

src/components/map/
└── LayerToggle.tsx       # canonical = current TraficoMapControls.tsx (rename + migrate /mapa)
```

---

## Summary

- **Total components found:** 113 in `src/components/` + ~40 significant reusable components embedded in `src/app/` pages.
- **Canonical:** ~15 (Breadcrumbs, Header, Footer, Nav stack, TraficoMap, TraficoMapControls, EmptyState, StaleDataBanner, SectionSkeleton, LocationShell, domain charts).
- **Ad-hoc / duplicated:** ~98 embedded or duplicated fragments.
- **Biggest duplication:** `StatCard` — 11 local definitions, zero shared exports.
- **Top 5 missing canonical components:** (1) Button system, (2) StatCard, (3) FAQAccordion, (4) TickerStrip, (5) Pagination.
