# Voice Assistants — trafico.live

Alexa Skill and Google Assistant Action providing Spanish voice access to traffic, train, and fuel data.

## Architecture

```
User (Spanish utterance)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│         Voice Platform NLU                            │
│  Alexa: Alexa Skills Kit (ASK)                        │
│  Google: Dialogflow CX / Actions SDK                  │
│                                                       │
│  Intent: GetTrainArrivalIntent                        │
│          GetRoadTrafficIntent                         │
│          GetFuelPriceIntent                           │
└──────────────────────┬────────────────────────────────┘
                       │ Fulfillment request (JSON)
                       ▼
┌───────────────────────────────────────────────────────┐
│          Fulfillment Layer                            │
│                                                       │
│  Alexa:  AWS Lambda (eu-west-1)                       │
│          trafico-live-alexa-skill                     │
│          Handler: services/alexa/src/index.ts         │
│                                                       │
│  Google: Cloud Function (europe-west1)                │
│          traficoLiveWebhook                           │
│          Handler: services/google-action/src/index.ts │
│                                                       │
│  Shared: services/voice-shared/src/                   │
│          api-client.ts  (HTTP fetch + timeout)        │
│          tts-strings.ts (Spanish number/TTS format)   │
└──────────────────────┬────────────────────────────────┘
                       │ GET /api/* (x-api-key, 3s timeout)
                       ▼
┌───────────────────────────────────────────────────────┐
│          trafico.live API                             │
│          https://trafico.live/api/                    │
│                                                       │
│  /trenes/posiciones   — live train GPS + delays       │
│  /incidencias         — DGT road incidents            │
│  /gas-stations        — MINETUR fuel prices           │
└───────────────────────────────────────────────────────┘
                       │
                       ▼
               PostgreSQL + PostGIS
               (hetzner-prod via PgBouncer)
```

## Services

| Service | Path | Runtime | Region |
|---------|------|---------|--------|
| Alexa Lambda | `services/alexa/` | Node.js 20 | eu-west-1 |
| Google Cloud Function | `services/google-action/` | Node.js 20 | europe-west1 |
| Shared utilities | `services/voice-shared/` | — (imported) | — |

## Intents (3 per platform)

| Intent | Slots | API Endpoint | Example |
|--------|-------|-------------|---------|
| GetTrainArrivalIntent | Station, TrainNumber | `/api/trenes/posiciones` | "cuándo llega el AVE a Barcelona" |
| GetRoadTrafficIntent | Road, Province | `/api/incidencias` | "cómo está la A-2" |
| GetFuelPriceIntent | FuelType, Province, City | `/api/gas-stations` | "precio de la gasolina en Madrid" |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRAFICO_API_KEY` | Yes | — | trafico.live API key |
| `TRAFICO_API_BASE` | No | `https://trafico.live/api` | API base URL override |

Set these in:
- Lambda: AWS Console → Function → Configuration → Environment variables
- Cloud Function: `--set-env-vars` flag or Google Cloud Console

## Rate Limits

Voice assistants generate low traffic pre-launch (<1K invocations/day). trafico.live API rate limiting (Redis-backed) applies per API key. No special configuration needed.

The 3-second HTTP timeout (configurable via `ApiClientOptions.timeoutMs`) ensures Lambda/Cloud Function responses stay within the 8-10s platform timeout budget.

## Deploy — Alexa

```bash
cd services/alexa
npm install
npm run build

# Package and deploy to Lambda
npm run package
aws lambda update-function-code \
  --function-name trafico-live-alexa-skill \
  --zip-file fileb://skill.zip \
  --region eu-west-1

# Create Lambda (first time)
aws lambda create-function \
  --function-name trafico-live-alexa-skill \
  --runtime nodejs20.x \
  --handler index.handler \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-basic-execution \
  --zip-file fileb://skill.zip \
  --timeout 10 \
  --memory-size 256 \
  --region eu-west-1 \
  --environment Variables="{TRAFICO_API_KEY=your_key_here}"
```

## Deploy — Google Action

```bash
cd services/google-action
npm install
npm run build

# Deploy Cloud Function
gcloud functions deploy traficoLiveWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region europe-west1 \
  --set-env-vars TRAFICO_API_KEY=$TRAFICO_API_KEY \
  --source dist/
```

## Submit for Review

### Amazon Developer Console (Alexa)

1. https://developer.amazon.com/alexa/console/ask
2. Create skill → Custom → Alexa-hosted (Node.js) or "Provision your own"
3. Invocation name: `tráfico live` (2 words, lowercase)
4. Paste interaction model from `src/skill-manifest.json`
5. Set Lambda endpoint ARN
6. Required for submission:
   - Icons: 108x108 and 512x512 PNG (HTTPS URL required)
   - Privacy policy URL: `https://trafico.live/privacidad`
   - Category: Navigation & Trip Planner
   - Testing instructions and example phrases (in skill-manifest.json)
7. Submit for certification — wait ~5-10 business days
8. Cost: AWS Lambda free tier covers 1M invocations/month

### Google Actions Console

1. https://console.actions.google.com
2. New project → Custom → Blank
3. Display name: `Tráfico Live`, locale: Spanish (Spain) (es-ES)
4. Add intents with training phrases from `action.yaml`
5. Webhook: Cloud Function URL
6. Required for submission:
   - Short and full description
   - Developer email: mj@abemon.es
   - Privacy policy: `https://trafico.live/privacidad`
   - Large banner image (1920x1080)
   - At least 4 sample invocations
7. Submit for review — wait ~5-10 business days
8. Cost: Cloud Functions free tier covers 2M invocations/month

## TTS String Formatting

Spanish-specific formatting handled in `services/voice-shared/src/tts-strings.ts`:

| Input | TTS Output |
|-------|-----------|
| `1.622` (price) | "uno coma seis dos dos euros el litro" |
| `"A-2"` (road) | "A dos" |
| `"AP-7"` (road) | "A P siete" |
| `17` (minutes) | "diecisiete minutos" |
| `"08:30"` (time) | "las ocho y media" |
| `["a","b","c","d"]` (list, max 2) | "a, b y 2 más" |

## Error Handling

| Scenario | Response |
|----------|---------|
| API timeout (>3s) | "No he podido consultar los datos ahora. Inténtalo en un momento." |
| HTTP error | "No he podido consultar los datos ahora. Inténtalo en un momento." |
| No data found | Contextual message (e.g. "No hay trenes con destino a Barcelona en este momento.") |
| Missing required slot | Prompt for the missing information |
| Unhandled intent | Help message with available capabilities |

## File Structure

```
services/
  alexa/
    package.json          # Lambda skill dependencies (ask-sdk-core)
    tsconfig.json
    src/
      index.ts            # Lambda handler + request routing
      skill-manifest.json # Alexa skill config (invocation, intents, utterances)
      utterances.yml      # 20 sample utterances per intent
      intents/
        get-train-arrival.ts
        get-road-traffic.ts
        get-fuel-price.ts
  google-action/
    package.json          # Cloud Function dependencies
    tsconfig.json
    action.yaml           # Actions SDK + Dialogflow intent config
    src/
      index.ts            # Cloud Function webhook handler
      intents/
        get-train-arrival.ts
        get-road-traffic.ts
        get-fuel-price.ts
  voice-shared/
    src/
      api-client.ts       # Shared HTTP client (fetch + 3s timeout)
      tts-strings.ts      # Spanish TTS formatters
docs/
  VOICE-ASSISTANTS.md     # This file
```
