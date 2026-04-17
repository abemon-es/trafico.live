# Alexa Skill — trafico.live

Spanish voice skill for traffic, trains, and fuel prices in Spain.

## Prerequisites

- AWS CLI configured (`aws configure`)
- Node.js >= 20
- ASK CLI (`npm install -g ask-cli`) — for skill submission
- Lambda function created in `eu-west-1`: `trafico-live-alexa-skill`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRAFICO_API_KEY` | Yes | API key for trafico.live (set in Lambda console) |
| `TRAFICO_API_BASE` | No | Override API base URL (default: `https://trafico.live/api`) |

## Build

```bash
cd services/alexa
npm install
npm run build          # Compiles TypeScript → dist/
```

## Package and Deploy to Lambda

```bash
npm run package        # Builds + zips to skill.zip
npm run deploy         # Uploads skill.zip to Lambda

# Or manually:
zip -r skill.zip dist/ node_modules/
aws lambda update-function-code \
  --function-name trafico-live-alexa-skill \
  --zip-file fileb://skill.zip \
  --region eu-west-1
```

## Lambda Configuration

- Runtime: Node.js 20.x
- Handler: `index.handler`
- Timeout: 10 seconds
- Memory: 256 MB (sufficient for 3s API calls)
- Environment variables: set `TRAFICO_API_KEY` in Lambda console

## Submit to Amazon Developer Console

1. Go to https://developer.amazon.com/alexa/console/ask
2. Create a new skill → Custom → Provision your own → Node.js
3. In **Invocation**: set invocation name to `tráfico live`
4. In **JSON Editor**: paste `src/skill-manifest.json` content
5. Or use ASK CLI:
   ```bash
   ask deploy --target skill-metadata
   ```
6. Set the Lambda ARN in **Endpoint** section
7. Test: say "Alexa, abre tráfico live"
8. For publication:
   - Upload icons (108x108px and 512x512px)
   - Fill in description, example phrases, category
   - Privacy policy: `https://trafico.live/privacidad`
   - Submit for certification review (~5-10 days)

## Example Utterances (test in Alexa Console)

- "Alexa, abre tráfico live"
- "cuándo llega el AVE a Barcelona"
- "cómo está la A-2"
- "precio de la gasolina en Madrid"
- "precio del diesel en Sevilla"
- "hay retenciones en la M-30"
- "retraso del tren 06213"

## Intents

| Intent | Slots | Example |
|--------|-------|---------|
| `GetTrainArrivalIntent` | Station, TrainNumber | "cuándo llega el AVE a Barcelona" |
| `GetRoadTrafficIntent` | Road, Province | "cómo está la A-2" |
| `GetFuelPriceIntent` | FuelType, Province, City | "precio del diesel en Madrid" |
