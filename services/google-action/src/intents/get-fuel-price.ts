/**
 * Intent: GetFuelPrice — Google Actions / Dialogflow CX webhook handler
 */

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
}

export interface DialogflowParams {
  FuelType?: string;
  Province?: string;
  City?: string;
  [key: string]: string | undefined;
}

function parseFuelType(raw: string): {
  apiParam: string;
  priceField: keyof GasStation;
  label: string;
} {
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
  return { apiParam: "gasoline_95", priceField: "priceGasoline95", label: "la gasolina noventa y cinco" };
}

function getStationPrice(station: GasStation, field: keyof GasStation): number | null {
  const val = station[field];
  if (typeof val === "number" && val > 0) return val;
  if (typeof station.price === "number" && station.price > 0) return station.price;
  return null;
}

export async function handleGetFuelPrice(params: DialogflowParams): Promise<string> {
  const fuelTypeRaw = params.FuelType ?? "gasolina";
  const provinceRaw = params.Province ?? "";
  const cityRaw = params.City ?? params["geo-city"] ?? "";
  const location = cityRaw || provinceRaw;

  if (!location) {
    return "¿En qué provincia o ciudad quieres saber el precio del combustible?";
  }

  const { apiParam, priceField, label } = parseFuelType(fuelTypeRaw);
  const client = getApiClient();

  try {
    const queryParams: Record<string, string> = { fuel: apiParam, limit: "50" };
    if (cityRaw) queryParams.municipality = cityRaw;
    else if (provinceRaw) queryParams.province = provinceRaw;

    const data = await client.get<GasStationsResponse>("/gas-stations", queryParams);
    const stations: GasStation[] = data.stations ?? data.gasolineras ?? data.data ?? [];

    if (stations.length === 0) {
      return `No he encontrado gasolineras con datos de ${label} en ${stationToTts(location)}.`;
    }

    const withPrices = stations
      .map((s) => ({ station: s, price: getStationPrice(s, priceField) }))
      .filter((x): x is { station: GasStation; price: number } => x.price !== null)
      .sort((a, b) => a.price - b.price);

    if (withPrices.length === 0) return NO_DATA_MESSAGE;

    const avg = withPrices.reduce((sum, x) => sum + x.price, 0) / withPrices.length;
    const cheapest = withPrices[0];
    const cheapestName = cheapest.station.name ?? cheapest.station.nombre ?? "una gasolinera cercana";
    const locationTts = stationToTts(location);

    let speech =
      `El precio medio de ${label} en ${locationTts} hoy es de ${priceTts(avg)}. ` +
      `La más barata está a ${priceTts(cheapest.price)} en ${stationToTts(cheapestName)}.`;

    if (withPrices.length >= 3) {
      const mostExpensive = withPrices[withPrices.length - 1];
      const diff = mostExpensive.price - cheapest.price;
      if (diff > 0.05) {
        speech += ` La diferencia entre la más barata y la más cara es de ${priceTts(diff)}.`;
      }
    }

    return speech;
  } catch (err) {
    if (err instanceof ApiError) return err.ttsFallback;
    return ERROR_MESSAGE;
  }
}
