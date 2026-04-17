/**
 * Chat tool definitions for the trafico.live AI assistant.
 *
 * Each tool calls a local /api/* endpoint (server-to-server, no external auth needed).
 * Results are truncated to ≤4K chars to avoid flooding the context window.
 */

import Anthropic from "@anthropic-ai/sdk";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RESULT_CHARS = 4000;
const INTERNAL_HEADER = { "x-internal": "1" };

// Base URL for server-to-server calls (localhost in all environments)
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_active_incidents",
    description:
      "Obtiene incidencias de tráfico activas en España. Permite filtrar por provincia (código INE de 2 dígitos), tipo de efecto (ROAD_CLOSED, SLOW_TRAFFIC, RESTRICTED, DIVERSION) o carretera (p.ej. A-1, N-340).",
    input_schema: {
      type: "object" as const,
      properties: {
        province: {
          type: "string",
          description: "Código INE de 2 dígitos de la provincia, p.ej. '28' para Madrid, '08' para Barcelona",
        },
        effect: {
          type: "string",
          enum: ["ROAD_CLOSED", "SLOW_TRAFFIC", "RESTRICTED", "DIVERSION"],
          description: "Tipo de afección",
        },
        road: {
          type: "string",
          description: "Número de carretera, p.ej. 'A-1' o 'N-340'",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (por defecto 20)",
        },
      },
    },
  },
  {
    name: "get_fuel_prices",
    description:
      "Obtiene precios de combustible en gasolineras de España. Filtra por provincia o tipo de combustible.",
    input_schema: {
      type: "object" as const,
      properties: {
        province: {
          type: "string",
          description: "Código INE de 2 dígitos de la provincia, p.ej. '28' para Madrid",
        },
        fuel_type: {
          type: "string",
          enum: ["GASOLINA_95", "GASOLINA_98", "DIESEL_A", "DIESEL_PREMIUM", "GLP", "GNC", "HIDROGENO"],
          description: "Tipo de combustible",
        },
        order_by: {
          type: "string",
          enum: ["cheapest", "nearest"],
          description: "Ordenar por precio más barato o más cercano",
        },
        limit: {
          type: "number",
          description: "Número máximo de resultados (por defecto 10)",
        },
      },
    },
  },
  {
    name: "get_train_alerts",
    description:
      "Obtiene alertas de servicio ferroviario Renfe activas: cancelaciones, retrasos significativos, avisos de línea.",
    input_schema: {
      type: "object" as const,
      properties: {
        network: {
          type: "string",
          description: "Red de cercanías, p.ej. 'madrid', 'barcelona', 'valencia'",
        },
      },
    },
  },
  {
    name: "get_train_positions",
    description:
      "Obtiene posiciones GPS en tiempo real de trenes de largo recorrido Renfe activos ahora mismo.",
    input_schema: {
      type: "object" as const,
      properties: {
        brand: {
          type: "string",
          description: "Marca comercial: AVE, AVLO, Alvia, Avant, Intercity, MD, Regional, etc.",
        },
        limit: {
          type: "number",
          description: "Número máximo de trenes a devolver (por defecto 20)",
        },
      },
    },
  },
  {
    name: "get_aircraft",
    description:
      "Obtiene posiciones de aeronaves sobrevolando España en tiempo real (OpenSky). Incluye altitud, velocidad y procedencia.",
    input_schema: {
      type: "object" as const,
      properties: {
        airport: {
          type: "string",
          description: "Código IATA del aeropuerto, p.ej. 'MAD', 'BCN', 'VLC'",
        },
        limit: {
          type: "number",
          description: "Número máximo de aeronaves (por defecto 20)",
        },
      },
    },
  },
  {
    name: "get_vessels",
    description:
      "Obtiene posiciones de embarcaciones en aguas españolas (AIS en tiempo real). Incluye tipo de buque, velocidad y rumbo.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          description: "Área marítima: 'atlantico', 'mediterraneo', 'cantabrico', 'canarias', 'baleares'",
        },
        vessel_type: {
          type: "string",
          description: "Tipo de embarcación: 'cargo', 'tanker', 'passenger', 'fishing', 'tug'",
        },
        limit: {
          type: "number",
          description: "Número máximo de embarcaciones (por defecto 20)",
        },
      },
    },
  },
  {
    name: "get_air_quality",
    description:
      "Obtiene el índice de calidad del aire (ICA) de estaciones de MITECO en España. Incluye niveles de NO2, PM10, PM2.5, O3.",
    input_schema: {
      type: "object" as const,
      properties: {
        province: {
          type: "string",
          description: "Código INE de 2 dígitos de la provincia",
        },
        station_id: {
          type: "string",
          description: "ID de estación específica",
        },
        ica_level: {
          type: "number",
          description: "Filtrar por nivel ICA mínimo (1=Bueno a 6=Muy malo)",
        },
      },
    },
  },
  {
    name: "search_entities",
    description:
      "Busca entidades en trafico.live: gasolineras, carreteras, cámaras, radares, municipios, trenes, aeropuertos, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Texto de búsqueda, p.ej. 'Gasolinera Repsol Madrid', 'A-6 accidentes', 'Atocha'",
        },
        collection: {
          type: "string",
          description: "Colección a buscar: gas_stations, roads, cameras, railway_stations, airports, etc.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_road_details",
    description:
      "Obtiene detalles de una carretera española: incidencias activas, cámaras, radares y estadísticas.",
    input_schema: {
      type: "object" as const,
      properties: {
        road_code: {
          type: "string",
          description: "Código de carretera, p.ej. 'A-1', 'A-6', 'N-340', 'AP-7'",
        },
      },
      required: ["road_code"],
    },
  },
  {
    name: "get_weather_alerts",
    description:
      "Obtiene alertas meteorológicas activas de AEMET para España. Incluye nivel de aviso y fenómeno.",
    input_schema: {
      type: "object" as const,
      properties: {
        province: {
          type: "string",
          description: "Código INE de 2 dígitos de la provincia",
        },
        level: {
          type: "string",
          enum: ["YELLOW", "ORANGE", "RED"],
          description: "Nivel mínimo de alerta",
        },
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────

/**
 * Execute a chat tool by name — dispatches to the appropriate local /api/* endpoint.
 * All calls are server-to-server (no x-api-key needed), using x-internal header.
 * Results are truncated to MAX_RESULT_CHARS to avoid bloating the context.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const base = getBaseUrl();

  try {
    const result = await dispatchTool(name, input, base);
    // Truncate long results
    if (result.length > MAX_RESULT_CHARS) {
      return result.slice(0, MAX_RESULT_CHARS) + "\n[resultado truncado]";
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ChatTools] executeTool(${name}) error:`, err);
    return `Error al consultar ${name}: ${msg}`;
  }
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  switch (name) {
    case "get_active_incidents":
      return fetchIncidents(input, base);

    case "get_fuel_prices":
      return fetchFuelPrices(input, base);

    case "get_train_alerts":
      return fetchTrainAlerts(input, base);

    case "get_train_positions":
      return fetchTrainPositions(input, base);

    case "get_aircraft":
      return fetchAircraft(input, base);

    case "get_vessels":
      return fetchVessels(input, base);

    case "get_air_quality":
      return fetchAirQuality(input, base);

    case "search_entities":
      return fetchSearch(input, base);

    case "get_road_details":
      return fetchRoadDetails(input, base);

    case "get_weather_alerts":
      return fetchWeatherAlerts(input, base);

    default:
      return `Herramienta desconocida: ${name}`;
  }
}

// ─── Individual tool fetchers ──────────────────────────────────────────────────

async function apiFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { ...INTERNAL_HEADER, "Accept": "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} → ${url}`);
  }
  return res.json();
}

function buildQs(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  return qs.toString() ? `?${qs.toString()}` : "";
}

async function fetchIncidents(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({
    province: input.province,
    effect: input.effect,
    road: input.road,
    limit: input.limit ?? 20,
    active: "true",
  });
  const data = await apiFetch(`${base}/api/incidents${qs}`) as Record<string, unknown>;
  const incidents = (data.incidents as unknown[]) ?? (Array.isArray(data) ? data : []);
  if (!incidents.length) return "No hay incidencias activas con esos filtros.";
  return formatJsonResult("Incidencias activas", incidents);
}

async function fetchFuelPrices(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({
    province: input.province,
    fuelType: input.fuel_type,
    orderBy: input.order_by ?? "cheapest",
    limit: input.limit ?? 10,
  });
  const data = await apiFetch(`${base}/api/gas-stations${qs}`) as Record<string, unknown>;
  const stations = (data.stations as unknown[]) ?? (Array.isArray(data) ? data : []);
  if (!stations.length) return "No se encontraron gasolineras con esos filtros.";
  return formatJsonResult("Gasolineras / precios combustible", stations);
}

async function fetchTrainAlerts(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({ network: input.network });
  const data = await apiFetch(`${base}/api/trenes/alertas${qs}`) as Record<string, unknown>;
  const alerts = (data.alerts as unknown[]) ?? (Array.isArray(data) ? data : []);
  if (!alerts.length) return "No hay alertas ferroviarias activas.";
  return formatJsonResult("Alertas Renfe", alerts);
}

async function fetchTrainPositions(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({ brand: input.brand, limit: input.limit ?? 20 });
  const data = await apiFetch(`${base}/api/trenes/posiciones${qs}`) as Record<string, unknown>;
  // posiciones returns GeoJSON
  const features = (data as { features?: unknown[] }).features ?? [];
  if (!features.length) return "No hay trenes con posición GPS en este momento.";
  return formatJsonResult("Trenes en tiempo real", features);
}

async function fetchAircraft(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({ airport: input.airport, limit: input.limit ?? 20 });
  const data = await apiFetch(`${base}/api/aviacion${qs}`) as Record<string, unknown>;
  const features = (data as { features?: unknown[] }).features ?? (Array.isArray(data) ? data : []);
  if (!features.length) return "No se encontraron aeronaves con esos filtros.";
  return formatJsonResult("Aeronaves en tiempo real", features);
}

async function fetchVessels(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({
    area: input.area,
    type: input.vessel_type,
    limit: input.limit ?? 20,
  });
  const data = await apiFetch(`${base}/api/maritimo${qs}`) as Record<string, unknown>;
  const features = (data as { features?: unknown[] }).features ?? (Array.isArray(data) ? data : []);
  if (!features.length) return "No se encontraron embarcaciones con esos filtros.";
  return formatJsonResult("Embarcaciones en tiempo real", features);
}

async function fetchAirQuality(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({
    province: input.province,
    stationId: input.station_id,
    minIca: input.ica_level,
  });
  const data = await apiFetch(`${base}/api/calidad-aire${qs}`) as Record<string, unknown>;
  const stations = (data.stations as unknown[]) ?? (Array.isArray(data) ? data : []);
  if (!stations.length) return "No se encontraron datos de calidad del aire con esos filtros.";
  return formatJsonResult("Calidad del aire (ICA, MITECO)", stations);
}

async function fetchSearch(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  if (!input.query) return "Se requiere un término de búsqueda.";
  const qs = buildQs({
    q: input.query,
    collections: input.collection,
  });
  const data = await apiFetch(`${base}/api/search${qs}`) as Record<string, unknown>;
  const hits = (data.hits as unknown[]) ?? (data.results as unknown[]) ?? [];
  if (!hits.length) return `No se encontraron resultados para "${input.query}".`;
  return formatJsonResult(`Resultados de búsqueda: "${input.query}"`, hits);
}

async function fetchRoadDetails(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  if (!input.road_code) return "Se requiere el código de carretera.";
  // Normalize: A-1 → a-1 slug
  const slug = String(input.road_code).toLowerCase().replace(/\s+/g, "-");
  try {
    const data = await apiFetch(`${base}/api/roads/${encodeURIComponent(slug)}`) as Record<string, unknown>;
    return formatJsonResult(`Carretera ${input.road_code}`, data);
  } catch {
    // Fallback: search for the road
    return fetchSearch({ query: String(input.road_code), collection: "roads" }, base);
  }
}

async function fetchWeatherAlerts(
  input: Record<string, unknown>,
  base: string
): Promise<string> {
  const qs = buildQs({
    province: input.province,
    level: input.level,
  });
  const data = await apiFetch(`${base}/api/weather-alerts${qs}`) as Record<string, unknown>;
  const alerts = (data.alerts as unknown[]) ?? (Array.isArray(data) ? data : []);
  if (!alerts.length) return "No hay alertas meteorológicas activas con esos filtros.";
  return formatJsonResult("Alertas AEMET", alerts);
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatJsonResult(label: string, data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  return `${label}:\n${json}`;
}
