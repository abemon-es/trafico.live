/**
 * Google Assistant Action — Cloud Function webhook handler for trafico.live
 * Compatible with Dialogflow CX / Actions SDK v3 webhook format.
 * Stateless, Lambda/Cloud Function-safe, Spanish (es-ES).
 */

import * as functions from "@google-cloud/functions-framework";

import { handleGetTrainArrival } from "./intents/get-train-arrival";
import { handleGetRoadTraffic } from "./intents/get-road-traffic";
import { handleGetFuelPrice } from "./intents/get-fuel-price";

// ─── Dialogflow / Actions SDK request/response types ─────────────────────────

interface DialogflowRequest {
  fulfillmentInfo?: {
    tag?: string;
  };
  intentInfo?: {
    displayName?: string;
    parameters?: Record<string, { resolved?: string; original?: string }>;
  };
  text?: string;
  sessionInfo?: {
    session?: string;
    parameters?: Record<string, unknown>;
  };
}

interface DialogflowResponse {
  fulfillmentResponse: {
    messages: Array<{
      text: { text: string[] };
    }>;
  };
  sessionInfo?: {
    parameters?: Record<string, unknown>;
  };
}

/** Extract flat parameter map from Dialogflow CX intent parameters. */
function extractParams(
  intentParams: Record<string, { resolved?: string; original?: string }> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(intentParams)) {
    if (val?.resolved) result[key] = val.resolved;
    else if (val?.original) result[key] = val.original;
  }
  return result;
}

/** Build a Dialogflow response object. */
function buildResponse(speechText: string): DialogflowResponse {
  return {
    fulfillmentResponse: {
      messages: [
        {
          text: { text: [speechText] },
        },
      ],
    },
  };
}

const WELCOME_MESSAGE =
  "Bienvenido a tráfico live. ¿Qué quieres saber? " +
  "Puedo decirte cuándo llega tu tren, cómo está el tráfico o el precio de la gasolina.";

const HELP_MESSAGE =
  "Puedo ayudarte con tres cosas. " +
  "Uno: saber cuándo llega tu tren, por ejemplo, cuándo llega el AVE a Madrid. " +
  "Dos: el estado del tráfico en una carretera, por ejemplo, cómo está la A dos. " +
  "Tres: el precio de la gasolina, por ejemplo, precio de la gasolina en Barcelona. " +
  "¿Qué quieres saber?";

const ERROR_MESSAGE =
  "Lo siento, no he podido obtener los datos ahora mismo. Inténtalo en un momento.";

// ─── Main Cloud Function webhook ─────────────────────────────────────────────

functions.http("traficoLiveWebhook", async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as DialogflowRequest;
  const intentName =
    body.intentInfo?.displayName ??
    body.fulfillmentInfo?.tag ??
    "";

  const params = extractParams(body.intentInfo?.parameters ?? {});

  let speechText: string;

  try {
    switch (intentName) {
      case "Default Welcome Intent":
      case "actions.intent.MAIN":
      case "Welcome":
        speechText = WELCOME_MESSAGE;
        break;

      case "GetTrainArrivalIntent":
      case "get_train_arrival":
        speechText = await handleGetTrainArrival(params);
        break;

      case "GetRoadTrafficIntent":
      case "get_road_traffic":
        speechText = await handleGetRoadTraffic(params);
        break;

      case "GetFuelPriceIntent":
      case "get_fuel_price":
        speechText = await handleGetFuelPrice(params);
        break;

      case "Default Fallback Intent":
      case "actions.intent.NO_MATCH":
        speechText =
          "No he entendido bien. Puedes preguntarme por el estado de una carretera, " +
          "la llegada de un tren o el precio del combustible.";
        break;

      case "actions.intent.CANCEL":
      case "Goodbye":
        speechText = "Hasta luego. Consulta trafico.live para más información.";
        break;

      case "AMAZON.HelpIntent":
      case "Help":
        speechText = HELP_MESSAGE;
        break;

      default:
        speechText = HELP_MESSAGE;
    }
  } catch {
    speechText = ERROR_MESSAGE;
  }

  res.status(200).json(buildResponse(speechText));
});
