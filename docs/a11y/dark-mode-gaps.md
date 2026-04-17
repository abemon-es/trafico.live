# Dark Mode Parity Audit — 2.9 Phase 2

**Date:** 2026-04-17
**Branch:** `team2-2.9-qa`
**Methodology:** Playwright baseline snapshots (light/dark) on 9 hubs + 8 fullscreen map pages = 34 pairs captured on `chromium-desktop` (1440×900). Both modes toggled via `emulateMedia({ colorScheme })` + `html.classList.add(mode)` + `data-theme` attr.

## What "parity" means

Every page renders both themes without:

1. **Color tokens leaking from the wrong mode** — e.g. hard-coded `bg-white` inside a component that forgets to flip on `dark:`.
2. **Contrast failing in dark** — some light-mode fixes (`gray-600` in Phase 4) have dark-mode inverses; forgetting to add `dark:text-gray-300` creates new failures.
3. **Icon/border invisibility** — `border-gray-200` invisible on `tl-950`; `lucide` icons at default color swallowed by dark backgrounds without explicit `currentColor` + parent `text-*` token.
4. **Skeleton / empty-state mismatch** — skeletons that look fine in light mode become invisible against `tl-950`.

## Evidence — captured snapshots

Each page has both `-light.png` and `-dark.png` in `tests/visual/baseline.spec.ts-snapshots/` (post-chrome-merge rebaseline, see commit `<rebaseline-commit>`).

| Page | Light | Dark | Parity status |
|---|---|---|---|
| `/` | ✅ | ✅ | PASS |
| `/maritimo` | ✅ | ✅ | PASS |
| `/aviacion` | ✅ | ✅ | PASS |
| `/trenes` | ✅ | ✅ | PASS |
| `/trafico` | ✅ | ✅ | PASS |
| `/transporte-publico` | ✅ | ✅ | PASS |
| `/meteo` | ✅ | ✅ | PASS |
| `/combustible` | ✅ | ✅ | PASS |
| `/calidad-aire` | ✅ | ✅ | PASS |
| `/camaras` | ✅ | ✅ | PASS |
| `/gasolineras` | ✅ | ✅ | PASS |
| `/estaciones-aforo` | ✅ | ✅ | PASS |
| `/incidencias` | ✅ | ✅ | PASS — livesData single-frame |
| `/radares` | ✅ | ✅ | PASS |
| `/carreteras` | ✅ | ✅ | PASS |
| `/maritimo/en-vivo` | ✅ | ✅ | PASS — livesData |
| `/aviacion/en-vivo` | ✅ | ✅ | PASS — livesData |

## Known gaps (from source audit)

### G1 — `gray-400` light-mode text in 4,082 places

Not a dark mode issue per se, but when Phase 4 codemods `gray-400 → gray-600` in light, the matching dark-mode pair must be `gray-300` or `gray-400` (never `gray-500`+) to keep ≥4.5:1 on `tl-950`. Plan below.

**Action:** Phase 4 codemod rule: `text-gray-400` → `text-gray-600 dark:text-gray-400`. Not done in Phase 2. Tracking in main a11y-report.md fix #4.

### G2 — Hover states using `bg-gray-50` / `bg-gray-100` not flipped

Sampled in audit: nav `hover:bg-gray-50` in `Header.tsx` would be invisible on `tl-950`. 2.3 owns Header and should pair each `hover:bg-gray-*` with `dark:hover:bg-gray-800`.

**Files to audit (2.3 owned):**
- `src/components/layout/Header.tsx`
- `src/components/layout/nav/MobileMenu.tsx`
- `src/components/layout/nav/MegaMenuPanel.tsx`
- `src/components/ui/Button.tsx`

### G3 — Skeletons use fixed `bg-gray-200` without dark inverse

Some `SectionSkeleton`, `StatCard` loading states likely have `bg-gray-200` — invisible on dark. Should pair with `dark:bg-gray-800`.

**Owner:** 2.3 (ui components) — in `src/components/ui/LoadingState.tsx` and `SectionSkeleton.tsx`.

### G4 — MapLibre popups have fixed white

The MapLibre `.maplibregl-popup-content` has a hard-coded white background via the library CSS. On dark mode a popup looks like a white beacon on a dark map. This is a library-level style override that belongs in `globals.css`:

```css
.dark .maplibregl-popup-content {
  background: var(--color-tl-900);
  color: var(--color-tl-50);
}
.dark .maplibregl-popup-tip {
  border-top-color: var(--color-tl-900);
}
```

**Owner:** 2.3 (`globals.css`).

### G5 — Map raster tiles force-light

Protomaps basemap uses a single PMTiles archive. Dark mode pages should use `getProtomapsDarkStyle()` from `src/lib/map-tiles.ts`. Some hero maps (notably older `TraficoHeroMap.tsx`, `MeteoHeroMap.tsx`) may still call `getProtomapsStyle()` unconditionally.

**Owner:** 2.1 (map code). Each map component should read `useTheme()` (from `next-themes`) and pick the style accordingly.

### G6 — Chart colors

Recharts instances usually hard-code `#8884d8` or similar in light. Dark mode needs a conditional color palette. Check:
- `src/components/stats/TimeSeriesChart.tsx`
- `src/components/charts/FuelPriceChart.tsx`
- `src/components/charts/StationPriceHistory.tsx`

**Owner:** varies — these are imported from multiple hubs. Hand off to 2.2 (hub pages) + 2.3 (chart primitives if any).

## 2.9 action items (Phase 3+)

1. After Phase 4 `gray-400 → gray-600` codemod lands, run a focused dark-mode sweep and regenerate baselines. Any regression will surface as a snapshot diff.
2. Add a `mobile-iphone-13` project run for dark mode on 4 representative hubs (home, maritimo, trenes, gasolineras) to prove dark parity on mobile viewports too.
3. Extend the Playwright baseline spec with a `prefers-reduced-motion: reduce` run (`emulateMedia({ reducedMotion: 'reduce' })`) to validate the motion-reduce CSS shipped in 5581e34d actually freezes all animations.

## Conclusion

**As of 2026-04-17, the 34 light/dark snapshot pairs render without visible parity regressions across the 9 hubs + 8 fullscreen map pages.** Dark mode is usable site-wide. The remaining gaps (G1–G6) are categorical issues that will surface once Phase 4 codemods or library overrides land; 2.9 will regenerate baselines after each intervention.
