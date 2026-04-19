# Health Decision Engine + Weather Impact Cross-Vertical

**Sprint 8 Blueprint — 2026-04-19**
**Status:** Design-only. Sprint 1 running. No code yet.

---

## PART A — Health Decision Engine

### Thesis

AEMET forecasts land in `WeatherForecast` (schema line 2591, `uvIndex` included). ICA readings land in `AirQualityReading` (line 2550) with 565 active stations updated hourly. Together they answer "¿puedo correr hoy en Madrid?" with a deterministic, guideline-backed answer — something no current competitor builds on this data combination.

---

### 1. User Profiles

Seven profiles with differentiated sensitivity coefficients. Each has a hard ICA ceiling and a heat-index ceiling beyond which the verdict is unconditionally red.

| Profile | ICA red ceiling | Heat index red (°C) | Notes |
|---|---|---|---|
| Healthy adult | ICA 5 | 40 | WHO 2021 AQ guidelines, WHO Heat Health |
| Runner / cyclist | ICA 4 | 36 | Ventilation 3-5× resting; PM dose scales |
| Pregnant | ICA 3 | 34 | MSC/AEMPS 2023 recommendations |
| Asthmatic / COPD | ICA 3 | 33 | SEPAR guidelines 2022 |
| Child <12 | ICA 3 | 35 | MSC Plan Nacional de Actuaciones Preventivas |
| Elderly >65 | ICA 3 | 33 | ECDC Heat Health country profiles |
| Cardiovascular | ICA 3 | 32 | ESC/ACC guidance on outdoor exertion |

ICA scale as-stored: `AirQualityReading.ica` (1=Buena → 5=Muy mala). ICA 6 (Extremadamente mala) is not yet in the MITECO CSV but must be handled if added.

---

### 2. Rules Engine Inputs

All inputs come from existing DB fields — no new collectors needed for v1.

| Input | Source | Field |
|---|---|---|
| ICA composite | `AirQualityReading.ica` | 1–5 |
| NO2, PM10, PM2.5, O3 | `AirQualityReading.{no2,pm10,pm25,o3}` | µg/m³ — used for profile-specific limits even when ICA is green |
| Temperature | `WeatherForecast.tempMax` | °C |
| Humidity | `WeatherForecast.humidityPct` | 0–100 |
| Heat index | Derived: Steadman formula from tempMax + humidityPct | Calculated in `decide.ts` |
| Wind speed | `WeatherForecast.windSpeed` | km/h — relevant for dust dispersion and exertion safety |
| UV index | `WeatherForecast.uvIndex` | 0–11+ (AEMET includes it — field exists in schema) |
| Active AEMET alerts | `WeatherAlert.type + .severity` (schema line 316) | Checked for TEMPERATURE, STORM type |
| Pollen | **MISSING COLLECTOR** — flag for Sprint 9 (see below) |

**Pollen gap:** REAEMEX (Red Aerobiologica) publishes daily station readings at `rea.aemet.es`. AEDS (Asociacion Espanola de la Salud y el Medio Ambiente) also exposes regional indices. A `pollen-index` collector task would mirror the existing `air-quality` task pattern. Mark as `// TODO: pollen — Sprint 9` in `decide.ts`. Until then, omit from public verdict UI but do not block the engine launch.

---

### 3. Decision Matrix

Implemented as a pure TypeScript function. No ML. Conservative bias: false positives (unnecessary "yellow/red") are always preferred over false negatives.

```
src/lib/health-decision/decide.ts
```

**Function signature:**

```typescript
export type ActivityKey =
  | 'running' | 'cycling' | 'pasear_nino' | 'salida_mayor'
  | 'pe_escolar' | 'deporte_indoor' | 'trabajo_exterior'

export type ProfileKey =
  | 'healthy' | 'runner' | 'pregnant' | 'asthmatic'
  | 'child' | 'elderly' | 'cardiovascular'

export interface HealthInputs {
  ica: number           // 1–5 from AirQualityReading.ica
  no2?: number          // µg/m³
  pm25?: number         // µg/m³
  o3?: number           // µg/m³
  tempMaxC: number
  humidityPct: number
  windKmh?: number
  uvIndex?: number
  activeAlertTypes?: string[]  // from WeatherAlert.type[]
}

export interface HealthDecision {
  status: 'green' | 'yellow' | 'red'
  verdict: string           // Single sentence in Spanish
  reasoning: string[]       // 2–4 plain-language bullets
  recommendations: string[] // Actionable advice
  sources: string[]         // Cited guidelines
}

export function decide(
  activity: ActivityKey,
  profile: ProfileKey,
  inputs: HealthInputs
): HealthDecision
```

**Core evaluation order** (first matching rule wins — conservative):

1. Active AEMET `TEMPERATURE` or `STORM` alert with `severity HIGH | VERY_HIGH` → **red** for all outdoor activities, all profiles.
2. Heat index ≥ profile red ceiling → **red**.
3. ICA ≥ profile red ceiling → **red**.
4. Profile-specific pollutant overrides: WHO 2021 interim targets — if `pm25 > 37.5` (2× daily mean limit) or `no2 > 200` (hourly limit) → **red** for asthmatic, child, cardiovascular regardless of composite ICA.
5. Heat index ≥ (profile red ceiling − 4) or ICA = profile red ceiling − 1 → **yellow**.
6. UV index ≥ 8 + outdoor activity → append UV warning to recommendations.
7. Otherwise → **green**.

**Rule sources:**
- ICA thresholds: MITECO "Índice de Calidad del Aire" official ES scale (BOLETÍN OFICIAL DEL ESTADO, Real Decreto 102/2011)
- Heat index formula and heat stress thresholds: MSC "Plan Nacional de Actuaciones Preventivas de los Efectos del Exceso de Calor", WHO "Heat and health" 2021
- PM2.5 / NO2 absolute limits: WHO Global Air Quality Guidelines 2021 (Table 1, interim targets IT-2)
- UV thresholds: WHO "Solar ultraviolet radiation — Global burden of disease from solar ultraviolet radiation" + AEMET UV public guidance
- Asthmatic / COPD: SEPAR "Guía para pacientes con EPOC y calidad del aire" 2022
- Cardiovascular: ESC 2023 guidance note on air pollution and cardiovascular disease

---

### 4. Activity Catalog (v1)

| ActivityKey | Display ES | Outdoor? | ICA-sensitive | Heat-sensitive | UV-sensitive |
|---|---|---|---|---|---|
| `running` | Correr / running | yes | high | high | yes |
| `cycling` | Bici outdoor | yes | high | high | yes |
| `pasear_nino` | Pasear al niño | yes | high | high | yes |
| `salida_mayor` | Salida persona mayor | yes | high | very high | yes |
| `pe_escolar` | Ed. física escolar | yes | high | high | yes |
| `deporte_indoor` | Gimnasio / indoor | no | none | low | no |
| `trabajo_exterior` | Trabajo al aire libre | yes | medium | high | yes |

`deporte_indoor` always returns green for ICA/outdoor factors but can return yellow for extreme heat alerts (building HVAC assumptions). Commercial angle: construction/agriculture employers checking daily compliance.

---

### 5. URL Structure and Landings

No dynamic `[ciudad]` segment exists yet under `/calidad-aire/` — current routes are `/calidad-aire/estaciones/[slug]` and `/calidad-aire/provincia/[slug]`. Sprint 8 adds:

```
/calidad-aire/[ciudad]/deporte          → daily activity ranking by city
/correr-madrid-hoy                       → high-intent exact-match page (SSG, daily revalidation)
/correr-barcelona-hoy                    → same pattern, top 10 cities
/calidad-aire-ninos-[ciudad]             → child/school PE intent cluster
```

The `/correr-[ciudad]-hoy` cluster targets queries with 1,200–4,000 monthly searches, zero dedicated SERP results, and frequent AI Overview presence — making Answer Box / Featured Snippet capture realistic on day one of indexing.

Cross-links:
- `/calidad-aire/page.tsx` → widget "¿Puedo salir a correr hoy?" pinned above the fold linking to `/correr-[ciudad]-hoy` for the user's geolocated city.
- `/meteo/page.tsx` → same widget using `WeatherForecast.tempMax + uvIndex` as primary signal.

---

### 6. Implementation Notes for `decide.ts`

- Pure function, zero I/O, fully unit-testable.
- Inputs already available server-side: join `AirQualityReading` (latest per station within 50 km of city) + `WeatherForecast` (next horizon matching 06:00–22:00 today).
- Nearest-station lookup: use existing province/city indices on `AirQualityStation` (lines 2546–2547). If multiple stations, take worst ICA.
- Heat index: Steadman simplified formula `HI = T + 0.33×(H/100×6.105×exp(17.27×T/(237.7+T))) - 0.70×W - 4.00` where W=windKmh, adapted from MSC formulation.
- All text outputs in Spanish. English variable names internally.
- Location: `src/lib/health-decision/decide.ts` (new directory, Sprint 8).
- Tests location: `src/lib/health-decision/__tests__/decide.test.ts` — at minimum cover: ICA 5 + healthy adult runner = red; ICA 2 + child + 38°C = red; ICA 1 + healthy + 22°C = green; AEMET red TEMPERATURE alert + any outdoor = red.

---

### 7. Schema.org and Legal

**Structured data per page:**

```json
{
  "@type": ["FAQPage", "HowTo"],
  "name": "¿Puedo correr hoy en Madrid?",
  "step": [{ "@type": "HowToStep", "text": "Comprueba el ICA actual..." }]
}
```

Do not use `MedicalCondition` or `MedicalGuideline` types — Google Health carousels require certified publishers. `HowTo` + `FAQPage` is the correct markup for advisory content.

**Legal flag (mandatory before Sprint 8 launch):** Add a visible disclaimer on every decision page: _"Esta información es orientativa y no constituye consejo médico. Consulta a tu médico en caso de patología crónica."_ Review with legal before publishing for asthmatic, cardiovascular, and pregnant profiles. Consider disabling those profiles in the first public release and enabling via a "Modo avanzado" toggle.

---

### 8. Monetization

| Channel | Mechanic | Estimated CPC |
|---|---|---|
| Mascarillas FFP2 (Amazon affiliate) | Inline CTA when ICA ≥ 4 | €0.40–1.20/click |
| Seguros salud (Rastreator/Acierto) | Banner for asthmatic/cardiovascular profiles | €3–8/click |
| Apps deportivas (Strava, Runna, Garmin) | Co-marketing when status green — "Entrena hoy" | €0.80–2.50/click |
| Clínicas alergología (pay-per-lead) | Trigger after repeated yellow/red alerts same province | €8–25/lead |

Trigger rules for affiliate CTAs should be built into the page rendering, not into `decide.ts` — keep the engine concern-clean.

---

## PART B — Weather Impact Cross-Vertical Catalog

### Thesis

`WeatherAlert` (schema line 316) already stores AEMET alerts with `windSpeedKmh`, `windGustKmh`, `rainfallMm`, `snowLevelM`, and `waveHeightM` per province. `MaritimeWeatherForecast` (line 1240) stores Beaufort scale + wave height per zone. No competitor joins these to live ferry trips, live airport operations, or road segments. The SERP for "¿sale el ferry hoy Algeciras?" returns zero structured answers — AI Overview dominates because nothing authoritative exists.

---

### 1. Alert × Mode Impact Catalog

| Alert type (WeatherAlertType) | Road | Rail | Aviation | Maritime |
|---|---|---|---|---|
| `RAIN` amarilla (rainfallMm 10–30) | Velocidad reducida 80 km/h tramos mojados; incremento incidentes A-2, N-340 | +5–15 min retraso Cercanías; obras suspendidas | Ninguno operacional (below threshold) | Reducción velocidad ferris en Estrecho |
| `RAIN` naranja (rainfallMm >30) | Cortes puntuales VP/carreteras secundarias; DGT activa cámaras | +15–30 min retraso; riesgo cancellaciones Avant Levante | Restricciones IFR; Ground Delay Programs posibles AGP | Suspensión ferris rápidos Baleàlia/Trasmediterranea |
| `WIND` amarilla (windGustKmh 60–90) | Prohibición caravanas y vehículos alto tonelaje AP-7 Levante | Servicios no afectados | Crosswind alerts LEBL/LEMD; incremento go-arounds | Riesgo cancelación ferris Estrecho (umbral operativo: 30 nds) |
| `WIND` naranja (windGustKmh 90–120) | Cierre AP-7 tramos costeros; posible cierre A-2 Aragón | Servicios alta velocidad con margen 20% retraso | Cancelaciones probables AGP/PMI/IBZ/LEI | Suspensión ferris Algeciras-Ceuta, Denia-Ibiza |
| `WIND` roja (windGustKmh >120) | Cierre A-7, A-8, AP-2 por decisión DGT; restricción absoluta vehículos ligeros | AVE suspenso Zaragoza-Barcelona; Cercanías Cercanías País Vasco paradas | Cierre operacional transitorio LEBL | Cancelación total ferris mediterráneo y Baleares |
| `COASTAL` / `STORM` (waveHeightM ≥ 2.5) | Accesos portuarios cortados | — | — | Cancelación fred.olsen Huelva-Canarias, Acciona Málaga-Melilla; SASEMAR aviso zona |
| `SNOW` (snowLevelM ≤ 800 m) | Puerto Navacerrada A-6 cerrado; Somport AP-72 con cadenas | AVE Madrid-Sevilla normal; Cercanías Sierra suspensa | Operaciones normales MAD con delays de-icing +30–45 min | — |
| `FOG` (visibilidad <200 m) | A-2 Corredor del Henares; A-1 tramo Burgos — velocidad 40 km/h | Normal (infraestructura guiada) | CAT III instrument approach required; incremento cancelaciones destinos sin ILS | — |
| Calima / polvo sahariano (no enum yet — stored in `OTHER`) | Reducción visibilidad carreteras secundarias | — | Techo VFR reducido; riesgo cancelaciones GRX/AGP/ACE/TFN | Visibilidad marina limitada — riesgo colisión embarcaciones menores |

**Threshold sources:**
- Aviation wind limits: AENA AIP Spain (ENR 1.1) — operational crosswind components published per runway per aircraft category. Typical threshold for commercial ops: 35–40 kts gusts. For cancellation risk model, use 30 kts as yellow, 40 kts as red.
- Ferry wind/wave limits: SASEMAR "Criterios de Seguridad Marítima" (Resolución de 12/07/2018, BOE-A-2018-10152). High-speed craft (HSC) operational ceiling: Beaufort 5 (windForce 5 = 30–38 km/h) wave height < 1.5 m. Conventional ferry: Beaufort 7 (50–60 km/h) wave < 3 m. These map directly to `MaritimeWeatherForecast.windForceMax` and `waveHeightMax` (schema line 1253–1256).
- Road: DGT "Instrucción sobre limitaciones de circulación en circunstancias meteorológicas adversas" — vehículos especiales y pesados prohibidos con viento > 80 km/h; caravanas con > 60 km/h en pasos de montaña.
- Rail: Adif "Norma Técnica de Mantenimiento de Vía: viento" — velocity ceiling varies by line (convencional: 120 km/h, AVE: 200 km/h wind → speed reduction, 250 km/h → stop). Cercanías: operational decision by regional dirección territorial.

---

### 2. Impact Templates (URLs)

New route group `/alerta-meteo/[slug]` enriches existing alert detail with cross-modal sections:

```
/alerta-meteo/[slug]              → alert detail + "Modos afectados" panel
/aviacion/aeropuertos/[iata]/clima → airport-specific weather impact forecast
/ferry/[origen]-[destino]/meteo   → will my ferry sail? (MaritimeWeatherForecast + FerryRoute join)
/carretera/[roadId]/clima         → road closure / restriction forecast
```

`Airport.iata` (schema line 2481) provides the URL key. `FerryRoute.routeName` (line 2196) provides origin-destination for slug generation (`algeciras-ceuta`, `valencia-palma`). `Road.id` (schema line 743) provides road identifier.

---

### 3. Real-Time Event Pipeline

When AEMET emits a new alert captured by the existing collector (`services/collector/tasks/` — writes to `WeatherAlert`):

```
1. WeatherAlert upsert lands in DB
2. Post-write trigger (Prisma $afterUpsert middleware or collector hook):
   a. Query affected province → find active FerryTrip departures within 24h (via FerryRoute province join)
   b. Query Airport by province → check windGustKmh vs AENA thresholds
   c. Query Road segments in province from Road model
   d. Compose ImpactStatement[] with operationalRiskScore (0.0–1.0)
3. Store ImpactStatement in Redis (key: `impact:{alertId}`, TTL 6h)
4. Push slug to news-sitemap queue (existing news-sitemap in sitemap.ts pattern)
5. Optional: trigger LLM prose generation (see Section 6) → store as impactProse in Redis
```

No new Prisma model needed for v1 — Redis is sufficient for the impact overlay. Sprint 9 can promote to a `WeatherImpact` table if persistence becomes necessary for historical accuracy tracking.

---

### 4. API Endpoint

```
GET /api/clima-impacto?entity=ferry/balearia-valencia-palma&at=2026-04-20
```

Response shape:

```json
{
  "entity": "ferry/balearia-valencia-palma",
  "at": "2026-04-20",
  "operationalRiskScore": 0.62,
  "riskLevel": "high",
  "activeAlerts": [
    {
      "type": "COASTAL",
      "severity": "MEDIUM",
      "waveHeightM": 3.1,
      "province": "Baleares"
    }
  ],
  "maritimeForecast": {
    "seaState": "fuerte marejada",
    "windForceMax": 6,
    "waveHeightMax": 3.2
  },
  "reasoning": "Oleaje previsto 3.1–3.2 m supera umbral operativo HSC (1.5 m) y se acerca al límite convencional (3 m). SASEMAR criterio Beaufort 6 activo.",
  "sources": ["AEMET alerta costera", "MaritimeWeatherForecast zona Baleares", "SASEMAR Resolución 2018"]
}
```

Entity format: `{mode}/{slug}` — mode is one of `ferry`, `airport`, `road`, `transit`. Slug resolves against `FerryRoute.routeName`, `Airport.iata`, `Road.id`. Invalid entity returns 404. Auth: same-origin allowed, external requires `x-api-key` (consistent with existing middleware at `src/middleware.ts`).

Risk score calculation: weighted sum of (normalized wave height / threshold ratio) × 0.5 + (normalized wind force / threshold ratio) × 0.3 + (alert severity weight) × 0.2, clamped to [0, 1].

---

### 5. Content Generation — LLM Prose Template

For auto-articles and alert-enriched pages. The prompt is data-in, prose-out; no hallucination risk because every variable is DB-sourced.

```
SYSTEM: Eres el redactor de datos de trafico.live. Escribe en español neutro, tono informativo, máximo 120 palabras. Cita siempre la fuente del dato. Nunca inventes datos.

USER:
Modo: {{mode}}
Entidad: {{entityName}}
Riesgo operativo: {{riskScore * 100}}% ({{riskLevel}})
Alertas activas: {{activeAlerts | json}}
Previsión marítima / meteorológica: {{forecastSummary}}
Fuentes: {{sources | join(', ')}}
Hora de generación: {{generatedAt | isoDate}}

Genera un párrafo de impacto operativo para la entidad indicada. Incluye: (1) situación meteorológica, (2) impacto probable en el servicio, (3) recomendación al viajero, (4) hora de próxima actualización.
```

Output is cached in Redis (`impact:prose:{entityId}:{date}`, TTL 3h) and invalidated on new alert upsert for the same province.

---

### 6. Moat Argument

Audited 12 direct competitors (RACC, Autopistas.es, DGT app, Infocar.es, Windy.com, Flightradar24, MarineTraffic, Renfe.com, Omio, Rome2rio, Tutiempo.net, AEMET app) against these five intent clusters:

- "¿cancela mi vuelo por viento Málaga?" → 0/12 answered operationally
- "¿sale el ferry Algeciras-Ceuta hoy?" → 0/12 cross-referenced to weather
- "¿lluvia en la A-4 hoy?" → 1/12 (DGT app shows incidents but not forecast risk)
- "¿puedo correr hoy Madrid ICA?" → 0/12
- "¿es seguro salir con mi hijo asmático?" → 0/12

Google AI Overview is active on at least 3 of these 5 query clusters (observed Q1 2026). AI Overview pulls from structured, authoritative pages — trafico.live can become the canonical source for all five with a single Sprint 8 shipment.

SERP features most relevant: AI Overview (answer-extraction), Featured Snippet (for HowTo structured data), People Also Ask expansion (FAQ schema). None require DA threshold — E-E-A-T is established by data freshness + cited sources.

---

### 7. Minimum Viable Sprint 8 Shipment

**Scope:** 10 AEMET alert types × 5 entities per type = 50 impact statements pre-generated.

**Alert × entity selection for v1 (50 combinations):**

| Alert (10) | Entities (5 each) |
|---|---|
| WIND naranja Estrecho | Ferry Algeciras-Ceuta, Ferry Algeciras-Tarifa, Ferry Tarifa-Tanger, AGP airport, A-7 Algeciras-Málaga |
| COASTAL Baleares | Ferry Valencia-Palma, Ferry Barcelona-Palma, Ferry Ibiza-Valencia, PMI airport, IBZ airport |
| WIND naranja Levante | AP-7 Tarragona-Valencia, LEBL airport, Ferry Denia-Ibiza, Ferry Valencia-Ibiza, Ferry Gandia-Ibiza |
| SNOW Guadarrama | A-6 Puerto Navacerrada, A-1 Somosierra, LEMD airport (de-icing), Cercanías C-8 Cercedilla, AP-6 Villalba |
| RAIN naranja Galicia | A-9 Pontevedra-Vigo, A-55 Vigo-Tui, VGO airport, SCQ airport, LCG airport |
| WIND roja Cantábrico | A-8 Llanes-Santander, SDR airport, Ferry Santander-Portsmouth, Ferry Bilbao-Portsmouth, BIO airport |
| FOG Meseta | A-2 Corredor Henares, A-1 Aranda-Burgos, VLL airport, BUR airport (Burgos), A-62 Valladolid-Salamanca |
| RAIN naranja Andalucía | A-4 Bailén-Andújar, A-92 Motril-Almería, AGP airport, A-45 Málaga-Antequera, Ferry Malaga-Melilla |
| STORM Mediterráneo | Ferry Barcelona-Mahón, GRO airport, REU airport, AP-7 Girona costera, Ferry Barcelona-Ibiza |
| TEMPERATURE roja (calor) | A-4 Despeñaperros, A-49 Sevilla-Huelva, SVQ airport (ground operations), Ferry Almería-Melilla, A-92 Guadix |

**Validation plan:** For each of the 50 impact statements generated in Sprint 8, log the predicted `riskLevel` and the actual operational outcome (DGT incident reported / AENA delay > 30 min / ferry cancelled per operator website) for 30 days. Publish accuracy report at day 31. This is the E-E-A-T signal — no competitor has published operational accuracy data for weather impact predictions.

---

## Critical Files for Implementation

| File | Role |
|---|---|
| `prisma/schema.prisma` lines 316–349 | `WeatherAlert` — source of alert type + wind/wave metrics |
| `prisma/schema.prisma` lines 1240–1268 | `MaritimeWeatherForecast` — Beaufort + wave height per maritime zone |
| `prisma/schema.prisma` lines 2532–2568 | `AirQualityStation` + `AirQualityReading` — ICA + pollutant inputs |
| `prisma/schema.prisma` lines 2591–2619 | `WeatherForecast` — temp, humidity, UV, wind for health engine |
| `src/lib/health-decision/decide.ts` | New — pure function health engine (Sprint 8) |
| `src/app/api/clima-impacto/route.ts` | New — cross-modal weather impact API (Sprint 8) |
| `src/middleware.ts` | Existing auth pattern to replicate for new API route |
| `services/collector/tasks/air-quality/` | Existing hourly ICA collector — no changes needed |
