# Predictive Forecasting — Design Document

**Target:** Sprint 9-10 · **Status:** Design / Pre-implementation  
**Author:** trafico.live platform team · **Date:** 2026-04-19

---

## 1. Scope — Four Prediction Models

### 1.1 Atasco-Predictor (Madrid)

**Question:** "¿Habrá atasco en el sensor X a las Y horas?"  
**Input:** `sensorId` + target `datetime` + current weather condition + `dayOfWeek`  
**Output:** probability of congestion (0–1) + severity bucket (`free_flow` / `moderate` / `congested`)

This is the highest-confidence model because we have 3+ years of 5-minute readings from 6,117 Madrid sensors (`TrafficIntensity.sensorId`, `.intensity`, `.serviceLevel`, `.recordedAt`). The `HourlyTrafficProfile` table already pre-aggregates the baseline — it stores `avgIntensity`, `avgOccupancy`, `avgServiceLevel`, and `sampleCount` per `(sensorId, dayOfWeek, hour)`. The model is essentially a correction layer on top of that baseline.

### 1.2 Fuel-Tomorrow (ES + PT)

**Question:** "¿Subirá la gasolina mañana en mi provincia?"  
**Input:** `province` (INE 2-digit) + `fuelType` + `currentPrice` + 7-day trend  
**Output:** direction (`up` / `stable` / `down`) + estimated delta in € + confidence score

We have 10 years × 52 provinces × 4 fuel types from `CNMCFuelPrice` (`.priceGasoleoA`, `.priceGasolina95`, `.paiGasoleoA`, `.date`, `.province`). The PAI (pre-tax) column is a unique data moat — it isolates the market signal from tax noise.

### 1.3 Train-Delay-Predictor

**Question:** "Mi AVE Madrid-Valencia — ¿llegará a tiempo?"  
**Input:** `trainNumber` + `date` (+ optionally `routeId`)  
**Output:** expected delay in minutes + probability of cancellation, computed from same-route, same-DoW, same-weather historical patterns

Data grounding: `RailwayDelaySnapshot` (`.brandStats` JSON, `.punctualityRate`, `.avgDelay`, `.recordedAt`) + `RenfeFleetPosition` (`.trainNumber`, `.brand`, `.delay`, `.originStation`, `.destStation`, `.fetchedAt`) + `RailwayDailyStats` (`.date`, `.avgDelay`, `.totalCancellations`, `.brandStats`).

### 1.4 Accident-Hotspot-Forecast

**Question:** "¿Qué tramos son peligrosos hoy?"  
**Input:** `roadNumber` + `date` + weather condition  
**Output:** ranked list of black-spot segments with historical accident density and current risk multiplier

Data grounding: `AccidentMicrodata` (`.roadNumber`, `.km`, `.weatherCondition`, `.lightCondition`, `.severity`, `.dayOfWeek`, `.hour`, `.latitude`, `.longitude`) — ~500K geocoded accidents from 2019–2023.

---

## 2. ML Approach per Model

### 2.1 Atasco-Predictor — Weighted historical baseline + residual regression

**Do not use a transformer here.** The `HourlyTrafficProfile` table already captures 90% of the variance. The remaining 10% is weather correction (rain = +15–25% congestion probability, fog = +10%) and calendar effects (holidays, school terms). A simple gradient-boosted regressor (XGBoost, ~50 trees) on top of the historical profile residuals is correct. Retraining weekly on the rolling 90-day window is sufficient. ARIMA is not appropriate — the data is periodic, not autocorrelated in a linear sense, and we already have explicit feature columns for time-of-day and day-of-week.

**Recommended:** XGBoost regressor on residuals over `HourlyTrafficProfile.avgServiceLevel`.

### 2.2 Fuel-Tomorrow — 7-day rolling average + PAI trend signal

**A transformer is overkill.** Fuel prices at provincial granularity move slowly (~2–5 day momentum cycles) and are highly correlated across provinces. A 7-day weighted moving average on `CNMCFuelPrice.priceGasolina95` (or `.priceGasoleoA`) + a directional signal derived from the PAI pre-tax price (which leads the pump price by 1–2 days) gives you 80%+ directional accuracy with zero training complexity. Add a simple linear regression for the delta estimate. Confidence is derived from variance in the 7-day window: tight prices → high confidence, volatile week → low confidence.

**Recommended:** WMA-7 + PAI signal. No neural network.

### 2.3 Train-Delay-Predictor — Lookup table + brand/DoW/season regression

The best signal is the `RailwayDailyStats.brandStats` JSON broken down by DoW + month. This is basically a lookup: "AVE on Fridays in July historically runs 4.2 min late." Layer on a weather penalty (rain/wind from `ClimateRecord` nearest station to origin) and you have a functional model. A light gradient boosted classifier handles the cancellation probability — `totalCancellations / avgTrains` by brand × DoW × month. Skip ARIMA: delays are not strongly autocorrelated day-to-day; they reset each morning.

**Recommended:** Lookup table (brand × DoW × month) + XGBoost classifier for cancellation probability.

### 2.4 Accident-Hotspot-Forecast — Density kernel + condition multipliers

This is a ranking problem, not a regression problem. For each road segment, compute a historical accident density score from `AccidentMicrodata`: accidents per km per year, stratified by weather condition bucket and daylight/night. Then multiply by today's condition flags (rain → ×1.4 wet-road risk, night → ×1.6 visibility risk, etc.). No training required — this is a deterministic scoring function over the historical dataset. The "ML" label is a misnomer here; what we really have is a data product. That is a strength: zero staleness risk, fully explainable.

**Recommended:** Pre-computed density table + deterministic condition multipliers. Re-score nightly.

---

## 3. Feature Engineering

All features are derivable from the current schema — no new collectors required.

### 3.1 Atasco-Predictor Features

| Feature | Source |
|---|---|
| `avg_service_level_h_dow` | `HourlyTrafficProfile.avgServiceLevel` WHERE `sensorId` + `hour` + `dayOfWeek` |
| `avg_intensity_h_dow` | `HourlyTrafficProfile.avgIntensity` |
| `sample_count` | `HourlyTrafficProfile.sampleCount` (confidence weight) |
| `is_holiday` | Computed from `date` (Spanish public holiday calendar, hardcoded) |
| `weather_bucket` | `ClimateRecord.precipitation > 1mm` → rain; `.windGust > 70` → wind |
| `month` | Extracted from target datetime |
| `current_intensity_delta` | Live `TrafficIntensity.intensity` vs `HourlyTrafficProfile.avgIntensity` at T-0 |

### 3.2 Fuel-Tomorrow Features

| Feature | Source |
|---|---|
| `price_t0` | `CNMCFuelPrice.priceGasolina95` (or selected fuel type) for today |
| `wma_7` | Rolling 7-day average from `CNMCFuelPrice` WHERE `province` |
| `pai_delta_3d` | `CNMCFuelPrice.paiGasolina95` change over 3 days (leading indicator) |
| `price_variance_7d` | StdDev of price over 7 days → confidence proxy |
| `province_group` | Coastal / inland / island clustering (proxy for refinery access) |
| `month_of_year` | Seasonality (summer = upward demand pressure) |

### 3.3 Train-Delay-Predictor Features

| Feature | Source |
|---|---|
| `brand_dow_month_avg_delay` | `RailwayDailyStats.brandStats` JSON aggregated by brand × DoW × month |
| `brand_cancel_rate_dow_month` | `RailwayDailyStats.totalCancellations / avgTrains` |
| `weather_penalty` | `ClimateRecord` nearest station to `RenfeFleetPosition.originStation` |
| `recent_punctuality_7d` | `RailwayDailyStats.punctualityRate` rolling 7-day for brand |
| `active_alerts_for_route` | `RailwayAlert.isActive` WHERE `routeIds` contains train's route |

### 3.4 Accident-Hotspot Features

| Feature | Source |
|---|---|
| `accidents_per_km_by_road_km` | `AccidentMicrodata` grouped by `roadNumber` + `km` bucket (1km) |
| `weather_condition_weight` | `AccidentMicrodata.weatherCondition` distribution per segment |
| `light_condition_weight` | `AccidentMicrodata.lightCondition` distribution |
| `severity_index` | Weighted sum: `fatalities×10 + hospitalized×3 + minorInjury×1` per segment |
| `today_weather_bucket` | `ClimateRecord` + `WeatherForecast` for province |
| `is_night` | Derived from target `hour` (sunset/sunrise from lat/lon) |

---

## 4. Training Pipeline

### Location

```
services/collector/tasks/predictions/
  ├── train-atasco.ts         # Weekly retraining
  ├── train-fuel.ts           # Daily WMA recompute (no ML, fast)
  ├── train-delays.ts         # Weekly DoW×brand×month lookup rebuild
  ├── score-hotspots.ts       # Nightly density table rebuild
  ├── shared/
  │   ├── feature-builder.ts  # Shared feature extraction from Prisma
  │   └── model-registry.ts   # Load/save ForecastModelVersion
```

Run via existing collector `TASK` dispatch. Add to `docker-compose.collectors.yml` under the `daily` container (hotspots, fuel) and `weekly` container (atasco, delays). No dedicated ML infra needed for Sprint 9 — all four models run in-process on the existing Node.js collector.

**Retraining schedule:**
- Atasco: Weekly Sunday 03:00 (90-day rolling window)
- Fuel: Daily 06:00 (recompute WMA after CNMC data lands at ~05:00)
- Delays: Weekly Monday 04:00 (rebuild lookup from `RailwayDailyStats`)
- Hotspots: Nightly 02:00 (deterministic re-score, fast)

### New Prisma Models

```prisma
model ForecastPrediction {
  id            String   @id @default(cuid())
  modelName     String   // "atasco" | "fuel" | "delay" | "hotspot"
  modelVersion  String   // FK to ForecastModelVersion.version
  entityKey     String   // sensorId, "28-gasolinea95", trainNumber, "A-1:km42"
  horizon       String   // "1h" | "6h" | "24h" | "1d" | "7d"

  // Core output
  value         Decimal  @db.Decimal(8, 4)     // Main predicted value
  confidence    Decimal  @db.Decimal(4, 3)     // 0.000–1.000
  directionHint String?  // "up" | "stable" | "down" (fuel, optional)
  severityHint  String?  // "free_flow" | "moderate" | "congested" (atasco)
  label         String?  // Human-readable summary in Spanish

  // Explainability
  basedOnDays   Int?     // Number of historical days used
  similarDays   Int?     // Number of matching condition days
  sourceModels  String[] // ["HourlyTrafficProfile", "ClimateRecord", ...]

  computedAt    DateTime @default(now()) @db.Timestamptz
  validFrom     DateTime @db.Timestamptz
  validUntil    DateTime @db.Timestamptz

  @@index([modelName, entityKey, validFrom])
  @@index([modelName, computedAt])
  @@index([entityKey])
}

model ForecastModelVersion {
  id          String   @id @default(cuid())
  modelName   String
  version     String   // "atasco-v1.3.0" — semver
  trainedAt   DateTime @db.Timestamptz
  trainedOn   DateTime @db.Date    // Last date of training data

  // Quality metrics at training time
  mae         Decimal? @db.Decimal(6, 4)   // Mean Absolute Error
  mape        Decimal? @db.Decimal(6, 4)   // Mean Absolute Percentage Error
  accuracy    Decimal? @db.Decimal(5, 4)   // For classifiers
  sampleSize  Int?

  isActive    Boolean  @default(true)
  notes       String?  @db.Text

  @@unique([modelName, version])
  @@index([modelName, isActive])
  @@index([trainedAt])
}
```

---

## 5. Inference API

All endpoints return the same envelope — schema-org-ready, version-pinned.

### Contract

```typescript
interface ForecastResponse {
  value: number;              // Main predicted value (delay in min, probability 0-1, price delta)
  confidence: number;         // 0.0–1.0
  horizon: string;            // "1h" | "24h" | "1d"
  direction?: "up" | "stable" | "down";   // Fuel only
  severity?: "free_flow" | "moderate" | "congested"; // Traffic only
  label: string;              // "Probable atasco moderado a las 18:00"
  explanation: string;        // "Basado en 847 días similares (lunes lluvioso en octubre)"
  model_version: string;      // "atasco-v1.3.0"
  computed_at: string;        // ISO 8601
  valid_from: string;
  valid_until: string;
  sources: string[];          // ["TrafficIntensity", "HourlyTrafficProfile", "ClimateRecord"]
  fallback: boolean;          // true = served from aggregate, not ML
}
```

### Endpoints

```
GET /api/forecast/traffic?sensor=1234&at=2026-04-20T18:00:00
GET /api/forecast/fuel?province=28&fuel=gasolina95&horizon=1d
GET /api/forecast/train?train=04204&date=2026-04-20
GET /api/forecast/hotspots?road=A-1&date=2026-04-20
```

Responses cached in Redis with TTL matching the model cadence (traffic: 30 min, fuel: 6h, train: 1h, hotspots: 12h). All endpoints are public (no API key required for basic predictions); premium tiers get batch access and extended horizons.

---

## 6. UI Slot Integration — `<PredictionSlot>` Component

The component is designed to drop into any page that has a relevant entity context.

```typescript
interface PredictionSlotProps {
  modelName: "atasco" | "fuel" | "delay" | "hotspot";
  entityKey: string;           // sensorId, "28-gasolina95", trainNumber, road+km
  horizon?: string;            // Default "24h"
  variant?: "compact" | "full";  // compact = 1 line; full = expanded card

  // Pre-fetched data (SSR) — avoids client waterfall
  initialData?: ForecastResponse;
}
```

**Rendering rules:**

- `confidence >= 0.75`: Show prediction with colored badge (green / amber / red per severity)
- `confidence 0.50–0.74`: Show prediction with "estimación aproximada" qualifier
- `confidence < 0.50` OR `fallback: true`: Render only the `explanation` sentence, no numeric prediction. Example: *"Los lunes a las 18:00 suelen registrar tráfico denso en este punto."*

**Usage examples:**

- `/trenes/estacion/madrid-atocha/llegadas` → `<PredictionSlot modelName="delay" entityKey="04204" variant="compact" />`
- `/gasolineras/madrid` → `<PredictionSlot modelName="fuel" entityKey="28-gasolina95" variant="full" />`
- `/intensidad` Madrid sensor card → `<PredictionSlot modelName="atasco" entityKey="1234" variant="compact" />`
- `/carreteras/a-1` → `<PredictionSlot modelName="hotspot" entityKey="A-1" variant="full" />`

---

## 7. Explainability for Google + AI Overviews

Every `ForecastResponse` renders a visible human sentence in the DOM:

```html
<p class="forecast-basis">
  Basado en <strong>847 días similares</strong> con lluvia en lunes de octubre 
  registrados desde 2021 — promedio histórico: 18 min de retraso.
</p>
```

This sentence is populated from `ForecastPrediction.basedOnDays`, `similarDays`, and `label`. It is rendered server-side (not client JS) so Googlebot reads it.

**Schema.org markup per prediction page:**

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Predicción de tráfico trafico.live",
  "description": "Previsiones de intensidad de tráfico basadas en sensores DGT y AEMET",
  "temporalCoverage": "2021/..",
  "spatialCoverage": { "@type": "Place", "name": "España" },
  "creator": { "@type": "Organization", "name": "trafico.live" },
  "license": "https://trafico.live/legal/licencia-datos",
  "variableMeasured": "Nivel de servicio vial (0–3)",
  "measurementTechnique": "Regresión supervisada sobre perfil histórico horario"
}
```

This gives Google enough signal to surface the data in AI Overviews as a citeable Dataset, not just a webpage. The `measurementTechnique` field explicitly names the method — Google's AI-Overview extraction favors sources that explain methodology.

---

## 8. Validation Protocol — `/prediccion/precision`

A public accuracy page, updated weekly:

| Model | Metric | Window |
|---|---|---|
| Atasco | MAE (service level, 0–3 scale) | Last 4 weeks |
| Fuel | Directional accuracy (%) | Last 30 days |
| Delays | MAE (minutes) | Last 4 weeks |
| Hotspots | Top-5 recall (accident occurred in predicted segment) | Last 90 days |

Data sourced from comparing `ForecastPrediction.value` against actuals loaded post-hoc from the same tables. Displayed as a simple table + weekly trend chart (Recharts). The page itself becomes a citeable transparency report — no competitor publishes this.

---

## 9. Failure Modes and Fallbacks

**Low confidence** (`< 0.50`): Do not render a prediction number. Render only the aggregate sentence: *"Según el histórico, este tramo a esta hora suele tener tráfico fluido."*

**Model stale** (last trained > 14 days ago): Flag in `ForecastModelVersion.isActive = false`. API falls back to `HourlyTrafficProfile` directly, sets `fallback: true` in response.

**Missing historical data** (< 30 sample days for a sensor): Skip sensor from atasco predictions entirely. Log to Sentry with severity `info`.

**Fuel data gap** (CNMC didn't update today): Re-serve yesterday's WMA with `confidence` reduced by 0.15 and `valid_until` shortened to 12h.

**Train route without delay history** (new route, < 10 observations): Return `{ fallback: true, label: "Sin datos históricos suficientes para este tren" }`. Do not invent a number.

The rule is simple: **a wrong prediction destroys trust faster than no prediction**. When in doubt, serve the aggregate sentence.

---

## 10. LLM Budget and Infra Cost

**Short answer: we do not need LLMs for inference. We need them only for prose generation.**

The four models are statistical — they produce numbers. The only role for an LLM is converting `{ value: 4.2, confidence: 0.81, basedOnDays: 312 }` into *"El AVE Madrid-Valencia de las 14:00 llegará con unos 4 minutos de retraso según 312 días similares."* This is a fill-in-the-template task, not a reasoning task.

**Cost estimate:**

| Component | Cost |
|---|---|
| Template-based prose (no LLM) | €0 |
| Claude Haiku for edge cases (~5% of predictions where template is ambiguous) | ~€0.0004 per 1K predictions = €0.40 per 1M |
| PostgreSQL query time for feature extraction | Negligible (indexed reads) |
| Redis cache (30-min TTL for traffic, 6h for fuel) | Reduces DB load by ~95% |
| XGBoost inference (in-process Node.js via `ml-xgboost` or Python sidecar) | <10ms per prediction |

**Total infra cost per 1M predictions: < €5.** No GPUs, no dedicated ML cluster. The collector container (`services/collector/`) already runs on `compute` — add the prediction task to the same stack. For training (weekly), budget 2–4 min of CPU time on the existing 64-core Hetzner node.

If we ever need real-time per-user personalization or natural language query parsing (Sprint 15+), that is when a dedicated inference endpoint makes sense.

---

## Minimum Viable Sprint 9 Checklist

The smallest thing that proves the pattern works, without over-engineering:

- [ ] **Atasco only** — ship one model first. Pick 10 high-traffic Madrid sensors.
- [ ] Add `ForecastPrediction` and `ForecastModelVersion` to `prisma/schema.prisma` and run migration.
- [ ] Implement `services/collector/tasks/predictions/train-atasco.ts` — reads `HourlyTrafficProfile`, applies weather bucket from `ClimateRecord`, writes predictions for next 24h to `ForecastPrediction`.
- [ ] Wire to `TASK=predictions-train` in collector dispatcher and add to `daily` cron at 03:00.
- [ ] Implement `GET /api/forecast/traffic` — reads from `ForecastPrediction` (Redis cache in front), returns the standard `ForecastResponse` contract.
- [ ] Add `<PredictionSlot>` component (skeleton only — just renders `explanation` + confidence badge).
- [ ] Drop it into one page: `/intensidad` sensor detail card.
- [ ] Add Schema.org `Dataset` JSON-LD to `/intensidad` page head.
- [ ] Ship `/prediccion/precision` as a static placeholder with the table structure — real data populates week 2.
- [ ] Verify fallback path: manually set a prediction's `confidence` to 0.3 and confirm the UI renders only the aggregate sentence.

**Acceptance criteria for Sprint 9:** One sensor, one model, one page, one public accuracy table. The fuel and delay models are Sprint 10, hotspots can slide to Sprint 11 (lower search volume, less urgency).
