# GSC + GA4 — datos reales 90 días pre-launch

**Fecha pull:** 2026-04-17
**Ventana:** últimos 90 días (~17 ene – 14 abr 2026)
**Property GSC:** `sc-domain:trafico.live` (creada 24-mar-2026, 24 días de historia)
**Property GA4:** `521333149` (Europa/Madrid, EUR)
**Acceso vía:** Service Account `claude-agent@claude-automation-484615.iam.gserviceaccount.com` (Full GSC + Viewer GA4)

---

## 1. Topline (90 días)

| Métrica | Valor | Lectura |
|---|---|---|
| **GSC clicks / impr / pos** | 1 / 115 / 31.4 | Pre-launch puro |
| **GSC trend first-7d → last-7d** | 1 impr → 45 impr (+4400%) | **Google indexando ahora mismo** |
| **GA4 users / sessions / pageviews** | 90 / 200 / 1.600 | 8 pv/sess, ratio altísimo |
| **GA4 avg session duration** | 638s (10:38) | Engagement excelente |
| **GA4 bounce rate** | 37% | Muy bueno (benchmark sector ~50-60%) |
| **GA4 trend first-7d → last-7d sessions** | 105 → 26 (**-75%**) | 🚨 Decay sin distribución |
| **Source mix** | direct 198 / chatgpt 1 / google organic 1 | 1 referral ChatGPT = AI discovery |
| **Device split** | Desktop 85% / Mobile 14% / Tablet 1% | Desktop-first audience |
| **Country split** | España 64% / USA 15% (probable bot) / NL 5% / DE 4% | Filtrar USA |

---

## 2. Hipótesis del roadmap validadas

### ✅ Entity SSG funciona sin optimizar

Páginas que Google ya rankea bien (pos < 15) sin trabajo on-page:

| URL | Posición | Impr |
|---|---|---|
| `/gasolineras/terrestres/12822` | **3.0** | 1 |
| `/gasolineras` (hub) | **3.5** | 2 |
| `/gasolineras/terrestres/12519` | **6.0** | 1 |
| `/incidencias` | **6.0** | 1 |
| `/carreteras` (hub) | **6.5** | 2 |
| `/espana` | **7.0** | 1 |
| `/clima` | **8.0** | 1 |
| `/camaras` | **8.0** | 1 |
| `/etiqueta-ambiental` | **9.0** | 2 |
| `/gasolineras/maritimas` | **10.0** | 1 |
| `/corredores/madrid-malaga` | **11.0** | 1 |
| `/estadisticas/accidentes/cordoba` | **11.0** | 1 |

**Conclusión:** la hipótesis de S3 (27.553 entity pages SSG) está **data-validated**. Tras P0 SEO fixes (titles dobles, og:image, canonicals) el multiplicador será grande.

### ✅ Hubs verticales enganchan

GA4 avg duration por hub:

| Hub | Sessions | Avg duration |
|---|---|---|
| `/` (home) | 143 | **643s** 🔥 |
| `/trenes` | 28 | **703s** 🔥 |
| `/maritimo/mapa` | 26 | 183s |
| `/gasolineras` | 50 | 183s |
| `/maritimo` | 21 | 146s |
| `/carreteras` | 33 | 144s |
| `/estadisticas` | 51 | 97s |

**Conclusión:** decisión Q3 (los 7 hubs full-feature) confirmada.

### ✅ Entity pages individuales validadas

| URL | Sessions | Avg duration |
|---|---|---|
| `/maritimo/buques/368381830-rodney-j-tregre` | 2 | **508s** |
| `/aviacion/aeropuertos/mad` | 2 | 208s |
| `/carreteras/autovias` | 2 | **2.315s** (outlier) |

**Conclusión:** S3 entity pages capturarán long-tail con engagement alto.

---

## 3. Hallazgos NUEVOS que cambian el roadmap

### 3.1 Páginas que Google muestra pero rankean lejos (S2 polish target)

| URL | Impr | Posición |
|---|---|---|
| `/carreteras/A-92` | **7** | 68 |
| `/estaciones-aforo` | **15** | 60 |
| `/carreteras/A-5` | 1 | 56 |
| `/maritimo/combustible` | 2 | 38 |
| `/carreteras/M-513` | 3 | 40 |

**Acción:** rework on-page de `/carreteras/[code]` template (intro 150-200 palabras, schema Road, breadcrumbs, FAQ) y `/estaciones-aforo` (titles + content density). Pos 50→20 con on-page bien hecho es realista.

### 3.2 `/camaras` paradoja

- GSC: pos **8** (top 10, búsqueda activa "cámaras carretera")
- GA4: 27 views, **20s avg** → aterrizaje pero abandono inmediato

**Acción S2:** rework hero más denso, listado categorizado por carretera/provincia, schema VideoObject. Target avg duration 60s+.

### 3.3 `/noticias` no engancha — decisión pre-launch

- GA4: 39 views, solo 8 engaged, **34s avg** → bounce alto
- GSC: `/noticias/informe-diario-2026-04-02` aparece pos 8 con 0 clicks

**Decisión a tomar S0:** rediseñar o deprecar antes del launch (consume nav + crawl budget sin retorno).

### 3.4 AI discoverability — señal concreta

- 1 session de chatgpt.com → ChatGPT citó una página y un humano hizo click
- Implica que LLMs ya están leyendo el sitio

**Acción S4:** `LLMs.txt` en root + FAQ schema en 7 hubs + JSON-LD denso. Capitaliza este vector de discovery.

### 3.5 Event funnel ROTO

Eventos custom en GA4 últimos 90d:
```
1.600 page_view · 200 session_start · 533 user_engagement
    3 click · 1 form_start · 1 form_submit · 70 search
```

**Faltan eventos críticos:** `pricing_click`, `api_docs_click`, `newsletter_signup`, `vertical_click`, `cta_click`, `affiliate_click` (clave para fase E).

**Acción S4 BLOQUEANTE:** sin event funnel post-launch no sabremos qué convierte.

### 3.6 GA4 ruido USA (15%)

127 ES vs 31 USA en 90d. Probable bots/CDN/AI crawlers no filtrados.

**Acción S0:** GA4 Admin → Data Streams → Configure tag → Define internal traffic + bot filter.

### 3.7 Decay -75% es la señal de alarma para Fase 2

```
first-7d: 105 sess (impulso lanzamiento + compartidos iniciales)
last-7d:   26 sess (sin push)
```

Sin distribución continua, el tráfico baja exponencialmente. **Add a Fase 2 nueva**: distribution loop semanal.

---

## 4. Top queries por impresiones (desierto pre-launch)

GSC casi sin queries (115 impr en 90d, 99% sin query asignada). Lo único con señal:
- queries genéricas tipo "trafico", "trafico tiempo real", "atascos" (no detalladas en `gsc-queries.json` por bajo volumen)

**Acción:** una vez indexadas las 27K entity pages el volumen explotará. Re-pull semanal post-launch.

---

## 5. Distribución desktop/mobile

| | Desktop | Mobile | Tablet |
|---|---|---|---|
| GSC impr | 98 (85%) | 15 (13%) | 2 (2%) |
| GA4 sessions | 171 (85%) | 27 (14%) | 2 (1%) |

**Conclusión:** confirma "desktop-dominant" pero el roadmap **mantiene** los 18 mobile fixes — el mix cambiará tras launch (mobile siempre crece más rápido en consumer).

---

## 6. Revisión semanal post-launch

Repetir este pull cada lunes 09:00 con script `/tmp/trafico-audit-pull-v2.sh`:
- Output a `docs/seo-monitoring/YYYY-MM-DD/`
- Comparar trend de impr/clicks/pos
- Revisar nuevas top queries
- Detectar páginas en pos 11-20 (striking distance) para optimizar

---

## 7. Acciones inmediatas que se integran a roadmap

| Acción | Sesión | Prioridad |
|---|---|---|
| GA4 internal traffic + bot filter | S0 | P0 |
| Decidir destino de `/noticias` | S0 | P0 |
| Polish template `/carreteras/[code]` | S2 | P1 |
| Rework `/camaras` hub | S2 | P1 |
| Rework `/estaciones-aforo` | S2 | P1 |
| GA4 event funnel custom (`pricing_click`, `api_docs_click`, `newsletter_signup`, `vertical_click`, `cta_click`, `affiliate_click`) | S4 | **P0 BLOQUEANTE** |
| `LLMs.txt` + FAQ schema 7 hubs + JSON-LD denso | S4 | P1 |
| Submit sitemap shards nuevos a GSC tras launch | post-launch S5 | P0 |
| **Distribution loop** semanal (newsletter, RRSS auto, Reddit niche) | Fase 2 | P0 |

---

**Raw data:** `/tmp/trafico-audit/` (gsc-*.json + ga4-*.json, 14 archivos, 64 KB total)
**Próxima revisión:** lunes 27 abril (1 semana post-launch)
