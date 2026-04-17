# E2E Test Scaffold (Phase 3)

Placeholder — Phase 3 work. Do NOT author these yet. Waiting on agents 2.2 / 2.3 to
land hubs + header/footer so selectors stabilise.

## Planned E2E suite (10 tests)

1. **home — golden path.** Load `/`, assert hero text + nav renders, click primary CTA, verify navigation target.
2. **nav — header links resolve (desktop).** Visit `/`, click every top-level nav item, assert each target page returns 200 and renders its H1.
3. **nav — mobile menu open/close/link.** Open hamburger, check focus-trap + ARIA, click a link, assert navigation + menu closes.
4. **search — Cmd+K palette.** Open command palette, type `madrid`, assert >=1 result, click first, assert navigation.
5. **map — MapLibre mounts on `/camaras`.** Wait for `.maplibregl-canvas`, assert no runtime error in console, verify >=1 marker or tile layer ready.
6. **layer toggle — TraficoMap.** On `/trafico`, toggle a layer on/off, assert DOM state attr flips and no console error.
7. **affiliate disclosure — present on affiliate pages.** Visit `/vuelos`, `/barcos`, assert disclosure banner text is visible in document flow.
8. **GDPR banner — consent flow.** First visit shows banner, "Aceptar" hides it and sets cookie, reload confirms banner gone.
9. **billing — anonymous checkout redirect.** Visit `/billing`, click PRO tier CTA, assert redirect to Stripe checkout domain.
10. **API keys — unauthenticated 401.** Fetch `/api/keys` without header, assert 401 response body shape.

## Owner / branch

- Author: agent-2.9 (Phase 3 only)
- Waits on: `team2-2.2-hubs`, `team2-2.3-chrome` landing
- File layout: one `*.spec.ts` per test or grouped by area (nav, search, map, billing)
