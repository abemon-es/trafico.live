# Google Assistant Action — trafico.live

Spanish Google Assistant action for traffic, trains, and fuel prices in Spain.

## Prerequisites

- Google Cloud CLI (`gcloud auth login`)
- Google Cloud project with billing enabled
- Node.js >= 20
- Actions on Google CLI: `npm install -g @assistant/sdk`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRAFICO_API_KEY` | Yes | API key for trafico.live |
| `TRAFICO_API_BASE` | No | Override API base (default: `https://trafico.live/api`) |

## Build

```bash
cd services/google-action
npm install
npm run build          # TypeScript → dist/
```

## Deploy to Cloud Functions

```bash
# Set your project
export GOOGLE_CLOUD_PROJECT=your-project-id
export TRAFICO_API_KEY=your_api_key_here

npm run deploy

# Or manually:
gcloud functions deploy traficoLiveWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region europe-west1 \
  --set-env-vars TRAFICO_API_KEY=$TRAFICO_API_KEY,TRAFICO_API_BASE=https://trafico.live/api \
  --source dist/
```

After deploy, update the webhook URL in `action.yaml`:
```yaml
webhook:
  httpsEndpoint:
    baseUrl: "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/traficoLiveWebhook"
```

## Submit to Google Actions Console

1. Go to https://console.actions.google.com
2. Create a new project → select "Custom" → "Blank project"
3. Set display name: `Tráfico Live`, locale: `Spanish (Spain)`
4. Go to **Develop → Actions** and create 3 intents: GetTrainArrival, GetRoadTraffic, GetFuelPrice
5. Add training phrases from `action.yaml`
6. Go to **Deploy → Webhook** and set the Cloud Function URL
7. Test in Actions Console simulator with:
   - "hablar con tráfico live"
   - "cuándo llega el AVE a Madrid"
   - "cómo está la A-2"
   - "precio de la gasolina en Barcelona"
8. For publication:
   - Fill in store listing: description, developer info
   - Privacy policy: `https://trafico.live/privacidad`
   - Submit for review (~5-10 days)

## Local Development

```bash
npm run dev
# Starts local Cloud Functions emulator on :8080
# Use ngrok for Dialogflow webhook testing:
ngrok http 8080
# Then set ngrok URL in Dialogflow webhook settings
```

## Intents

| Intent Tag | Dialogflow Intent | Example |
|------------|-------------------|---------|
| `GetTrainArrivalIntent` | GetTrainArrivalIntent | "cuándo llega el AVE a Barcelona" |
| `GetRoadTrafficIntent` | GetRoadTrafficIntent | "cómo está la A-2" |
| `GetFuelPriceIntent` | GetFuelPriceIntent | "precio del diesel en Madrid" |
