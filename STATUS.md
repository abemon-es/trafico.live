# STATUS — 4 teams × 9 sub-agents

> Single-page status of the 36 parallel agents.
> Source of truth: `docs/ROADMAP-MASTER-2026.md` + `docs/ROADMAP-TEAM-{1,2,3,4}-*.md`.
> Last updated: 2026-04-17 (S0 kickoff eve, team1 lead check-in).

---

## Global sprint calendar

| Sprint | Dates | Gate |
|---|---|---|
| **S0** | jue 17 → dom 19 abr | Launch 20 abr 09:00 CEST |
| **S1** | lun 21 → dom 27 abr | OTP live + auth + email |
| **S2** | lun 28 → dom 11 may | Stripe + calc real + OD seed |
| **S3** | lun 12 → dom 25 may | Valhalla + ML + MCP publish |
| **S4** | lun 26 may → dom 8 jun | /ir LIVE + affiliates |
| **S5** | lun 9 → dom 22 jun | Distribution loop + polish |

---

## TEAM 1 — ROUTING CORE (branch: `team1`)

**Lead role:** routing architect · **Sub-agents:** 9 · **Status:** S0 kickoff.

| # | Sub-agent | Branch | Status | Sprint | Owner | Blockers |
|---|---|---|---|---|---|---|
| 1.1 | OSRM deploy (3 perfiles) | `team1-1.1-osrm-deploy` | ⏳ pending | S0 | — | needs `iberia.osm.pbf` on compute |
| 1.2 | Routing API profile-aware | `team1-1.2-routing-api` | 🚧 in_progress | S0 | lead | HS3 types ✅ landed `src/types/routing.ts` |
| 1.3 | OSRM profiles compilation | `team1-1.3-osrm-profiles` | ⏳ pending | S0 | — | waits 1.1 container scaffolding |
| 1.4 | OTP2 service | `team1-1.4-otp-service` | ⏳ pending | S1 | — | — |
| 1.5 | OTP graph builder | `team1-1.5-otp-graph` | ⏳ pending | S1 | — | needs GTFS fixtures from collectors |
| 1.6 | Multimodal API + sanctions | `team1-1.6-multimodal` | ⏳ pending | S1→S2 | — | waits 1.4 |
| 1.7 | Valhalla isócronas + truck | `team1-1.7-valhalla` | ⏳ pending | S3 | — | `services/valhalla/` to re-scaffold |
| 1.8 | /calculadora motor real | `team1-1.8-calculadora` | ⏳ pending | S2-S3 | — | needs `TollSegment` populated (T3.1 confirm), `CNMCFuelPrice` daily collector live |
| 1.9 | /ir /ruta /viaje + 6K SSG | `team1-1.9-ir-meta` | ⏳ pending | S2 stub → S4 live | — | HS6 depends on T2.4 `<Offers>` props |

### Handshakes T1

| HS | Role | Counterparty | Sprint | Status | Artifact |
|---|---|---|---|---|---|
| HS3 | **producer** | T1 internal (1.8, 1.9) | S0 | ✅ **landed** | `src/types/routing.ts` |
| HS4 | producer | T1.9, T2.4 | S2 | ⏳ | `src/types/multimodal.ts` |
| HS5 | consumer | T3.7 (`/api/predict/*`) | S3 | ⏳ | schemas for reliability ranking in `/ir` |
| HS6 | consumer | T2.4 (`<Offers provider source />`) | S4 | ⏳ | widget props contract |
| HS10 | coordinated | T2.8 (sitemap, canonicals) | S2-S3 | ⏳ | `getSlugList()` for 2.000 OD pairs |

### S0 exit criteria (dom 19 abr)

- [ ] 3 OSRM containers `Up` 6h+ sin restart
- [ ] P95 routing < 120 ms (rutas <500 km)
- [ ] `/api/route` test 100% green los 3 perfiles
- [ ] Madrid→Bilbao car: 395±5 km, 4h±10min
- [ ] `services/osrm/README.md` con build/redeploy steps
- [x] HS3 contract producido y compilable

### S0 quick wins (jue 17 noche)

- [x] Branch `team1` creada + push
- [x] `STATUS.md` T1 section publicada
- [x] HS3 `src/types/routing.ts` (consumers desbloqueados)
- [ ] Audit `services/valhalla/docker-compose.yml` (bloquear puerto 8002 hasta S3 o wipe)
- [ ] README skeletons para `services/osrm/` y `services/otp/`

---

## TEAM 2 — CONSUMER + UX (branch: `team2`)

_Other team lead owns this section. T1 only reads._

---

## TEAM 3 — DATA + ML + INFRA (branch: `team3`)

_Other team lead owns this section. T1 only reads._

**T1 dependency watch:**

- T3.1 — `TollSegment` must be populated before S2 T1.8. Ping on vie AM.
- T3.1 — `CNMCFuelPrice` daily collector must be green before S2 T1.8.
- T3.6 — coordinate any `prisma/schema.prisma` change (T1 expects AffiliateClick in S4 via T4.1, not T3).
- T3.7 — `/api/predict/*` schemas needed by `/ir` in S4 for reliability ranking (HS5).

---

## TEAM 4 — PLATFORM + MONEY (branch: `team4`)

_Other team lead owns this section. T1 only reads._

**T1 dependency watch:**

- T4.1 — `AffiliateClick` model in `prisma/schema.prisma` needed S4 for `/ir` tracking.
- T2.4 via T4? — Affiliate widget contract (HS6) — coordinate with T2 lead in S3.

---

## Sync protocol

- **Daily 22:30** — each T1 sub-agent pushes to `team1-{X.Y}-{slug}`, opens/updates PR.
- **Daily 23:00** — T1 lead merges green PRs into `team1`.
- **Daily 23:30** — `team1` → `integration` automatic (global script).
- **Mié 14:00** — T1 mid-sprint check, identify blockers.
- **Vie 17:00** — T1 demo (10 min), merge `integration` → `main` on green.

**Blocker protocol:** tag `cross-team-handshake` in main chat + notify `#t1-routing` + counterparty lead.
