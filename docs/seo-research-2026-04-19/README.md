# SEO Research 2026-04-19 — trafico.live ES + PT

**Punto de entrada para agentes y humanos.** Este directorio contiene el research SEO completo de trafico.live para los mercados ES + PT. Úsalo como fuente única de verdad cuando planifiques contenido, arquitectura, sitemap, landings o afiliación.

---

## TL;DR (5 líneas)

- **trafico.live rankea 0 keywords con volumen >50 en Google ES/PT** — el site es invisible. P0 del VERDICT audit bloquea todo: canonical → `/` en 32 páginas, sitemap omite ~4K URLs, og:images faltan en 117.
- **Universo:** 70.632 keywords ES+PT con volumen medido. **25.467 con dificultad (KD) medida**.
- **Oportunidad real ganable:** **20.472 keywords** con KD ≤20 y volumen ≥100 (17.448 ES + 5.024 PT). De esas, 1.954 con vol ≥10K/mes.
- **Cubo #1 por volumen:** Meteo (40M búsquedas/mes ES+PT). **No** tráfico como asumíamos.
- **Competidor estratégico a batir:** eltiempo.es, aemet.es, dieselogasolina.com, maisgasolina.com, iqair.com (este último US, UX mediocre).
- **Ferry es imposible orgánico** (OTAs dominan), pivot a **comparador afiliado**.

---

## Cómo usar este directorio (agentes)

### Si buscas ... → Lee

| Necesidad | Archivo |
|---|---|
| **Plan ejecutivo intent-driven (canónico)** | **`MASTER-intent-driven-plan.md`** ⭐⭐ |
| Deep dive vuelos (13 clusters intent, roadmap) | `expert-01-vuelos.md` |
| Deep dive trenes (Renfe LD, observatorio puntualidad) | `expert-02-trenes.md` |
| Deep dive marítimo (tracking vs. booking split) | `expert-03-maritimo.md` |
| Deep dive carreteras (commuter, accidentes, ZBE) | `expert-04-carreteras.md` |
| Informe keyword research metodología | `REPORT-keyword-research.md` |
| Gap analysis vs. competidores | `REPORT-gap-analysis.md` |
| Planes superseded (histórico) | `06-`, `09-`, `10-` |
| Roadmap mapa interactivo | `../ROADMAP-MAP-INTERACTIVE-2026-04-19.md` |

### Si quieres datos → Consulta CSV

| CSV | Filas | Propósito |
|---|---|---|
| `03-keyword-universe-full.csv` ⭐ | 70.632 | **Universo maestro**: keyword, country, vol, CPC, competición, fuente, difficulty |
| `13-winnable-full.csv` ⭐ | 5.956 | Keywords ganables priorizadas por score (KD bajo + vol alto + relevancia) |
| `02-competitors-gap.csv` | 22.213 | Keywords que rankean competidores y no nosotros (= todas, somos 0) |
| `08-winnable-keywords.csv` | 521 | (Legacy) Subset inicial ganables — usar `13-winnable-full.csv` |

### Si quieres reportes puntuales → Lee md

| Archivo | Contenido |
|---|---|
| `00-executive-summary.md` | Cifras baseline |
| `02-competitors-gap.md` | Top 50 gap keywords + resumen por competidor |
| `04-serp-features.md` | 52 SERPs analizadas a detalle (lookup keyword) |
| `05-affiliate-opportunities.md` | 11.237 keywords comerciales ordenadas por Vol×CPC |
| `07-city-vertical-matrix.md` | Quién rankea pos 1 por ciudad × vertical |
| `11-universe-full-stats.md` ⭐ | Matriz KD × Volumen ES y PT |
| `12-serp-features-top300.md` ⭐ | Features SERP en top 300 ganables (AI Overview %, PAA %, etc.) |
| `13-winnable-full.md` ⭐ | Top ganables segmentadas: quick wins / mid / premium |

### Si quieres re-ejecutar

Scripts en `/scripts/seo-research/`:
- `run.py` — waves 1-5
- `run2.py` — waves 6-8
- `run3.py` — waves 9-11
- `analyze.py`, `analyze2.py`, `analyze3.py` — procesado

Credenciales DataForSEO en `/.env.seo-research` (gitignored).

---

## Metodología

**Fuente:** DataForSEO API ($20,67 gastados de $49,97 disponibles).

**Ubicaciones:** ES (`location_code=2724`, `language=es`) y PT (`location_code=2620`, `language=pt`).

**Waves ejecutadas:**

| Wave | Endpoint | Propósito | Coste |
|---|---|---|---|
| 1 | `ranked_keywords` + `domain_rank_overview` + `domain_intersection` | Baseline site + 19 competidores × 2 países | $3,13 |
| 2 | `keywords_data/google_ads/search_volume` | Volumen exacto de 419 seeds ES + 132 PT | $0,15 |
| 3 | `dataforseo_labs/keyword_ideas` | Expansión 35 seeds × 700 ideas c/u | $4,08 |
| 4 | `serp/google/organic/advanced` | SERP completa 35 keywords ES + 17 PT | $0,18 |
| 5 | `dataforseo_labs/keyword_ideas` | Expansión intención afiliado | $1,32 |
| 6 | `dataforseo_labs/bulk_keyword_difficulty` | KD × 900 ES + 450 PT | $0,15 |
| 7 | `serp/google/organic/advanced` | SERP 10 ciudades ES × 7 verticales + 5 PT × 5 | $0,33 |
| 8 | `backlinks/summary` | **FALLIDO** — suscripción requerida | $0 |
| 9 | `dataforseo_labs/bulk_keyword_difficulty` | KD para universo completo 26K | $2,98 |
| 10 | `dataforseo_labs/keyword_ideas` | 150 seeds adicionales (meteo, legal, afiliado, PT deep) | $7,28 |
| 11 | `serp/google/organic/advanced` | SERP top 300 winnable | $1,05 |

**Total:** 11 waves · ~750 llamadas API · 70.632 keywords únicas.

---

## Estado del site (baseline trafico.live)

Confirmado via DataForSEO `ranked_keywords` (abril 2026):

- **España:** 0 keywords rankeadas con vol ≥50
- **Portugal:** 0 keywords rankeadas con vol ≥50

Coincide con los P0 del [VERDICT audit 2026-04-17](../seo-audit-2026-04-17/VERDICT.md):
- Canonical apuntando a `/` en 32 páginas
- Sitemap omite ~4.000 URLs
- og:image falta en 117 páginas

**Implicación:** antes de cualquier contenido nuevo, ejecutar Fase 0 del plan (fix canonical + sitemap + og). Sin eso, las nuevas landings no se indexan.

---

## Archivos del directorio

```
docs/seo-research-2026-04-19/
├── README.md                            ← estás aquí
├── REPORT-keyword-research.md           ← informe keyword research consolidado
├── REPORT-gap-analysis.md               ← informe gap analysis consolidado
├── DATA-DICTIONARY.md                   ← columnas CSV explicadas
├── 00-executive-summary.md              baseline numérico
├── 02-competitors-gap.md/.csv           gap 22K keywords
├── 03-keyword-universe-full.csv ⭐      CSV maestro 70K keywords
├── 04-serp-features.md                  52 SERPs analizadas
├── 05-affiliate-opportunities.md        11K keywords comerciales
├── 06-roadmap-priorizado.md             roadmap anterior (obsoleto)
├── 07-city-vertical-matrix.md           dominios pos 1 por ciudad×vertical
├── 08-winnable-keywords.md/.csv         (legacy — usa 13)
├── 09-estrategia-integral.md            estrategia v2 (superseded by 10)
├── 10-total-domination.md ⭐           estrategia final
├── 11-universe-full-stats.md            matriz KD × Volumen
├── 12-serp-features-top300.md           features SERP top 300 ganables
├── 13-winnable-full.csv/.md ⭐         5.956 ganables priorizadas
└── raw/
    ├── wave1/ ... wave11/               JSON responses DataForSEO
```

⭐ = archivos canónicos, usa estos primero.

---

## Limitaciones conocidas

1. **Backlinks no medidos** — suscripción DataForSEO separada requerida ($0,01/día activación).
2. **KD no cubre 100%**: 25.467/70.632 keywords tienen KD medido. El resto (44K) tienen volumen pero necesitan KD adicional (~$5 de budget).
3. **SERP detallada solo para 340 keywords** (waves 4+7+11). El resto se infiere por dominio competidor del gap CSV.
4. **Ventana temporal**: los datos son snapshot abril 2026. Refrescar cada 3-6 meses.
5. **Volumen PT menos denso** que ES: los seeds originales eran ES-first, cola larga PT menos explorada.

---

## Licencia y actualización

Datos propiedad de trafico.live (generados con crédito DataForSEO de mj@abemon.es). Refrescar cuando:
- Métricas GSC propias muestren movimiento (T+30d de lanzar Sprint 1)
- Antes de lanzar un nuevo vertical importante
- Cada trimestre para KD/vol delta

**Próximo refresh recomendado:** 2026-07-19 (trimestre).
