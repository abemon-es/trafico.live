# Data Dictionary — CSVs del research

## `03-keyword-universe-full.csv` (70.632 filas — maestro)

| Columna | Tipo | Descripción |
|---|---|---|
| `country` | str | `es` o `pt` |
| `keyword` | str | Keyword tal como la escribe el usuario |
| `search_volume` | int | Búsquedas mensuales promedio (Google Ads) |
| `cpc` | float | CPC medio en USD |
| `competition_level` | str | `LOW` / `MEDIUM` / `HIGH` / null (competencia en Google Ads, no SEO) |
| `source` | str | `seed` (wave2), `w3`/`w5`/`w10` (expansion), `affiliate` |
| `difficulty` | int / null | KD 0-100 (DataForSEO proprietary). 0-20 = fácil, 21-40 = medio, 41+ = difícil. `null` si no medido |

**Rows no medidos:** 45.165 keywords sin KD (sobre todo cola larga). Si necesitas KD para esas, ejecuta wave adicional (`bulk_keyword_difficulty` $0,0001/kw, ~$5 total).

**Filtros útiles:**
```bash
# Quick wins (KD<=20, vol>=1000)
awk -F, 'NR==1 || ($3>=1000 && $7!="" && $7<=20)' 03-keyword-universe-full.csv

# Solo ES meteo
grep -i "tiempo\|aemet\|meteo" 03-keyword-universe-full.csv | grep "^es,"
```

---

## `13-winnable-full.csv` (5.956 filas — ganables priorizadas)

Derivado de `03-keyword-universe-full.csv` filtrando: `vol≥100 AND KD medido AND relevance_score>0`.

| Columna | Tipo | Descripción |
|---|---|---|
| `country`, `keyword`, `search_volume`, `cpc`, `competition_level`, `source`, `difficulty` | (iguales que arriba) | |
| `relevance` | int 0-10 | Heurística fit con nuestro stack (10=meteo, 9=tren/tráfico, 8=aero/fuel/aire, 7=otros). Si `relevance=0` fue filtrada. |
| `score` | float | `(volume / (difficulty + 10)) × relevance × comp_bonus`. `comp_bonus = 1.5` si competencia LOW, si no 1.0. Mayor score = más ganable. |

**Ordenado por score descendente.** Usa para priorización sprint-a-sprint.

---

## `02-competitors-gap.csv` (22.213 filas)

Keywords donde 25 competidores rankean en top 100 y trafico.live no. Como trafico.live rankea 0 keywords, **todo competidor keyword es gap** por defecto.

| Columna | Tipo | Descripción |
|---|---|---|
| `country` | str | `es` / `pt` |
| `competitor` | str | Dominio competidor |
| `keyword` | str | Keyword en la que rankea |
| `search_volume` | int | Vol mensual |
| `cpc` | float | CPC USD |
| `competition_level` | str | Google Ads competition |
| `competitor_rank` | int | Posición del competidor (1-100) |
| `competitor_url` | str | URL exacta del competidor que rankea |
| `etv` | float | Estimated traffic value USD (vol × CTR × CPC aprox) |
| `intent` | str / null | `commercial`, `informational`, etc. (casi siempre null en nuestra data) |

**Útil para:** copiar estructura de URL del competidor, entender qué contenido rankea hoy.

---

## `08-winnable-keywords.csv` (521 filas — LEGACY)

Versión inicial, generada antes de wave 9. Usa `13-winnable-full.csv` en su lugar.

---

## Raw JSON responses

En `raw/wave{1..11}/` están los JSON completos de DataForSEO. Útiles si necesitas campos adicionales (monthly_searches series, search_intent, historical data, etc.) que no volcamos al CSV.

**Schema por wave:**
- `wave1/rank_*.json` — domain summary
- `wave1/ranked_*.json` — keywords que rankea ese dominio
- `wave1/intersection_*.json` — (vacíos, trafico.live 0 kw)
- `wave2/volume_*.json` — flat list of keyword stats
- `wave3/ideas_*.json`, `wave5/affiliate_ideas_*.json`, `wave10/ideas_*.json` — keyword ideas con métricas
- `wave4/serp_*.json`, `wave7/city_*.json`, `wave11/serp_*.json` — SERP data con items (organic + features)
- `wave6/difficulty_*.json`, `wave9/kd_*.json` — KD batch results

**Estructura DataForSEO estándar:**
```json
{
  "tasks": [{
    "status_code": 20000,
    "cost": 0.05,
    "result": [{
      // depends on endpoint
      "items": [...]
    }]
  }]
}
```
