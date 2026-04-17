/**
 * Intent: GetTrainArrivalIntent
 * Slots: Station (city/station name), TrainNumber (optional)
 * Fetches live train positions from trafico.live and responds with arrival info.
 */

import { HandlerInput, ResponseBuilder } from "ask-sdk-core";
import { getApiClient, ApiError } from "../../../voice-shared/src/api-client";
import {
  stationToTts,
  minutesToTts,
  numberToTts,
  ERROR_MESSAGE,
  NO_DATA_MESSAGE,
} from "../../../voice-shared/src/tts-strings";

interface TrainPosition {
  trainNumber?: string;
  train?: string;
  brand?: string;
  origin?: string;
  destination?: string;
  nextStation?: string;
  nextStationName?: string;
  estimatedArrivalMinutes?: number;
  delayMinutes?: number;
  lat?: number;
  lon?: number;
}

interface PositionsResponse {
  features?: Array<{
    properties: TrainPosition;
  }>;
  trains?: TrainPosition[];
}

export async function handleGetTrainArrival(input: HandlerInput): Promise<string> {
  const { requestEnvelope } = input;
  const intent = (requestEnvelope.request as { type: string; intent?: { slots?: Record<string, { value?: string }> } }).intent;
  const slots = intent?.slots ?? {};

  const stationRaw: string = slots.Station?.value ?? "";
  const trainNumberRaw: string = slots.TrainNumber?.value ?? "";

  if (!stationRaw && !trainNumberRaw) {
    return "¿A qué estación o con qué número de tren quieres consultar la llegada?";
  }

  const client = getApiClient();
  let speechText: string;

  try {
    const params: Record<string, string> = {};
    if (trainNumberRaw) params.train = trainNumberRaw.toUpperCase();

    const data = await client.get<PositionsResponse>("/trenes/posiciones", params);

    // Normalise response shape — API may return GeoJSON or plain array
    const trains: TrainPosition[] = data.features
      ? data.features.map((f) => f.properties)
      : data.trains ?? [];

    if (trains.length === 0) {
      return "Ahora mismo no hay trenes en circulación con esa información.";
    }

    // Filter by station name if provided
    const stationNorm = stationRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = stationRaw
      ? trains.filter((t) => {
          const dest = (t.destination ?? t.nextStationName ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return dest.includes(stationNorm);
        })
      : trains;

    if (matches.length === 0) {
      const stationTts = stationToTts(stationRaw);
      return `No hay trenes con destino a ${stationTts} en este momento.`;
    }

    // Take the first matching train for the response
    const train = matches[0];
    const id = train.trainNumber ?? train.train ?? "desconocido";
    const brand = train.brand ?? "";
    const destName = stationToTts(train.destination ?? train.nextStationName ?? stationRaw);
    const arrivalMin = train.estimatedArrivalMinutes;
    const delay = train.delayMinutes ?? 0;

    const brandPrefix = brand ? `${brand} ` : "";

    if (arrivalMin !== undefined && arrivalMin !== null) {
      if (delay > 0) {
        speechText = `El ${brandPrefix}${id} llega a ${destName} en ${minutesToTts(arrivalMin)}, con ${numberToTts(delay)} minutos de retraso.`;
      } else {
        speechText = `El ${brandPrefix}${id} llega a ${destName} en ${minutesToTts(arrivalMin)}, a la hora prevista.`;
      }
    } else {
      speechText = `El ${brandPrefix}${id} tiene como destino ${destName}${delay > 0 ? `, con ${numberToTts(delay)} minutos de retraso` : ""}.`;
    }

    // If more trains found, mention count
    if (matches.length > 1) {
      speechText += ` Hay ${numberToTts(matches.length)} trenes en ruta hacia esa estación.`;
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

export function buildGetTrainArrivalResponse(
  responseBuilder: ResponseBuilder,
  speechText: string,
): ReturnType<ResponseBuilder["getResponse"]> {
  return responseBuilder
    .speak(speechText)
    .reprompt("¿Quieres saber algo más sobre trenes, tráfico o combustible?")
    .withShouldEndSession(false)
    .getResponse();
}
