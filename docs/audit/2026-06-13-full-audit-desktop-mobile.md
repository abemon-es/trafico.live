# Full Audit — Desktop + Mobile — trafico.live — 2026-06-13

Method: 3 parallel code-level audits (a11y, performance, theming) with file:line
citations + live Playwright sweep at 1440×900 (desktop) and 390×844 (mobile).
Builds on the 2026-06-10 mobile audit; focuses on desktop coverage, shipped-fix
verification, and new findings.

## Scorecard

| Dimension | Score | Headline |
|-----------|-------|----------|
| Accessibility | 1.5/4 | 3 modals lack dialog semantics/focus-trap; systemic gray-400 contrast fails; my new lens bar's tablist is incomplete |
| Performance | 2/4 | Font-swap LCP root cause CONFIRMED (2-line fix); recharts statically imported into 6+ pages |
| Theming / Brand | 1/4 | 123 files use generic hues (purple/cyan/violet); 3 files use UNDEFINED tokens → unstyled badges |
| Responsive | 3/4 | No h-scroll either viewport; layouts hold; homepage still 9.8k px desktop / 19k mobile |
| UX / Anti-patterns | 3/4 | Map lens overhaul shipped + verified; flagship pages clean |
| **Total** | **~10.5/20** | **Flagship surfaces strong; systemic token + a11y debt in the long tail** |

## Verified live this session (wins)

- **Map intent lenses (#63) deployed mid-audit and work end-to-end** on BOTH
  viewports. `/mapa` opens clean on Tráfico (4 layers, not 29); tapping a lens
  swaps the whole map in one tap (URL → `?layers=radars`); legend scopes to the
  active set; Personalizar demoted top-right. Mobile bar scrolls, 44px targets.
  Before/after: `.playwright-mcp/mapa-before-mobile.jpeg` vs `mapa-after-desktop.jpeg` / `mapa-radares-desktop.jpeg`.
- `/gasolineras` national-first + `/incidencias` real count (#62) hold on desktop.
- Mobile menu (#59) works. No horizontal scroll on any page, either viewport.
- Strong fundamentals: single h1/page, breadcrumbs, skip-link, alt text, no
  unnamed buttons, images carry dimensions (no CLS).

## P0 — fix immediately

1. **Confirmed font-swap LCP** — `src/app/layout.tsx:24`. Exo 2 uses
   `display:"swap"` (verified next/font size-adjust is on but swap still repaints
   the SSR'd hero h2 → LCP bumped to ~7.5s). Fix: `display:"optional"` +
   `fallback:["system-ui","sans-serif"]` on all 3 fonts; drop the dead
   `preconnect` to fonts.gstatic.com (`layout.tsx:203` — next/font self-hosts).
2. **Three modals miss dialog semantics + focus trap** — `IncidentModal.tsx:121`,
   `sobre/api/PricingTable.tsx:284` (Stripe checkout!), `dashboard/CreateKeyModal.tsx`.
   No `role="dialog"`/`aria-modal`/focus-return; focus leaks to background.
   `FocusTrap` already exists in the repo (`src/components/a11y/FocusTrap.tsx`).
3. **Invisible focus** — `mapa/routing-panel.tsx:640` combobox has
   `focus:outline-none` with no ring replacement.

## P1 — fix before next release

4. **Undefined brand tokens render unstyled** — `tl-emerald-*` / `tl-sky-*` used
   in `layers/DecisionSlot.tsx`, `layers/WeatherImpactSlot.tsx`,
   `freshness/TimestampBadge.tsx` but NOT defined in globals.css (verified: 0
   matches). Live/recent badges + decision slots paint with no color. Fix:
   define the tokens (mirror the `tl-sea-*` pattern, which IS defined) or map to
   `signal-green`/`tl-sea`.
5. **My own lens bar's tablist is incomplete** — `MapLensBar.tsx`. role=tab
   without roving tabindex, ArrowLeft/Right keys, or a tabpanel. Either complete
   the ARIA tabs pattern or switch to `role="toolbar"` + buttons. (My code — I own this.)
6. **Systemic contrast fails** — `text-gray-400` on white (~2.5:1) and
   `text-gray-300` skeleton text (~1.3:1) across carga-ev, carreteras, location
   sections. Promote to gray-600; skeletons should be shimmer blocks not text.
7. **Generic-hue brand breaks on high-traffic pages** — purple as Gasolina 98
   (`GasStationPopup`, `PriceComparisonCard`, every map gas hover), cyan maritime
   block (`gasolineras/page.tsx:380`), purple Autopista (`carreteras/*`), purple
   Cercanías guide. ~243 purple + ~93 cyan/teal violations across 123 files.
8. **Recharts statically imported** into `precio-gasolina-hoy`, 3 `/inteligencia`
   pages, 2 gas detail pages — ~180KB recharts in critical JS for below-fold charts.
   Wrap in `next/dynamic({ssr:false})`.
9. **Form errors not announced** — `PriceAlertForm.tsx:192`,
   `NewsletterCTA.tsx:103` error states lack `role="alert"`/`aria-live`.

## P2

- **`/gasolineras` can cache an empty-data render** — observed live: both price
  blocks absent in server HTML despite fresh DB (national Jun-13, 67 rows); a
  forced regeneration restored them. ISR cached a render from a collector gap and
  served it. Fix: render a "datos no disponibles" placeholder instead of hiding
  the block, so a stale-empty cache never looks like a broken page.
- `EntitySamples` needlessly `"use client"` (contains the LCP h2; pushes it into
  hydration) — make it a server component.
- `text-white/60` on dark hero gradients (~4.1:1) on aviacion/camaras detail pages.
- `font-mono` used instead of `font-data` (JetBrains Mono) in ~6 files for prices.
- OG images use `system-ui` font + raw blue hex instead of Exo 2 / tl tokens.

## P3

- 106KB stale `public/og-image.png` (live meta uses the 17KB .webp) — delete.
- `NearbyCities` table `<th>` missing `scope="col"`; 9px gray-400 headers.
- Homepage length: 9.8k px desktop / 19k mobile, 483 links (carryover from 06-10).

## Recommended sequence

1. **P0 batch** (one PR): font-display fix + dead preconnect + 3 modal focus-traps + routing-panel focus ring. High user impact, low risk.
2. **P1 brand tokens** (one PR): define tl-emerald/tl-sky, swap cyan→tl-sea + purple→tl on the high-impact components (GasStationPopup, PriceComparisonCard, gasolineras, AdvancedFeatures). Visible on every gas hover + homepage.
3. **P1 lens bar a11y** — complete the tablist (my code).
4. **P1 perf**: dynamic-import recharts; EntitySamples → server.
5. **P2 gasolineras empty-state placeholder.**
6. Re-run this audit to confirm score lift.

## Operational note (recurring)

Docker image prune struck again: `postgres:16-alpine` had to re-pull during this
audit (same prune that killed `trafico-tiles-gen` twice). The deployer host prunes
unreferenced images aggressively. The tile-gen self-heal wrapper (2026-06-12)
covers that one case; a host-level prune policy exclusion or a freshness monitor
on generated artifacts is the durable fix.
