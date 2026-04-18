/**
 * Intent: GetRoadTraffic — Google Actions / Dialogflow CX webhook handler
 */

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
}

interface IncidentsResponse {
  incidents?: Incident[];
  incidencias?: Incident[];
  data?: Incident[];
}

export interface DialogflowParams {
  Road?: string;
  Province?: string;
  [key: string]: string | undefined;
}

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

export async function handleGetRoadTraffic(params: DialogflowParams): Promise<string> {
  const roadRaw = params.Road ?? "";
  const provinceRaw = params.Province ?? "";

  if (!roadRaw && !provinceRaw) {
    return "¿De qué carretera quieres saber el estado del tráfico?";
  }

  const client = getApiClient();

  try {
    const queryParams: Record<string, string> = {};
    if (roadRaw) queryParams.road = roadRaw.toUpperCase().replace(/\s+/g, "");
    if (provinceRaw) queryParams.province = provinceRaw;
    queryParams.limit = "10";

    const data = await client.get<IncidentsResponse>("/incidencias", queryParams);
    const incidents: Incident[] = data.incidents ?? data.incidencias ?? data.data ?? [];
    const roadTts = roadRaw ? roadToTts(roadRaw) : provinceRaw;

    if (incidents.length === 0) {
      return `En la ${roadTts} no hay incidencias registradas en este momento. Circulación fluida.`;
    }

    if (incidents.length === 1) {
      const inc = incidents[0];
      const typeStr = incidentTypeToTts(inc.type ?? inc.tipo);
      const kmDesc = buildKmDescription(inc);
      return `En la ${roadTts} hay una incidencia activa: ${typeStr}${kmDesc ? ` ${kmDesc}` : ""}.`;
    }

    const topN = incidents.slice(0, 3);
    const descriptions = topN.map((inc) => {
      const typeStr = incidentTypeToTts(inc.type ?? inc.tipo);
      const kmDesc = buildKmDescription(inc);
      return kmDesc ? `${typeStr} ${kmDesc}` : typeStr;
    });

    return (
      `En la ${roadTts} hay ${numberToTts(incidents.length)} incidencias activas. ` +
      truncateListForSpeech(descriptions, 2) + "."
    );
  } catch (err) {
    if (err instanceof ApiError) return err.ttsFallback;
    return ERROR_MESSAGE;
  }
}
