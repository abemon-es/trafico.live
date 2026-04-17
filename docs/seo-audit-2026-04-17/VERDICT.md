# trafico.live — SEO + UX Audit Verdict

**Fecha:** 2026-04-17
**Método:** 9 agentes paralelos + síntesis comité (3 perspectivas: SEO técnico, keywords/content, UX/brand)
**Fuente:** `docs/seo-audit-2026-04-17/01-*.md` a `09-*.md` (3.279 líneas consolidadas)
**Contexto:** integrable con `docs/ROADMAP-LAUNCH-2026-04-20.md` — esta síntesis actualiza las sesiones del sprint launch

---

## TL;DR

> **trafico.live tiene la infraestructura SEO para dominar el nicho multimodal español, pero cada página individual lleva errores básicos que bloquean ese dominio.** El contenido principal existe; el empaquetado (titles, canonicals, H1, OG images) tiene defectos reparables en <24h. El chrome (header navy + footer cargado) trabaja contra la experiencia. Un push de 2 sesiones (~12h) en P0 + P1 sube drásticamente tanto ranking orgánico como percepción de marca.

**Cifras de un vistazo**:

| Dimensión | Hallazgo |
|---|---|
| **Sitemap** | 62/100 completeness — faltan ~4.000 URLs (rail stations + lines + AQ + climate) |
| **Structured data** | 45% coverage — home + gasolineras ricas, resto pobres |
| **Titles** | 57 duplicados · 47 con double brand suffix `\| trafico.live \| trafico.live` |
| **Canonical** | 32 páginas sin `alternates.canonical` |
| **H1** | 30 páginas sin H1 · 2 con H1 duplicado |
| **OG images** | 117 páginas sin og:image |
| **Orphans** | 3 páginas sin links entrantes |
| **Breadcrumbs** | Ausentes en todo el subárbol `/trenes/*` y data platform |
| **Thin content** | 15-25 páginas bajo 300 palabras |
| **Keywords analizadas** | **470** (100 marítimo/aéreo + 270 road/rail/transit + 100 meteo/fuel/AQ) |
| **Keyword coverage actual** | ~25% parcial · ~75% sin cobertura directa |
| **Header** | Navy dominante — conflicto con contenido light · 12 issues |
| **Footer** | 76 links (oversaturado) · duplicaciones estructurales |
| **Design tokens** | 18 modificaciones para paleta white-first |

---

## 1. Perspectiva SEO técnico

### Fortalezas
- Sitemap existe (14 shards, ~41K URLs)
- Robots.txt correcto
- Next.js 16 metadata API usado consistentemente en la mayoría de layouts
- Structured data presente en home + gasolineras

### Fallos graves (P0)
- **47 páginas con título tipo `"Algo | trafico.live | trafico.live"`** — el layout root template añade ` | trafico.live` automáticamente, y 47 pages ya lo tienen embebido. Google muestra esto literal.
- **32 páginas sin `alternates.canonical`** — todas auto-reportan `https://trafico.live/` como canonical (porque Next.js falla hacia el root). Esto causa falsa duplicate-content masiva.
- **117 páginas sin `og:image`** — OG fallback sitewide probablemente es el logo, no hay preview bonito para redes sociales.
- **Sitemap falta 4K URLs** — rail stations (2154), rail lines (1248), AQ stations (565), climate stations (900) — ninguna indexada por Google.

### Fallos medios (P1)
- Structured data inconsistente — falta `Place` para estaciones, `Product` para gasolineras, `FlightReservation` para vuelos, `Event` para alertas weather
- Cameras pages usan `<img>` crudo (CLS impact)
- Home intermittent 502 en cache miss (TTFB risk)

---

## 2. Perspectiva Keywords + Content

### Landscape competitivo

| Vertical | Top query | Dominante actual | Nuestra posición |
|---|---|---|---|
| Maritime — tracking | `radar aviones España tiempo real` | FlightRadar24 + clones | Tenemos data (OpenSky), falta landing SEO-optimizada |
| Maritime — sea state | `estado del mar España` | AEMET (UX pobre) | Tenemos data, falta página `/maritimo/estado-del-mar` |
| Rail — delays | `retrasos Renfe hoy` | Renfe.com, traficohoy.com | Tenemos datos tiempo real, sin landing dedicada |
| Road — traffic | `tráfico en directo` | DGT.es, RACE.es | Tenemos mapa, falta landing textual + schema |
| Fuel — prices | `gasolinera más barata cerca de mí` | dieselogasolina.com | `/gasolineras/cerca` existe, falta route-planning angle |
| Weather — radar | `radar lluvia España` | AEMET, eltiempo.es | **Zero content** pese a tener infra MapLibre |
| Air Quality | `calidad del aire Madrid` | AQICN, IQAir, MITECO | `/calidad-aire/` existe, falta per-city |

### Oportunidades ranked por ROI

1. **Aeropuertos × salidas/llegadas** — 42 páginas, 200K+ búsquedas/mes combinadas, template-reutilizable desde nuestra DB (P1, coincide con S3 entity pages del launch roadmap)
2. **Estaciones tren × incidencias/próximos trenes** — 2154 páginas, volumen agregado similar, Renfe GTFS-RT ya lo tenemos (P1, S3)
3. **DANA / alertas AEMET con angle "impacto tráfico"** — nadie más combina tiempo + carreteras; oportunidad única (P2, octubre)
4. **Madrid triple pack** (`/madrid/tiempo` + `/madrid/gasolineras-baratas` + `/madrid/calidad-aire`) — ninguna competencia lo integra (P2)
5. **Radar lluvia España** — tenemos MapLibre + llegará EUMETSAT OPERA en S1, falta SEO-landing (P1 coincide con S2)
6. **Bilbao transit** — near-zero competition, 87 GTFS operadores, muy fácil top-ranking (P2)

### Content gap top-5 a crear

| # | Content piece | Keyword target | Estimated effort |
|---|---|---|---|
| 1 | `/guias/ferry-baleares-canarias` | `ferry baleares precios horarios` | M (6h) |
| 2 | `/guias/aeropuertos-españa-ranking` | `mejores aeropuertos España`, `aeropuertos españoles pasajeros 2025` | S (3h) |
| 3 | `/guias/calidad-aire-ica-explicacion` | `que es ICA calidad aire` | S (3h) |
| 4 | `/guias/dana-tempestad-trafico` (evergreen + updateable) | `DANA España alertas tráfico` | M (6h) |
| 5 | `/guias/radar-lluvia-espana-como-funciona` | `como funciona radar lluvia`, `radar lluvia tiempo real` | S (3h) |

---

## 3. Perspectiva UX / Brand

### El problema central

La plataforma tiene un **conflicto visual**: contenido en blanco/light dentro de un chrome dark navy (header + footer). Esto:
- Rompe la percepción de "profesional limpio"
- Crea islas de contraste agresivo
- Dificulta reading flow
- Obliga a mantener 2 paletas (light content + dark chrome) en paralelo

### Solución recomendada

**Full white-first design system.** Dark mode sigue disponible pero opt-in, no default.

| Componente | De | A | Tiempo |
|---|---|---|---|
| **Header** | Navy (`tl-950`) + gradiente | `bg-white/95 backdrop-blur-md border-b border-ink-200` | 4-6h |
| **Footer** | Navy (`bg-tl-950`) + 76 links | `bg-white border-t border-ink-200` + 57 links en 5 cols | 2-3h |
| **Tokens** | 2 backgrounds | 6 backgrounds scale (ink-50..100), 4 shadow levels | 1h |
| **Cards** | Variados | `bg-white border border-ink-100 rounded-lg shadow-xs` | 2h (sistema) |
| **CTAs** | Mixto | `bg-tl-600 text-white hover:bg-tl-700` canonical | 1h |

**Total refactor UI:** 10-12h — cabe en Sesión 4 del launch roadmap.

### Accesibilidad
- Focus rings actuales quedan bien en navy, pierden contraste sobre white → necesita `focus-visible:ring-tl-600`
- Target WCAG AA: color contrast check en 8 hubs

---

## 4. Matriz de prioridades integrada con ROADMAP-LAUNCH

### P0 — Pre-launch (incorporar a Sesión 1 del roadmap, +2 agentes)

Estos items no estaban en el roadmap launch original, los añadimos:

| # | Acción | Esfuerzo | Por qué P0 |
|---|---|---|---|
| 1 | **Fix 47 doble-suffix titles** | 2h | Google muestra literal, mala impresión |
| 2 | **Añadir `alternates.canonical` a 32 páginas** | 1h | Resuelve falsa duplicate-content masiva |
| 3 | **Generar `opengraph-image.tsx` por vertical + entity** | 3h | 117 páginas sin OG image = sharing feo |

**Agentes nuevos S1 (11 y 12 — expandir a 11 agentes totales o sustituir uno ligero)**:
- Agent P0-SEO-A: doble-suffix + canonicals
- Agent P0-SEO-B: OG image template system

### P1 — Durante launch sprint (integrado en sesiones existentes)

| Sesión | Item añadido | Agente |
|---|---|---|
| **S2** | Header redesign navy → white | Agente 9 ampliado |
| **S2** | Footer redesign 76 → 57 links | Agente 9 ampliado |
| **S2** | Design system tokens white-first | Agente 9 ampliado |
| **S3** | Sitemap inclusion de 4K URLs faltantes | **Automático** al generar entity pages |
| **S3** | Structured data per entity (Place, Product, etc.) | Agentes 1-9 S3 (en cada template) |
| **S3** | Breadcrumbs en `/trenes/*` y data platform | Agente 2 S3 |
| **S4** | RelatedLinks activación cross-vertical | Agente 4 S4 |
| **S4** | H1 fixes en 30 páginas sin H1 | Agente 2 S4 (smoke tests) |
| **S4** | Orphan pages (3) — fix links o delete | Agente 4 S4 |

### P2 — Post-launch (Fase 2 después de miércoles 22)

**Content production:**
- 5 guías priority + 4 más siguiendo el content gap
- `/madrid/[vertical]` hub para el triple pack
- DANA evergreen + landings estacionales
- Radar lluvia content (la infra EUMETSAT llega en S1 del launch sprint)

**SEO expansion:**
- Cercanías Madrid incidencias × línea (12 páginas)
- ZBE city 2026 × 10 ciudades
- Puntualidad AVE monthly stats blog
- Bilbao transit landing

---

## 5. Veredicto final

### ¿Esto cambia el launch plan del lunes?

**Parcialmente.** La decisión Q8 ("todo o nada, delay a miércoles") se mantiene. Añadimos:

- **+6h a Sesión 1**: los 3 P0 SEO (doble-suffix, canonicals, OG images)
- **+8h a Sesión 2**: header + footer + tokens en Agente 9
- **+0h a Sesión 3**: structured data se genera on-the-fly al crear templates entity
- **+4h a Sesión 4**: RelatedLinks, breadcrumbs, H1 fixes, orphans

**Total añadido**: ~18h de trabajo distribuido. Con 9 agentes paralelos, 2h por agente efectivas en las sesiones.

### Recomendación
- **Sí al launch lunes** con este scope ampliado
- **P0 SEO son show-stoppers** para el launch — 47 titles feos en Google son peor que no lanzar
- **Header/footer white-first** dobla el impacto del launch visualmente
- **P2 content production** comienza miércoles 22 como Fase 2

### Expectativa realista post-launch

- **~10% orgánico vía entity pages** (3-4 semanas para empezar a indexar masivamente)
- **~5% orgánico vía top keyword landings** (2-3 semanas)
- **~50% reducción de duplicación** (titles + canonicals) — efecto en semanas 2-4
- **~30% mejora percepción marca** (white + limpio) — inmediato

---

**Firmado:** comité synthesizer tras lectura de 3.279 líneas × 9 dominios
**Archivo maestro:** este `VERDICT.md` + los 9 reports por dominio en `docs/seo-audit-2026-04-17/`
