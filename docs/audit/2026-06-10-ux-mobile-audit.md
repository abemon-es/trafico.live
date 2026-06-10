# UX/UI Mobile Audit — trafico.live — 2026-06-10

Live audit via Playwright at 390×844 (+ code-level diagnosis). Pages: `/`,
`/mapa`, `/trafico/madrid`, `/gasolineras`, `/trenes`, `/incidencias`,
`/radares`. Register: product. Brand: `~/Desarrollos/.claude-brands/trafico-live.md`.

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Strong base (alt, ARIA, skip link, focus trap); inline-link touch targets small |
| 2 | Performance | 2/4 | Mobile 72–84 post PR #55; home LCP 7.5s (font swap), 19k px page |
| 3 | Responsive | 3/4 | No h-scroll anywhere; menu existed but was functionally dead (P0, fixed) |
| 4 | Theming | 3/4 | tl-* tokens + dark mode consistent; stray green/purple tints on /gasolineras cards |
| 5 | Anti-patterns | 3/4 | No AI-slop tells; redundant CTA triplet on /incidencias |
| **Total** | | **14/20** | **Good — address weak dimensions** |

## P0 — fixed in this session (`fix/mobile-menu-outside-click`)

**The entire mobile menu was interaction-dead.** `DesktopNav.tsx` registers a
document-level `mousedown` "click outside" handler that calls `closeAll()`.
DesktopNav stays mounted (CSS-hidden) on mobile, and `#mobile-nav` is outside
its ref, so every real tap inside the mobile drawer closed it on mousedown
before the tap's `click` could land:

- Accordion sections: tap → menu vanishes instead of expanding. Browsing
  menu sections on mobile was impossible.
- Search trigger: tap → menu closes; the late `click` still set
  `searchActive=true`, so the NEXT menu open started with the search overlay
  silently covering the menu and eating all taps.
- Plain links survived only because navigation fires anyway as the menu dies.

Shipped with the new menu in PR #50 (2026-06-08). Repro evidence: real
pointer clicks failed deterministically; synthetic `element.click()` (no
mousedown) worked. Fix: ignore presses inside `#mobile-nav` in the outside
handler + reset `searchActive` on every menu open/close flip.

Once open, mobile search is excellent: query "radar madrid" auto-extracts
filter chips (Radares + Madrid), 25 Typesense results, clean rows.

## P1

1. **Homepage mobile is 19,195 px tall with 483 links** (~23 viewports).
   Everything-page IA: decision fatigue, diluted internal linking, and the
   long tail of sections gets near-zero scroll reach. Recommend: cut to ~6
   sections + per-vertical "ver todo" links. (`$impeccable distill /`)
2. **/gasolineras leads with maritime prices.** First price block a user
   sees is "Precios Medios Estaciones Marítimas" (154 port stations); the
   11,850 terrestrial stations — what nearly all visitors want — are behind
   a card. Invert: terrestrial averages first, maritime as a section below.
   (`$impeccable layout /gasolineras`)
3. **Intermittent HTTP 500s on RSC prefetch** of `/atascos/{city}` and
   `/accidentes/{city}` (observed 4 distinct cities from /trenes; direct
   loads return 200). Suspect DB pool contention under prefetch burst
   (PgBouncer 25-conn). Check GlitchTip/Loki for the stack; consider
   `prefetch={false}` on city link farms or raising pool headroom.
4. **/incidencias stat contradicts the homepage.** Page says "100
   incidencias activas" (looks like a query LIMIT rendered as a total);
   homepage ticker says 5,162. Data-confidence brand promise broken by our
   own numbers. Show the real count or label it "últimas 100".
   (`$impeccable clarify /incidencias`)

## P2

- **Triple CTA redundancy on /incidencias**: "Estadísticas de incidencias" /
  "Análisis de incidencias" / "Ver análisis histórico" stacked — three
  near-identical labels. Merge to one. (`$impeccable distill`)
- **347 sub-40px touch targets on home** — mostly the link-farm lists
  (20-24px row height). Raise row padding on mobile. (`$impeccable adapt /`)
- **Font preload warnings** on /trenes (woff2 + css preloaded, unused) —
  related to the LCP font-swap issue from the perf audit.
- **Off-palette tints on /gasolineras entry cards** (green/purple) — brand
  allows tl-blue, tl-amber + semantic signal colors only. Verify tokens.

## P3

- Two identical "Ver mapa en vivo" CTAs visible in the same viewport on home
  (hero button + floating pill).
- Generic incident copy "Incidencia en Madrid" repeated in list rows; the
  road badge carries all the information.

## Positive findings (keep doing this)

- Brand discipline: Exo 2 / DM Sans / JetBrains Mono everywhere; numbers in
  mono; data attribution present; dark mode consistent.
- Semantic fundamentals: single h1 per page, breadcrumbs on every page,
  skip-link, all images alt-texted, zero unnamed buttons, zero dead links.
- `/trafico/{city}` and `/radares` are model pages: clear hierarchy, live
  status chips, severity callouts, useful stats above the fold.
- Search implementation quality (chip extraction, recents, grouped results).
- No horizontal scroll on any audited page.

## Recommended next actions

1. **[P0]** ship `fix/mobile-menu-outside-click` (this PR) and re-verify
   with real pointer events post-deploy.
2. **[P1]** `$impeccable distill /` — homepage mobile diet.
3. **[P1]** `$impeccable layout /gasolineras` — terrestrial-first IA.
4. **[P1]** server logs for the RSC 500 bursts (obs/GlitchTip).
5. **[P1]** `$impeccable clarify /incidencias` — true counts + CTA merge.
6. Re-run `$impeccable audit` after fixes.
