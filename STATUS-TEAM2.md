# STATUS — TEAM 2 (CONSUMER + UX)

> T2-local status tracker. Shared `STATUS.md` owned by T1 lead aggregates all 4 teams.
> Source of truth: `docs/ROADMAP-MASTER-2026.md` + `docs/ROADMAP-TEAM-2-CONSUMER.md`
> Last updated: 2026-04-17 — overnight S0 kickoff, 3 priority sub-agents launched

---

## TEAM 2 — CONSUMER + UX (branch: `team2`)

**Lead role:** frontend lead · **Sub-agents:** 9 · **Status:** S0 overnight push, 3 priority agents in parallel.

| # | Sub-agent | Branch | Status | Sprint | Owner | Blockers |
|---|---|---|---|---|---|---|
| 2.1 | TraficoMap unified + LayerRegistry + delete 8 legacy (~6.2K LOC) | `team2-2.1-traficomap` | in_progress | S0 | agent-2.1 | — |
| 2.2 | 8 hubs verticales full-feature | `team2-2.2-hubs` | pending | S0 sáb | — | waits HS1 (2.1) and HS2 (T3.3) |
| 2.3 | Header+Footer+Design tokens+UI canonical + i18n | `team2-2.3-chrome` | in_progress | S0 | agent-2.3 | — |
| 2.4 | Live trackers + affiliate widgets | `team2-2.4-trackers` | pending | S2-3 | — | — |
| 2.5 | Entity pages SSG batch A (transporte) | `team2-2.5-entity-a` | pending | S0 dom AM | — | waits HS1 (TraficoMap API) |
| 2.6 | Entity pages SSG batch B (infra+data) | `team2-2.6-entity-b` | pending | S0 dom AM | — | waits HS1 |
| 2.7 | Polish GSC pages + affiliate disclosure | `team2-2.7-polish` | pending | S0 sáb | — | — |
| 2.8 | SEO infra + GDPR cookie banner | `team2-2.8-seo-gdpr` | in_progress | S0 | agent-2.8 | — |
| 2.9 | a11y + mobile + dark + visual QA + E2E | `team2-2.9-qa` | pending | S0 dom PM | — | needs 2.1+2.2+2.3 landed |

### Handshakes T2

| HS | Role | Counterparty | Sprint | Status | Artifact |
|---|---|---|---|---|---|
| HS1 | **producer** | T2 (2.2, 2.4, 2.5, 2.6) + T1.9 | S0 vie | in_progress | `docs/TRAFICOMAP-API.md` produced by 2.1 tonight |
| HS2 | consumer | T3.3 (AEMET forecast) | S0 sáb | pending | `WeatherForecast` schema expected vie AM |
| HS6 | producer | T1.9 | S4 | pending | `<Offers provider source />` props |
| HS9 | consumer | T4.4 (MCP tools) | S3 | pending | MCP tools list for chatbot widget |
| HS10 | producer | T1.9 | S2-3 | pending | `getSlugList()` per SSG template |

### S0 exit criteria (dom 19 abr)

- [ ] 8 hubs + 8 fullscreens functional in prod
- [ ] 27.553 URLs accessible (build <30 min with ISR)
- [ ] Header+footer white, design tokens clean, 3 new `<*State>` components
- [ ] GDPR cookie banner active + trackable
- [ ] WCAG AA <5 residual violations
- [ ] 10 E2E tests green
- [ ] LCP <2s on 8 hubs (mobile Slow 3G)
- [ ] TraficoMap props API frozen and documented (HS1)

### S0 overnight quick wins (jue 17 noche → vie 18 AM)

- [x] Branch `team2` created + pushed
- [x] T2 file ownership matrix established
- [x] T2 STATUS doc published
- [ ] 2.1 — TraficoMap API freeze + LayerRegistry finalize + 8 legacy deletions
- [ ] 2.3 — Header/Footer white-first redesign + canonical UI components
- [ ] 2.8 — 47 double-suffix titles + 32 canonicals + 117 OG images + GDPR banner + robots + not-found + sitemap shards

### Dependency watch (other teams)

- T3.3 `WeatherForecast` schema needed vie AM (HS2) for `/meteo` hub
- T4.1 `AffiliateClick` model in Prisma schema needed S4 for `<Offers>` widget
- T4.4 MCP tools list in S3 for chatbot widget embed
- T1.9 consumes our `getSlugList()` (HS10) and `<Offers>` props (HS6) in S2-S4

---

## File ownership matrix (strict)

### 2.1 owns (exclusive)
```
src/components/map/TraficoMap.tsx
src/components/map/TraficoMapControls.tsx
src/components/map/TraficoMapLegend.tsx
src/components/map/IncidentMarker.tsx           # keep as atomic marker
src/lib/map-layers/**
docs/TRAFICOMAP-API.md                          (NEW, HS1 contract)
# DELETE targets (8 legacy):
src/components/map/InteractiveBaseMap.tsx       (687 LOC)
src/components/map/HistoricalMap.tsx            (525 LOC)
src/components/map/ProvinceHeatmap.tsx          (333 LOC)
src/components/maritimo/VesselLiveMap.tsx
src/components/location/LocationMap.tsx
src/components/location/sections/LocationMapSection.tsx
src/components/gas-stations/StationLocationMap.tsx
# + UnifiedMap/ComparatorMap if discovered during audit
```

### 2.3 owns (exclusive)
```
src/app/globals.css
src/app/layout.tsx                              (coordinates CookieConsent mount with 2.8)
src/components/layout/Header.tsx
src/components/layout/Footer.tsx
src/components/layout/ThemeToggle.tsx
src/components/layout/nav/**
src/components/ui/Button.tsx                    (NEW canonical)
src/components/ui/StatCard.tsx                  (NEW, replaces 11 inline)
src/components/ui/VerticalHub.tsx               (NEW template)
src/components/ui/EmptyState.tsx                (exists, polish)
src/components/ui/LoadingState.tsx              (NEW)
src/components/ui/ErrorState.tsx                (NEW)
src/components/ui/TickerStrip.tsx               (NEW)
src/components/ui/FAQAccordion.tsx              (NEW canonical)
src/components/ui/Breadcrumbs.tsx               (NEW canonical)
src/components/ui/RelatedLinks.tsx              (activate cross-vertical)
src/components/ui/SkipLink.tsx                  (NEW for WCAG, coordinated with 2.9)
messages/es.json                                (NEW i18n stub)
messages/en.json                                (NEW i18n stub)
```

### 2.8 owns (exclusive)
```
src/app/opengraph-image.tsx                     (NEW root OG via @vercel/og)
src/app/llms.txt/route.ts                       (NEW, capitalize chatgpt referral)
src/app/not-found.tsx                           (rework)
src/app/sitemap.ts                              (NEW + shard 27K entities)
src/app/robots.ts                               (NEW replace static)
public/robots.txt                               (keep in sync)
src/components/cookie-consent/**                (NEW GDPR banner + consent API)
src/components/legal/CookieConsent.tsx          (keep interface until swap)
src/lib/seo/**                                  (extend with schema helpers)
# Site-wide metadata fixes (non-UI, metadata exports only):
# - Remove 47 double-suffix titles
# - Add alternates.canonical to 32 pages
# - Add og:image to 117 pages
# - FAQ + Article/Breadcrumb JSON-LD in 7 hubs
```

### Coordinated files (no overlap risk)
- `src/app/layout.tsx` → 2.3 owns structurally. 2.8 **only** provides `<CookieConsent />` component; 2.3 imports + mounts it.
- Page-level `metadata` exports in `src/app/**/page.tsx` → 2.8 owns metadata-only edits; never touches rendered JSX. Hub pages (2.2) will follow in S0 Saturday using 2.8's patterns.

---

## Merge discipline

- 9 branches `team2-{X.Y}-{slug}` (created as sub-agents open them)
- Daily merge to `team2` at 23:30 by lead
- Visual QA Playwright regression per PR (2.9)
- No merge to `main` without 2.9 QA green
- Conflict resolution with other teams happens at integration branch by all 4 leads

---

## Metrics target (repeated for visibility)

- 27.553 URLs indexables · 90% in GSC in 30 days
- LCP <2s on 8 hubs (mobile)
- WCAG AA <5 residual violations
- Bounce <40% hubs · avg session >300s (baseline `/trenes` 703s)
- CTR SERP +10-15% vs baseline
- 0 duplicated/double-suffix titles post-S0
