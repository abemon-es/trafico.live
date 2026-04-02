/**
 * Fuel price MCP tools.
 * Covers: current prices, cheapest nearby station, price trend.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";

const FUEL_FIELD_MAP: Record<string, string> = {
  gasoleoA: "priceGasoleoA",
  gasolina95: "priceGasolina95E5",
  gasolina98: "priceGasolina98E5",
  glp: "priceGLP",
  gnc: "priceGNC",
};

const FUEL_LABELS: Record<string, string> = {
  gasoleoA: "Gasóleo A",
  gasolina95: "Gasolina 95",
  gasolina98: "Gasolina 98",
  glp: "GLP/Autogas",
  gnc: "GNC",
};

export function registerFuelTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // get_fuel_prices
  // -----------------------------------------------------------------------
  server.tool(
    "get_fuel_prices",
    "Get current fuel station prices in Spain. Filter by province or fuel type. Sort by cheapest or most expensive.",
    {
      province: z.string().optional().describe("INE 2-digit province code, e.g. '28' for Madrid"),
      fuel_type: z
        .enum(["gasoleoA", "gasolina95", "gasolina98", "glp", "gnc"])
        .default("gasoleoA")
        .describe("Fuel type (default: gasoleoA)"),
      limit: z.number().int().min(1).max(50).default(20).describe("Maximum results (default 20)"),
      sort: z
        .enum(["cheapest", "expensive"])
        .default("cheapest")
        .describe("Sort order (default: cheapest)"),
    },
    async ({ province, fuel_type, limit, sort }) => {
      try {
        const db = getDb();
        const field = FUEL_FIELD_MAP[fuel_type] ?? "priceGasoleoA";
        const label = FUEL_LABELS[fuel_type] ?? fuel_type;

        const where: Record<string, unknown> = {
          [field]: { not: null },
        };
        if (province) where.province = province;

        const stations = await db.gasStation.findMany({
          where,
          orderBy: { [field]: sort === "cheapest" ? "asc" : "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            locality: true,
            provinceName: true,
            [field]: true,
            is24h: true,
            schedule: true,
            lastPriceUpdate: true,
          },
        });

        const total = await db.gasStation.count({ where });

        const lines: string[] = [
          `${label} — ${total} gasolineras (mostrando ${stations.length} ${sort === "cheapest" ? "más baratas" : "más caras"})`,
          province ? `Filtro: provincia ${province}` : "Ámbito: nacional",
          "",
        ];

        for (const st of stations) {
          const stTyped = st as typeof st & { lastPriceUpdate?: Date | null };
          const price = (st as Record<string, unknown>)[field];
          const loc = [st.locality, st.provinceName].filter(Boolean).join(", ");
          const h24 = st.is24h ? " [24h]" : "";
          const updated = stTyped.lastPriceUpdate
            ? stTyped.lastPriceUpdate.toISOString().slice(0, 10)
            : "—";
          lines.push(
            `${(price as number | string).toString().padStart(5)} €/L — ${st.name}${h24} (${loc}) [act. ${updated}]`
          );
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error al consultar precios: ${String(err)}` }] };
      }
    }
  );

  // -----------------------------------------------------------------------
  // get_cheapest_station
  // -----------------------------------------------------------------------
  server.tool(
    "get_cheapest_station",
    "Find the cheapest fuel stations near a GPS location within a given radius.",
    {
      latitude: z.number().min(-90).max(90).describe("Latitude in decimal degrees"),
      longitude: z.number().min(-180).max(180).describe("Longitude in decimal degrees"),
      fuel_type: z
        .enum(["gasoleoA", "gasolina95", "gasolina98", "glp", "gnc"])
        .default("gasoleoA")
        .describe("Fuel type (default: gasoleoA)"),
      radius_km: z
        .number().min(1).max(100).default(10)
        .describe("Search radius in kilometres (default 10)"),
    },
    async ({ latitude, longitude, fuel_type, radius_km }) => {
      try {
        const db = getDb();
        const field = FUEL_FIELD_MAP[fuel_type] ?? "priceGasoleoA";
        const label = FUEL_LABELS[fuel_type] ?? fuel_type;

        // Approximate bounding box (1 degree lat ≈ 111 km)
        const latDelta = radius_km / 111;
        const lngDelta = radius_km / (111 * Math.cos((latitude * Math.PI) / 180));

        const stations = await db.gasStation.findMany({
          where: {
            [field]: { not: null },
            latitude: {
              gte: latitude - latDelta,
              lte: latitude + latDelta,
            },
            longitude: {
              gte: longitude - lngDelta,
              lte: longitude + lngDelta,
            },
          },
          orderBy: { [field]: "asc" },
          take: 20,
          select: {
            name: true,
            address: true,
            locality: true,
            provinceName: true,
            latitude: true,
            longitude: true,
            [field]: true,
            is24h: true,
            schedule: true,
          },
        });

        type StationRow = {
          name: string | null;
          address: string | null;
          locality: string | null;
          provinceName: string | null;
          latitude: import("@prisma/client").Prisma.Decimal | null;
          longitude: import("@prisma/client").Prisma.Decimal | null;
          is24h: boolean;
          schedule: string | null;
          [key: string]: unknown;
        };

        // Filter by actual distance and return top 5
        const withDist = (stations as unknown as StationRow[])
          .map((st) => {
            const dLat = (Number(st.latitude) - latitude) * (Math.PI / 180);
            const dLng = (Number(st.longitude) - longitude) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((latitude * Math.PI) / 180) *
                Math.cos((Number(st.latitude) * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return { ...st, distKm };
          })
          .filter((st) => st.distKm <= radius_km)
          .sort((a, b) => {
            const pa = Number((a as Record<string, unknown>)[field] ?? 999);
            const pb = Number((b as Record<string, unknown>)[field] ?? 999);
            return pa - pb;
          })
          .slice(0, 5);

        if (withDist.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No se encontraron gasolineras con ${label} en un radio de ${radius_km} km.`,
              },
            ],
          };
        }

        const lines: string[] = [
          `Top ${withDist.length} gasolineras más baratas de ${label} a ${radius_km} km de (${latitude.toFixed(4)}, ${longitude.toFixed(4)}):`,
          "",
        ];

        for (const st of withDist) {
          const price = (st as Record<string, unknown>)[field];
          const addr = [st.address, st.locality, st.provinceName].filter(Boolean).join(", ");
          const h24 = st.is24h ? " [24h]" : "";
          lines.push(
            `${(price as number | string).toString().padStart(5)} €/L — ${st.name}${h24}\n  ${addr} (${st.distKm.toFixed(1)} km)`
          );
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error al buscar gasolinera cercana: ${String(err)}` }] };
      }
    }
  );

  // -----------------------------------------------------------------------
  // get_fuel_trend
  // -----------------------------------------------------------------------
  server.tool(
    "get_fuel_trend",
    "Get fuel price trend for Spain or a specific province. Compares current prices with N days ago.",
    {
      province: z.string().optional().describe("INE 2-digit province code (omit for national average)"),
      fuel_type: z
        .enum(["gasoleoA", "gasolina95", "gasolina98"])
        .default("gasoleoA")
        .describe("Fuel type"),
      days: z.number().int().min(1).max(365).default(30).describe("Days to look back (default 30)"),
    },
    async ({ province, fuel_type, days }) => {
      try {
        const db = getDb();
        const label = FUEL_LABELS[fuel_type] ?? fuel_type;

        // Build scope string matching FuelPriceDailyStats
        const scope = province ? `province:${province}` : "national";

        const today = new Date();
        const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

        // Get latest record
        const latest = await db.fuelPriceDailyStats.findFirst({
          where: { scope },
          orderBy: { date: "desc" },
          select: {
            date: true,
            avgGasoleoA: true,
            avgGasolina95: true,
            avgGasolina98: true,
            minGasoleoA: true,
            minGasolina95: true,
            minGasolina98: true,
            stationCount: true,
          },
        });

        // Get record from N days ago
        const past = await db.fuelPriceDailyStats.findFirst({
          where: {
            scope,
            date: { lte: pastDate },
          },
          orderBy: { date: "desc" },
          select: {
            date: true,
            avgGasoleoA: true,
            avgGasolina95: true,
            avgGasolina98: true,
          },
        });

        if (!latest) {
          return {
            content: [
              {
                type: "text",
                text: `No hay datos de tendencia de precios para ${scope}. El módulo de estadísticas diarias puede no estar activo.`,
              },
            ],
          };
        }

        const avgField = `avg${fuel_type.charAt(0).toUpperCase()}${fuel_type.slice(1)}` as keyof typeof latest;
        const minField = `min${fuel_type.charAt(0).toUpperCase()}${fuel_type.slice(1)}` as keyof typeof latest;

        const avgNow = Number(latest[avgField] ?? 0);
        const minNow = Number(latest[minField] ?? 0);
        const avgPast = past ? Number((past as Record<string, unknown>)[String(avgField)] ?? 0) : null;

        const lines: string[] = [
          `Tendencia de precio — ${label} (${province ? `provincia ${province}` : "nacional"})`,
          `Datos de: ${latest.date.toISOString().slice(0, 10)} (${latest.stationCount} estaciones)`,
          "",
          `Precio medio actual: ${avgNow.toFixed(3)} €/L`,
          `Precio mínimo actual: ${minNow.toFixed(3)} €/L`,
        ];

        if (avgPast !== null && past) {
          const diff = avgNow - avgPast;
          const pct = avgPast > 0 ? ((diff / avgPast) * 100).toFixed(2) : "—";
          const arrow = diff > 0 ? "▲ subida" : diff < 0 ? "▼ bajada" : "→ estable";
          lines.push(
            ``,
            `Hace ${days} días (${past.date.toISOString().slice(0, 10)}): ${avgPast.toFixed(3)} €/L`,
            `Variación: ${diff >= 0 ? "+" : ""}${diff.toFixed(3)} €/L (${diff >= 0 ? "+" : ""}${pct}%) — ${arrow}`
          );
        } else {
          lines.push(`\nNo hay datos históricos para hace ${days} días.`);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Error al consultar tendencia de combustible: ${String(err)}` }] };
      }
    }
  );
}
