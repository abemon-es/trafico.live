# trafico.live — UX + Infrastructure + Data Flow Audit Verdict

**Fecha:** 2026-04-17
**Método:** 9 agentes paralelos (5 UX + 3 infra + 1 data flow) + síntesis comité (3 perspectivas: producto, técnica/infra, integridad de datos)
**Cobertura:** ~3.200 líneas consolidadas across 9 reports
**Integración:** se acopla al `ROADMAP-LAUNCH-2026-04-20` + `SEO-UX-VERDICT-2026-04-17`

---

## TL;DR

> **La plataforma tiene 73% de los datos fluyendo correctamente end-to-end pero 27% roto o stale, componentes duplicados x7, 32 violaciones WCAG AA, 36 de 43 collectors sin staleness monitoring, y un scaling cap de 600 req/s que rompe antes que la CPU.** La infra de observabilidad es madura (6/10) pero no se usa sobre los datos. UX tiene todos los huesos pero sin sistema de componentes canónicos. Datos hablan: 8 chains rotos descubiertos que los tests manuales no hubieran encontrado.

### Hallazgos a granel

| Dimensión | Score | Hallazgo |
|---|---|---|
| **Componentes** | 2/10 canonical | 153 componentes, solo ~15 canónicos, StatCard duplicado 11 veces, FAQ inline x29 |
| **Templates** | 5/10 consistencia | 5 archetypes, 10 páginas desvían (incluye `/trenes` el hub con más tráfico) |
| **Mobile UX** | 3/10 | Layer panel tapa 60% iPhone, checkboxes 16px (44 mínimo), sin safe-area |
| **Accesibilidad** | 3/10 WCAG AA | 32 violaciones (8 críticas), sin skip link, sin `<main>`, modals sin focus trap |
| **Performance** | 5/10 | 2.2MB JS lazy ok, pero recharts sync = 1.2MB parse burst en trenes+intensidad |
| **Stack** | 6/10 | 10 containers saludables, SPOF Postgres single-instance, sin DB replica |
| **Monitoring** | 6/10 | Prometheus+Loki+Grafana solid, pero 36/43 collectors sin staleness rules |
| **Deploy** | 4/10 | 5-15s downtime por deploy, sin blue-green, sin smoke tests |
| **DR** | 5/10 | Backups hourly R2 ok, RTO 1-4h, sin cross-DC standby |
| **Data flow E2E** | 7/10 | **22/30 dominios OK, 8 roturas** — 1 stale, 2 API bugs, 1 UI missing, 1 backfill, 1 orphan, 1 data endpoint gap, 1 migration missing |

---

## 1. Veredicto del comité — 3 perspectivas

### 🧩 Producto / UX — "¿Qué experimenta el usuario?"

**Lo positivo:**
- Base estructural existe (5 archetypes detectables, 10 layouts)
- Home y hubs hubs principales cargan en <3s
- Desktop experience razonablemente consistente

**Lo negativo (inmediato):**
1. **Mobile es disfuncional** en las dos páginas más importantes: `/maritimo/mapa` y `/trenes` tienen un layer panel que ocupa **60% de una pantalla de iPhone**. Es inusable. Checkboxes 16×16px cuando Apple HIG exige 44×44.
2. **32 violaciones WCAG AA** — 8 críticas. La más dolorosa: ningún `<main>` landmark y ningún skip link. Usuarios de teclado tienen que tabular 8+ veces para llegar al contenido en cada página.
3. **Componentes caóticos** — `StatCard` definido inline 11 veces en páginas distintas. `FAQAccordion` inline en 29 páginas. No hay Button system. Cualquier cambio brand requiere tocar 50+ archivos.
4. **/trenes es el hub con más tráfico pero el más desviado** del patrón canónico. Sin gradient hero, sin stats grid, breadcrumbs manuales. Impresión inconsistente.

### ⚙️ Técnica / Infra — "¿Aguanta?"

**Lo positivo:**
- **Monitoring infra es madura** (Prometheus + Loki + Grafana + Pushover + Blackbox + Beyla eBPF + Tempo) — nivel de SaaS serio
- 10 containers healthy en un Hetzner AX102 con headroom (64 cores, 256GB RAM)
- Backups hourly a Cloudflare R2
- Planetiler rebuild pipeline maduro

**Lo negativo (urgente):**
1. **36 de 43 collectors sin staleness monitoring** — toda la infra Grafana está para nada porque no observa la capa de datos. El audit lo demostró: aviation stale 41 min DURANTE el audit sin alerta firing.
2. **PgBouncer 25-connection pool cap a 600 req/s** — el cuello de botella llega antes que la CPU o la RAM. A 100K DAU se rompe.
3. **Postgres sin replica** — SPOF #1 real. Si cae, todos los 121 endpoints dinámicos caen simultáneamente.
4. **Deploy maturity 4/10** — 5-15s downtime por cada deploy, sin blue-green, sin smoke tests. Cada push rompe el servicio unos segundos.
5. **`.env` con permisos permisivos** — las credenciales del collector son leíbles por cualquier proceso en el host.

### 📊 Integridad de Datos — "¿Fluye lo que debería?"

**El agent de data flow descubrió 8 chains rotos (27%) que ningún otro audit cogió:**

| # | Dominio | Rotura | Impacto |
|---|---|---|---|
| 1 | **Air Quality stations + readings** | Silent collector failure desde 3-abr (MITECO source) | `/calidad-aire` muestra 0 lecturas recientes pero la UI dice "en vivo" |
| 2 | **Movilidad corredores** | API bug: default a ayer pero data acaba en 2024-01-07 | `/api/movilidad/corredores` devuelve `[]` siempre |
| 3 | **SASEMAR emergencies** | Filtro API `occurredAt >= NOW()-30d` excluye TODO el histórico 2019-2023 | 2.093 rescates invisibles |
| 4 | **Aviacion aeropuertos catalog** | 404 — no existe `/aviacion/aeropuertos/page.tsx` | Link roto en nav |
| 5 | **IMD flows** | max año = 2019 — el refresh 2022 no corrió | 14.741 segments desactualizados |
| 6 | **Climate stations/records** | ORPHAN — 947 stations + 4.4M records, API works, ninguna UI consume | Data valiosa invisible |
| 7 | **Transit stops** | 225.599 stops en DB, sin API endpoint standalone | No se pueden buscar paradas |
| 8 | **CollectorHeartbeat** | Migration missing — cada collector cycle escupe P2021 error | Ruido, no rompe pero silencia info |

**Traducción**: hay datos de calidad dentro de trafico.live que el usuario nunca verá porque el camino desde el collector hasta su navegador está cortado en algún punto. El audit estima **~27% de fuga de valor**.

---

## 2. Matriz de prioridades — integrada con launch sprint

### P0 — Sesión 1 (añadir al sprint launch)

| # | Acción | Esfuerzo | Dónde encaja | Origen |
|---|---|---|---|---|
| 1 | Debug collector `air-quality` (MITECO source broken) | 2h | S1 agente libre | DATA 08 |
| 2 | Fix `/api/movilidad/corredores` date fallback | 30min | S1 agente libre | DATA 08 |
| 3 | Remove SASEMAR 30-day filter | 15min | S1 agente libre | DATA 08 |
| 4 | Create `/src/app/aviacion/aeropuertos/page.tsx` catalog | 1h | S3 entity agent 3 | DATA 08 |
| 5 | Run `prisma migrate deploy` para `CollectorHeartbeat` | 5min | S1 (any agent) | DATA 08 |
| 6 | Fix recharts sync imports en `/trenes` y `/intensidad` | 30min | S1 agent 2 perf | UX 05 |
| 7 | Add skip-to-content link + `<main id="main-content">` al layout | 2h | S2 design agent | UX 04 |
| 8 | Extend `/api/health` a 43 collectors + alerta Grafana | 4h | S4 monitoring agent | INFRA 07 |
| 9 | `chmod 600 .env` + rotate credenciales expuestas | 30min | S0 (ya hecho parcial) | INFRA 09 |

**Total P0 added**: ~10h distribuidas. Cabe en los agentes libres sin reventar capacity.

### P1 — Durante sprint (en las sesiones existentes)

| # | Acción | Sesión | Agente |
|---|---|---|---|
| 10 | Canonical `<Button>` system (variantes, tamaños) | S1 agent 1 TraficoMap (extend) | UX 01 |
| 11 | Canonical `<StatCard>` (eliminar 11 copias) | S2 verticales agents | UX 01 |
| 12 | Canonical `<FAQAccordion>` (eliminar 29 inline) | S2 verticales agents | UX 01 |
| 13 | Canonical `<TickerStrip>` (hubs) | S2 agent 1-5 | UX 01 |
| 14 | Template `<VerticalHub>` obligatorio para 7 hubs | S2 — todos los hub agents | UX 02 |
| 15 | Rework `/trenes` al patrón canónico | S2 agent 3 trenes | UX 02 |
| 16 | Default layer panel collapsed en `<md` viewports | S4 mobile agent | UX 03 |
| 17 | Touch targets 16px → 44px minimum | S4 mobile agent | UX 03 |
| 18 | `aria-current`, `aria-live`, `aria-label` on icon buttons | S4 a11y agent | UX 04 |
| 19 | Focus trap en modals + cookie consent | S4 a11y agent | UX 04 |
| 20 | `<img>` → `next/image` en cameras pages | S4 perf agent | UX 05 |
| 21 | Fix CF `CF-Cache-Status: DYNAMIC` sitewide (`s-maxage=60` override) | S4 perf agent | UX 05 |
| 22 | Create `/src/app/climate/estaciones/page.tsx` + `/trenes/estacion/[slug]` | S3 entity agents | DATA 08 |
| 23 | Create `/api/transporte/stops` endpoint (225K stops) | S3 entity agents | DATA 08 |
| 24 | Re-trigger IMD 2022 collector + enable auto refresh | S1 agent libre | DATA 08 |
| 25 | PgBouncer 25 → 50 connections (config change) | S4 deploy agent | INFRA 09 |

### P2 — Post-launch (Fase 2 desde miércoles 22)

| # | Acción | Origen |
|---|---|---|
| 26 | Postgres read replica (secondary para read queries) | INFRA 06/09 |
| 27 | Second web container + load balancer | INFRA 09 |
| 28 | Sentry release tagging en deploy pipeline | INFRA 07 |
| 29 | Trafico-live Grafana dashboard dedicado | INFRA 07 |
| 30 | Blue-green deploys | INFRA 09 |
| 31 | Full canonical component library (`src/components/ui/`) | UX 01 |
| 32 | Storybook o dev preview de componentes | UX 01 |
| 33 | Safe-area insets across all pages | UX 03 |
| 34 | aisstream.io fallback (datalastic.com) aunque hoy funcione | INFRA 06 |

---

## 3. El nuevo roadmap launch (actualizado con todos los audits)

Con los 3 audits consolidados (launch roadmap original + SEO/UX + UX/Infra/Data), el sprint lunes tiene **~45-50 horas adicionales** distribuidas entre 9 agentes × 4 sesiones = 36 slots de ~6h = **~216h capacidad bruta**. Suficiente pero ajustado.

### Capacity revisado

| Sesión | Original | + SEO | + UX/Infra/Data | Total | Capacity 9 agentes |
|---|---|---|---|---|---|
| S1 | TraficoMap + 5 infra | +3 P0 SEO | +5 data fixes | ~60h | 54h |
| S2 | 7 hubs + boards | +Header/footer/design | +4 UX components canonical | ~70h | 54h |
| S3 | 27K entity pages | +structured data | +2 missing pages (climate, aeropuertos, transit stops API) | ~60h | 54h |
| S4 | QA + deploy | +3 UX perf/CF fixes | +7 a11y/mobile/monitoring | ~50h | 54h |

**Conclusión**: S1 y S2 están ligeramente sobredimensionadas (~6h overflow cada). Opciones:

1. **Cortar scope** — mover items a Fase 2: ejemplo, `<FAQAccordion>` canónico a P2
2. **Extender S1/S2** — +1-2h cada sesión
3. **Delay launch a miércoles** — decisión Q8 lo permite

### Recomendación operativa

**Recortar los siguientes items a Fase 2** para mantener calendar:
- `<FAQAccordion>` canónico (agente S2 libre)
- `<TickerStrip>` canónico (agente S2 libre)
- Storybook / dev preview components (no crítico)
- Rework `/trenes` al patrón canónico (dejar en estado actual, rework Fase 2)

**Mantener en launch**:
- Todos los P0 data fixes (8 de 8 roturas de chain)
- Todos los P0 SEO (3 items)
- Header/footer/design white (decidido Q7)
- 7 hubs + entity pages 27K (decidido Q4)
- 32 WCAG AA fixes críticos (8 items)
- Perf fixes recharts + next/image + CF cache

---

## 4. Expectativa post-launch ajustada

### Métricas técnicas

| Métrica | Pre-audit | Post-launch | Delta |
|---|---|---|---|
| Chains de datos OK | 73% (22/30) | 100% (30/30) | +8 chains |
| WCAG AA violations | 32 | <5 | -85% |
| Components ad-hoc | ~98 | ~60 | -40% |
| Monitoring collector coverage | 7/43 | 43/43 | +515% |
| Mobile usability score | 3/10 | 7/10 | +133% |
| Performance (home JS parse) | 1.2MB burst | ~600KB | -50% |
| PgBouncer capacity | 600 req/s | 1.200 req/s | 2× |

### Métricas negocio (estimado)

- **~30% reducción bounce rate móvil** tras fix del layer panel
- **~15% mejora CWV scores** tras recharts dynamic + next/image
- **~25% menos duplicación contenido** (SEO)
- **~10% uplift orgánico** a 3-4 semanas tras indexación entity pages

---

## 5. Recomendación final del comité

### Decisión
**Sí al launch lunes** con el scope ampliado tras los 3 audits consolidados.
**Delay a miércoles** es la válvula de escape si S1 o S2 se desbordan — decisión Q8 lo permite.

### Tres riesgos que el comité quiere destacar explícitamente

1. **El layer panel móvil es un crítico no discutible**. Si lanzamos con /maritimo/mapa y /trenes inusables en iPhone, el feedback del lanzamiento será "es lento" o "no funciona" — precepción equivocada pero real. Fix S4 obligatorio.

2. **Los 8 chain breaks deben resolverse antes del launch**. En particular air-quality (stale desde 3-abr), SASEMAR (30-day filter) y /aviacion/aeropuertos (404). Son 3 horas totales pero son bugs de producto.

3. **Monitoring coverage 7/43 es el riesgo sistémico más grande**. El hecho de que aviation estuviera stale 41 min durante el audit sin alerta implica que, post-launch, problemas similares pasarán invisibles hasta que usuarios se quejen. Fix S4 de 4h resuelve 515% de mejora en cobertura.

### Orden sugerido de próximos pasos

1. **Tú apruebas este verdict** (o pides cambios)
2. **Actualizo el ROADMAP-LAUNCH-2026-04-20** con los 25 P0/P1 items integrados
3. **Regenero el PDF ejecutivo** del roadmap con el scope actualizado
4. **Arrancamos S1 mañana viernes** — 9 agentes con scope claro

---

**Firmado:** comité synthesizer tras lectura de ~3.200 líneas × 9 dominios
**Archivo maestro:** este `VERDICT.md` + los 9 reports por dominio en `docs/uxinfra-audit-2026-04-17/`
**Audits relacionados:** `docs/audit-2026-04-17/` (data/sources) + `docs/seo-audit-2026-04-17/` (SEO/UX chrome)
