# STATUS — TEAM 2 (CONSUMER + UX)

> T2-local status tracker. Shared `STATUS.md` owned by T1 lead aggregates all 4 teams.
> Source of truth: `docs/ROADMAP-MASTER-2026.md` + `docs/ROADMAP-TEAM-2-CONSUMER.md`
> Last updated: 2026-04-17 — **S0 integration COMPLETE, team2 build green**

---

## TEAM 2 — CONSUMER + UX (branch: `team2`)

**Lead role:** frontend lead · **Sub-agents:** 9 · **team2 HEAD:** `6132cbfc` · **Build:** GREEN

| # | Sub-agent | Branch | Status | Merge commit |
|---|---|---|---|---|
| 2.1 | TraficoMap unified + LayerRegistry + delete 8 legacy (~3.2K LOC) | `team2-2.1-traficomap` | ✅ complete | fe46e694 |
| 2.2 | 8 hubs verticales full-feature | `team2-2.2-hubs` | ✅ complete | a88ada7a |
| 2.3 | Header+Footer white-first + 11 UI components + layout landmark | `team2-2.3-chrome` | ✅ complete | 4458a8cc |
| 2.4 | Live tracker scaffolds (/vuelos, /barcos, /trenes/live) + affiliate infra | `team2-2.4-trackers` | ✅ complete | 9130ac0a |
| 2.5 | Entity SSG batch A — 3,494 pages (rail stations+lines, airports, ports) | `team2-2.5-entity-a` | ✅ complete | b14ff08b |
| 2.6 | Entity SSG batch B — 23K+ pages (roads, vessels ISR, fuel ISR, meteo+AQ) | `team2-2.6-entity-b` | ✅ complete | 2f49017b |
| 2.7 | Polish GSC pages + /divulgacion-afiliados | `team2-2.7-polish` | ✅ complete | 4f310d25 |
| 2.8 | SEO W1-W5 (GDPR banner, schemas, sitemap, robots, 404, metadata fixes) | `team2-2.8-seo-gdpr` | ✅ complete | 8d413a94 |
| 2.9 | Playwright + a11y primitives + E2E scaffolds + handoff docs | `team2-2.9-qa` | 🚧 Phase 2 ongoing | bb93dd25 |

### Lead integration fixes (post-merge)

| Commit | Description |
|---|---|
| ed2c15bf | `docs(traficomap-api): reconcile presets + entity types with actual code` |
| 546b52f8 | `fix(trafico): roadName → roadNumber` (Prisma field drift from 2.2) |
| 9e47289e | `fix(trenes): remove invalid changeFrequency from page metadata` |
| 6132cbfc | `fix(map): TraficoMapClient wrapper` (Next.js 16 forbids `ssr:false` in Server Components) |

### Build verification

- `npx tsc --noEmit` — GREEN, 0 source errors
- `npm run build` — GREEN, all routes prerender (SSG + ISR + static + dynamic)
- 27K+ URL patterns indexable

### Handshakes delivered

| HS | Role | Artifact | Status |
|---|---|---|---|
| HS1 | producer | `docs/TRAFICOMAP-API.md` (frozen) + `src/lib/map-layers/*` | ✅ delivered |
| HS2 | consumer | T3.3 WeatherForecast | not yet received — `/meteo` uses placeholder |
| HS6 | producer | `<Offers>` widget (`src/components/embed/OffersWidget.tsx` scaffold) | ✅ scaffold delivered, full impl S4 |
| HS9 | consumer | T4.4 MCP tools list | pending S3 |
| HS10 | producer | `getSlugList()` exports per entity template | ✅ delivered |

---

## S0 exit criteria (dom 19 abr — ACHIEVED)

- [x] TraficoMap props API frozen (HS1)
- [x] 8 hubs + fullscreens functional in prod build
- [x] 27K+ URL patterns accessible (SSG + ISR)
- [x] Header+footer white, 10-step ink scale, canonical UI library
- [x] GDPR cookie banner (TCF-lite) active + wired to GA4 consent
- [x] a11y primitives landed (SkipLink, focus-trap, live-region, useActiveDescendant)
- [x] Playwright baselines + 10 E2E test scaffolds
- [x] `npm run build` green

---

## Remaining for launch Mon 20 Apr 09:00 CEST

- 2.9 Phase 2+ ongoing:
  - Motion-reduce global sweep
  - Post-integration baseline regen (was on pre-refactor team2)
  - 10 E2E test implementations (currently `fixme`)
- WCAG handoff patches from `docs/a11y-fixes.md` applied by owning agents (2.1/2.2/2.3/2.6/2.8)
- /combustible route — T4 next.config.ts rewrite adjustment (cross-team ask)
- 2.8 sitemap shard population verification post-build (can run as health check)

---

## Known tech debt (S1 cleanup)

- 2.6 pages use `@/components/seo/Breadcrumbs` (pre-existing) vs 2.3's `@/components/ui/Breadcrumbs` — dual components. Consolidate S1.
- `/calidad-aire` hub uses `preset="meteo"` fallback — add dedicated `calidad-aire` VerticalId in S1.
- Legacy `HeroMap.tsx` components per hub (MaritimoHeroMap, AviationHeroMap, etc.) could be consolidated into TraficoMap presets directly in S1.
- 2.1 `ProvinceHeatmap` is stubbed — wire `province-choropleth` layer to `/api/estadisticas/accidentes` in S1.
- 2.4 affiliate clients are interface stubs — real implementations in S4.

---

## Metrics target (verified buildable)

- 27K+ URLs indexable → ✅ 27,553+ routes compile
- 8 hubs on white-first chrome → ✅
- GDPR banner → ✅ TCF-lite active
- JSON-LD on 8 hubs + entity pages → ✅ via `@/lib/seo/schemas.ts`
- Schema.org coverage: Place, Train, Airport, SeaPort, Road, Vehicle, GasStation+Product, WeatherStation, Observation (AQ)
- WCAG AA residual — pending 2.9 final audit

---

**Integration branch:** `origin/team2` @ `6132cbfc` (push merge to `origin/main` after visual QA signoff from 2.9).
