/**
 * Intent: GetRoadTrafficIntent
 * Slots: Road (e.g. "A-2"), Province (optional)
 * Fetches active incidents from trafico.live and responds with traffic summary.
 */

import { HandlerInput, ResponseBuilder } from "ask-sdk-core";
import { getApiClient, ApiError } from "../../../voice-shared/src/api-client";
import {
  roadToTts,
  numberToTts,
  truncateListForSpeech,
  ERROR_MESSAGE,
} from "../../../voice-shared/src/tts-strings";

interface Incident {
  road?: string;
  carretera?: string;
  kmStart?: number;
  kmEnd?: number;
  pk?: number;
  type?: string;
  tipo?: string;
  description?: string;
  descripcion?: string;
  level?: string;
  nivel?: string;
}

interface IncidentsResponse {
  incidents?: Incident[];
  incidencias?: Incident[];
  data?: Incident[];
  total?: number;
}

/** Map DGT incident type codes to human-readable Spanish phrases. */
function incidentTypeToTts(type?: string): string {
  const map: Record<string, string> = {
    ACCIDENT: "accidente",
    SLOW_TRAFFIC: "circulación lenta",
    ROAD_WORKS: "obras en la vía",
    LANE_CLOSED: "carril cortado",
    ROAD_CLOSED: "vía cortada",
    WEATHER: "condiciones meteorológicas adversas",
    OBSTACLE: "obstáculo en la calzada",
    CONGESTION: "retención",
  };
  return map[(type ?? "").toUpperCase()] ?? (type ?? "incidencia");
}

function buildKmDescription(inc: Incident): string {
  const start = inc.kmStart ?? inc.pk;
  const end = inc.kmEnd;
  if (start !== undefined && end !== undefined && start !== end) {
    return `entre el kilómetro ${numberToTts(Math.round(start))} y el ${numberToTts(Math.round(end))}`;
  }
  if (start !== undefined) {
    return `en el kilómetro ${numberToTts(Math.round(start))}`;
  }
  return "";
}

export async function handleGetRoadTraffic(input: HandlerInput): Promise<string> {
  const { requestEnvelope } = input;
  const intent = (requestEnvelope.request as { type: string; intent?: { slots?: Record<string, { value?: string }> } }).intent;
  const slots = intent?.slots ?? {};

  const roadRaw: string = slots.Road?.value ?? "";
  const provinceRaw: string = slots.Province?.value ?? "";

  if (!roadRaw && !provinceRaw) {
    return "¿De qué carretera quieres saber el estado del tráfico?";
  }

  const client = getApiClient();
  let speechText: string;

  try {
    const params: Record<string, string> = {};
    if (roadRaw) params.road = roadRaw.toUpperCase().replace(/\s+/g, "");
    if (provinceRaw) params.province = provinceRaw;
    params.limit = "10";

    const data = await client.get<IncidentsResponse>("/incidencias", params);

    const incidents: Incident[] =
      data.incidents ?? data.incidencias ?? data.data ?? [];

    const roadTts = roadRaw ? roadToTts(roadRaw) : provinceRaw;

    if (incidents.length === 0) {
      return `En la ${roadTts} no hay incidencias registradas en este momento. Circulación fluida.`;
    }

    if (incidents.length === 1) {
      const inc = incidents[0];
      const typeStr = incidentTypeToTts(inc.type ?? inc.tipo);
      const kmDesc = buildKmDescription(inc);
      speechText = `En la ${roadTts} hay una incidencia activa: ${typeStr}${kmDesc ? ` ${kmDesc}` : ""}.`;
    } else {
      // Summarise top 2-3 incidents
      const topN = incidents.slice(0, 3);
      const descriptions = topN.map((inc) => {
        const typeStr = incidentTypeToTts(inc.type ?? inc.tipo);
        const kmDesc = buildKmDescription(inc);
        return kmDesc ? `${typeStr} ${kmDesc}` : typeStr;
      });

      speechText =
        `En la ${roadTts} hay ${numberToTts(incidents.length)} incidencias activas. ` +
        truncateListForSpeech(descriptions, 2) + ".";
    }
  } catch (err) {
    if (err instanceof ApiError) {
      speechText = err.ttsFallback;
    } else {
      speechText = ERROR_MESSAGE;
    }
  }

  return speechText;
}

export function buildGetRoadTrafficResponse(
  responseBuilder: ResponseBuilder,
  speechText: string,
): ReturnType<ResponseBuilder["getResponse"]> {
  return responseBuilder
    .speak(speechText)
    .reprompt("¿Quieres saber algo más sobre tráfico, trenes o combustible?")
    .withShouldEndSession(false)
    .getResponse();
}
