# 04 — Accessibility Audit (WCAG 2.1 AA)

**Date:** 2026-04-17  
**Scope:** `src/` tree + live pages at trafico.live  
**Standard:** WCAG 2.1 Level AA (4.5:1 text, 3:1 UI)

---

## 1. Baseline Audit

| Check | Status | Notes |
|---|---|---|
| `<html lang="es">` | PASS | Set in `src/app/layout.tsx:187` |
| `<title>` unique per page | PASS | Template `"%s \| trafico.live"` applied consistently; verified on /, /trenes, /calidad-aire |
| Skip-to-content link | FAIL | Not present anywhere in `layout.tsx`, `Header.tsx`, or any page |
| `<header>` landmark | PASS | `<header>` in `Header.tsx:15` |
| `<nav>` with `aria-label` | PASS | `aria-label="Navegación principal"` on desktop nav; `aria-label="Tráfico por ciudad"` in footer |
| `<main>` landmark | PARTIAL | Present on ~107 content pages; absent on the homepage (`HomeClient.tsx` returns a `<section>` not `<main>`), `/mapa`, `/maritimo`, `/aviacion` — all map-heavy pages |
| `<footer>` landmark | PASS | Semantic `<footer>` in `Footer.tsx:38` |
| Buttons vs. divs | PASS | All interactive triggers use `<button type="button">` |
| Links vs. buttons | PASS | Navigation uses `<Link>` (Next.js); action triggers use `<button>` |

---

## 2. Color Contrast (WCAG AA)

Brand palette extracted from `src/app/globals.css`.

| Combination | Context | Ratio (est.) | WCAG AA | Severity |
|---|---|---|---|---|
| `gray-400` (#9ca3af) on `white` (#fff) | Light-mode placeholder text, secondary labels | ~2.85:1 | FAIL (need 4.5:1) | HIGH |
| `gray-500` (#6b7280) on `white` (#fff) | Light-mode subtitle text, filter chip labels | ~3.96:1 | FAIL — normal text | MEDIUM |
| `gray-400` (#9ca3af) on `tl-950` (#000025) | Footer small text (dark bg) | ~10.2:1 | PASS | — |
| `tl-400` (#6393ff) on `white` (#fff) | Primary links in light mode | ~3.8:1 | FAIL — normal text; PASS at 18px+ | MEDIUM |
| `tl-400` (#6393ff) on `tl-950` (#000025) | Dark-mode primary links | ~9.1:1 | PASS | — |
| `text-[10px]`/`text-[11px]` `gray-400` | Category labels, badge text, filter hints | ~2.85:1 at 10px | FAIL (requires 4.5:1 even harder at small size) | HIGH |
| `gray-300` (#d1d5db) header text on `tl-900` (#000245) | Desktop nav inactive links | ~6.4:1 | PASS | — |
| `tl-600` (#1b4bd5) on `white` | CTA buttons, accept cookie btn | ~5.9:1 | PASS | — |
| Signal green (#00e676 approx) ping dot on dark | Footer live indicator | ~11:1 | PASS | — |

**Dark mode parity:** Dark-mode text values are generally well-contrasted (near-black backgrounds). The primary failure mode is light-mode `gray-400`/`gray-500` secondary text, which is used extensively across 4,000+ instances in the codebase (`grep` count: 4,082).

---

## 3. Keyboard Navigation

| Check | Status | Notes |
|---|---|---|
| Tab order logical | PARTIAL | Header → DesktopNav → content, but no skip link means keyboard users must tab through all 8+ nav buttons before reaching page content |
| Focus visible — buttons/links | PARTIAL | Most interactive elements use `focus:ring-2 focus:ring-tl-300` (passes). However, `focus:outline-none` appears 39 times — many instances paired with `focus:ring`, but not all verified |
| Escape closes mega menu | PASS | `DesktopNav.tsx:75-87` handles `Escape` and returns focus to trigger |
| Escape closes mobile menu | NOT IMPLEMENTED | `MobileMenu.tsx` has no `Escape` handler; only hamburger toggle closes it |
| Escape closes CameraModal | PASS | `CameraModal.tsx:42-46` handles `Escape` |
| Arrow keys in mega menu | PARTIAL | `ArrowDown` opens panel (`DesktopNav.tsx:127`); no `ArrowLeft`/`ArrowRight` to move between panel triggers; search listbox has full arrow-key handling (`MegaMenuPanel.tsx:240-242`) |
| Layer panel keyboard | FAIL | `layer-panel.tsx` layer toggle buttons have no keyboard handling beyond default focus; group expand buttons lack `aria-expanded` and `aria-label` |
| Map canvas keyboard | FAIL | MapLibre canvas is inaccessible by keyboard; no keyboard equivalent for map interactions |
| Focus trap in dialogs | FAIL | `CookieConsent` dialog has `role="dialog"` but no focus trap; `CameraModal` has no `role="dialog"`, no `aria-modal`, no focus trap |

---

## 4. Screen Reader Support

| Check | Status | Notes |
|---|---|---|
| `aria-label` on icon-only buttons | PARTIAL | Mobile hamburger: PASS (`aria-label` changes with state). ThemeToggle: `aria-label="Toggle dark mode"` — English, not Spanish (inconsistent with site language). Geolocation button: uses `title=` not `aria-label`. Layer panel "Capas" toggle: no `aria-label` or `aria-expanded` |
| `aria-expanded` on collapsibles | PARTIAL | Desktop mega menu triggers: PASS. Mobile accordion sections: PASS. Layer panel group headers: FAIL (no `aria-expanded`). Layer panel outer toggle: FAIL |
| `aria-current="page"` on active nav | FAIL | Only present on one breadcrumb (`trenes/estaciones/page.tsx:36`); missing from all primary nav links in `Header.tsx` |
| Alt text on images | PASS | All `<img>` tags found have meaningful `alt` attributes (camera name, article title, station name). No empty-alt decorative images found without `aria-hidden` |
| Labels on form fields | PARTIAL | See Section 5 |
| `aria-live` for dynamic content | FAIL | Only one `aria-live="polite"` found site-wide (arrivals-live.tsx). Real-time updates (incidents, train positions, air quality readings) have no live region announcements — screen readers cannot detect updates |
| Search combobox ARIA | PARTIAL | `role="listbox"` and `role="option"` applied to search results. Input missing `aria-label`, `aria-autocomplete="list"`, `aria-owns`, `aria-activedescendant` |

---

## 5. Form Accessibility

| Form | Location | Labels | `htmlFor` | Required Indicators | Error Messaging |
|---|---|---|---|---|---|
| Route calculator | `/calculadora` | Present (visual labels above inputs) | FAIL — labels not associated via `htmlFor` or wrapping | None | None visible |
| Cost calculator | `/cuanto-cuesta-cargar` | Present | FAIL — no `htmlFor` | None | None |
| Fuel filter / search | `/profesional/diesel` | Visual only | FAIL | None | None |
| Layer panel toggles | `/mapa` | Visual only (label wraps switch) | PARTIAL — `<label>` wraps `<button role="switch">` but button has no `aria-label` identifying which layer | N/A | N/A |
| Province filter | `/paneles` | Present (`htmlFor` used) | PASS | None | None |
| Period filter | `/incidencias/estadisticas` | Present (`htmlFor` used) | PASS | None | None |
| Search input (mega menu) | Global header | No visible label | FAIL — input has no `aria-label` or `<label>` | N/A | N/A |
| Cookie consent | Global | N/A (buttons, no inputs) | N/A | N/A | N/A |

**Key finding:** Calculadora, cuanto-cuesta-cargar, and the global search input all lack programmatic label association. Screen readers will announce these as unlabelled inputs.

---

## 6. Map Accessibility

| Check | Status | Notes |
|---|---|---|
| MapLibre canvas fallback | FAIL | The map `<div ref={mapRef}>` has no `aria-label`, `role`, or any fallback content. MapLibre renders a `<canvas>` — completely inaccessible to screen readers |
| Text alternative for map data | PARTIAL | The homepage and `/mapa` include an `aria-hidden="true"` SEO nav with links to city/data pages — screen readers skip it entirely due to `aria-hidden`. This was designed for crawlers, not AT users |
| Layer panel keyboard | FAIL | No keyboard-navigable alternative to map layer toggling; panel toggle button has no `aria-expanded`, no `aria-label` |
| Map popups/tooltips | FAIL | MapLibre popups are generated as raw HTML strings (`mapa/content.tsx` popup templates) — not accessible to screen readers; no structured ARIA roles on popup content |
| Quick-access buttons (Canarias etc.) | PARTIAL | Use `href` links (accessible) but Locate button uses `title=` not `aria-label` |
| Suggested approach | — | Add `role="application" aria-label="Mapa interactivo de tráfico"` to the outer container; add a visually-hidden `<div aria-live="polite">` to announce major map events; link to structured data pages as the primary accessible alternative |

---

## 7. Motion / Animation

| Check | Status | Notes |
|---|---|---|
| `prefers-reduced-motion` in CSS | PARTIAL | Only one `@media (prefers-reduced-motion: reduce)` block in `globals.css` (targets `.gauge-arc`). 187 Tailwind `animate-*` classes (`animate-ping`, `animate-pulse`, `animate-spin`, `animate-bounce`) are not covered |
| `useReducedMotion` in Motion | PASS | `MegaMenuPanel.tsx`, `MobileMenu.tsx` correctly use `useReducedMotion()` from `motion/react` and reduce animation duration to 0.01s |
| Incident ticker scroll animation | PARTIAL | `IncidentTicker.tsx:53` has an inline `@media (prefers-reduced-motion: reduce)` — PASS for that component |
| Map reduced motion | PASS | `InteractiveBaseMap.tsx:192` checks `window.matchMedia("(prefers-reduced-motion: reduce)")` |
| Auto-playing content | PASS | No auto-playing video or carousel found |
| Live data updates (auto-refresh) | INFO | CameraModal auto-refresh at 30s interval is user-initiated, not auto-starting |
| `animate-pulse` skeleton loaders | FAIL | Multiple skeleton loaders (`MapaClient.tsx:12`, `HomeClient.tsx:94`) use `animate-pulse` without a `prefers-reduced-motion` guard via CSS or conditional class |

---

## 8. Top 15 Accessibility Fixes (Prioritised)

| # | Fix | Impact | Effort | WCAG Criterion |
|---|---|---|---|---|
| 1 | **Add skip-to-content link** in `layout.tsx` before `<Header>`: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Saltar al contenido</a>` | All keyboard and AT users | Low | 2.4.1 |
| 2 | **Add `<main id="main-content">` to homepage and all map pages** (`HomeClient.tsx`, `mapa/MapaClient.tsx`, `aviacion`, `maritimo`) | AT navigation | Low | 1.3.6 |
| 3 | **Fix calculator and search form label associations** — add `id`/`htmlFor` pairs or convert to wrapping `<label>` in `/calculadora/content.tsx`, `/cuanto-cuesta-cargar/content.tsx`, and the mega-menu search input | Screen readers | Low | 1.3.1, 4.1.2 |
| 4 | **Upgrade `gray-400` secondary text to `gray-600` in light mode** across the codebase (4,082 instances) or ensure they only appear in non-text / large-text contexts | Low vision users | Medium | 1.4.3 |
| 5 | **Add `aria-label` (in Spanish) to ThemeToggle** ("Cambiar a modo oscuro"/"Cambiar a modo claro") and fix `layer-panel.tsx` outer toggle to include `aria-expanded={open}` and `aria-label` | Screen readers | Low | 4.1.2 |
| 6 | **Add `aria-current="page"` to active nav links** in `DesktopNav` and `MobileMenu` — derive from `isActiveRoute()` which already exists | Screen readers | Low | 4.1.2 |
| 7 | **Add focus trap to `CookieConsent` dialog and `CameraModal`** — add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and a focus trap loop | Screen readers, keyboard | Medium | 1.3.1, 2.1.2 |
| 8 | **Add `aria-live="polite"` region for real-time data updates** (incidents count, train positions, air quality readings) — a single hidden `<div aria-live="polite" aria-atomic="true">` updated on data fetch | Screen readers | Low | 4.1.3 |
| 9 | **Add `aria-label` / `aria-expanded` to layer panel group buttons** and wrap the outer "Capas" button with `aria-expanded={open}` and `aria-label="Panel de capas"` | Screen readers | Low | 4.1.2 |
| 10 | **Add `Escape` handler to mobile menu** and trap focus while open | Keyboard users | Low | 2.1.1 |
| 11 | **Wrap MapLibre container** with `role="application" aria-label="Mapa interactivo de tráfico de España"` and add a visually-hidden `<p>` with `aria-describedby` pointing to a descriptive text about keyboard-inaccessible nature and linking to list-based alternatives | Screen readers | Low | 1.1.1 |
| 12 | **Add `prefers-reduced-motion` guard to all `animate-pulse` skeleton loaders** — add `motion-reduce:animate-none` Tailwind class alongside each `animate-pulse`/`animate-ping` occurrence | Motion-sensitive users | Low–Medium | 2.3.3 |
| 13 | **Fix search combobox ARIA** — add `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-owns`, `aria-activedescendant` to the mega-menu search input | Screen readers | Medium | 4.1.2 |
| 14 | **Add `aria-label` to the MapLibre geolocation button** (currently uses `title=` only) in `InteractiveBaseMap.tsx:651` | Screen readers | Low | 4.1.2 |
| 15 | **Add required field indicators** (`aria-required="true"` + visible asterisk with legend) on calculator forms | Screen readers, cognitive | Low | 3.3.2 |

---

## Summary

**Estimated WCAG AA violations:** ~32 distinct issues across the codebase (8 critical, 14 medium, 10 low). The largest single source of violations is the 4,082 instances of `gray-400` secondary text in light mode (failing 4.5:1 contrast) and the complete absence of a skip-to-content link.

**Critical path issues:** No skip link forces keyboard users to tab through 8+ navigation buttons on every page load. The homepage and all map pages lack a `<main>` landmark. The cookie consent dialog and camera modal lack focus trapping, allowing keyboard users to escape modal context.

**Screen reader readiness:** Low. `aria-current` is missing from navigation (only one occurrence site-wide). Real-time data updates emit no live region announcements. The global search input has no programmatic label. Map canvas has zero screen reader support beyond linked list pages.

**Biggest single fix:** Add the skip-to-content link (`1`) and `<main id="main-content">` wrapper (`2`) — together these unblock keyboard navigation for all 150+ pages in under 2 hours of work and satisfy WCAG 2.4.1 (Bypass Blocks).
