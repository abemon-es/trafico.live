/**
 * Intent: GetFuelPriceIntent
 * Slots: FuelType (gasolina, diesel, glp, adblue), Province or City
 * Fetches gas station prices from trafico.live and returns TTS summary.
 */

import { HandlerInput, ResponseBuilder } from "ask-sdk-core";
import { getApiClient, ApiError } from "../../../voice-shared/src/api-client";
import {
  priceTts,
  stationToTts,
  ERROR_MESSAGE,
  NO_DATA_MESSAGE,
} from "../../../voice-shared/src/tts-strings";

interface GasStation {
  name?: string;
  nombre?: string;
  address?: string;
  direccion?: string;
  municipality?: string;
  municipio?: string;
  province?: string;
  provincia?: string;
  priceGasoline95?: number;
  priceDiesel?: number;
  priceGasoline98?: number;
  priceGLP?: number;
  price?: number;
  [key: string]: unknown;
}

interface GasStationsResponse {
  stations?: GasStation[];
  gasolineras?: GasStation[];
  data?: GasStation[];
  total?: number;
}

/** Map spoken fuel type to API parameter and price field. */
function parseFuelType(raw: string): { apiParam: string; priceField: keyof GasStation; label: string } {
  const norm = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (norm.includes("diesel") || norm.includes("gasoil") || norm.includes("gasoleo")) {
    return { apiParam: "diesel", priceField: "priceDiesel", label: "el gasoil" };
  }
  if (norm.includes("98")) {
    return { apiParam: "gasoline_98", priceField: "priceGasoline98", label: "la gasolina noventa y ocho" };
  }
  if (norm.includes("glp") || norm.includes("autogas")) {
    return { apiParam: "glp", priceField: "priceGLP", label: "el autogas" };
  }
  // Default: 95 octane
  return { apiParam: "gasoline_95", priceField: "priceGasoline95", label: "la gasolina noventa y cinco" };
}

function getStationPrice(station: GasStation, field: keyof GasStation): number | null {
  const val = station[field];
  if (typeof val === "number" && val > 0) return val;
  if (typeof station.price === "number" && station.price > 0) return station.price;
  return null;
}

export async function handleGetFuelPrice(input: HandlerInput): Promise<string> {
  const { requestEnvelope } = input;
  const intent = (requestEnvelope.request as { type: string; intent?: { slots?: Record<string, { value?: string }> } }).intent;
  const slots = intent?.slots ?? {};

  const fuelTypeRaw: string = slots.FuelType?.value ?? "gasolina";
  const provinceRaw: string = slots.Province?.value ?? "";
  const cityRaw: string = slots.City?.value ?? "";

  const location = cityRaw || provinceRaw;

  if (!location) {
    return "¿En qué provincia o ciudad quieres saber el precio del combustible?";
  }

  const { apiParam, priceField, label } = parseFuelType(fuelTypeRaw);

  const client = getApiClient();
  let speechText: string;

  try {
    const params: Record<string, string> = {
      fuel: apiParam,
      limit: "50",
    };
    if (cityRaw) params.municipality = cityRaw;
    else if (provinceRaw) params.province = provinceRaw;

    const data = await client.get<GasStationsResponse>("/gas-stations", params);

    const stations: GasStation[] =
      data.stations ?? data.gasolineras ?? data.data ?? [];

    if (stations.length === 0) {
      const placeTts = stationToTts(location);
      return `No he encontrado gasolineras con datos de ${label} en ${placeTts}.`;
    }

    // Extract valid prices
    const withPrices = stations
      .map((s) => ({ station: s, price: getStationPrice(s, priceField) }))
      .filter((x): x is { station: GasStation; price: number } => x.price !== null)
      .sort((a, b) => a.price - b.price);

    if (withPrices.length === 0) {
      return NO_DATA_MESSAGE;
    }

    // Calculate average
    const avg = withPrices.reduce((sum, x) => sum + x.price, 0) / withPrices.length;
    const cheapest = withPrices[0];
    const locationTts = stationToTts(location);
    const cheapestName = cheapest.station.name ?? cheapest.station.nombre ?? "una gasolinera cercana";

    speechText =
      `El precio medio de ${label} en ${locationTts} hoy es de ${priceTts(avg)}. ` +
      `La más barata está a ${priceTts(cheapest.price)} en ${stationToTts(cheapestName)}.`;

    if (withPrices.length >= 3) {
      const most_expensive = withPrices[withPrices.length - 1];
      const diff = most_expensive.price - cheapest.price;
      if (diff > 0.05) {
        speechText += ` La diferencia entre la más barata y la más cara es de ${priceTts(diff)}.`;
      }
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

export function buildGetFuelPriceResponse(
  responseBuilder: ResponseBuilder,
  speechText: string,
): ReturnType<ResponseBuilder["getResponse"]> {
  return responseBuilder
    .speak(speechText)
    .reprompt("¿Quieres saber algo más sobre combustible, tráfico o trenes?")
    .withShouldEndSession(false)
    .getResponse();
}
