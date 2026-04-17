# trafico.live — status board

> Source of truth: `docs/ROADMAP-MASTER-2026.md`
> Última actualización: 2026-04-17

## T4 — Platform + Money (10 sub-agents)

Branch base: `team4` · Lead: platform lead · Roadmap: `docs/ROADMAP-TEAM-4-PLATFORM.md`

| # | Sub-agent | Owns | Status | Sprint | Branch |
|---|-----------|------|--------|--------|--------|
| **4.1** | Stripe tiers + middleware enforcement + refunds + VAT | `src/app/api/billing/**`, `src/lib/stripe.ts`, `src/lib/api-tiers.ts`, `src/middleware.ts` | pending | S0→S2 | `team4-4.1-stripe` |
| **4.2** | `/api` landing + Swagger + customer support | `src/app/api-landing/**`, `src/app/api-docs/**`, `public/openapi.json`, `src/app/ayuda/**` | pending | S0→S2 | `team4-4.2-api-landing` |
| **4.3** | Dashboard cliente | `src/app/dashboard/**` | pending | S2→S3 | `team4-4.3-dashboard` |
| **4.4** | MCP npm publish + Discord | `src/mcp/**`, `packages/mcp-server/**` | pending | S3 | `team4-4.4-mcp` |
| **4.5** | Chatbot widget (Claude API + MCP) | `src/components/chat/**`, `src/app/api/chat/route.ts` | pending | S0→S3 | `team4-4.5-chatbot` |
| **4.6** | Alexa + Google Assistant skills | `services/alexa/**`, `services/google-action/**` | pending | S4 | `team4-4.6-voice` |
| **4.7** | Flotas SaaS | `src/app/flotas/**`, `src/app/api/flotas/**`, prisma `FleetVehicle/FleetPosition` (PR → T3.6) | pending | S4 | `team4-4.7-flotas` |
| **4.8** | Analytics funnel + alertas + legal pages + affiliates dashboard | `src/lib/analytics.ts`, `src/app/alertas/**`, `src/app/api/alerts/**`, `src/app/{aviso-legal,privacidad,cookies}/page.tsx`, `src/app/admin/affiliates/**`, prisma `UserAlert/AffiliateOffer/AffiliateClick/RouteODPair` (PR → T3.6) | **in_progress (S0+)** | S0→S4 | `team4-4.8-analytics-alerts` |
| **4.9** | Distribution loop + ayuntamientos + press kit | `services/collector/tasks/weekly-digest/**`, `src/app/ayuntamiento/[slug]/**`, `src/app/prensa/**`, `src/app/recursos/**` | pending | S1→S5 | `team4-4.9-distribution` |
| **4.10** | Auth (NextAuth) + accounts + status + i18n EN | `src/app/(auth)/**`, `src/app/account/**`, `src/app/status/**`, `src/lib/auth-client.ts`, `src/middleware.ts` (auth ↔ 4.1 tier), next-intl base | pending | S1→S2 | `team4-4.10-auth-status-i18n` |

### S0+ checklist (jue 17 noche → sáb 19)

- [ ] **4.8** GA4 Admin → Data Streams → internal traffic + bot filter (screenshots pre/post) — USER UI ACTION, 15min
- [ ] **4.8** Decisión `/noticias`: rework `<TickerStrip>` consumiendo `/api/incidencias?live=true` (recomendado) vs deprecar — ver §A abajo
- [ ] **4.8** GA4 event funnel custom: 8 events críticos en `src/lib/analytics.ts` — **BLOCKED: edit reverted 2026-04-17, needs user confirmation** (detalle §B)
- [ ] **4.8** Esqueleto routes `/api`, `/api-docs`, `/dashboard`, `/flotas`, `/alertas`, `/ayuntamiento/[slug]` con "coming soon"
- [ ] **4.8** T&C + Privacidad + Cookies pages updated (LSSI + GDPR) — 3 páginas nuevas (`/privacidad`, `/cookies` no existen; `aviso-legal` sí)
- [ ] **4.1** Stripe sandbox setup + webhook `/api/billing/webhook` + 3 tier products + price IDs en env
- [ ] **4.1** Middleware detecta API key → header `x-tier` (logging only, sin enforcement)
- [ ] **4.2** `/api` landing comercial + `/api-docs` Swagger UI
- [ ] **4.8** LLMs.txt + FAQ schema en 7 hubs (coordinado T2.8, T4 provee contenido FAQ)
- [ ] **4.5** Skeleton chatbot widget bottom-right en hubs (placeholder)
- [ ] **4.8** Submit sitemap shards nuevos a GSC

### Criterio salida S0 T4

- [ ] Stripe sandbox responde a webhooks
- [ ] GA4 event funnel custom verified en DebugView
- [ ] T&C/Privacy/Cookies actualizados
- [ ] `/api` landing live con tiers visibles
- [ ] Sitemap submitted GSC

### Handshakes T4

| HS | Rol | Counterparty | Sprint | Contract |
|----|-----|--------------|--------|----------|
| HS7 | Produce | T4.3, T4.5, todos `/api/*` | S2 | Headers `x-tier` en requests autenticados |
| HS8 | Consume | T3.1 | S0 | `CollectorHeartbeat` table para `/status` page |
| HS9 | Produce | T2.4 (chatbot embed) | S3 | MCP tools list firmada vie S2 |

### Sync rules

- Prisma changes → siempre PR de propuesta a T3.6 ANTES de implementar
- `src/middleware.ts` → coordinated 4.1 ↔ 4.10 (auth + tier viven juntos)
- Daily merge `team4` → `integration` 23:30
- Demo viernes: 1 vista cada 2 sub-agents (rotación) + sales pipeline

### Dependencias externas pendientes (aplicar HOY)

**Afiliados (1-3 sem aprobación):**
- [ ] Skyscanner Partners
- [ ] Trainline Partners (**CRÍTICO** — Renfe/OUIGO/Iryo)
- [ ] DirectFerries
- [ ] FlixBus + BlaBlaCarBus
- [ ] Awin (puente)
- [ ] Rakuten

**Servicios:**
- [ ] Stripe partner agreement (aplicar S0 vie, <7d aprobado)
- [ ] Resend API key (ya hay? verificar)
- [ ] Crisp account (S2 lun)
- [ ] Cloudflare R2 bucket (S5)
- [ ] Telegram bot token (S4)
- [ ] Discord server admin (S3)

### Métricas éxito T4

- 3 clientes PRO (49€/mes) piloto S2
- Newsletter 1.000 suscriptores S5
- 100 conversaciones chatbot/día S3
- 5 ayuntamientos firmados piloto S5
- 1.000 instalaciones MCP npm package S5
- GDPR consent verified pre-launch

---

## §A — Decisión `/noticias` (S0+)

**Contexto:**
- GA4: 39 views, 8 engaged, **34s avg** → bounce alto
- GSC: `/noticias/informe-diario-2026-04-02` aparece pos 8 con 0 clicks
- Consume nav + crawl budget sin retorno monetizable
- Actualmente pulls de tabla `Article` con categorías DAILY_REPORT / WEEKLY_REPORT / PRICE_ALERT / etc.

**Recomendación: REWORK como live ticker**

1. Conservar señal SEO (pos 8 en query "informe diario tráfico") → **NO deprecar**
2. Reemplazar landing actual por `<TickerStrip>` consumiendo `/api/incidencias?live=true`
3. Mantener categoría archive bajo `/noticias/[slug]` (informes diarios auto generados por colector)
4. Añadir sección "hoy en las carreteras" con contador vivo (sesiones → lecturas engaged con duration target 90s+)

**Implementación (S0 sáb 19, 2h):**
- `src/app/noticias/page.tsx` → reemplaza hero por `<TickerStrip>` + lista de informes últimos 7d
- `src/components/noticias/TickerStrip.tsx` → nueva (SWR sobre `/api/incidencias?live=true`, refresh 60s)
- Mantener `metadata` + breadcrumbs + structured data intactos

**Alternativa: DEPRECAR**
- Remove from nav, add `noindex` + remove from sitemap, 410 Gone en slugs — solo si rework no cabe en S0

---

## §B — GA4 event funnel custom (BLOCKED)

**Contexto (`docs/seo-audit-2026-04-17/10-gsc-ga4.md §3.5`):**

Eventos GA4 actuales en 90d:
```
1.600 page_view · 200 session_start · 533 user_engagement
    3 click · 1 form_start · 1 form_submit · 70 search
```

**Faltan 8 events BLOQUEANTES para post-launch attribution:**

| Event | Qué mide | Source params |
|-------|----------|---------------|
| `pricing_click` | tier upgrade intent | tier (PRO/ENTERPRISE), source |
| `api_docs_click` | developer acquisition | source, endpoint |
| `newsletter_signup` | distribution loop seed | source, lead_magnet |
| `vertical_click` | hub navigation | vertical, source |
| `cta_click` | primary CTA conversion | cta_id, cta_text, source |
| `affiliate_click` | revenue attribution | partner, route, product, value (EUR), source |
| `search_submit` | query form submission | search_term, source |
| `embed_view` | external embed reach | embed_type, embed_origin |

**Estado:** primer intento de edit a `src/lib/analytics.ts` (añadiendo las 8 funciones) fue **revertido por el sistema** el 2026-04-17. El file sigue en su estado original (6 helpers legacy: `trackSearch`, `trackPriceAlert`, `trackMapInteraction`, `trackFilter`, `trackOutbound`, `trackEntityView`).

**Acción pendiente:** usuario confirma autorización para extender `analytics.ts`, o indica alternativa (nuevo archivo `src/lib/analytics-funnel.ts`?).

**Próximo paso una vez desbloqueado:**
- Extender `analytics.ts` con 8 helpers
- Cablear `trackPricingClick` en `/api` landing tier buttons
- Cablear `trackVerticalClick` en nav primary links (src/components/layout/PrimaryNav o equivalente)
- Cablear `trackAffiliateClick` en `/ir` redirect handler (T1) — coordinar contract con T1
- Cablear `trackNewsletterSignup` en footer signup (S1)
- Verificar en GA4 DebugView que los 8 events disparan
