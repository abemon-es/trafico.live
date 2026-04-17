# TEAM 2 — CONSUMER + UX

> 📍 Source of truth: `docs/ROADMAP-MASTER-2026.md` · este doc es la **vista parcial T2**, ampliada.
> **Rol:** TraficoMap unificado, hubs verticales, entity pages SSG, live trackers, header/footer, design system, accesibilidad, SEO on-page, GDPR cookie banner.

**Lead role:** Frontend lead
**Tamaño team:** 9 sub-agents
**Branch:** `team2`
**Slack channel:** #t2-consumer
**Standup async:** lunes 09:00

---

## 0. Mission

Construir la capa visible de la plataforma: 8 hubs full-feature, 27.553 entity pages SSG, 3 live trackers (vuelos/barcos/trenes), redesign white-first del chrome, sistema de diseño canónico, y pasar de 32 violaciones WCAG AA a <5. La cara que ven todos los usuarios.

---

## 1. Sub-agents (9)

| # | Sub-agent | Owns (paths exclusivos) | Sprint principal |
|---|---|---|---|
| **2.1** | TraficoMap unified + LayerRegistry | `src/components/map/TraficoMap.tsx`, `src/lib/map-layers/**`, **borra** 8 componentes legacy | S0 |
| **2.2** | Hubs verticales (8) | `src/app/{maritimo,aviacion,trenes,trafico,transporte-publico,meteo,combustible,calidad-aire}/page.tsx` y `**/content.tsx` | S0 |
| **2.3** | Header + footer + design tokens + i18n | `src/components/layout/{Header,Footer,Nav}*`, `src/app/globals.css`, `src/components/ui/{Button,StatCard,VerticalHub,EmptyState,LoadingState,ErrorState}.tsx`, `src/app/layout.tsx`, `messages/{es,en}.json` | S0 |
| **2.4** | Live trackers + widgets afiliados | `src/app/{vuelos,barcos}/**`, `src/app/trenes/live/**`, `src/components/{aviation,maritime}/Live*`, `src/lib/affiliates/**`, `src/components/embed/**` | S2-3 |
| **2.5** | Entity pages SSG batch A (transporte) | `src/app/trenes/estacion/[slug]/**`, `src/app/trenes/linea/[slug]/**`, `src/app/aviacion/aeropuertos/[iata]/**`, `src/app/maritimo/puertos/[slug]/**` | S0 |
| **2.6** | Entity pages SSG batch B (infra+data) | `src/app/carreteras/[ref]/**`, `src/app/maritimo/buques/[slug]/**`, `src/app/gasolineras/[id]/**`, `src/app/meteo/estaciones/[slug]/**`, `src/app/calidad-aire/estaciones/[slug]/**` | S0 |
| **2.7** | Polish páginas (GSC data) + affiliate disclosure | `src/app/{camaras,carreteras,estaciones-aforo,noticias}/**` (rework), `src/app/divulgacion-afiliados/page.tsx` | S0 |
| **2.8** | SEO infra (titles+canonicals+OG+JSON-LD+LLMs.txt+robots+404) + GDPR cookie banner | Page metadata exports site-wide, `src/app/opengraph-image.tsx`, `src/app/llms.txt/route.ts`, `public/robots.txt`, `src/app/not-found.tsx`, `src/components/cookie-consent/**`, `src/lib/seo/`, `src/app/sitemap.ts` | S0 |
| **2.9** | a11y + mobile + dark mode + visual QA + E2E | `src/components/ui/SkipLink.tsx`, `src/app/layout.tsx` WCAG attrs (coordinado 2.3), Playwright config + `tests/visual/`, `tests/e2e/` (10 flujos críticos) | S0 |

---

## 2. Sprint plan T2

### S0 (jue 17 → dom 19) — el sprint más grande

**Objetivo:** TODO el frontend del launch listo para producción.

#### Viernes 18

| Sub-agent | Entregable |
|---|---|
| 2.1 | TraficoMap reemplaza UnifiedMap, InteractiveBase, Historical, Comparator, ProvinceHeatmap, LocationMap, VesselLiveMap, StationLocationMap → **borrar 8 componentes** (~6.200 LOC). LayerRegistry en `src/lib/map-layers/registry.ts` |
| 2.3 | Header navy → white + footer 76→57 links + design tokens white-first en `globals.css`. Componentes canónicos `<Button>`, `<StatCard>`, `<VerticalHub>`, **NUEVOS** `<EmptyState>`, `<LoadingState>`, `<ErrorState>` |
| 2.8 | Fix 47 doble-suffix titles + 32 canonicals + OG image template `src/app/opengraph-image.tsx` + 4 OG sub-templates por vertical. **Fix `robots.txt` 3 errores GSC** + custom `not-found.tsx` |
| 2.8 | **GDPR cookie banner** componente con consent management para GA4 + futuros afiliados (TCF v2.2 simple, no IAB framework) |

#### Sábado 19

| Sub-agent | Entregable |
|---|---|
| 2.2 | 8 hubs full-feature: `/maritimo`, `/aviacion`, `/trenes` (rework total), `/trafico`, `/transporte-publico`, `/meteo`, `/combustible`, `/calidad-aire`. Cada uno usa `<VerticalHub>` + ticker + StatCards + boards (cuando T3 los tenga) |
| 2.3 | Finish design tokens · activate RelatedLinks cross-vertical · breadcrumbs en `/trenes/*` y data platform pages |
| 2.7 | Rework `/camaras` (categorización por carretera/provincia, schema VideoObject, target avg 60s+) · polish `/carreteras/[code]` (intro 150-200w + Road schema + breadcrumbs + FAQ) · `/estaciones-aforo` (titles + density). Decisión `/noticias`: rework "live news ticker" o deprecar |
| 2.8 | LLMs.txt + FAQ schema en 7 hubs + JSON-LD denso (capitaliza señal chatgpt referral) |

#### Domingo 19 AM

| Sub-agent | Entregable |
|---|---|
| 2.5 | Templates SSG batch A: `/trenes/estacion/[slug]` (2.154) + `/trenes/linea/[slug]` (1.248) + `/aviacion/aeropuertos/[iata]` (42) + `/maritimo/puertos/[slug]` (50). Structured data `Place`, `TravelAction`, `Airport`, `Port` |
| 2.6 | Templates SSG batch B: `/carreteras/[ref]` (300) + `/maritimo/buques/[slug]` (~10K, ISR) + `/gasolineras/[id]` (12.294, ISR) + `/meteo/estaciones/[slug]` (900) + `/calidad-aire/estaciones/[slug]` (565). Structured data `Road`, `Vehicle`, `GasStation`/`Product`, `WeatherStation`, `Place` |
| 2.8 | Sitemap incluye los 4K URLs faltantes + nuevos shards para 27.553 entity pages |

#### Domingo 19 PM (QA)

| Sub-agent | Entregable |
|---|---|
| 2.9 | Visual QA Playwright en 8 hubs + 8 fullscreens light/dark = 32 screenshots baseline + comparator |
| 2.9 | **E2E Playwright 10 flujos críticos:** home→hub vertical→entity page; búsqueda Cmd+K; map filter toggle; calculadora simple; trenes live click→panel; mobile nav abrir/cerrar; cookie consent accept/reject; sitemap visit; 404 navigate; switch dark mode |
| 2.9 | Fix 32 WCAG AA violaciones: skip link + `<main>` + focus trap + aria-current/live + role attrs |
| 2.9 | 18 mobile fixes: layer panel collapsed `<md`, touch targets 44px, safe-area iOS, swipe gestures |
| 2.9 | Dark mode parity site-wide (cada página en dark sin contrast issues) |

**Criterio salida S0:**
- [ ] 8 hubs + 8 fullscreens funcionando en producción
- [ ] **27.553 URLs accesibles** (build local <30 min con ISR donde aplique)
- [ ] Header+footer white, design tokens limpios, 3 nuevos `<*State>` components
- [ ] Cookie banner activo y trackable
- [ ] WCAG AA: <5 violaciones residuales
- [ ] 10 E2E tests verdes
- [ ] LCP <2s en 8 hubs en mobile (Slow 3G simulado)

### S1 (lun 21 → dom 27 abr)

**Objetivo:** Live trackers fase 1 + páginas SEO por-ruta.

| Sub-agent | Entregable |
|---|---|
| 2.4 | `/vuelos` esqueleto: TraficoMap preset `aviation-live` con OpenSky data + filtros aerolínea/altitud/tipo. Click→panel sin histórico aún |
| 2.4 | `/barcos` esqueleto: TraficoMap preset `maritime-live` con AIS + filtros categoría. Click→panel básico |
| 2.4 | 200 landings SSG `/vuelo/[origen]-[destino]` para top 200 rutas domésticas |
| 2.7 | Affiliate disclosure footer + `/divulgacion-afiliados` page (FTC + EU compliance) |

### S2 (lun 28 abr → dom 11 may)

**Objetivo:** Trackers 80% + páginas SEO trenes + integración con T1 multimodal.

| Sub-agent | Entregable |
|---|---|
| 2.4 | `/trenes/live` rework con AVE+LD+Cercanías + click panel + filtros brand. Integración panel histórico (consume T3.7 cuando esté) |
| 2.4 | Entity pages live: `/vuelo/[iata]/[num]`, `/tren/[num]`, `/barco/[mmsi]` con histórico on-time |
| 2.4 | 300 landings SSG `/billete-tren/[origen]-[destino]` |
| 2.3 | i18n EN base (next-intl): home + 8 hubs + 4 entity templates traducidos. Switch idioma en header |

### S3 (lun 12 → dom 25 may)

**Objetivo:** Trackers FULL + comparadores + widgets embebibles.

| Sub-agent | Entregable |
|---|---|
| 2.4 | Trackers FULL: panel detalle profundo, filtros avanzados, histórico, predicciones (HS5 con T3.7) |
| 2.4 | Widgets embebibles `<iframe src="https://trafico.live/embed/{ruta\|tren\|vuelo\|barco}/...">` con CSP + CORS configurados (HS con T3.8 para next.config) |
| 2.4 | Comparadores evergreen: `/comparador/ave-avlo-iryo`, `/comparador/aerolineas-domesticas`, `/comparador/ferries-baleares` (5-10 artículos data-driven) |

### S4 (lun 26 may → dom 8 jun)

**Objetivo:** Widgets afiliados integrados + landings monetizables.

| Sub-agent | Entregable |
|---|---|
| 2.4 | Implementar `<Offers>` componente que consume T1.9 `/api/ir` + 4 clientes afiliados. Producto del HS6 |
| 2.4 | Cliente Skyscanner (`src/lib/affiliates/skyscanner.ts`) + cache Redis 15 min |
| 2.4 | Cliente Trainline + cache + tracking `AffiliateClick` (depende T4.1 schema) |
| 2.4 | Cliente DirectFerries + cache |
| 2.4 | Cliente FlixBus + BlaBlaCarBus + cache |
| 2.4 | Landings: `/vuelo/[ruta]`, `/billete-tren/[ruta]`, `/ferry/[ruta]`, `/autobus/[ruta]` (cada uno con widget afiliado correspondiente) |

### S5 (lun 9 → dom 22 jun)

**Objetivo:** Embeds públicos + comparadores SEO + iteración trackers.

| Sub-agent | Entregable |
|---|---|
| 2.4 | Embed público: página `/embed-builder` para que externos generen iframe con preset y dimensiones |
| 2.4 | 5-10 comparadores nuevos data-driven (rotación mensual) |
| 2.7 | Onboarding tour first-time visitors (react-joyride o Driver.js) |

---

## 3. File ownership T2 (vista resumida)

```
src/app/
├── (most pages — ver detail)         ← T2.2 hubs, T2.5+2.6 entity, T2.7 polish
├── vuelos/                           ← T2.4
├── barcos/                           ← T2.4
├── trenes/live/                      ← T2.4
├── divulgacion-afiliados/            ← T2.7
├── llms.txt/                         ← T2.8
├── opengraph-image.tsx               ← T2.8
├── not-found.tsx                     ← T2.8
├── sitemap.ts                        ← T2.8
└── layout.tsx                        ← T2.3 (coordinado WCAG con 2.9)

src/components/
├── map/TraficoMap.tsx                ← T2.1 (BORRA 8 legacy)
├── layout/{Header,Footer,Nav}*       ← T2.3
├── ui/{Button,StatCard,VerticalHub,EmptyState,LoadingState,ErrorState,SkipLink}.tsx  ← T2.3 + T2.9
├── cookie-consent/                   ← T2.8
├── aviation/Live*                    ← T2.4
├── maritime/Live*                    ← T2.4
└── embed/                            ← T2.4

src/lib/
├── map-layers/                       ← T2.1
├── affiliates/                       ← T2.4
└── seo/                              ← T2.8

src/app/globals.css                   ← T2.3
public/robots.txt                     ← T2.8
messages/{es,en}.json                 ← T2.3
tests/visual/                         ← T2.9
tests/e2e/                            ← T2.9
```

---

## 4. Handshakes T2

| HS | Rol T2 | Counterparty | Sprint | Contract |
|---|---|---|---|---|
| **HS1** | Productor | Internal T2 (2.2, 2.4, 2.5, 2.6) | S0 vie | TraficoMap props API congelada vie 18 noche |
| **HS2** | Consumidor | T3.3 (AEMET forecast) | S0 sáb | Tabla `WeatherForecast` schema firmada vie mañana para `/meteo` hub |
| **HS6** | Productor | T1.9 | S4 | `<Offers provider source />` props para widgets en `/ir` |
| **HS9** | Consumidor | T4.4 (MCP tools) | S3 | MCP tools list para chatbot widget integrado en site (T4.5 lo construye, T2 lo embebe) |
| **HS10** | Productor | T1.9 | S2-3 | `getSlugList()` per template + `revalidate` policy para que T1 calcule SSG OD pairs sobre nuestros slugs |

---

## 5. Dependencias externas

| Dependencia | Para qué |
|---|---|
| Cookie banner library elegida | Decidir sáb 18 (vanilla JS custom vs cookieconsent OSS) |
| OG image lib (`@vercel/og`) ya instalada | Templates dinámicos |
| Playwright instalado | E2E + visual |
| react-joyride o Driver.js | Onboarding tour |
| Programas afiliados aprobados | Bloquea integración real S4 — si no, mock data |

---

## 6. Métricas éxito T2

### SEO/Performance
- 27.553 URLs indexables, 90% en GSC en 30 días
- LCP <2 s en 8 hubs (mobile)
- CTR SERP +10-15% vs baseline
- 0 titles duplicados/dobles tras S0

### UX
- Bounce rate hubs <40%
- Avg session duration mantener >300 s en hubs principales (baseline `/trenes` 703s, `/` 643s)
- Mobile usability 7/10 (vs 3/10 baseline audit)
- WCAG AA <5 violaciones

### Producto monetizable (S4-S5)
- Widget `<Offers>` renderiza en `/ir` y entity pages
- Embed iframe usado por ≥5 sites externos en S5

---

## 7. Riesgos T2

| Riesgo | Mitigación |
|---|---|
| Build SSG explota >60 min con 27K páginas | ISR para `/buques` + `/gasolineras` (alta cardinalidad) |
| Cookie banner mal implementado bloquea GA4 | Test estricto consent flow + verify GA4 receives events post-consent |
| Header/footer redesign rompe pages existentes | Visual QA Playwright baseline antes de cambios |
| Live trackers latencia mala (5 min OpenSky) | Mensaje "actualizado hace X" + fallback skeleton |
| Widget afiliado bloqueado por adblocker | Server-side render del widget + fallback link directo |

---

## 8. Sync interno T2

- 9 sub-agents con file ownership disjunto → bajo riesgo conflicto interno
- Excepción: `src/app/layout.tsx` (T2.3) coordina con T2.9 (a11y attrs) — handshake síncrono vie noche
- Daily merge a `team2` por lead T2
- Demo viernes: visual diff Playwright + scroll por 8 hubs + 1 entity page por template

---

**Source of truth:** `docs/ROADMAP-MASTER-2026.md`
**Última actualización:** 2026-04-17
