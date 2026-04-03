#!/usr/bin/env node
/**
 * @trafico/mcp-server
 *
 * MCP server for trafico.live — exposes Spanish traffic intelligence as tools
 * for AI assistants (Claude Desktop, Cursor, etc.) via the trafico.live REST API.
 *
 * Usage:
 *   npx trafico-mcp
 *   trafico-mcp  (after global install)
 *
 * Environment variables:
 *   TRAFICO_API_URL   Base URL (default: https://trafico.live)
 *   TRAFICO_API_KEY   API key (required for non-public endpoints)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// Package version (read from package.json at runtime)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let PKG_VERSION = "0.1.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")) as { version: string };
  PKG_VERSION = pkg.version;
} catch {
  // fallback to hardcoded
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
const BASE_URL = process.env.TRAFICO_API_URL ?? "https://trafico.live";
const API_KEY = process.env.TRAFICO_API_KEY ?? "";

async function api(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.data)) return data.data as T[];
  if (data && Array.isArray(data.features)) return data.features as T[];
  return [];
}

function errResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error al consultar datos: ${msg}` }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "trafico-live",
  version: PKG_VERSION,
});

// ===========================================================================
// TRAFFIC TOOLS
// ===========================================================================

// ---------------------------------------------------------------------------
// get_active_incidents
// ---------------------------------------------------------------------------
server.tool(
  "get_active_incidents",
  "Obtiene incidencias de tráfico activas en España. Filtra por provincia (código INE 2 dígitos), severidad o carretera.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos), p.ej. '28' para Madrid"),
    severity: z
      .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
      .optional()
      .describe("Severidad mínima"),
    road: z.string().optional().describe("Número de carretera, p.ej. 'A-1', 'N-340'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50)
      .describe("Número máximo de resultados (por defecto 50)"),
  },
  async ({ province, severity, road, limit }) => {
    try {
      const params: Record<string, string> = { active: "true", limit: String(limit) };
      if (province) params.province = province;
      if (severity) params.severity = severity;
      if (road) params.road = road;

      const data = (await api("/api/incidents", params)) as {
        total?: number;
        data?: Array<{
          type?: string;
          severity?: string;
          roadNumber?: string;
          provinceName?: string;
          municipality?: string;
          description?: string;
          startedAt?: string;
          causeType?: string;
        }>;
      };

      type IncidentItem = NonNullable<typeof data.data>[number];
      const incidents = extractArray<IncidentItem>(data);
      const total = data.total ?? incidents.length;

      if (!incidents || incidents.length === 0) {
        return {
          content: [{ type: "text", text: "No hay incidencias activas con los filtros indicados." }],
        };
      }

      const breakdown: Record<string, number> = {};
      for (const inc of incidents) {
        const sev = inc.severity ?? "UNKNOWN";
        breakdown[sev] = (breakdown[sev] ?? 0) + 1;
      }

      const lines: string[] = [
        `Incidencias activas: ${total} en total (mostrando ${incidents.length})`,
        `Desglose por severidad: ${Object.entries(breakdown).map(([k, v]) => `${k}=${v}`).join(", ")}`,
        "",
      ];

      for (const inc of incidents) {
        const loc = [inc.roadNumber, inc.provinceName, inc.municipality].filter(Boolean).join(", ");
        const when = inc.startedAt ? inc.startedAt.replace("T", " ").slice(0, 16) : "—";
        lines.push(
          `[${inc.severity ?? "?"}] ${inc.type ?? "Incidencia"} — ${loc || "—"} (${when})` +
            (inc.description ? `\n  ${inc.description}` : "") +
            (inc.causeType ? ` [causa: ${inc.causeType}]` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_traffic_intensity
// ---------------------------------------------------------------------------
server.tool(
  "get_traffic_intensity",
  "Obtiene la intensidad de tráfico en tiempo real de los sensores de Madrid. Devuelve lecturas con nivel de carga y servicio.",
  {
    zone: z.string().optional().describe("Texto libre para filtrar sensores por ubicación"),
    min_load: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Solo devuelve sensores con carga superior a este porcentaje"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(30)
      .describe("Número máximo de sensores (por defecto 30)"),
  },
  async ({ zone, min_load, limit }) => {
    try {
      const params: Record<string, string> = { limit: String(limit) };
      if (zone) params.zone = zone;
      if (min_load !== undefined) params.min_load = String(min_load);

      const data = (await api("/api/trafico/intensidad", params)) as {
        data?: Array<{
          sensorId?: string;
          description?: string;
          intensity?: number;
          occupancy?: number;
          load?: number;
          serviceLevel?: number;
          recordedAt?: string;
        }>;
      };

      type ReadingItem = NonNullable<typeof data.data>[number];
      const readings = extractArray<ReadingItem>(data);

      if (!readings || readings.length === 0) {
        return {
          content: [{ type: "text", text: "No se encontraron lecturas recientes para los filtros indicados." }],
        };
      }

      const levelLabel = (l?: number) =>
        l !== undefined ? (["Fluido", "Lento", "Retenciones", "Congestión"][l] ?? String(l)) : "—";

      const lines: string[] = [
        `Sensores de tráfico Madrid (${readings.length} lecturas):`,
        "",
      ];

      for (const r of readings) {
        lines.push(
          `Sensor ${r.sensorId ?? "—"} — ${r.description ?? "Sin descripción"}` +
            `\n  Intensidad: ${r.intensity ?? "—"} veh/h | Carga: ${r.load ?? "—"}% | Nivel: ${levelLabel(r.serviceLevel)}`
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// predict_congestion
// ---------------------------------------------------------------------------
server.tool(
  "predict_congestion",
  "Predice la congestión de tráfico para las próximas horas basándose en patrones históricos y datos en tiempo real.",
  {
    hours: z
      .number()
      .int()
      .min(1)
      .max(24)
      .default(3)
      .describe("Número de horas a predecir (1–24, por defecto 3)"),
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
  },
  async ({ hours, province }) => {
    try {
      const params: Record<string, string> = { hours: String(hours) };
      if (province) params.province = province;

      const data = (await api("/api/prediccion/congestion", params)) as {
        predictions?: Array<{
          hour?: string;
          level?: string;
          description?: string;
          roads?: string[];
        }>;
        summary?: string;
      };

      if (!data.predictions || data.predictions.length === 0) {
        return {
          content: [{ type: "text", text: "No hay datos de predicción de congestión disponibles." }],
        };
      }

      const lines: string[] = [
        `Predicción de congestión para las próximas ${hours} horas:`,
        "",
      ];

      if (data.summary) lines.push(data.summary, "");

      for (const p of data.predictions) {
        lines.push(
          `${p.hour ?? "—"}: ${p.level ?? "—"}` +
            (p.description ? ` — ${p.description}` : "") +
            (p.roads && p.roads.length > 0 ? `\n  Carreteras: ${p.roads.join(", ")}` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// predict_accident_risk
// ---------------------------------------------------------------------------
server.tool(
  "predict_accident_risk",
  "Predice el riesgo de accidente en una carretera según las condiciones meteorológicas y el historial.",
  {
    road: z.string().optional().describe("Número de carretera, p.ej. 'A-1', 'N-340'"),
    weather: z
      .string()
      .optional()
      .describe("Condición meteorológica, p.ej. 'rain', 'fog', 'snow', 'wind'"),
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
  },
  async ({ road, weather, province }) => {
    try {
      const params: Record<string, string> = {};
      if (road) params.road = road;
      if (weather) params.weather = weather;
      if (province) params.province = province;

      const data = (await api("/api/prediccion/riesgo", params)) as {
        riskLevel?: string;
        score?: number;
        factors?: string[];
        recommendation?: string;
        zones?: Array<{ name?: string; risk?: string; description?: string }>;
      };

      const lines: string[] = ["Análisis de riesgo de accidente:", ""];

      if (data.riskLevel) lines.push(`Nivel de riesgo: ${data.riskLevel}`);
      if (data.score !== undefined) lines.push(`Puntuación: ${data.score}/100`);
      if (data.factors && data.factors.length > 0) {
        lines.push(`Factores: ${data.factors.join(", ")}`);
      }
      if (data.recommendation) lines.push(`\nRecomendación: ${data.recommendation}`);

      if (data.zones && data.zones.length > 0) {
        lines.push("", "Zonas de riesgo:");
        for (const z of data.zones) {
          lines.push(
            `  ${z.name ?? "—"}: ${z.risk ?? "—"}` + (z.description ? ` — ${z.description}` : "")
          );
        }
      }

      if (lines.length <= 2) {
        lines.push("No hay datos de riesgo disponibles para los parámetros indicados.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// FUEL TOOLS
// ===========================================================================

// ---------------------------------------------------------------------------
// get_fuel_prices
// ---------------------------------------------------------------------------
server.tool(
  "get_fuel_prices",
  "Obtiene precios de combustible en gasolineras de una provincia. Devuelve nombre, dirección y precios actuales.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos), p.ej. '28' para Madrid"),
    fuel_type: z
      .enum(["gasolina95", "gasolina98", "gasoleo", "gasoleoplus", "glp", "gnc", "hidrogeno"])
      .optional()
      .describe("Tipo de combustible para mostrar precio"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe("Número máximo de resultados (por defecto 20)"),
  },
  async ({ province, fuel_type, limit }) => {
    try {
      const params: Record<string, string> = { limit: String(limit) };
      if (province) params.province = province;
      if (fuel_type) params.fuelType = fuel_type;

      const data = (await api("/api/gas-stations", params)) as {
        total?: number;
        data?: Array<{
          name?: string;
          address?: string;
          municipality?: string;
          provinceName?: string;
          priceGasolina95?: number | string;
          priceGasolina98?: number | string;
          priceGasoleoA?: number | string;
          priceGasoleoPremium?: number | string;
          priceGlp?: number | string;
          schedule?: string;
        }>;
      };

      type StationItem = NonNullable<typeof data.data>[number];
      const stations = extractArray<StationItem>(data);
      const total = data.total ?? stations.length;

      if (stations.length === 0) {
        return {
          content: [{ type: "text", text: "No se encontraron gasolineras para los filtros indicados." }],
        };
      }

      const lines: string[] = [
        `Gasolineras: ${total} totales (mostrando ${stations.length})`,
        "",
      ];

      for (const st of stations) {
        const loc = [st.address, st.municipality, st.provinceName].filter(Boolean).join(", ");
        const prices: string[] = [];
        if (st.priceGasolina95) prices.push(`G95: ${Number(st.priceGasolina95).toFixed(3)} €`);
        if (st.priceGasolina98) prices.push(`G98: ${Number(st.priceGasolina98).toFixed(3)} €`);
        if (st.priceGasoleoA) prices.push(`Gasóleo A: ${Number(st.priceGasoleoA).toFixed(3)} €`);
        if (st.priceGasoleoPremium) prices.push(`Gasóleo+: ${Number(st.priceGasoleoPremium).toFixed(3)} €`);
        if (st.priceGlp) prices.push(`GLP: ${Number(st.priceGlp).toFixed(3)} €`);

        lines.push(
          `${st.name ?? "—"} — ${loc}` +
            (prices.length > 0 ? `\n  ${prices.join(" | ")}` : "") +
            (st.schedule ? `\n  Horario: ${st.schedule}` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_cheapest_fuel
// ---------------------------------------------------------------------------
server.tool(
  "get_cheapest_fuel",
  "Encuentra las gasolineras más baratas de una provincia para un tipo de combustible concreto.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
    fuel: z
      .enum(["gasolina95", "gasolina98", "gasoleo", "gasoleoplus", "glp"])
      .default("gasolina95")
      .describe("Tipo de combustible (por defecto gasolina95)"),
    limit: z.number().int().min(1).max(20).default(10).describe("Número de estaciones a devolver"),
  },
  async ({ province, fuel, limit }) => {
    try {
      const params: Record<string, string> = { fuel, limit: String(limit) };
      if (province) params.province = province;

      const data = (await api("/api/gas-stations/cheapest", params)) as {
        fuel?: string;
        data?: Array<{
          name?: string;
          address?: string;
          municipality?: string;
          provinceName?: string;
          price?: number | string;
          distance?: number;
        }>;
      };

      type CheapItem = NonNullable<typeof data.data>[number];
      const stations = extractArray<CheapItem>(data);

      if (stations.length === 0) {
        return {
          content: [{ type: "text", text: "No se encontraron gasolineras baratas para los filtros indicados." }],
        };
      }

      const fuelLabel = data.fuel ?? fuel;
      const lines: string[] = [`Top ${stations.length} gasolineras más baratas (${fuelLabel}):`, ""];

      for (const [i, st] of stations.entries()) {
        const loc = [st.address, st.municipality, st.provinceName].filter(Boolean).join(", ");
        lines.push(
          `${i + 1}. ${st.name ?? "—"} — ${loc}` +
            (st.price !== undefined ? `\n   Precio: ${Number(st.price).toFixed(3)} €/L` : "") +
            (st.distance !== undefined ? ` (${Number(st.distance).toFixed(1)} km)` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_fuel_trend
// ---------------------------------------------------------------------------
server.tool(
  "get_fuel_trend",
  "Muestra la evolución del precio del combustible en una provincia durante los últimos 30 días.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
    fuel: z
      .enum(["gasolina95", "gasolina98", "gasoleo"])
      .default("gasolina95")
      .describe("Tipo de combustible"),
  },
  async ({ province, fuel }) => {
    try {
      const params: Record<string, string> = { fuel };
      if (province) params.province = province;

      const data = (await api("/api/combustible/tendencia", params)) as {
        fuel?: string;
        province?: string;
        trend?: string;
        current?: number;
        min30d?: number;
        max30d?: number;
        avg30d?: number;
        history?: Array<{ date: string; price: number }>;
      };

      const lines: string[] = [
        `Tendencia de ${data.fuel ?? fuel}${data.province ? ` en provincia ${data.province}` : " en España"}:`,
        "",
      ];

      if (data.current !== undefined) lines.push(`Precio actual: ${Number(data.current).toFixed(3)} €/L`);
      if (data.avg30d !== undefined) lines.push(`Media 30 días: ${Number(data.avg30d).toFixed(3)} €/L`);
      if (data.min30d !== undefined) lines.push(`Mínimo 30 días: ${Number(data.min30d).toFixed(3)} €/L`);
      if (data.max30d !== undefined) lines.push(`Máximo 30 días: ${Number(data.max30d).toFixed(3)} €/L`);
      if (data.trend) lines.push(`Tendencia: ${data.trend}`);

      if (data.history && data.history.length > 0) {
        lines.push("", "Historial reciente (últimas 7 entradas):");
        const recent = data.history.slice(-7);
        for (const h of recent) {
          lines.push(`  ${h.date}: ${Number(h.price).toFixed(3)} €/L`);
        }
      }

      if (lines.length <= 2) {
        lines.push("No hay datos de tendencia disponibles.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// predict_fuel_price
// ---------------------------------------------------------------------------
server.tool(
  "predict_fuel_price",
  "Predice el precio del combustible para los próximos días basándose en tendencias de mercado.",
  {
    fuel: z
      .enum(["gasolina95", "gasolina98", "gasoleo"])
      .default("gasolina95")
      .describe("Tipo de combustible"),
    days: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(7)
      .describe("Número de días a predecir (1–30, por defecto 7)"),
  },
  async ({ fuel, days }) => {
    try {
      const data = (await api("/api/prediccion/combustible", { fuel, days: String(days) })) as {
        fuel?: string;
        predictions?: Array<{ date: string; price: number; confidence?: number }>;
        trend?: string;
        recommendation?: string;
      };

      if (!data.predictions || data.predictions.length === 0) {
        return {
          content: [{ type: "text", text: "No hay predicciones de precio disponibles." }],
        };
      }

      const lines: string[] = [
        `Predicción de precio de ${data.fuel ?? fuel} para los próximos ${days} días:`,
        "",
      ];

      for (const p of data.predictions) {
        const conf = p.confidence !== undefined ? ` (confianza: ${Math.round(p.confidence * 100)}%)` : "";
        lines.push(`  ${p.date}: ${Number(p.price).toFixed(3)} €/L${conf}`);
      }

      if (data.trend) lines.push("", `Tendencia: ${data.trend}`);
      if (data.recommendation) lines.push(`Recomendación: ${data.recommendation}`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// RAILWAY TOOLS
// ===========================================================================

// ---------------------------------------------------------------------------
// get_railway_alerts
// ---------------------------------------------------------------------------
server.tool(
  "get_railway_alerts",
  "Obtiene alertas de servicio ferroviario de Renfe (cancelaciones, retrasos, modificaciones). Cubre Cercanías, AVE y larga distancia.",
  {
    service_type: z
      .enum(["CERCANIAS", "AVE", "LARGA_DISTANCIA", "REGIONAL", "MEDIA_DISTANCIA"])
      .optional()
      .describe("Filtra por tipo de servicio ferroviario"),
    effect: z
      .enum(["NO_SERVICE", "REDUCED_SERVICE", "SIGNIFICANT_DELAYS", "DETOUR", "MODIFIED_SERVICE"])
      .optional()
      .describe("Filtra por tipo de efecto"),
  },
  async ({ service_type, effect }) => {
    try {
      const params: Record<string, string> = {};
      if (service_type) params.serviceType = service_type;
      if (effect) params.effect = effect;

      const data = (await api("/api/trenes/alertas", params)) as {
        total?: number;
        data?: Array<{
          alertId?: string;
          headerText?: string;
          description?: string;
          cause?: string;
          effect?: string;
          serviceType?: string;
          routeIds?: string[];
          activePeriodStart?: string;
          activePeriodEnd?: string;
        }>;
      };

      type RailAlertItem = NonNullable<typeof data.data>[number];
      const alerts = extractArray<RailAlertItem>(data);

      if (alerts.length === 0) {
        return {
          content: [{ type: "text", text: "No hay alertas ferroviarias activas en este momento." }],
        };
      }

      const lines: string[] = [`Alertas Renfe activas: ${alerts.length}`, ""];

      for (const a of alerts) {
        const until = a.activePeriodEnd
          ? ` hasta ${a.activePeriodEnd.replace("T", " ").slice(0, 16)}`
          : "";
        const stype = a.serviceType ? ` [${a.serviceType}]` : "";
        const routes =
          a.routeIds && a.routeIds.length > 0
            ? `\n  Líneas afectadas: ${a.routeIds.slice(0, 5).join(", ")}`
            : "";

        lines.push(
          `${a.headerText ?? a.alertId ?? "Alerta"}${stype}` +
            `\n  Efecto: ${a.effect ?? "—"}${a.cause ? ` | Causa: ${a.cause}` : ""}${until}` +
            routes +
            (a.description
              ? `\n  ${a.description.slice(0, 300)}${a.description.length > 300 ? "..." : ""}`
              : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_train_fleet
// ---------------------------------------------------------------------------
server.tool(
  "get_train_fleet",
  "Información sobre el material rodante de Renfe y flotas de trenes por marca o tipo de servicio.",
  {
    brand: z
      .string()
      .optional()
      .describe("Marca o tipo, p.ej. 'AVE', 'Avant', 'Alvia', 'Cercanías'"),
  },
  async ({ brand }) => {
    try {
      const params: Record<string, string> = {};
      if (brand) params.brand = brand;

      const data = (await api("/api/trenes/flota", params)) as {
        data?: Array<{
          brand?: string;
          series?: string;
          units?: number;
          capacity?: number;
          speed?: number;
          description?: string;
        }>;
      };

      type FleetItem = NonNullable<typeof data.data>[number];
      const fleet = extractArray<FleetItem>(data);

      if (fleet.length === 0) {
        return {
          content: [{ type: "text", text: "No se encontraron datos de flota para los parámetros indicados." }],
        };
      }

      const lines: string[] = [`Flota Renfe (${fleet.length} series):`, ""];

      for (const f of fleet) {
        lines.push(
          `${f.brand ?? "—"} — Serie ${f.series ?? "—"}` +
            (f.units !== undefined ? `\n  Unidades: ${f.units}` : "") +
            (f.capacity !== undefined ? ` | Capacidad: ${f.capacity} pax` : "") +
            (f.speed !== undefined ? ` | Velocidad máx: ${f.speed} km/h` : "") +
            (f.description ? `\n  ${f.description}` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_railway_stations
// ---------------------------------------------------------------------------
server.tool(
  "get_railway_stations",
  "Catálogo de estaciones de Renfe con ubicación y tipos de servicio disponibles.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
    service_type: z
      .enum(["CERCANIAS", "AVE", "LARGA_DISTANCIA", "REGIONAL", "MEDIA_DISTANCIA"])
      .optional()
      .describe("Filtra por tipo de servicio"),
    query: z.string().optional().describe("Nombre de la estación (búsqueda parcial)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Número máximo de resultados (por defecto 20)"),
  },
  async ({ province, service_type, query, limit }) => {
    try {
      const params: Record<string, string> = { limit: String(limit) };
      if (province) params.province = province;
      if (service_type) params.serviceType = service_type;
      if (query) params.q = query;

      const data = (await api("/api/trenes/estaciones", params)) as {
        total?: number;
        type?: string;
        features?: Array<{
          properties?: {
            name?: string;
            municipality?: string;
            provinceName?: string;
            network?: string;
            serviceTypes?: string[];
            code?: string;
            wheelchair?: number;
          };
          geometry?: { coordinates?: [number, number] };
        }>;
        data?: Array<{
          name?: string;
          municipality?: string;
          provinceName?: string;
          network?: string;
          serviceTypes?: string[];
          code?: string;
          wheelchair?: number;
          latitude?: number;
          longitude?: number;
        }>;
      };

      // Handle both GeoJSON FeatureCollection and plain array
      let stations: Array<{
        name?: string;
        municipality?: string;
        provinceName?: string;
        network?: string;
        serviceTypes?: string[];
        code?: string;
        wheelchair?: number;
        latitude?: number;
        longitude?: number;
      }> = [];

      if (data.type === "FeatureCollection" && data.features) {
        stations = data.features.map((f) => ({
          ...f.properties,
          latitude: f.geometry?.coordinates?.[1],
          longitude: f.geometry?.coordinates?.[0],
        }));
      } else if (data.data) {
        stations = data.data;
      } else if (Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stations = (data as any[]).map((item) => item as typeof stations[number]);
      }

      const total = data.total ?? stations.length;

      if (stations.length === 0) {
        return {
          content: [{ type: "text", text: "No se encontraron estaciones ferroviarias para los filtros indicados." }],
        };
      }

      const lines: string[] = [
        `Estaciones ferroviarias: ${total} totales (mostrando ${stations.length})`,
        "",
      ];

      for (const st of stations) {
        const loc = [st.municipality, st.provinceName].filter(Boolean).join(", ");
        const svcs = st.serviceTypes && st.serviceTypes.length > 0 ? st.serviceTypes.join(", ") : "—";
        const net = st.network ? ` [Red: ${st.network}]` : "";
        const wc = st.wheelchair === 1 ? " ♿" : "";
        lines.push(
          `${st.name ?? "—"}${wc} — ${loc}${net}` +
            `\n  Servicios: ${svcs}` +
            (st.code ? ` | Código: ${st.code}` : "") +
            (st.latitude && st.longitude
              ? `\n  Coordenadas: ${Number(st.latitude).toFixed(5)}, ${Number(st.longitude).toFixed(5)}`
              : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// WEATHER TOOLS
// ===========================================================================

// ---------------------------------------------------------------------------
// get_weather_alerts
// ---------------------------------------------------------------------------
server.tool(
  "get_weather_alerts",
  "Obtiene alertas meteorológicas activas de AEMET que pueden afectar al tráfico. Filtra por provincia.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos), p.ej. '28' para Madrid"),
    severity: z
      .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
      .optional()
      .describe("Severidad mínima"),
  },
  async ({ province, severity }) => {
    try {
      const params: Record<string, string> = {};
      if (province) params.province = province;
      if (severity) params.severity = severity;

      const data = (await api("/api/weather-alerts", params)) as {
        data?: Array<{
          type?: string;
          severity?: string;
          provinceName?: string;
          description?: string;
          startedAt?: string;
          endedAt?: string;
          windSpeedKmh?: number;
          windGustKmh?: number;
          rainfallMm?: number;
          snowLevelM?: number;
          waveHeightM?: number;
        }>;
      };

      type WeatherAlertItem = NonNullable<typeof data.data>[number];
      const alerts = extractArray<WeatherAlertItem>(data);

      if (alerts.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: province
                ? `No hay alertas meteorológicas activas para la provincia ${province}.`
                : "No hay alertas meteorológicas activas en España.",
            },
          ],
        };
      }

      const lines: string[] = [`Alertas meteorológicas activas: ${alerts.length}`, ""];

      for (const a of alerts) {
        const validUntil = a.endedAt
          ? ` hasta ${a.endedAt.replace("T", " ").slice(0, 16)}`
          : "";
        const details: string[] = [];
        if (a.windSpeedKmh) details.push(`Viento: ${a.windSpeedKmh} km/h`);
        if (a.windGustKmh) details.push(`Racha: ${a.windGustKmh} km/h`);
        if (a.rainfallMm) details.push(`Lluvia: ${a.rainfallMm} mm`);
        if (a.snowLevelM) details.push(`Nieve: desde ${a.snowLevelM} m`);
        if (a.waveHeightM) details.push(`Olas: ${Number(a.waveHeightM).toFixed(1)} m`);

        lines.push(
          `[${a.severity ?? "?"}] ${a.type ?? "Alerta"} — ${a.provinceName ?? "—"}${validUntil}` +
            (a.description ? `\n  ${a.description}` : "") +
            (details.length ? `\n  ${details.join(" | ")}` : "")
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ---------------------------------------------------------------------------
// get_climate_history
// ---------------------------------------------------------------------------
server.tool(
  "get_climate_history",
  "Consulta el historial climático de una provincia: temperaturas, precipitaciones, viento u otras métricas.",
  {
    province: z.string().optional().describe("Código INE de la provincia (2 dígitos)"),
    metric: z
      .enum(["temperature", "precipitation", "wind", "humidity", "pressure"])
      .default("temperature")
      .describe("Métrica climática"),
    months: z
      .number()
      .int()
      .min(1)
      .max(24)
      .default(3)
      .describe("Número de meses hacia atrás (por defecto 3)"),
  },
  async ({ province, metric, months }) => {
    try {
      const params: Record<string, string> = { metric, months: String(months) };
      if (province) params.province = province;

      const data = (await api("/api/clima/historico", params)) as {
        metric?: string;
        province?: string;
        data?: Array<{ date?: string; value?: number; unit?: string }>;
        avg?: number;
        min?: number;
        max?: number;
        unit?: string;
      };

      const lines: string[] = [
        `Historial de ${data.metric ?? metric}${data.province ? ` en provincia ${data.province}` : ""}:`,
        "",
      ];

      if (data.avg !== undefined) lines.push(`Media: ${Number(data.avg).toFixed(1)} ${data.unit ?? ""}`);
      if (data.min !== undefined) lines.push(`Mínimo: ${Number(data.min).toFixed(1)} ${data.unit ?? ""}`);
      if (data.max !== undefined) lines.push(`Máximo: ${Number(data.max).toFixed(1)} ${data.unit ?? ""}`);

      if (data.data && data.data.length > 0) {
        lines.push("", "Últimas mediciones:");
        const recent = data.data.slice(-10);
        for (const d of recent) {
          lines.push(`  ${d.date ?? "—"}: ${d.value !== undefined ? Number(d.value).toFixed(1) : "—"} ${d.unit ?? data.unit ?? ""}`);
        }
      }

      if (lines.length <= 2) {
        lines.push("No hay datos históricos disponibles para los parámetros indicados.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// SEARCH TOOL
// ===========================================================================

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------
server.tool(
  "search",
  "Búsqueda de texto completo en trafico.live: incidencias, carreteras, cámaras, gasolineras, estaciones ferroviarias, alertas meteorológicas, artículos.",
  {
    query: z.string().min(1).describe("Consulta de búsqueda en español o inglés"),
    type: z
      .enum(["all", "incidents", "stations", "roads", "cameras", "fuel", "weather", "articles"])
      .default("all")
      .describe("Limita la búsqueda a una categoría (por defecto: all)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Número máximo de resultados (por defecto 10)"),
  },
  async ({ query, type, limit }) => {
    try {
      const data = (await api("/api/search", { q: query, type, limit: String(limit) })) as {
        results?: Array<{
          collection?: string;
          found?: number;
          hits?: Array<{
            name?: string;
            title?: string;
            headerText?: string;
            roadNumber?: string;
            provinceName?: string;
            type?: string;
            severity?: string;
            effect?: string;
            serviceType?: string;
            description?: string;
            summary?: string;
            priceGasoleoA?: number | string;
            priceGasolina95?: number | string;
          }>;
        }>;
        total?: number;
      };

      type SearchResultItem = NonNullable<typeof data.results>[number];
      const results = data.results ?? extractArray<SearchResultItem>(data);

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No se encontraron resultados para "${query}".` }],
        };
      }

      const lines: string[] = [`Resultados de búsqueda para "${query}":`, ""];
      let totalHits = data.total ?? 0;

      for (const col of results) {
        if (!col.hits || col.hits.length === 0) continue;
        totalHits += col.found ?? col.hits.length;
        lines.push(`--- ${(col.collection ?? "").toUpperCase().replace("_", " ")} (${col.found ?? col.hits.length} resultados) ---`);

        for (const hit of col.hits) {
          const parts: string[] = [];
          const name = hit.name ?? hit.title ?? hit.headerText ?? hit.roadNumber ?? "—";
          parts.push(String(name));

          if (hit.provinceName) parts.push(hit.provinceName);
          if (hit.type) parts.push(`[${hit.type}]`);
          if (hit.severity) parts.push(`[${hit.severity}]`);
          if (hit.effect) parts.push(`[${hit.effect}]`);
          if (hit.serviceType) parts.push(`[${hit.serviceType}]`);
          if (hit.priceGasoleoA) parts.push(`Gasóleo: ${hit.priceGasoleoA} €`);
          if (hit.priceGasolina95) parts.push(`G95: ${hit.priceGasolina95} €`);
          if (hit.description)
            parts.push(`— ${String(hit.description).slice(0, 100)}${String(hit.description).length > 100 ? "..." : ""}`);
          else if (hit.summary)
            parts.push(`— ${String(hit.summary).slice(0, 100)}${String(hit.summary).length > 100 ? "..." : ""}`);

          lines.push(`  • ${parts.join(" | ")}`);
        }

        lines.push("");
      }

      if (totalHits > 0) lines.push(`Total: ${totalHits} resultados encontrados`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// MOBILITY TOOL
// ===========================================================================

// ---------------------------------------------------------------------------
// get_mobility_flows
// ---------------------------------------------------------------------------
server.tool(
  "get_mobility_flows",
  "Consulta los flujos de movilidad entre municipios o provincias de España.",
  {
    origin: z.string().optional().describe("Municipio o provincia de origen"),
    dest: z.string().optional().describe("Municipio o provincia de destino"),
    date: z
      .string()
      .optional()
      .describe("Fecha en formato YYYY-MM-DD (por defecto: hoy)"),
  },
  async ({ origin, dest, date }) => {
    try {
      const params: Record<string, string> = {};
      if (origin) params.origin = origin;
      if (dest) params.dest = dest;
      if (date) params.date = date;

      const data = (await api("/api/movilidad", params)) as {
        origin?: string;
        dest?: string;
        date?: string;
        flows?: Array<{
          from?: string;
          to?: string;
          trips?: number;
          distance?: number;
          mode?: string;
        }>;
        total_trips?: number;
        summary?: string;
      };

      const lines: string[] = [
        `Flujos de movilidad${data.origin ? ` desde ${data.origin}` : ""}${data.dest ? ` hacia ${data.dest}` : ""}${data.date ? ` (${data.date})` : ""}:`,
        "",
      ];

      if (data.total_trips !== undefined) lines.push(`Total de desplazamientos: ${data.total_trips.toLocaleString("es")}`);
      if (data.summary) lines.push(data.summary, "");

      if (data.flows && data.flows.length > 0) {
        for (const f of data.flows.slice(0, 20)) {
          lines.push(
            `${f.from ?? "—"} → ${f.to ?? "—"}` +
              (f.trips !== undefined ? `: ${f.trips.toLocaleString("es")} viajes` : "") +
              (f.distance !== undefined ? ` | Distancia media: ${Number(f.distance).toFixed(1)} km` : "") +
              (f.mode ? ` [${f.mode}]` : "")
          );
        }
      } else {
        lines.push("No hay datos de flujos disponibles para los parámetros indicados.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return errResponse(err);
    }
  }
);

// ===========================================================================
// Entry point
// ===========================================================================
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[trafico-mcp] Fatal error:", err);
  process.exit(1);
});
