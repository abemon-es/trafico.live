/**
 * trip_plan — Plan a road trip with Claude synthesis
 */

import Anthropic from "@anthropic-ai/sdk";
import { Client as Typesense } from "typesense";

const ts = new Typesense({
  nodes: [{ host: process.env.TYPESENSE_HOST || "10.100.0.1", port: parseInt(process.env.TYPESENSE_PORT || "6442"), protocol: "http" }],
  apiKey: process.env.TYPESENSE_API_KEY || "",
  connectionTimeoutSeconds: 5,
});

const anthropic = new Anthropic();

export async function tripPlan(args: { from: string; to: string; stops?: string[]; preferences?: string }): Promise<string> {
  const corridor = `${args.from} ${args.to} ${(args.stops || []).join(" ")}`.trim();

  // Gather data about the corridor
  const response = await ts.multiSearch.perform({
    searches: [
      { collection: "roads", q: corridor, query_by: "roadNumber,name", per_page: 5 },
      { collection: "incidents", q: corridor, query_by: "description,roadNumber,provinceName", per_page: 10 },
      { collection: "weather_alerts", q: corridor, query_by: "description,provinceName", per_page: 5 },
      { collection: "gas_stations", q: corridor, query_by: "name,locality,provinceName", per_page: 10, sort_by: "priceGasoleoA:asc" as string },
      { collection: "ev_chargers", q: corridor, query_by: "name,city,provinceName", per_page: 5 },
      { collection: "radars", q: corridor, query_by: "roadNumber,provinceName", per_page: 10 },
    ],
  }, {});

  const results = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown> }> }> }).results;
  const data = {
    roads: results[0]?.hits?.slice(0, 3).map((h) => h.document) || [],
    incidents: results[1]?.hits?.slice(0, 5).map((h) => h.document) || [],
    weather: results[2]?.hits?.slice(0, 3).map((h) => h.document) || [],
    gasStations: results[3]?.hits?.slice(0, 5).map((h) => h.document) || [],
    evChargers: results[4]?.hits?.slice(0, 3).map((h) => h.document) || [],
    radars: results[5]?.hits?.slice(0, 5).map((h) => h.document) || [],
  };

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `You are a Spanish road trip planner for trafico.live. Plan a trip based on this data. Answer in Spanish, be practical and specific.

Trip: ${args.from} → ${args.stops?.length ? args.stops.join(" → ") + " → " : ""}${args.to}
${args.preferences ? `Preferencias: ${args.preferences}` : ""}

Available data:
${JSON.stringify(data, null, 2)}

Respond with:
1. **Ruta recomendada** — main road(s) and why
2. **Estado actual** — incidents and weather (if any)
3. **Paradas recomendadas** — cheapest gas stations or EV chargers along the way
4. **Radares** — how many and notable speed limits
5. **Consejo** — one practical tip for this trip`,
    }],
  });

  return (msg.content[0] as { text: string }).text;
}
