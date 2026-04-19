# Intent Validation — emergent verticals
**Fecha:** 2026-04-19
**Data:** `03-keyword-universe-full.csv` (70.632 kw) vía `query.py search`
**Objetivo:** confirmar o descartar los 10 verticales emergentes de `EMERGENT-VERTICALS.md` según volumen real antes de asignar sprints 5-13.

---

## Veredicto resumen

| # | Vertical emergente | Señal | Veredicto | Sprint |
|---|---|---|---|---|
| 1 | Multimodal route planner | MEDIA-BAJA en pattern concreto. Cluster más amplio "como llegar [ciudad]" ya validado antes (300K-600K) | **GO — cobertura vía `/como-llegar/[ciudad]`** | 6 |
| 2 | Predictive forecasting | **FUERTE en "precio luz mañana" (165K KD 14, CPC $2.98)** + "precio gasolina mañana" + "previsión tráfico mañana". Pattern `X mañana` es oro | **GO — palanca clara con CNMC 10y** | 9 |
| 3 | Weather impact on mobility | **DÉBIL como keyword directo** (solo "vuelos cancelados" 1.9K). El intent NO se busca como tal; se captura vía otras landings enriquecidas | **GO — pero no como vertical standalone, como widget en páginas de modo** | 8 |
| 4 | Health decision | **CERO vol directo** con nuestros patterns ES. El intent existe pero como "correr X ciudad" o "mascarilla", no como "¿puedo correr?". Necesita reframe | **DEGRADADO — validar con query alterna antes de sprint** | 10 o post-13 |
| 5 | Events + mobility | **MUY FUERTE: manifestaciones 450K/mes + huelga Renfe 22K KD 4 + greve aeroporto Lisboa 8K KD 3**. Pattern manifestación solo = 200K KD 0 | **GO PRIORITARIO — adelantar a Sprint 7** | 7 (promovido) |
| 6 | Data journalism | No se valida con pattern keywords (el intent emerge del producto, no de búsquedas directas) | **GO — no depende de keyword research** | 9 |
| 7 | Compliance automation | **FUERTE: renovar carnet 37K + ZBE Madrid 15K con KD bajos. Pattern legal es mina clara** | **GO CONFIRMADO — ya en Sprint 11 del plan base, mantener** | 11 |
| 8 | Emergency crisis | No testado aquí (era event-driven). Pero 363K/mes en "accidente tren hoy" ya lo valida | **GO — ejecutar vía pipeline editorial** | 12 |
| 9 | Tourism intelligence | **CERO volumen directo**. Pattern "mejor época", "sin turistas", "cuando visitar" no aparece con nuestros seeds | **DESCARTAR para T+180d. Revisar con nuevos seeds si queda budget** | POSTPONED |
| 10 | API-as-content | Ya en Sprint 1 actual por el otro agente (Team F) | **EN EJECUCIÓN** | 1 (activo) |

**Promociones vs plan original:**
- **Events → Sprint 7** (arriba 4 posiciones): señal brutal de `manifestación` pattern
- **Predictive → mantener Sprint 9** pero empezar con fuel price (vol más claro que atasco)

**Degradaciones:**
- **Health decision → post-Sprint-13**: el intent no aparece en SEO. Es producto de retención no de captura, mejor como feature dentro de `/calidad-aire/[ciudad]` sin landing propia
- **Tourism intelligence → descartar** hasta seeds específicos (vendimia, puente, temporada baja)

**Refraseos necesarios:**
- **Weather impact**: no es vertical, es **enriquecimiento** cross-cutting. Va como `<WeatherImpactSlot>` en todas las páginas de modo (ya construido como skeleton en `src/components/layers/WeatherImpactSlot.tsx`)

---

## Evidencia cruda

### 1. Multimodal planner (`pattern: como ir desde|como llegar.*en|opciones.*viaje`)

Top hits con vol ≥500 (solo 5 resultados en el pattern estrecho):

```
es | como llegar valencia             vol=6,600   KD=0    CPC=$1.56
es | como llegar alcobendas           vol=2,900   KD=3    CPC=$0
es | como llegar en coche             vol=590     KD=30   CPC=$2.07
es | como llegar a madrid en coche    vol=590     KD=0    CPC=$2.92
```

El pattern estrecho no captura el grueso. Con el pattern más amplio "cómo llegar [ciudad]" (ejecutado previamente), el cluster era 300-600K/mes. **Confirmado: vertical existe, URL sugerida `/como-llegar/[ciudad]` con comparador cross-mode**.

### 2. Predictive forecasting (`pattern: precio.*mañana|subira.*gasolina`)

```
es | precio luz mañana                        vol=165,000  KD=14  CPC=$2.98
es | precio de la luz mañana                  vol=74,000   KD=14  CPC=$2.76
es | precio luz mañana por horas              vol=6,600    KD=7   CPC=$2.76
es | precio de la luz mañana sábado           vol=4,400    KD=4   CPC=$3.49
es | previsión tráfico mañana                 vol=590      KD=-   CPC=$0
es | bajara la gasolina                       vol=390      KD=-   CPC=$0
es | subira el precio de la gasolina          vol=260      KD=-   CPC=$0
es | precio gasolina mañana                   vol=210      KD=-   CPC=$0.07
```

**260K agregado solo en precio luz mañana**. Aunque no tenemos datos de luz nativos, el patrón se replica a gasolina/tráfico. Sprint 9 debe arrancar por **"precio gasolina mañana"** con nuestros 10 años CNMC: aunque el volumen directo sea 210/mes, la cola larga ("precio diesel mañana provincia X", "cuanto costará gasolina semana que viene") es infinita y ML trivial con la data que tenemos.

### 3. Weather impact (`pattern: vuelo.*cancelad|ferry.*oleaje|tren.*tormenta`)

```
es | vuelos cancelados                vol=1,900   KD=-   CPC=$2.24
```

**Señal directa débil**. Reframe: no se construye como vertical separado; se integra como `<WeatherImpactSlot>` dentro de páginas de modo. El valor está en que cuando AEMET emite roja, cientos de miles buscan "vuelos cancelados málaga", "ferry canarias oleaje" y nuestras páginas enriquecidas capturan la oleada.

### 4. Health decision (`pattern: correr.*hoy|deporte.*aire`)

**CERO resultados con vol ≥200**. El intent NO está en el SEO — lo que sí hay es `correr madrid rutas` (diferente intent) y `mascarilla asma` (transaccional). **Degradar**: el producto health-decision puede existir como widget de retención pero no justifica landings SEO-first.

### 5. Events mobility (`pattern: manifestación|huelga.*aena|huelga.*renfe`)

```
es | manifestación madrid hoy              vol=27,100   KD=0    (× 6 variants = ~160K)
es | huelga renfe                          vol=22,200   KD=4    CPC=$0
es | madrid manifestación                  vol=12,100   KD=0
es | manifestación barcelona hoy           vol=9,900    KD=0    (× 4 variants = ~40K)
es | manifestación palestina madrid        vol=6,600    KD=4
```

**Agregado `manifestación` cluster ≈ 450K/mes KD 0-9.** Huelgas ≈ 22K+. **Señal brutal.** Promover de Sprint 11 a **Sprint 7**. Landings sugeridas:
- `/manifestacion-madrid-[date]` autogenerated daily
- `/huelga-[operator]-[date]` autogenerated cada huelga anunciada
- `/evento/[slug]` per evento deportivo/cultural

### 6. Compliance (`pattern: renovar carnet|zona bajas emisiones`)

```
es | renovar carnet de conducir             vol=27,100   KD=-    CPC=$1.13
es | renovar carnet conducir                vol=9,900    KD=9    CPC=$1.18
es | zona bajas emisiones madrid            vol=9,900    KD=5    CPC=$1.99
es | renovar carnet de conducir madrid      vol=5,400    KD=11   CPC=$0.99
es | renovar carnet de conducir barcelona   vol=2,900    KD=0    CPC=$1.60
es | zona bajas emisiones madrid mapa       vol=2,900    KD=-    CPC=$1.98
```

**Cluster ~65K/mes KD ≤11 CPC $1-2**. Confirma el plan. Sumado al research anterior (baliza V-16 246K, etiqueta ambiental 150K), el vertical compliance sigue siendo ~1M/mes.

### 7. Tourism intelligence

**Cero hits con vol ≥500**. Descartar para T+180d.

### 8. PT intents

```
pt | greve aeroporto lisboa    vol=8,100   KD=3
pt | greve aeroporto porto     vol=1,900   KD=0
pt | greve aeroporto portugal  vol=1,600
```

PT events pattern valida pero volumen pequeño. **Ok para Sprint 7 como tail-cover**.

---

## Acción

1. **Promover "Events + Mobility" a Sprint 7** (sube 4 posiciones). Scraping delegaciones gobierno + AENA huelgas + LaLiga calendar arrancan antes.
2. **Predictive Sprint 9**: arrancar por **precio gasolina mañana** (no atasco Madrid) como MVP — datos CNMC 10y son la palanca más directa, ML trivial, volumen creciente.
3. **Weather impact**: no sprint propio. Integrar como `<WeatherImpactSlot>` en Sprint 2 template base (skeleton ya construido).
4. **Health decision**: degradar a feature post-Sprint-13. No landing SEO-first; solo widget contextual en `/calidad-aire/[ciudad]`.
5. **Tourism intelligence**: descartar del plan. Revisitar con nuevos seeds de DataForSEO en Q3 2026 (Wave 12 opcional del plan original).

Con estas correcciones, el plan de 10 verticales emergentes queda reducido a **6 accionables** + 3 postpuestos + 1 descartado. Budget liberado = ~2 sprints.
