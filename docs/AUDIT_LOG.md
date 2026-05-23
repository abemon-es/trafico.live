# trafico.live — End-to-End Audit Log

Iterative audit + auto-improvement loop. CTO/CMO/CSO/CEO lens.
Append new iterations at top. Older iterations stay for trend tracking.

---

## Iteration 1 — 2026-05-23

**Branch:** `audit/iter-1-fixes` from `fix/csp-cal-embed`
**Trigger:** `/loop` (session-mode) — comprehensive end-to-end audit
**Operator:** Claude Opus 4.7 (1M ctx)

### Prod health snapshot

| Surface | Status |
|---|---|
| Homepage + 19 sampled routes (incl. multimodal, /calendario) | 200 across the board, p50 ~0.4s |
| `robots.txt` | 200, AI bots allow-listed (GPTBot, ChatGPT-User, Anthropic-AI, Claude-Web) |
| `sitemap.xml` | 200, index references 20 child sitemaps, ~121,947 URLs total |
| `news-sitemap.xml` | 200, 9 articles |
| Security headers | HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — all present |
| `/api/health` | **DEGRADED** — 10 collectors stale (see infra section) |
| Cmd+K search | **BROKEN** — Typesense index stale 14.5 days, `/api/search` returns empty results silently |
| AIS maritime tracking | **DEAD** — `ais-stream` collector has not run since 2026-05-07 (15.4 days) |

### Code-level findings (file:line cited)

**Analytics (GA4)**
- `src/app/layout.tsx:217-230` — GA4 initialized correctly with consent-mode-v2 defaults to denied, `G-NL52LCLDV7` ID.
- `src/lib/analytics.ts:81-86` — `trackPricingClick` was orphaned (never called from any component). **Fixed iter 1.**
- `src/lib/analytics.ts:92,103,114` — `trackApiDocsClick`, `trackNewsletterSignup`, `trackVerticalClick` partially or never called. Wire next iteration.
- `src/lib/ga4-measurement-protocol.ts` — server-side MP helper exists. Used only in affiliate redirector before iter 1.
- `src/components/api-landing/RequestAccessForm.tsx:27-32` — local `trackCtaClick`/`trackNewsletterSignup` shadowed canonical lib versions, sent every event as `filter_applied`. **Fixed iter 1.**
- `src/app/api/billing/route.ts` — zero GA4 events on checkout. **Fixed iter 1** (server-side `begin_checkout` MP event, gated on `gaClientId` passed by browser).
- `src/app/api/billing/webhook/route.ts` — zero GA4 events on `checkout.session.completed`. **Fixed iter 1** (server-side `purchase` MP event with full enhanced-ecommerce items array, EUR currency, real transaction_id).

**SEO**
- `src/app/robots.ts` — only listed 4 AI bots. **Fixed iter 1** — now allow-lists 19 AI/search crawler fingerprints (ClaudeBot, PerplexityBot, OAI-SearchBot, GoogleOther, Google-Extended, Applebot-Extended, Bytespider, CCBot, etc.).
- `src/lib/sitemap-generator.ts` — `/calendario` page missing from index. **Fixed iter 1.**
- `src/app/api/sitemap-index/route.ts` + `src/lib/sitemap-generator.ts` — empty sitemap shards (101, 102, 201, 202) were declared in the index but contained 0 URLs, wasting Googlebot crawl budget. **Fixed iter 1** — new `getActiveShardIds()` queries Prisma counts and emits only non-empty shards, with safe fallback to static list if DB query fails.
- `src/components/seo/StructuredData.tsx:13` — module-level mutable counter for script IDs could collide across concurrent SSR renders. **Fixed iter 1** — replaced with FNV-1a content hash (deterministic per payload).
- `src/app/layout.tsx:127` — `Organization.sameAs` is an empty array. Knowledge Panel gap. **Not fixed iter 1** — need MJ's social handles (X/Twitter, LinkedIn).
- `google-site-verification` meta tag — **NOT FOUND** in layout. `public/ef8b508f84f07064a1bda393b024e2f5.txt` exists, so file verification is presumably how GSC was verified. Confirm and add meta tag too for redundancy. **Deferred iter 2.**
- OG image overrides missing for: `/calidad-aire`, `/gasolineras`, `/incidencias`, `/estadisticas`, `/radares`. Generic `/og-image.webp` fallback served. **Deferred iter 3.**

**Bot / AI citation tracking**
- `src/middleware.ts` — had zero bot user-agent inspection. **Fixed iter 1** — detects 18 AI/LLM crawler fingerprints, logs structured `ai_bot_visit` JSON to stdout for Loki ingestion. Loki dashboard wiring deferred to iter 2.
- `public/llms.txt` exists and is well-structured.
- No `ai.txt` / `robots-ai.txt` (not standard, skip).

**Funnel / conversion**
- `src/app/dashboard/billing/page.tsx:73,80` — pricing CTAs use `<a href="/api/billing?tier=PRO">` (GET), but the endpoint only handles checkout via POST. **The dashboard upgrade flow is silently broken.** Iter 2 priority: convert to a form POST or a client-side fetch. Not fixed iter 1 to avoid touching the dashboard surface in the same PR.
- `src/components/api-landing/TierCard.tsx` — pricing CTAs now fire `trackPricingClick(tier, source)` on click. **Fixed iter 1.**

**Revenue leaks**
- `src/app/baliza-v-16/page.tsx:269-281` — Amazon affiliate tag is `AFFILIATE_TODO` placeholder. Every V16 click in production earns €0. **Blocked on MJ providing real Associates tag.**
- `src/app/maritimo/ferries/proximo/page.tsx:477,541` — DirectFerries affiliate not wired. **Blocked.**
- `src/app/reclamacion-vuelo/page.tsx:340,356` — AirHelp affiliate not wired. **Blocked.**

**Security / auth**
- `src/app/api/billing/portal/route.ts:9,64` — customer lookup by email instead of session. Allows any party with a valid email to open another user's billing portal. **HIGH severity. Deferred iter 2 (needs session/auth design decision).**
- `src/app/admin/affiliates/layout.tsx:9` — admin auth not role-gated; uses a hardcoded check. **MEDIUM. Deferred iter 2.**

### Infra issues (require SSH — flagged for MJ)

| Severity | Service | Issue | Action |
|---|---|---|---|
| CRITICAL | `ais-stream` | 15.4 days dead, vessel tracking stale | `ssh compute && docker compose -f docker-compose.collectors.yml --project-directory /opt/apps/trafico-live restart ais` + investigate why it died (likely OOM or WebSocket disconnect that exhausted retries) |
| CRITICAL | `typesense-sync` | 14.5 days stale, sitewide Cmd+K returns empty | `ssh compute && docker compose ... run --rm daily node services/collector/dist/index.js` with `TASK=typesense-sync`; verify `/api/search?q=madrid` after |
| HIGH | `cnmc-fuel`, `transit-gtfs`, `opensky`, `aemet-forecast` | `partial` status, fuel/transit/aviation pages serve stale data | Tail logs, rerun manually |
| MEDIUM | `/api/search` | Silent zero-results when index stale | Code fix iter 2: return 503 + degraded flag if index age > 24h |

### Shipped this iteration

Files modified on `audit/iter-1-fixes`:
- `src/lib/sitemap-generator.ts` — `/calendario` entry + `getActiveShardIds()` DB-backed
- `src/app/api/sitemap-index/route.ts` — uses `getActiveShardIds()`, fallback to static
- `src/app/robots.ts` — 19 AI/search bot allow-list
- `src/components/seo/StructuredData.tsx` — FNV-1a content hash IDs
- `src/lib/stripe.ts` — `createCheckoutSession` returns `{url, sessionId}` + accepts `tier`+`gaClientId` metadata
- `src/app/api/billing/route.ts` — fires `begin_checkout` MP event when `gaClientId` provided
- `src/app/api/billing/webhook/route.ts` — fires `purchase` MP event on `checkout.session.completed` with full ecommerce items
- `src/components/api-landing/RequestAccessForm.tsx` — uses canonical analytics lib
- `src/components/api-landing/TierCard.tsx` — wires `trackPricingClick` to PRO/ENTERPRISE CTAs
- `src/middleware.ts` — AI bot visit logging (18 fingerprints) → stdout/Loki

### KPIs to watch (iter 2 must verify)

- Sitemap index URL count drops from 20 to ~16 (4 empty shards removed)
- GSC sitemap errors drop to zero
- `ai_bot_visit` Loki entries appear within 1h of deploy
- `purchase` events appear in GA4 within 24h of next paid checkout
- `pricing_click` events appear in GA4 within 1h of next pricing-page visit
- Indexed pages in GSC up over 7d (verify next iteration)

### Deferred to iter 2

1. Verify deploy of iter 1 PR succeeded (probe sitemap-index, robots.txt, log Loki for `ai_bot_visit`).
2. SSH ops: restart `ais-stream`, run `typesense-sync` manually.
3. Fix dashboard pricing CTAs (`src/app/dashboard/billing/page.tsx`) — GET→POST conversion.
4. Add browser-side `gaClientId` capture from `_ga` cookie + plumb to POST `/api/billing`.
5. Add `google-site-verification` meta in layout.
6. Populate `Organization.sameAs` with real social profiles (ask MJ).
7. Add OG images for `/calidad-aire`, `/gasolineras`, `/incidencias`, `/estadisticas`, `/radares`.
8. Add search degradation flag (503) when Typesense unreachable.
9. Fix `/api/billing/portal` email-based lookup (security).
10. Add Prisma `BotVisit` model + nightly aggregation → public AI citations dashboard at `/sobre/citaciones-ia`.
11. Pull GSC + GA4 data via API to enrich audit log automatically.

### One-line state summary

> Production responding 200 on all routes; **search dead 14d, AIS dead 15d (infra ops blocked on SSH)**; iter 1 ships sitemap-index + robots + GA4 funnel + AI bot logging fixes; **next: verify deploy + dig into dashboard pricing bug + automate GSC/GA4 ingestion**.
