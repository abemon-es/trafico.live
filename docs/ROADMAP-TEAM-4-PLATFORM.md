# TEAM 4 — PLATFORM + MONEY

> 📍 Source of truth: `docs/ROADMAP-MASTER-2026.md` · vista parcial T4, ampliada.
> **Rol:** Stripe + API premium + dashboard + MCP + chatbot + Alexa + flotas + alertas + ayuntamientos + analytics + distribution loop + auth/accounts + status page + i18n base.

**Lead role:** Platform lead
**Tamaño team:** **10 sub-agents** (incluye 4.10 nuevo de auth+status+i18n)
**Branch:** `team4`
**Slack channel:** #t4-platform

---

## 0. Mission

Convertir trafico.live en una plataforma comercial: monetización (afiliados + API premium + flotas + ayuntamientos), capa de identidad (auth + accounts + i18n EN), assistant AI (chatbot + MCP + Alexa), legal/compliance (T&C + cookies + disclosure), y el loop de distribución que garantiza tráfico continuo. Sin esta capa, el trabajo de T1/T2/T3 no genera revenue.

---

## 1. Sub-agents (10)

| # | Sub-agent | Owns (paths exclusivos) | Sprint principal |
|---|---|---|---|
| **4.1** | Stripe tiers + webhooks + middleware enforcement + refunds + VAT | `src/app/api/billing/**`, `src/lib/stripe.ts`, `src/lib/api-tiers.ts`, `src/middleware.ts` (auth+tier coordinated con 4.10) | S0 (sandbox) → S2 (live) |
| **4.2** | `/api` landing + playground + Swagger + customer support | `src/app/api-landing/**`, `src/app/api-docs/**`, `public/openapi.json`, support email auto-reply (Resend), Crisp widget integration | S2 |
| **4.3** | Dashboard cliente | `src/app/dashboard/**`, key management UI, usage charts, billing portal | S3 |
| **4.4** | MCP npm publish + Discord community | `src/mcp/**`, `packages/mcp-server/**`, npm release pipeline + GH Actions, Discord server setup | S3 |
| **4.5** | Chatbot widget | `src/components/chat/**`, `src/app/api/chat/route.ts`, Claude API integration, MCP tools wiring | S3 |
| **4.6** | Alexa + Google Assistant skills | `services/alexa/**`, `services/google-action/**` | S4 |
| **4.7** | Flotas SaaS | `src/app/flotas/**`, `prisma/schema.prisma` (`FleetVehicle`, `FleetPosition` — coordina con T3.6), `src/app/api/flotas/**` | S4 |
| **4.8** | Alertas push + suscripción + analytics + T&C/Privacy/Cookies pages + Affiliate dashboard | `src/app/alertas/**`, `prisma/schema.prisma` (`UserAlert`, `AffiliateOffer`, `AffiliateClick`, `RouteODPair` — coordina), `src/app/api/alerts/**`, GA4 event funnel custom, GA4 bot filter, `src/app/{aviso-legal,privacidad,cookies}/page.tsx`, `src/app/admin/affiliates/**` | S0 (eventos) + S4 (alertas) |
| **4.9** | Distribution loop + ayuntamientos + press kit | `services/collector/tasks/weekly-digest/**`, `src/app/ayuntamiento/[slug]/**`, Resend integration, Bluesky/X auto-post, monthly PDF report, `src/app/prensa/**` | S5 |
| **4.10** | **NUEVO** Auth + accounts + status page + i18n EN | `src/app/(auth)/**` (login/signup/forgot/verify), `src/lib/auth-client.ts`, NextAuth config, `src/app/account/**`, `src/middleware.ts` (auth coordinado con 4.1), `src/app/status/page.tsx` + cron checker, next-intl setup base | S1 |

---

## 2. Sprint plan T4

### S0+ (jue 17 noche)

| Sub-agent | Entregable |
|---|---|
| 4.8 | **GA4 internal traffic + bot filter**: GA4 Admin → Data Streams → Configure tag → Define internal traffic (IP propia + colaboradores) + bot filter. Screenshot pre/post. (15m) |
| 4.8 | Decisión `/noticias`: rework "live news ticker" o deprecar. **Recomendación**: rework con `<TickerStrip>` consumiendo `/api/incidencias?live=true` para no perder los pos 8 de GSC (15m) |

### S0 viernes 18

| Sub-agent | Entregable |
|---|---|
| 4.1 | Stripe sandbox setup completo · webhook endpoint `/api/billing/webhook` · 3 tier products en Stripe Dashboard (FREE/PRO/ENTERPRISE) · price IDs en env |
| 4.1 | Middleware `src/middleware.ts` extiende auth con detección API key + lookup `ApiKey` table → tier en headers `x-tier` (todavía sin enforcement, solo logging) |
| 4.8 | **GA4 event funnel custom completo** (BLOQUEANTE post-launch): `pricing_click`, `api_docs_click`, `newsletter_signup`, `vertical_click`, `cta_click`, `affiliate_click`, `search_submit`, `embed_view`. Helper `src/lib/analytics.ts` |
| 4.8 | Esqueleto routes: `/api`, `/api-docs`, `/dashboard`, `/flotas`, `/alertas`, `/ayuntamiento/[slug]` con placeholder "coming soon" hasta sprint correspondiente |

### S0 sábado 19

| Sub-agent | Entregable |
|---|---|
| 4.2 | `/api` landing comercial: hero, tiers pricing table, ejemplos curl, "request access" form (Resend) |
| 4.2 | `/api-docs` con Swagger UI cargando `public/openapi.json` (generado de `next-swagger-doc`) |
| 4.8 | LLMs.txt y FAQ schema en 7 hubs (capitaliza señal chatgpt referral) — coordinado con T2.8 (T2 hace integración, T4 provee contenido FAQ) |
| 4.8 | **T&C + Privacidad + Cookies pages updated** para incluir afiliados, API premium, flotas, alertas push, biometría futura. Revisión con plantilla LSSI + GDPR |

### S0 domingo (QA + analytics live)

| Sub-agent | Entregable |
|---|---|
| 4.8 | GA4 events tracking en producción · verificar en GA4 DebugView que los 8 events disparan |
| 4.8 | Submit sitemap shards nuevos a GSC (incluyendo 4K URLs faltantes + 27K entity pages) |
| 4.5 | Esqueleto chatbot widget UI (placeholder "próximamente") flotando bottom-right en hubs |

**Criterio salida S0 T4:**
- [ ] Stripe sandbox responde a webhooks
- [ ] GA4 event funnel custom verified en DebugView
- [ ] T&C/Privacy/Cookies actualizados
- [ ] `/api` landing live con tiers visibles
- [ ] Sitemap submitted GSC

### S1 (lun 21 → dom 27 abr)

**Objetivo:** Auth + accounts + status page + Stripe live.

| Sub-agent | Entregable |
|---|---|
| 4.10 | **NextAuth setup** con providers email magic link (Resend) + Google OAuth + GitHub OAuth |
| 4.10 | Pages: `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/account` (perfil + key list + alertas) |
| 4.10 | Middleware extiende auth para rutas protegidas (`/dashboard`, `/flotas`, `/account`, `/alertas` admin) |
| 4.10 | `/status` page consulta `/api/health` cada 30s · histórico 7 días en `StatusIncident` model · push a `status.trafico.live` subdomain (Cloudflare CNAME) |
| 4.10 | **i18n EN base** con next-intl: 8 hubs + 4 entity templates traducidos (coordinado T2.3 ownership messages files) |
| 4.1 | Stripe live mode (verificar partner agreement) · primer test PRO checkout end-to-end · webhook signed handling |
| 4.1 | Stripe Tax para VAT por país (UE auto, ROW manual) |
| 4.9 | Newsletter primer envío manual con Resend · template HTML genérico · 1 lead magnet "guía multimodal España" en `/recursos/guia-multimodal` |

### S2 (lun 28 abr → dom 11 may)

**Objetivo:** Tier enforcement live + customer support + dashboard cliente arranque.

| Sub-agent | Entregable |
|---|---|
| 4.1 | Tier enforcement live en middleware: rate limiting por tier (FREE 1K/día, PRO 100K/día, ENTERPRISE ilimitado), bloqueo paths PRO+ con 402 Payment Required + redirect `/api?upgrade=1` |
| 4.1 | Refund + dispute flow Stripe API |
| 4.2 | Customer support: `support@trafico.live` + auto-reply Resend ("respondemos en 24h hábil") + Crisp widget en `/api`, `/dashboard`, `/flotas`, `/account` |
| 4.2 | Help center estructura `/ayuda` con 10 artículos seed (FAQ comunes + getting started API) |
| 4.3 | Dashboard arranque: `/dashboard` con vista "your plan" + "your keys" + "usage last 7d" |
| 4.8 | Affiliate revenue dashboard interno `/admin/affiliates` (auth admin only) — preparar para S4 cuando llegue tracking real |
| 4.10 | i18n EN cobertura ampliada: hubs + landings principales |

### S3 (lun 12 → dom 25 may)

**Objetivo:** MCP npm + chatbot live + dashboard FULL.

| Sub-agent | Entregable |
|---|---|
| 4.4 | Refactor `src/mcp/` para empaquetar como `@trafico/mcp-server` npm package · build pipeline · README con instalación Claude Desktop / Cursor / Continue.dev |
| 4.4 | Publish v1.0.0 a npm public · GH Actions release pipeline en `packages/mcp-server/` |
| 4.4 | Discord server setup con canales #api-users, #mcp-questions, #showcase, #announcements |
| 4.5 | Chatbot widget LIVE con Claude API + MCP tools internos · streaming responses · cache conversation per session |
| 4.5 | Rate limit chatbot: 10 mensajes/día visitor, 100/día PRO, ilimitado ENTERPRISE (tier check via 4.1 middleware) |
| 4.3 | Dashboard FULL: usage charts (Recharts), invoices download, change plan, cancel subscription, regenerate keys |

### S4 (lun 26 may → dom 8 jun)

**Objetivo:** Flotas onboarding + alertas push live + Alexa stub.

| Sub-agent | Entregable |
|---|---|
| 4.7 | `/flotas` landing comercial con pricing 19/14/9€/vehículo |
| 4.7 | Onboarding flota: ingest GPS via `/api/flotas/positions` (POST batch endpoint) · auth via API key del cliente · model `FleetVehicle` + `FleetPosition` |
| 4.7 | Vista flota en vivo `/flotas/dashboard` sobre TraficoMap (preset `fleet`) · superpone tráfico + peajes + combustible barato · solo el cliente ve sus vehículos |
| 4.8 | `/alertas` pages: crear alerta (ruta carretera segmento, tren habitual, vuelo IATA) · listado · borrar · pausar |
| 4.8 | Push notifications via Web Push API · email vía Resend · Telegram bot opcional con bot username `@traficoLiveBot` |
| 4.8 | Suscripción premium 4,99€/mes (vía Stripe T4.1) gives ilimitadas alertas + prioridad |
| 4.6 | Alexa skill stub: "Alexa, pregunta a trafico cuándo llega mi AVE" → consulta `/api/predict/train-delays` → responde · publish para review Amazon Developer |
| 4.6 | Google Assistant action equivalente |

### S5 (lun 9 → dom 22 jun)

**Objetivo:** Distribution loop full + ayuntamientos + press kit.

| Sub-agent | Entregable |
|---|---|
| 4.9 | `services/collector/tasks/weekly-digest/`: cron lunes 09:00, recopila stats semana (top accidentes, atascos hot, alertas notables), genera HTML con plantilla brand, envía via Resend a lista suscriptores |
| 4.9 | Auto-post AEMET alertas extreme: hook al insertar `WeatherAlert.severity = 'extreme'` → POST a Bluesky API + X API + Telegram channel |
| 4.9 | Monthly state-of-traffic PDF: bot Python genera 8-12 página PDF con KPIs mes + top stories, publish a `/blog/estado-trafico-YYYY-MM` |
| 4.9 | `/ayuntamiento/[slug]` template configurable por brand (logo + colores cliente) · dashboard tráfico+incidencias+AQ+parkings · informe mensual PDF auto via collector |
| 4.9 | Outreach: 20 ayuntamientos medios via LinkedIn + Zoho campaign (manual user con plantilla) |
| 4.9 | `/prensa` press kit: logos high-res, screenshots brand-aligned, datos clave, contacto press, timeline lanzamiento |

---

## 3. File ownership T4 (vista resumida)

```
src/app/
├── (auth)/                            ← T4.10
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── verify-email/page.tsx
├── account/                           ← T4.10
├── dashboard/                         ← T4.3
├── flotas/                            ← T4.7
├── alertas/                           ← T4.8
├── api-landing/                       ← T4.2 (mostrado como /api)
├── api-docs/                          ← T4.2
├── ayuda/                             ← T4.2
├── status/                            ← T4.10
├── prensa/                            ← T4.9
├── ayuntamiento/[slug]/               ← T4.9
├── admin/affiliates/                  ← T4.8
├── aviso-legal/page.tsx               ← T4.8
├── privacidad/page.tsx                ← T4.8
├── cookies/page.tsx                   ← T4.8
└── api/
    ├── billing/                       ← T4.1
    ├── chat/route.ts                  ← T4.5
    ├── flotas/                        ← T4.7
    └── alerts/                        ← T4.8

src/components/
└── chat/                              ← T4.5

src/lib/
├── stripe.ts                          ← T4.1
├── api-tiers.ts                       ← T4.1
├── auth-client.ts                     ← T4.10
└── analytics.ts                       ← T4.8

src/middleware.ts                      ← T4.1 (auth+tier coordinado con T4.10)

src/mcp/                               ← T4.4
packages/mcp-server/                   ← T4.4

services/
├── alexa/                             ← T4.6
├── google-action/                     ← T4.6
└── collector/tasks/weekly-digest/     ← T4.9

prisma/schema.prisma                   ← T4.8 propone (ApiKey, ApiUsage ya existen) + UserAlert + AffiliateOffer + AffiliateClick + RouteODPair + FleetVehicle + FleetPosition
                                       ← T3.6 hace merge final

public/openapi.json                    ← T4.2
```

---

## 4. Handshakes T4

| HS | Rol T4 | Counterparty | Sprint | Contract |
|---|---|---|---|---|
| **HS7** | Productor | T4.3, T4.5, todos `/api/*` | S2 | Headers `x-tier` en requests autenticados |
| **HS8** | Consumidor | T3.1 | S0 | `CollectorHeartbeat` table contract para `/status` page |
| **HS9** | Productor | T2.4 (chatbot embed) | S3 | MCP tools list firmada vie S2 |

---

## 5. Dependencias externas

| Dependencia | Para qué | Ventana |
|---|---|---|
| Stripe partner agreement | Live mode | Aplicar S0 vie · aprobado <7d |
| Resend API key | Email transaccional + newsletter | live |
| Crisp account | Customer support widget | S2 lun |
| Anthropic Claude API key | Chatbot | live (ya hay) |
| Cloudflare R2 bucket | Archivos pesados (PDF reports, exports) | S5 |
| Telegram bot token | Alertas opcional | S4 |
| Discord server admin | API community | S3 |
| Programas afiliados aprobados | Tracking real `AffiliateClick` | S4 (pendiente sub agentes T4.1+T4.8) |

---

## 6. Métricas éxito T4

### Monetización
- 3 clientes PRO (49€/mes) en piloto durante S2
- 1 conversación ENTERPRISE abierta S3
- 5 ayuntamientos firmados piloto S5
- 50+ suscriptores premium alertas (4,99€/mes) S4-S5

### Distribution
- Newsletter 1.000 suscriptores S5
- 100 conversaciones chatbot/día S3
- 1.000 instalaciones MCP package npm S5
- Discord 200 miembros S5

### Compliance
- T&C/Privacy/Cookies actualizados pre-launch
- GDPR consent verified
- Affiliate disclosure presente en todas landings monetizables S4
- VAT correcto por país via Stripe Tax S2

### Producto
- Auth flow completo S1
- Status page subdomain live S1
- Chatbot widget en producción S3
- MCP package en npm S3
- 3 flotas pilotando S4

---

## 7. Riesgos T4

| Riesgo | Mitigación |
|---|---|
| Stripe rechaza partner (sitio nuevo) | Aplicar S0 inmediatamente, plan B Lemon Squeezy |
| Afiliados rechazan | Aplicar S0 paralelo a Skyscanner/Trainline/DirectFerries/FlixBus/Awin (Awin como puente) |
| Chatbot consume mucho Claude API | Rate limit + cache 1h conversaciones similares |
| MCP package abandona uso post-novedad | Iterar features (tools nuevas) + Discord engagement |
| GDPR breach por mal cookie consent | Test consent flow + auditor externo en S5 |
| Alertas push con permisos browser denegados | UX claro pre-petición + email fallback siempre disponible |
| Customer support saturado sin equipo | Crisp + auto-reply + FAQ exhaustivo + escalation a usuario manual |

---

## 8. Sync interno T4

- 10 sub-agents — más complejos por compartir `prisma/schema.prisma` y `src/middleware.ts`
- Reglas extra:
  - Cualquier model nuevo en schema → propuesta PR a 3.6 ANTES de empezar implementación
  - `src/middleware.ts` modificaciones coordinadas 4.1 ↔ 4.10 (auth + tier enforcement viven juntos)
  - 4.5 (chatbot) consume MCP de 4.4 → integration test conjunto al final de S3
- Daily merge `team4` por lead T4
- Demo viernes: 1 vista cada 2 sub-agents (rotación) + métricas distribution + sales pipeline update

---

**Source of truth:** `docs/ROADMAP-MASTER-2026.md`
**Última actualización:** 2026-04-17
