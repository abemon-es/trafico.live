/**
 * Intent: GetTrainArrival — Google Actions / Dialogflow CX webhook handler
 * Mirrors Alexa intent with Google conversational API conventions.
 */

import { getApiClient, ApiError } from "../../../voice-shared/src/api-client";
import {
  stationToTts,
  minutesToTts,
  numberToTts,
  ERROR_MESSAGE,
} from "../../../voice-shared/src/tts-strings";

interface TrainPosition {
  trainNumber?: string;
  train?: string;
  brand?: string;
  destination?: string;
  nextStationName?: string;
  estimatedArrivalMinutes?: number;
  delayMinutes?: number;
}

interface PositionsResponse {
  features?: Array<{ properties: TrainPosition }>;
  trains?: TrainPosition[];
}

export interface DialogflowParams {
  Station?: string;
  TrainNumber?: string;
  [key: string]: string | undefined;
}

export async function handleGetTrainArrival(params: DialogflowParams): Promise<string> {
  const stationRaw = params.Station ?? params["geo-city"] ?? "";
  const trainNumberRaw = params.TrainNumber ?? "";

  if (!stationRaw && !trainNumberRaw) {
    return "¿A qué estación o con qué número de tren quieres consultar la llegada?";
  }

  const client = getApiClient();

  try {
    const queryParams: Record<string, string> = {};
    if (trainNumberRaw) queryParams.train = trainNumberRaw.toUpperCase();

    const data = await client.get<PositionsResponse>("/trenes/posiciones", queryParams);

    const trains: TrainPosition[] = data.features
      ? data.features.map((f) => f.properties)
      : data.trains ?? [];

    if (trains.length === 0) {
      return "Ahora mismo no hay trenes en circulación con esa información.";
    }

    const stationNorm = stationRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = stationRaw
      ? trains.filter((t) => {
          const dest = (t.destination ?? t.nextStationName ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return dest.includes(stationNorm);
        })
      : trains;

    if (matches.length === 0) {
      return `No hay trenes con destino a ${stationToTts(stationRaw)} en este momento.`;
    }

    const train = matches[0];
    const id = train.trainNumber ?? train.train ?? "desconocido";
    const brand = train.brand ?? "";
    const destName = stationToTts(train.destination ?? train.nextStationName ?? stationRaw);
    const arrivalMin = train.estimatedArrivalMinutes;
    const delay = train.delayMinutes ?? 0;
    const brandPrefix = brand ? `${brand} ` : "";

    let speechText: string;
    if (arrivalMin !== undefined && arrivalMin !== null) {
      speechText = delay > 0
        ? `El ${brandPrefix}${id} llega a ${destName} en ${minutesToTts(arrivalMin)}, con ${numberToTts(delay)} minutos de retraso.`
        : `El ${brandPrefix}${id} llega a ${destName} en ${minutesToTts(arrivalMin)}, a la hora prevista.`;
    } else {
      speechText = `El ${brandPrefix}${id} tiene como destino ${destName}${delay > 0 ? `, con ${numberToTts(delay)} minutos de retraso` : ""}.`;
    }

    if (matches.length > 1) {
      speechText += ` Hay ${numberToTts(matches.length)} trenes en ruta hacia esa estación.`;
    }

    return speechText;
  } catch (err) {
    if (err instanceof ApiError) return err.ttsFallback;
    return ERROR_MESSAGE;
  }
}
