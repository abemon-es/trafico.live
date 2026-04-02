/**
 * route_check — Check road conditions between two points
 *
 * 1. Resolve cities to provinces
 * 2. Query incidents, weather alerts, radars on the corridor
 * 3. Use Claude Haiku to synthesize a natural language summary
 */

import Anthropic from "@anthropic-ai/sdk";
import { Client as Typesense } from "typesense";

const ts = new Typesense({
  nodes: [{ host: process.env.TYPESENSE_HOST || "10.100.0.1", port: parseInt(process.env.TYPESENSE_PORT || "6442"), protocol: "http" }],
  apiKey: process.env.TYPESENSE_API_KEY || "",
  connectionTimeoutSeconds: 5,
});

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export async function routeCheck(args: { from: string; to?: string; road?: string }): Promise<string> {
  const searches: Array<{ collection: string; q: string; query_by: string; per_page: number; filter_by?: string }> = [];

  const roadQuery = args.road || `${args.from} ${args.to || ""}`.trim();

  // Search incidents on the corridor
  searches.push({
    collection: "incidents",
    q: roadQuery,
    query_by: "description,roadNumber,provinceName,municipality",
    per_page: 10,
  });

  // Search weather alerts
  searches.push({
    collection: "weather_alerts",
    q: args.from + (args.to ? ` ${args.to}` : ""),
    query_by: "description,provinceName",
    per_page: 5,
  });

  // Search radars on the road
  if (args.road) {
    searches.push({
      collection: "radars",
      q: args.road,
      query_by: "roadNumber,provinceName",
      per_page: 10,
    });
  }

  // Search the road itself
  searches.push({
    collection: "roads",
    q: roadQuery,
    query_by: "roadNumber,name",
    per_page: 3,
  });

  const response = await ts.multiSearch.perform({ searches }, {});
  const results = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown> }> }> }).results;

  const incidents = results[0]?.hits?.map((h) => h.document) || [];
  const weather = results[1]?.hits?.map((h) => h.document) || [];
  const radars = args.road ? (results[2]?.hits?.map((h) => h.document) || []) : [];
  const roads = results[args.road ? 3 : 2]?.hits?.map((h) => h.document) || [];

  // Synthesize with Claude Haiku
  const context = JSON.stringify({ incidents: incidents.slice(0, 5), weather: weather.slice(0, 3), radars: radars.slice(0, 5), roads }, null, 2);

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `You are a Spanish traffic assistant for trafico.live. Summarize the current road conditions based on this data. Answer in Spanish, be concise and practical.

Query: ${args.road ? `Estado de la ${args.road}` : `Ruta de ${args.from} a ${args.to || "destino"}`}

Data:
${context}

Respond with:
1. Estado general (1 line)
2. Incidencias activas (if any)
3. Alertas meteorológicas (if any)
4. Radares en ruta (count + notable ones)
5. Recomendación (1 line)`,
    }],
  });

  return (msg.content[0] as { text: string }).text;
}
