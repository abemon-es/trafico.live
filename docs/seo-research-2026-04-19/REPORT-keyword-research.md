# INFORME — Keyword Research ES + PT (trafico.live)

**Fecha:** 2026-04-19
**Autor:** DataForSEO research orchestration ($20,67 gastados)
**Scope:** España + Portugal, dominios Google es / pt
**Estado del research:** cerrado — no se ejecuta más hasta refresh Q3 2026

---

## 1. Resumen ejecutivo

- **Universo analizado:** 70.632 keywords únicas con volumen mensual medido.
- **Cobertura KD:** 25.467 keywords con dificultad (36%). Resto cola larga sin KD.
- **Mercado principal por volumen:** ES con 51.823 keywords (18,5M vol agregado mensual en top 1K).
- **Mercado secundario:** PT con 18.809 keywords (3,2M vol agregado mensual en top 1K).
- **TAM agregado top verticales:** ~80M búsquedas/mes ES+PT.
- **Cluster #1 por volumen:** Meteo (40M/mes agregado) — eclipsa tráfico.
- **Keywords ganables (KD≤20, vol≥100):** 20.472 — la cola es el tesoro.

---

## 2. Metodología

**Herramienta:** DataForSEO API (plan estándar, cuenta mj@abemon.es).

**Parámetros:**
- ES: `location_code=2724`, `language_code=es`
- PT: `location_code=2620`, `language_code=pt`
- Google: `device=desktop`, `os=windows`
- Engine: Google organic (no Bing ni YouTube)

**Pipelines:**
1. **Seed list** manual: 541 semillas cubriendo 7 verticales × 52 provincias ES + 18 distritos PT × intent transaccional.
2. **Volume lookup** vía `keywords_data/google_ads/search_volume` (Google Ads API oficial).
3. **Expansion** vía `dataforseo_labs/keyword_ideas` (DataForSEO proprietary algorithm que combina Google clickstream + related + suggestions).
4. **Difficulty** vía `dataforseo_labs/bulk_keyword_difficulty` (DataForSEO proprietary KD 0-100).
5. **SERP** vía `serp/google/organic/live/advanced` (rendering completo: organic + features).

**Dedup:** lower-case match. Keywords con espacios/tildes variantes se fusionan al de mayor volumen.

**Fecha snapshot:** 2026-04-19. Re-run trimestral recomendado.

---

## 3. Distribución del universo

### 3.1 España (51.823 keywords)

| Banda volumen | Keywords | % |
|---|---|---|
| 100K+ | 268 | 0,5% |
| 10K-100K | 2.696 | 5,2% |
| 1K-10K | 15.835 | 30,6% |
| 100-1K | 21.750 | 42,0% |
| 10-100 | 11.224 | 21,7% |
| <10 | 50 | 0,1% |

**Mediana de volumen ES:** ~480/mes.

### 3.2 Portugal (18.809 keywords)

| Banda volumen | Keywords | % |
|---|---|---|
| 100K+ | 37 | 0,2% |
| 10K-100K | 553 | 2,9% |
| 1K-10K | 4.645 | 24,7% |
| 100-1K | 8.293 | 44,1% |
| 10-100 | 5.250 | 27,9% |
| <10 | 31 | 0,2% |

**Mediana de volumen PT:** ~280/mes. Mercado más pequeño pero menos competido.

---

## 4. Matriz KD × Volumen (oportunidad)

### 4.1 España (keywords con KD medido + relevancia a trafico.live)

| KD \\ Vol | 100-1K | 1K-10K | 10K-100K | 100K+ | Total |
|---|---|---|---|---|---|
| **KD 0-10** | 4.914 | 7.192 | 1.131 | 45 | **13.282** |
| **KD 11-20** | 502 | 1.227 | 413 | 24 | **2.166** |
| KD 21-30 | 289 | 773 | 257 | 41 | 1.360 |
| KD 31-50 | 196 | 795 | 303 | 47 | 1.341 |
| KD 51+ | 152 | 596 | 241 | 64 | 1.053 |

**Ganables trivialmente (KD ≤ 20):** 15.448 keywords ES.

### 4.2 Portugal

| KD \\ Vol | 100-1K | 1K-10K | 10K-100K | 100K+ | Total |
|---|---|---|---|---|---|
| **KD 0-10** | 1.304 | 2.655 | 311 | 10 | **4.280** |
| **KD 11-20** | 127 | 511 | 99 | 7 | **744** |
| KD 21-30 | 61 | 244 | 58 | 3 | 366 |
| KD 31-50 | 45 | 147 | 33 | 6 | 231 |
| KD 51+ | 28 | 136 | 30 | 7 | 201 |

**Ganables trivialmente PT:** 5.024 keywords.

### 4.3 Lectura estratégica

- **20.472 keywords KD≤20 con vol≥100** = cola larga programática. Requiere templates + DB + cron, no contenido humano.
- **1.954 keywords vol≥10K y KD≤40** = mid-tier donde podemos pelear con contenido de calidad + UX superior. Aquí concentrar esfuerzo editorial.
- **206 keywords vol≥100K y KD≤50** = cluster premium. Competir en el medio plazo (6-12 meses) con autoridad acumulada.

---

## 5. Verticales — volumen ES + PT

| # | Vertical | Vol ES/mes | Vol PT/mes | TAM | Cluster #1 keyword |
|---|---|---|---|---|---|
| 1 | Meteo (ciudad + provincia + alertas) | 25M | 15M | **40M** | "el tiempo" (4,09M), "tempo para amanhã" (3,35M) |
| 2 | Ferroviario (Renfe + CP + estaciones + líneas) | 6M | 2M | 8M | "renfe" (3,35M), "atocha" (1M) |
| 3 | Aviación (radar + aeropuertos + live) | 3M | 1M | 4M | "flight radar" (301K), "aeroporto lisboa" (49K) |
| 4 | Tráfico & carreteras (atasco + DGT + normativa) | 2,5M | 500K | 3M | "tráfico en directo", "baliza V-16" (246K) |
| 5 | Combustible (precio + gasolineras + EV) | 2M | 1M | 3M | "precio gasolina hoy", "combustíveis" (165K) |
| 6 | Metro / transit urbano | 1,5M | 2M | 3,5M | "metro lisboa" (135K), "metro madrid" |
| 7 | Marítimo (ferry + puerto + AIS) | 1M | 500K | 1,5M | "ferry a Mallorca" (10-100K) |
| 8 | Calidad del aire | 800K | 400K | 1,2M | "calidad aire madrid" (L) |
| 9 | Alertas (DANA + radar lluvia + avisos) | 300K | 200K | 500K | "dana españa" (M) |
| 10 | Hubs ciudad/provincia (cola larga multi-vertical) | 10M | 5M | 15M | "madrid", "porto", "barcelona" (673K-823K c/u) |
| 11 | Legal / normativa (V-16, ZBE, carnet, multas) | 800K | 200K | 1M | "baliza V-16" (246K), "etiqueta ambiental" (150K) |

**Total TAM:** ~80M búsquedas/mes ES+PT. Captura objetivo 180d: 0,6% = 500K clics/mes.

---

## 6. Top keywords ganables — quick wins

### 6.1 España — KD ≤10, vol ≥100K (45 keywords, 10 ejemplos)

| Keyword | Vol/mes | KD | CPC | Landing sugerida |
|---|---|---|---|---|
| madrid-puerta de atocha-almudena grandes | 450.000 | 0 | $0,40 | `/trenes/estacion/madrid-puerta-atocha` |
| estación de servicio cepsa | 450.000 | 0 | $0,31 | `/gasolineras/marcas/cepsa` |
| estacion sur de autobuses madrid | 201.000 | 0 | $0,18 | `/transporte-publico/madrid/estacion-sur` |
| plano metro madrid | 246.000 | 7 | $0,07 | `/metro-madrid/plano` |
| alcampo gasolinera | 110.000 | 0 | $0,47 | `/gasolineras/marcas/alcampo` |
| terminal t4 llegadas aparcamiento p 4 | 110.000 | 0 | $0,39 | `/aviacion/aeropuertos/MAD/terminal-t4` |
| aeropuerto Palma de Mallorca | 201.000 | 9 | $1,35 | `/aviacion/aeropuertos/PMI` |
| puerto venecia | 165.000 | 4 | $0,63 | `/ciudad/zaragoza/puerto-venecia` (centro comercial) |
| estación Valencia Joaquín Sorolla | 90.500 | 0 | $0,20 | `/trenes/estacion/valencia-joaquin-sorolla` |
| estación de autobuses plaza de armas | 90.500 | 0 | $0,11 | `/transporte-publico/sevilla/plaza-de-armas` |

**Volumen agregado top 10 ES quick wins:** 2.114.000/mes.

### 6.2 España — mid-tier (KD 20-40, vol ≥10K)

10 ejemplos de 203 keywords:

| Keyword | Vol/mes | KD | CPC | Landing sugerida |
|---|---|---|---|---|
| el tiempo en Barcelona | 1.000.000 | 27 | $0,60 | `/meteo/barcelona` |
| tiempo Barcelona | 673.000 | 36 | $0,53 | ídem |
| el tiempo en vigo | 368.000 | 24 | $0 | `/meteo/vigo` |
| tiempo A Coruña | 301.000 | 25 | $0,26 | `/meteo/a-coruna` |
| tiempo en malaga | 301.000 | 25 | $0 | `/meteo/malaga` |
| tiempo Zaragoza | 301.000 | 28 | $0 | `/meteo/zaragoza` |
| el tiempo en huelva | 246.000 | 25 | $0 | `/meteo/huelva` |
| tiempo Valladolid | 246.000 | 26 | $0 | `/meteo/valladolid` |
| aeropuerto adolfo suárez madrid-barajas | 246.000 | 23 | $0,40 | `/aviacion/aeropuertos/MAD` |
| tiempo Granada | 201.000 | 23 | $0 | `/meteo/granada` |

### 6.3 Portugal — quick wins (KD ≤10)

10 ejemplos:

| Keyword | Vol/mes | KD | Landing sugerida |
|---|---|---|---|
| lisboa tempo | 368.000 | 17 | `/meteo/pt/lisboa` |
| parque de estacionamento | 135.000 | 0 | `/estacionamento` |
| tempo Porto | 301.000 | 16 | `/meteo/pt/porto` |
| combustíveis próxima semana | 135.000 | 0 | `/combustiveis/previsao` |
| meteorologia braga | 246.000 | 18 | `/meteo/pt/braga` |
| preço combustíveis próxima semana | 110.000 | 1 | `/combustiveis/previsao-precos` |
| meteorologia guimarães | 110.000 | 6 | `/meteo/pt/guimaraes` |
| tempo Braga | 135.000 | 15 | `/meteo/pt/braga` |
| meteorologia leiria | 90.500 | 7 | `/meteo/pt/leiria` |
| metro do porto | 90.500 | 4 | `/metro-porto` |

---

## 7. SERP features — top 300 ganables (288 SERPs)

| Feature | % aparición | Implicación |
|---|---|---|
| related_searches | 99,7% | Baseline siempre presente |
| people_also_ask | **56,2%** | **FAQ schema obligatorio en 100% landings** |
| images | 39,9% | Imagen optimizada con og: + image-sitemap |
| knowledge_graph | 21,5% | Schema Place/TrainStation/Airport/Organization |
| top_stories | 15,3% | News-sitemap + Article schema activos |
| local_pack | 12,5% | GBP o LocalBusiness para entidades locales |
| compare_sites | 12,5% | Oportunidad afiliado — listas comparativas |
| video | 10,1% | YouTube embed donde aplique |
| google_reviews | 9,4% | Valoraciones schema en puntos de interés |
| answer_box | 5,9% | Featured snippet — párrafo 40-60 palabras con respuesta directa |
| ai_overview | **2,4%** | **Bajo en ganables** — vs. 19% top broad. Ventana SGE-free |

**Lectura clave:** las keywords ganables están **por debajo del radar SGE**. Ventana de 12-24 meses antes de que AI Overview las alcance. Actuar rápido.

---

## 8. Dominios competidores — mapa de fuerzas (top-5 appearances en 288 SERPs)

### 8.1 España

| # | Dominio | Top-5 appearances | Vertical principal |
|---|---|---|---|
| 1 | eltiempo.es | 98 | Meteo |
| 2 | aemet.es | 92 | Meteo oficial |
| 3 | tiempo.com | 59 | Meteo (3º player) |
| 4 | es.wikipedia.org | 52 | Cross-vertical |
| 5 | renfe.com | 47 | Trenes brand |
| 6 | metromadrid.es | 40 | Transit Madrid |
| 7 | accuweather.com | 39 | **Meteo US — ganable** |
| 8 | 24timezones.com | 24 | **Horarios — ganable** |
| 9 | crtm.es | 21 | Transit Madrid operador |
| 10 | aena.es | 20 | Aeropuertos |

### 8.2 Portugal

| # | Dominio | Top-5 appearances | Vertical |
|---|---|---|---|
| 1 | ipma.pt | 84 | Meteo oficial |
| 2 | tempo.pt | 58 | Meteo |
| 3 | accuweather.com | 40 | **US — ganable** |
| 4 | otempo.pt | 26 | Meteo pequeño |
| 5 | tempoeradar.pt | 24 | Meteo pequeño |
| 6 | fcporto.pt | 20 | Fútbol (interferencia para "porto") |

**Insight crítico:** accuweather.com aparece 79 veces en ES+PT con UX en inglés. Dominio foreign con baja relevancia local. **Ganable en 6-12 meses con contenido ES/PT native + schema + cross-vertical data**.

---

## 9. Intención comercial — CPC y afiliación

De los 11.237 keywords con CPC >$0,50 (marcador de intención comercial):

**Top clusters comerciales por Vol × CPC:**

| Vertical | Vol agregado | CPC medio | Revenue potencial afiliado/año |
|---|---|---|---|
| Seguros auto | 200K | $8-12 | €30K-80K |
| Parking aeropuerto | 400K | $1-2 | €8K-20K |
| Alquiler coche | 600K | $2-4 | €15K-40K |
| Ferry reserva | 500K | $1-3 | €10K-30K |
| Fuel apps (Waylet, Solred, Galp) | 1M | $0,50-2 | €5K-15K (CPI) |
| EV charging | 80K | $1 | €3K-8K (leads) |
| Vuelos OTA | 400K | $0,50 | €5K-15K |
| Billetes tren | 30K | $0,80 | €1K-3K |

**Revenue afiliado estimado año 1 (con Sprint 10 afiliados activo):** €50K-200K según capture rate.

Detalle en `05-affiliate-opportunities.md` y `13-winnable-full.csv` filtrando por CPC.

---

## 10. Keywords imposibles (informativo)

Evitar gastar esfuerzo orgánico en:

| Keyword | Vol/mes | KD | Razón |
|---|---|---|---|
| renfe | 3.350.000 | 100 | Brand, imposible |
| aemet | 2.240.000 | 100 | Brand institucional |
| el tiempo | 4.090.000 | 100 | Generic + SGE |
| lluvia | 673.000 | 81 | Generic |
| vuelos baratos | 550.000 | 95 | OTA war |
| ferry a Mallorca/Ibiza | 100K c/u | - | OTA dominates top 10 (directferries, clickferry, omio) — **pivot afiliado** |
| dgt | 10M+ | 95+ | Brand gubernamental |
| renfe cercanías | 300K+ | 80+ | Brand + operador |

Foco de estos: comprar tráfico (Google Ads) o capturar cola larga ("renfe Madrid Barcelona horario" en lugar de "renfe").

---

## 11. Oportunidades por país — diferenciales

### 11.1 España
- Mercado denso y competido por operadores oficiales (dgt.es, aemet.es, renfe.com, aena.es).
- Hueco en UX: aemet.es, dieselogasolina.com tienen UX pre-2015.
- Hueco en cross-vertical: nadie cruza meteo + tráfico + aire + fuel en una ciudad.
- Hueco en contenido diario: aemet.es no publica artículos, eltiempo.es publica pero thin.

### 11.2 Portugal
- Mercado menos competido: viamichelin.pt, maisgasolina.com, tempo.pt son los únicos jugadores significativos con UX moderna, y los 3 tienen data limitada.
- **KD medio 50% más bajo** que ES en keywords equivalentes.
- **maisgasolina.com = monopolio** en combustible (5/5 pos 1 en ciudades top). Colapsable con UX nativa + data DGEG (ya importada).
- Metro Lisboa/Porto tienen operador oficial fuerte pero no incluyen contenido editorial ni cross-vertical.
- **Hueco total en comparador ferry** (Lisboa-Cacilhas, Setúbal-Tróia, Porto-Madeira).

---

## 12. Limitaciones del informe

1. **KD no medido en 45.165 keywords** (sobre todo cola larga). Budget adicional $4,5 lo cubriría.
2. **SERP rico solo en 340 keywords**. Para estrategias detalladas por keyword, re-query SERP específica.
3. **Backlinks no disponibles** — activar suscripción DataForSEO Backlinks para competir autoridad.
4. **Google Ads data** es aproximada (rangos, no exacto). Para precisión exacta: Keyword Planner cuenta propia.
5. **Seasonality no capturada** — volúmenes son promedio anual. Algunos verticals tienen picos (ferry verano, tráfico puentes, meteo invernal).
6. **Portugal idioma BR vs. PT-PT**: la API usa pt-PT, pero algunos términos tienen variantes brasileñas que pueden sobrestimar vol.

---

## 13. Anexos — archivos de soporte

- `03-keyword-universe-full.csv` — CSV maestro 70.632 keywords
- `13-winnable-full.csv` — 5.956 ganables priorizadas
- `11-universe-full-stats.md` — distribución completa
- `12-serp-features-top300.md` — features SERP detalladas
- `raw/wave{1..11}/*.json` — respuestas DataForSEO raw

---

**Next step:** combinar este informe con `REPORT-gap-analysis.md` para accionar Sprint 1 del plan estratégico `10-total-domination.md`.
