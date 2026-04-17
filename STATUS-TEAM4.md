# trafico.live — status board T4

> Source of truth: `docs/ROADMAP-MASTER-2026.md`
> Última actualización: 2026-04-17 (post wave B · S1-S4 scaffolded)

## T4 — Platform + Money (10 sub-agents)

Branch: `team4` · Worktree: `/private/tmp/trafico-t4` · Roadmap: `docs/ROADMAP-TEAM-4-PLATFORM.md`

| # | Sub-agent | Status | Commits | Notes |
|---|-----------|--------|---------|-------|
| **4.1** | Stripe + middleware tier detection + rate-limit + refunds | **shipped S0+S1+S2 scaffolds** · pending live mode | `1e43ae2d`, `acfade61` | Webhook 4 handlers + clampInt · tier-rate-limit.ts Redis sliding window · portal/refund endpoints · PRO=49€ |
| **4.2** | `/api-landing` + `/api-docs` + OpenAPI 3.1 | **shipped S0** | `5f05b244` | 14 paths, 8 reusable schemas, TierCard + CurlExample + RequestAccessForm |
| **4.3** | Dashboard cliente (layout + keys CRUD + usage Recharts + billing + alertas) | **shipped S2-S3** | `ea30ebb0` | 17 files, sidebar, CSV export, Stripe portal integration |
| **4.4** | MCP npm package + release workflow | **scaffolded S3** · npm publish manual step pending | `ead21453` + prior | @trafico/mcp-server HTTP-based · GH Actions release on tag `mcp-v*` · 17 tools |
| **4.5** | Chatbot widget | **skeleton S0** · live S3 pending Claude API | `b5ce1533` | FAB + drawer + placeholder · /api/chat stub 503 · T2.3 mounts `<ChatWidget/>` |
| **4.6** | Alexa + Google Assistant skills | pending S4 | — | — |
| **4.7** | Flotas SaaS (landing + dashboard + onboarding + ingest API) | **shipped S4 scaffold** | `e63cb2f3` | 3-tier pricing · /flotas/dashboard live map · per-fleet isolation · T2 TraficoMap consumer |
| **4.8** | Analytics funnel + legal + skeletons + /noticias ticker + alertas + admin/affiliates | **shipped S0+S4** | `595d4724`, `5d262ff8`, `6c5635da`, `00a9eca6`, `598d6306`, `16db0437` | 8 GA4 events · RGPD+LSSI pages · 8 skeletons · live TickerStrip · /alertas CRUD + Web Push SW · admin dashboard stub |
| **4.9** | Distribution loop: afiliados guide + newsletter + lead magnet | **shipped S0+S1** · weekly-digest S5 pending | `6a4fe684`, `dc025a91` | 6 programas · disclosure templates · Resend lib · double opt-in · /recursos/guia-multimodal 1.5K palabras |
| **4.10** | NextAuth + /status LIVE + i18n EN | **shipped S1** | `37f933fa`, `2f980293`, `b9c5c3fb`, `7e929b23` | Magic link + Google + GitHub · middleware gate · /status polling 30s · 8 next-intl namespaces ES+EN |

## Shipped (18 commits on team4 post S0+S1)

- [x] STATUS-TEAM4.md
- [x] analytics.ts 8 events (pricing_click, api_docs_click, newsletter_signup, vertical_click, cta_click, affiliate_click, search_submit, embed_view)
- [x] `/noticias` rework con `<TickerStrip>` + LiveIncidentBadge
- [x] 3 páginas legales (aviso-legal actualizado · /privacidad · /cookies)
- [x] 8 skeletons `coming-soon` con `noindex`
- [x] Stripe sandbox setup (webhook 4 handlers + clampInt)
- [x] Middleware x-tier detection (logging only)
- [x] `/api-landing` comercial + `/api-docs` + `public/openapi.json`
- [x] Chatbot widget skeleton
- [x] 6 programas afiliados researched + disclosure templates
- [x] NextAuth v5 (5 auth pages + middleware gate)
- [x] `/status` LIVE (30s refresh, collectors + history + incidents)
- [x] i18n EN base (8 namespaces)
- [x] Newsletter Resend + `/recursos/guia-multimodal` lead magnet
- [x] Tier rate-limit (Redis) + enforcement helpers + Stripe portal/refund endpoints
- [x] Dashboard FULL (keys CRUD + Recharts usage + billing + alertas summary)
- [x] Flotas SaaS landing + dashboard + onboarding
- [x] /alertas CRUD + Web Push service worker + 3-step wizard
- [x] /admin/affiliates dashboard skeleton
- [x] @trafico/mcp-server npm package + GH Actions release workflow (`mcp-v*` tag)

## Pendientes usuario (acción fuera del código)

- [ ] **Aplicar a 6 programas afiliados** HOY — `docs/AFFILIATE-PROGRAMS-APPLICATIONS.md` (~90 min)
- [ ] **GA4 Admin → internal traffic + bot filter** (15 min)
- [ ] **Stripe dashboard** crear 3 productos test + webhook endpoint → env IDs (`docs/STRIPE-SANDBOX-SETUP.md`)
- [ ] **Resend setup** (DKIM/SPF/DMARC + Audience ID) — `docs/NEWSLETTER-SETUP.md`
- [ ] **Google OAuth + GitHub OAuth apps** + callback URLs — `docs/AUTH-SETUP.md`
- [ ] **Web Push VAPID keys** — `docs/ALERTS-SYSTEM.md`
- [ ] **npm install**: `next-auth@beta @auth/prisma-adapter next-intl resend`
- [ ] **npm publish** `@trafico/mcp-server@1.0.0` (push tag `mcp-v1.0.0` → GH Actions publica automático con provenance)

## Prisma PR proposals abiertas → T3.6

| Proposal | Modelos | Archivo |
|---|---|---|
| T4.10 auth | User, Account, Session, VerificationToken (+ApiKey.userId FK) | `docs/PRISMA-PROPOSAL-T4-AUTH.md` |
| T4.10 status | StatusIncident | `docs/PRISMA-PROPOSAL-T4-STATUS.md` |
| T4.9 newsletter | NewsletterSubscription | `docs/PRISMA-PROPOSAL-T4-NEWSLETTER.md` |
| T4.7 fleet | FleetClient, FleetVehicle, FleetPosition | `docs/PRISMA-PROPOSAL-T4-FLEET.md` |
| T4.8 alertas | UserAlert, PushSubscription, AffiliateOffer, AffiliateClick + 4 enums | `docs/PRISMA-PROPOSAL-T4-ALERTS.md` |
| T4.1 key-hash | ApiKey.keyHash (unique) + ApiKey.status enum | inline TODO en `src/app/api/internal/keys/lookup/route.ts` |

## Pendientes código (S2-S5)

- T4.1 Stripe **live mode** (partner agreement + Tax EU VAT) — S1
- T4.1 Tier **enforcement** mounted en middleware (B5 helpers listos; B1 middleware tiene auth gate pero falta wire `enforceTier` + 402/429 responses en `/api/*`) — S2
- T4.2 Resend cable en RequestAccessForm · Crisp widget · `/ayuda` FAQ 10 artículos — S1-S2
- T4.3 Stripe portal redirect · invoice PDF polish — S2-S3
- T4.4 `npm publish @trafico/mcp-server@1.0.0` · Discord server config — S3
- T4.5 Claude API streaming + MCP tool calls + tier-based rate limit — S3
- T4.6 Alexa skill + Google Assistant action — S4
- T4.7 Fleet features: historial rutas, reports PDF, alertas por vehículo — S4
- T4.8 Alert matching engine (cron UserAlert × incidents → Resend/Push/Telegram) — S4
- T4.8 Affiliate tracking real `/ir/[partner]/[slug]` → AffiliateClick (coordina T1 que owns /ir) — S4
- T4.9 weekly-digest collector · Bluesky/X auto-post AEMET extreme · monthly PDF · 20 ayuntamientos outreach · `/prensa` press kit · `/ayuntamiento/[slug]` datos reales — S5

## Integraciones cross-team pendientes

- **T2.3** monta `<ChatWidget />` + `<NextIntlClientProvider>` en `src/app/layout.tsx`
- **T2** cablea `trackVerticalClick` en nav header (patrones en `docs/ANALYTICS-FUNNEL.md`)
- **T1** cablea `trackAffiliateClick` en `/ir/[partner]/[slug]` antes del 302
- **T3.6** merge de 6 proposals Prisma (lista arriba)
- **T3.1** `CollectorHeartbeat` ya existe · `/status` consume OK

## Handshakes T4

| HS | Rol | Counterparty | Sprint | Estado |
|----|-----|--------------|--------|--------|
| HS7 | Produce | T4.3, T4.5, todos `/api/*` | S2 | Headers `x-tier` disponibles en middleware (logging) |
| HS8 | Consume | T3.1 | S0 | `CollectorHeartbeat` + `/api/status/collectors` ✓ |
| HS9 | Produce | T2.4 (chatbot embed) | S3 | MCP tools list via npm package (17 tools) |

## Métricas target

- 3 clientes PRO (49€/mes) piloto S2
- 1.000 suscriptores newsletter S5
- 100 conversaciones chatbot/día S3
- 5 ayuntamientos firmados S5
- 1.000 instalaciones @trafico/mcp-server en npm S5
- GDPR consent verificado pre-launch (T2.8 owns banner)

## Branches y merge

- Solo `team4` — sub-agents no tienen branches propias esta sprint (worktree constraint en el entorno multi-agent)
- Daily merge `team4` → `integration` a las 23:30
- Demo viernes: rotación de 2 sub-agents por semana
