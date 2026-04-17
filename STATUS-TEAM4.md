# trafico.live — status board T4

> Source of truth: `docs/ROADMAP-MASTER-2026.md`
> Última actualización: 2026-04-18 (post wave C · **S0-S5 fully scaffolded**)

## T4 — Platform + Money (10 sub-agents · 100% shipped)

Branch: `team4` · Worktree: `/private/tmp/trafico-t4` · Roadmap: `docs/ROADMAP-TEAM-4-PLATFORM.md`

| # | Sub-agent | Status | Highlights |
|---|-----------|--------|-----------|
| **4.1** | Stripe + rate-limit + enforcement LIVE | **✅ S0+S1+S2** · live mode pending external | Webhook 4 handlers · Redis tier rate-limit · enforceTier wired in middleware · edge→Node loopback · fail-open · 402/429 deny responses · portal + refund endpoints · PRO=49€ |
| **4.2** | `/api-landing` + `/api-docs` + `/ayuda` + contact + Crisp | **✅ S0+S1+S2** | Commercial page · OpenAPI 3.1 (14 paths) · 10 FAQ articles · `/api/contact` rate-limited 3/h · auto-reply + internal mail · CrispWidget component |
| **4.3** | Dashboard cliente FULL | **✅ S2-S3** | 17 files · sidebar · keys CRUD · Recharts usage 7/30/90d · CSV export · Stripe portal · alertas summary |
| **4.4** | MCP npm package + GH Actions release | **✅ S3** · `npm publish` pending | @trafico/mcp-server HTTP-based · 17 tools · tag `mcp-v*` → auto-publish with provenance |
| **4.5** | Chatbot LIVE (Claude + 10 MCP tools) | **✅ S0+S3** | Anthropic SDK streaming · SSE transport · 10 server-side tools · prompt caching · tier rate limit (FREE 10/d, PRO 100/d, ENT 1000/d) · Redis cache 1h |
| **4.6** | Alexa + Google Assistant | **✅ S4** · submissions pending | 3 intents (trenes/tráfico/combustible) · es-ES · TTS-friendly · Lambda + Cloud Function · skill manifests listos |
| **4.7** | Flotas SaaS | **✅ S4 scaffold** | Landing 3 tiers 19/14/9€ · /dashboard live map · /onboarding 4 pasos · batch ingest API · per-fleet isolation · T2 TraficoMap consumer |
| **4.8** | Analytics + legal + alertas + admin + /ir | **✅ S0+S1+S4** | 8 GA4 events · RGPD+LSSI · 8 skeletons · TickerStrip `/noticias` · /alertas CRUD + Web Push · /admin/affiliates · alert matching engine (cron 5min) · `/ir/[partner]/[slug]` redirect + postback |
| **4.9** | Distribution loop completa | **✅ S0+S1+S5** | 6 afiliados guía · disclosure templates · Resend lib · /recursos/guia-multimodal · weekly-digest collector (SES+DigestSubscriber) · Bluesky/X/Telegram auto-post · monthly PDF (R2+cron) · /ayuntamiento/[slug] real · /prensa press kit |
| **4.10** | NextAuth + /status LIVE + i18n EN | **✅ S1** | Magic-link+Google+GitHub · middleware auth gate · /status polling 30s · HistoryGrid · heartbeat lib · 8 next-intl namespaces ES+EN |

## 31 commits shipped en `origin/team4`

```
S0+ · STATUS-TEAM4 · analytics funnel · legal · skeletons · /noticias ticker · chatbot skeleton · afiliados docs · Stripe sandbox · middleware x-tier
S1  · NextAuth · /status LIVE · i18n EN · newsletter + lead magnet · tier rate-limit · dashboard FULL
S2  · MCP package + GH Actions · tier enforcement wired · /ayuda FAQ + contact + Crisp
S3  · chatbot LIVE (Claude + 10 MCP tools)
S4  · voice assistants (Alexa+Google) · alert matching engine · /ir redirect + GA4 MP + postback
S5  · weekly-digest · social broadcast · monthly PDF · /ayuntamiento real · /prensa press kit
```

## Pendientes usuario (acción externa)

- [ ] **6 programas afiliados** (`docs/AFFILIATE-PROGRAMS-APPLICATIONS.md`) — 90 min
- [ ] **GA4 internal traffic + bot filter** — 15 min
- [ ] **Stripe dashboard** crear productos + webhook + price IDs
- [ ] **Resend setup** (DKIM/SPF/DMARC + Audience ID)
- [ ] **Google OAuth + GitHub OAuth apps**
- [ ] **Web Push VAPID keys** (`npx web-push generate-vapid-keys`)
- [ ] **Anthropic API key** (`ANTHROPIC_API_KEY`)
- [ ] **Cloudflare R2 bucket** `trafico-reports` + subdomain `reports.trafico.live`
- [ ] **Bluesky app password** (create handle `@trafico.live`)
- [ ] **X API** (paid Basic $100/mo) + OAuth 1.0a user context credentials
- [ ] **Telegram bot** via `@BotFather` + channel `@TraficoLiveES`
- [ ] **Crisp account** + `NEXT_PUBLIC_CRISP_WEBSITE_ID`
- [ ] **GA4 Measurement Protocol** secret
- [ ] **Per-partner postback secrets** (Awin, Impact, Rakuten, FlixBus, Trainline, DirectFerries)
- [ ] **npm publish** `@trafico/mcp-server@1.0.0` (push tag `mcp-v1.0.0`)
- [ ] **Alexa + Google Actions** submission (5-10 días review cada uno)
- [ ] **`npm install`** lista consolidada abajo

### `npm install` consolidado

```bash
npm install next-auth@beta @auth/prisma-adapter next-intl resend \
  @anthropic-ai/sdk @atproto/api @react-pdf/renderer @aws-sdk/client-s3 \
  web-push
npm install -D @types/web-push
```

Para el paquete MCP (`packages/mcp-server/`): `cd packages/mcp-server && npm ci && npm run build`.

## Prisma PR proposals → T3.6 (7 docs)

| Proposal | Modelos | Archivo |
|---|---|---|
| T4.10 auth | User, Account, Session, VerificationToken (+ApiKey.userId FK) | `docs/PRISMA-PROPOSAL-T4-AUTH.md` |
| T4.10 status | StatusIncident | `docs/PRISMA-PROPOSAL-T4-STATUS.md` |
| T4.9 newsletter | NewsletterSubscription (ó DigestSubscriber ya existente) + DigestEmailEvent | `docs/PRISMA-PROPOSAL-T4-NEWSLETTER.md` + `docs/WEEKLY-DIGEST.md` |
| T4.7 fleet | FleetClient, FleetVehicle, FleetPosition | `docs/PRISMA-PROPOSAL-T4-FLEET.md` |
| T4.8 alertas | UserAlert, PushSubscription, AffiliateOffer, AffiliateClick + 4 enums | `docs/PRISMA-PROPOSAL-T4-ALERTS.md` |
| T4.9 ayuntamientos | MunicipalityBranding + Article category=MONTHLY_REPORT | `docs/AYUNTAMIENTO-BRANDING.md` |
| T4.1 key-hash | ApiKey.keyHash unique + ApiKey.status enum | inline TODO en lookup route |
| T4.9 social | WeatherAlert.socialBroadcastAt?  | `docs/SOCIAL-BROADCAST.md` |

## Integraciones cross-team pendientes

- **T2.3** monta en `src/app/layout.tsx`:
  - `<NextIntlClientProvider messages={messages}>` wrapping children
  - `<ChatWidget />` (lazy via `next/dynamic`, ssr:false) antes de `</body>`
  - `<CrispWidget />` NOT in root — mount individually in `/api-landing`, `/dashboard/layout`, `/flotas/dashboard/layout`, `/account`
- **T2 nav**: cablea `trackVerticalClick` en header hub links
- **T1 `/ir/*`**: la ruta ya está en T4 (`src/app/ir/[partner]/[slug]/route.ts`) — si T1 tiene otra implementación, reconciliar
- **T3.6** merge de los 7 proposals Prisma (bloquea /dashboard /flotas /alertas /account runtime)
- **T3.1** `CollectorHeartbeat` ya existe · `/status` consume OK

## Handshakes T4

| HS | Rol | Counterparty | Sprint | Estado |
|----|-----|--------------|--------|--------|
| HS7 | Produce | T4.3, T4.5, todos `/api/*` | S2 | ✅ `x-tier` + enforcement live en middleware |
| HS8 | Consume | T3.1 | S0 | ✅ CollectorHeartbeat + `/api/status/collectors` |
| HS9 | Produce | T2.4 (chatbot embed) | S3 | ✅ 10 MCP tools + npm package 17 tools |

## Métricas target

- 3 clientes PRO (49€/mes) piloto S2
- 1.000 suscriptores newsletter S5
- 100 conversaciones chatbot/día S3
- 5 ayuntamientos firmados S5
- 1.000 instalaciones @trafico/mcp-server en npm S5
- Newsletter open rate >35%, click rate >8%
- GDPR consent verificado pre-launch (T2.8)

## Registro en dispatcher de collectors

Añadir en `services/collector/index.ts` a `VALID_TASKS`:
```ts
"alert-matcher",
"weekly-digest",
"social-broadcast",
"monthly-report",
```

Y en crontabs:
- `realtime`: `*/5 * * * * TASK=alert-matcher`
- `realtime`: `*/5 * * * * TASK=social-broadcast`
- `daily`: `0 8 * * 1 TASK=weekly-digest` (Monday 09:00 CET)
- `monthly`: `0 3 1 * * TASK=monthly-report`

## Branches y merge

- 31 commits en `origin/team4`, clean history (dropped T2 noise con rebase)
- Worktree pinned: `/private/tmp/trafico-t4`
- Daily merge `team4` → `integration` 23:30
