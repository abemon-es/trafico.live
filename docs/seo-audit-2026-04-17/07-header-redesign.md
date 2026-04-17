# 07 — Header / Navigation Redesign Spec

**Date:** 2026-04-17  
**Scope:** `src/components/layout/Header.tsx` + `src/components/layout/nav/`

---

## 1. Current State Analysis

### Header shell (`Header.tsx`)
- Dark gradient: `bg-gradient-to-r from-tl-900 via-tl-950 to-tl-900` (near-black navy, #000245 → #000025)
- Fixed height `h-16` (64px), `sticky top-0 z-50`
- Layout: logo-left | nav-center | [ThemeToggle + Hamburger]-right
- No backdrop-blur on the header bar itself; mega menu overlay uses `bg-black/20 backdrop-blur-[2px]`
- `themeColor` in viewport is `#1b4bd5` (tl-600), but header is tl-950 — mismatch

### DesktopNav.tsx
- 6 mega-menu trigger buttons + 1 search button = 7 interactive items
- Button text-only (no icons) with `text-gray-300` default, `text-white` active
- `px-2.5 py-2 rounded-lg text-sm font-medium` — compact spacing
- Hover intent: 200ms open delay, 500ms close delay — good UX
- Keyboard: `ArrowDown` opens panel, `Escape` closes and returns focus — correct ARIA pattern
- `aria-expanded` on each trigger, `aria-controls="mega-panel-shell"` — partial compliance
- No `role="menubar"` / `role="menuitem"` on the nav wrapper or buttons
- Search button has `aria-label="Buscar"` but the kbd hint shows `⌘K` only — no role or keyboard shortcut hint for non-mac users

### MegaMenuPanel.tsx (shell + content)
- `fixed left-0 right-0 top-16 z-40` — drops below the 64px header bar
- Content: HubColumn (w-52 sidebar with live stats) + CategoryGrid (dynamic column count per panel)
- Panel `Explorar` has 6 categories × up to 6 items = 36 links in one dropdown — largest panel
- Panel `Combustible` has 5 categories — tied for widest column layout
- Panel `Carreteras` has 4 categories with 14 total items
- CityStrip only on `trafico` panel (8 cities + "Todas →")
- Live widgets: Traffic (incidents + V16 + cameras), Fuel (95/Diesel prices), Maritime, Professional
- No `role="menu"` on the panel; links have no `role="menuitem"` — accessibility gap

### MobileMenu.tsx
- Expands below header as `height: auto` with spring animation, not a right-side drawer
- Background: `bg-tl-950` (dark, not theme-aware for the container itself — class `dark` is hardcoded)
- Accordion per panel: hub link + chevron toggle + staggered item list
- Full-viewport search overlay replaces the menu content — good pattern
- `max-h-[85vh] overflow-y-auto` — long menus will scroll inside, which is acceptable but not ideal on small phones

### NavData.ts — catalog counts

| Panel | Categories | Total links |
|-------|-----------|-------------|
| Tráfico | 3 | 11 |
| Carreteras | 4 | 14 |
| Combustible | 5 | 14 |
| Marítimo | 3 | 11 |
| Explorar | 6 | 23 |
| Profesional | 3 | 12 |
| **Total** | **24** | **85** |

Footer uses the same `NavData.ts` via `footerColumns`. No duplicate `/mapa` found in nav panels (appears once as "Mapa en vivo" in Tráfico > En directo). However `/maritimo/mapa` appears in **both** `Combustible` (Marítimo sub-section) and `Marítimo` panel — duplicate cross-panel entry. `/estadisticas` appears in `Carreteras > Datos` and `Profesional > API y datos` — intentional but worth noting.

---

## 2. Issues Identified

| # | Issue | Severity |
|---|-------|----------|
| 1 | Dark navy header clashes with white/light page content below — heavy visual weight on every page | High |
| 2 | No backdrop-blur on header bar — reads as a solid wall | Medium |
| 3 | `dark` class hardcoded on MobileMenu container — ignores user theme preference for the menu shell | High |
| 4 | 85 total nav links across 6 panels — `Explorar` alone has 23 links with 6 categories | High |
| 5 | `/maritimo/mapa` and `/maritimo/combustible` duplicated in both Combustible and Marítimo panels | Medium |
| 6 | No `role="menubar"`, `role="menu"`, or `role="menuitem"` ARIA roles on nav or panel | Medium |
| 7 | Search kbd hint shows `⌘K` only — Windows/Linux users see unfamiliar symbol | Low |
| 8 | No visual indication of logo being a link (no underline, no hover state documented) | Low |
| 9 | ThemeToggle is the only "utility" action — no login/API key shortcut for professional users | Medium |
| 10 | Mobile menu is a vertical accordion — deep nesting means users must scroll to reach lower panels | Medium |
| 11 | `themeColor` is tl-600 (#1b4bd5) but header is tl-950 — browser chrome color mismatch | Low |
| 12 | No skip-to-content link visible — keyboard-only users must tab through all 7 nav items | Medium |

---

## 3. Redesign Spec — White / Clean Design

### Design Direction
White background, minimal chrome, strong typographic hierarchy. Brand color (tl-600) used only as accent — not as the default background. Inspired by: Vercel, Linear, Stripe nav bars.

### Proposed Top-Bar Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ h-14 (56px) white bg, border-b border-gray-100, sticky, blur        │
│                                                                    │
│  [trafico.live logo]   Tráfico  Carreteras  Combustible  │  [🔍 ⌘K]  [🌙]  │
│                         Marítimo  Explorar  Más ▾         │         │
└────────────────────────────────────────────────────────────────────┘
        ↑ logo left         ↑ primary nav center-left    ↑ utilities right
```

- **Height:** 56px (`h-14`) default; 48px on scroll (CSS transition)
- **Background:** `bg-white/95 backdrop-blur-md` — translucent white, frosted
- **Border:** `border-b border-gray-100` default; `border-gray-200 shadow-sm` on scroll
- **Logo:** `trafico.live` wordmark + icon, dark variant on white background
- **Primary nav:** 5 visible items (Tráfico, Carreteras, Combustible, Marítimo, Explorar) + "Más" dropdown for Profesional + API
- **Search:** Pill button `[🔍 Buscar... ⌘K]` — always visible on desktop (lg+), icon-only on md
- **Theme toggle:** `rounded-full` button, right-most before hamburger
- **No hamburger on desktop** (md+)

### Scroll Behavior
```
not-scrolled:  h-14, bg-white/90, border-gray-100, shadow-none
scrolled:      h-12, bg-white/95 backdrop-blur-md, border-gray-200, shadow-sm
```

---

## 4. Component Spec

### Component Tree

```
TraficoHeader
├── TraficoHeaderBrand          (logo)
├── TraficoHeaderNav            (desktop nav, mega menu triggers)
│   ├── NavTrigger × 5          (Tráfico, Carreteras, Combustible, Marítimo, Explorar)
│   ├── NavTrigger "Más"        (Profesional + API)
│   └── MegaMenuShell           (existing, reused)
└── TraficoHeaderUtilities
    ├── SearchPill              (Cmd+K, visible lg+; icon md)
    ├── ThemeToggle             (existing)
    └── MobileMenuButton        (md: hidden)
```

### Props

| Component | Props | Notes |
|-----------|-------|-------|
| `TraficoHeader` | `className?: string` | Provides NavStateContext |
| `TraficoHeaderBrand` | `theme: "light"\|"dark"` | Uses `Logo` component |
| `TraficoHeaderNav` | `panels: MegaMenuPanel[]` | Passes down to NavTrigger |
| `NavTrigger` | `panel: MegaMenuPanel \| MoreMenu`, `isOpen`, `onOpen`, `onClose` | Replaces current anonymous buttons |
| `SearchPill` | `onOpen: () => void`, `compact?: boolean` | compact = icon-only below lg |
| `TraficoHeaderUtilities` | none | Slot for ThemeToggle + SearchPill + Hamburger |

### States Matrix

| State | bg | border | height | shadow |
|-------|----|--------|--------|--------|
| top-of-page, light mode | `bg-white/90` | `border-gray-100` | `h-14` | none |
| scrolled, light mode | `bg-white/95 backdrop-blur-md` | `border-gray-200` | `h-12` | `shadow-sm` |
| top-of-page, dark mode | `bg-gray-950/90` | `border-gray-800` | `h-14` | none |
| scrolled, dark mode | `bg-gray-950/95 backdrop-blur-md` | `border-gray-800` | `h-12` | `shadow-sm` |
| mega menu open | same + `ring-0` | same | same | `shadow-none` (mega panel has shadow) |
| mobile menu open | same | `border-b-0` | same | none |

---

## 5. Mega Menu Redesign

### Layout Change: Hub-first → Grid-first

Current layout: left hub sidebar (w-52) + right category columns.  
Proposed: remove fixed hub column; replace with compact vertical pill at top, then 2-row grid.

```
┌──────────────────────────────────────────────────────────────────┐
│  [gradient accent bar 2px]                                       │
│                                                                  │
│  ● Tráfico en España          [Ver mapa →]  [Ver hub →]          │
│  ─────────────────────────────────────────────────────────────── │
│  En directo          Incidencias       Cámaras                   │
│  • Mapa en vivo      • Todas           • DGT                     │
│  • Atascos           • Cortes          • Madrid                  │
│  • Alertas meteo     • Restricciones   • Barcelona               │
│  • Paneles PMV       • Mejor hora      • Valencia                │
│                                                                  │
│  ── Tráfico en: [Madrid] [Barcelona] [Valencia] [+5] [Todas →]   │
└──────────────────────────────────────────────────────────────────┘
   live stat pill: "247 incidencias · 3 balizas V16"
```

- **Hub row:** icon + title (Exo 2 bold) + live stat pill (JetBrains Mono) + two CTAs
- **Category columns:** same as current, but no sidebar taking up 52px — more room for content
- **Max width:** `max-w-6xl` (narrower than current 7xl) to avoid very wide panels
- **Quick stats per vertical:** inline after title, from existing `MegaMenuWidgets`

### Mega Menu — Vertical Tile Grid (for "Más" / overview entry point)

```
┌────────┬────────┬────────┐
│ 🚦     │ 🛣️     │ ⛽     │
│Tráfico │Carret. │Combust.│
│ hub    │ hub    │ hub    │
├────────┼────────┼────────┤
│ ⚓     │ 🗺️     │ 🚛     │
│Marít.  │Explorar│Profes. │
│ hub    │ hub    │ hub    │
└────────┴────────┴────────┘
```

Each tile: icon (24px) + name (DM Sans semibold) + 1 quick stat + "Ver →" link. Same tile design as the existing search panel idle state.

---

## 6. Mobile Approach

### Current problem
Vertical accordion below the header — on a 375px phone with 6 panels, fully expanded content easily hits 1200px. Users who want the bottom panel (Profesional) must scroll past 4–5 expanded sections.

### Proposed: Right-side drawer

```
┌────────────────────────────────────┬──────────────────────┐
│ page content (blurred/dimmed)      │ drawer 320px from rt  │
│                                    │ ─────────────────────│
│                                    │ [trafico.live]    [✕] │
│                                    │ ──────────────────────│
│                                    │ [🔍 Buscar...]        │
│                                    │ ──────────────────────│
│                                    │ 🚦 Tráfico       >    │
│                                    │ 🛣️ Carreteras    >    │
│                                    │ ⛽ Combustible   >    │
│                                    │ ⚓ Marítimo      >    │
│                                    │ 🗺️ Explorar      >    │
│                                    │ 🚛 Profesional   >    │
│                                    │ ──────────────────────│
│                                    │ [API] [Sobre] [Blog]  │
└────────────────────────────────────┴──────────────────────┘
```

- **Drawer width:** `w-80` (320px), slides from right with `translateX` spring animation
- **Backdrop:** `bg-black/40 backdrop-blur-sm` covering page
- **Sub-panel:** tapping a vertical slides in a second panel (full-width, replaces drawer content) with `ArrowLeft` back button at top
- **Bottom sheet variant** for stats/live data: swipe-up from bottom, 40vh height, rounded-t-2xl

### Transition
```
drawer:     x: 320 → 0, spring stiffness: 400 damping: 35
sub-panel:  x: 80 → 0, duration: 0.2s easeOut
backdrop:   opacity: 0 → 0.4, duration: 0.2s
```

---

## 7. Launch Spec (for Agent 9 Session 2)

### Files to create

| File | Action |
|------|--------|
| `src/components/layout/nav/NavTrigger.tsx` | New — replaces inline button in DesktopNav |
| `src/components/layout/nav/SearchPill.tsx` | New — `⌘K` search button with compact prop |
| `src/components/layout/MobileDrawer.tsx` | New — right-side drawer replacing MobileMenu accordion |
| `src/components/layout/MobileSubPanel.tsx` | New — second-level panel for drawer |
| `src/components/layout/Header.tsx` | Modify — white bg, scroll state, new component tree |

### Files to modify

| File | Change |
|------|--------|
| `src/components/layout/nav/DesktopNav.tsx` | Use `NavTrigger`, add `SearchPill`, remove inline button markup |
| `src/components/layout/nav/MobileMenu.tsx` | Replace with `MobileDrawer` import |
| `src/components/layout/nav/MegaMenuPanel.tsx` | Swap `HubColumn` (w-52 sidebar) for compact `HubRow` at top |

### Tokens to add in `globals.css`

```css
/* Header scroll transition */
--header-h: 3.5rem;          /* 56px default */
--header-h-scrolled: 3rem;   /* 48px scrolled */

/* Header backgrounds */
--header-bg: oklch(100% 0 0 / 0.92);           /* white/92 */
--header-bg-scrolled: oklch(100% 0 0 / 0.97);  /* white/97 */
--header-bg-dark: oklch(8% 0.02 265 / 0.92);   /* near-black */
--header-border: var(--color-tl-50);
--header-border-scrolled: oklch(92% 0 0);
```

### Tailwind classes for the new Header shell

```tsx
// Header.tsx — new className
"sticky top-0 z-50 transition-all duration-200"
"bg-white/92 dark:bg-gray-950/92"
"border-b border-gray-100 dark:border-gray-800"
"backdrop-blur-md"
// + JS class toggled on scroll:
// "h-14" → "h-12 shadow-sm border-gray-200"
```

### Skip link (accessibility fix)

Add as first child of `<body>` in `layout.tsx`:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-tl-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
  Saltar al contenido
</a>
```

### ARIA fixes (apply in same PR)

```tsx
// DesktopNav wrapper:
<nav role="navigation" aria-label="Menú principal">
// Per trigger:
role="button"  // already implicit on <button>
// MegaMenuShell:
<div role="region" aria-label={`Submenú ${activePanel}`}>
```

### Kbd shortcut for non-Mac

```tsx
// SearchPill.tsx
const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
<kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
```

---

## ASCII Wireframe — Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 56px  │  trafico.live ●   Tráfico ▾  Carreteras ▾  Combustible ▾  Marítimo ▾  Explorar ▾  Más ▾  │  [ 🔍 Buscar ⌘K ]  [🌙] │
└──────────────────────────────────────────────────────────────────────────────┘
         logo              nav items (gap-0.5, text-sm DM Sans)                              utilities
```

## ASCII Wireframe — Mobile Drawer (375px)

```
┌──────────────┬─────────────────────┐
│ page (dimmed)│ trafico.live    [✕] │
│              │─────────────────────│
│              │ 🔍 Buscar...        │
│              │─────────────────────│
│              │ 🚦 Tráfico      ›   │
│              │ 🛣️ Carreteras   ›   │
│              │ ⛽ Combustible  ›   │
│              │ ⚓ Marítimo     ›   │
│              │ 🗺️ Explorar     ›   │
│              │ 🚛 Profesional  ›   │
│              │─────────────────────│
│              │ API · Sobre · Blog  │
└──────────────┴─────────────────────┘
```
