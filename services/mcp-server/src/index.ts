#!/usr/bin/env node
/**
 * trafico.live MCP Server
 *
 * Exposes traffic intelligence tools that use:
 * - Typesense for data retrieval (50k+ entities)
 * - Claude Haiku for synthesis and natural language answers
 *
 * Tools:
 *   route_check    — Check road conditions between two points
 *   nearby_search  — Find entities near coordinates
 *   price_compare  — Compare fuel prices in a province
 *   trip_plan      — Plan a road trip with stops
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { routeCheck } from "./tools/route-check.js";
import { nearbySearch } from "./tools/nearby.js";
import { priceCompare } from "./tools/price-compare.js";
import { tripPlan } from "./tools/trip-plan.js";

const server = new Server(
  { name: "trafico-live", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "route_check",
      description: "Check road conditions, incidents, radars, and weather between two Spanish cities or along a specific road. Returns a natural language summary of current conditions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Origin city or location (e.g., 'Madrid')" },
          to: { type: "string", description: "Destination city or location (e.g., 'Sevilla')" },
          road: { type: "string", description: "Specific road to check (e.g., 'A-4'). Optional — if omitted, main routes between from/to are inferred." },
        },
        required: ["from"],
      },
    },
    {
      name: "nearby_search",
      description: "Find gas stations, EV chargers, cameras, radars, train stations, and other traffic entities near a location. Supports natural language queries like 'cheapest diesel near Atocha'.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Natural language search query (e.g., 'gasolinera 24h cerca de Atocha')" },
          lat: { type: "number", description: "Latitude (optional — resolved from query if omitted)" },
          lng: { type: "number", description: "Longitude (optional — resolved from query if omitted)" },
          radius_km: { type: "number", description: "Search radius in km (default: 10, max: 100)" },
        },
        required: ["query"],
      },
    },
    {
      name: "price_compare",
      description: "Compare fuel prices across gas stations in a province or city. Returns cheapest stations with prices, sorted by price.",
      inputSchema: {
        type: "object" as const,
        properties: {
          location: { type: "string", description: "Province or city name (e.g., 'Madrid', 'Murcia')" },
          fuel_type: { type: "string", enum: ["diesel", "gasolina95", "gasolina98", "glp", "gnc"], description: "Fuel type to compare (default: diesel)" },
          limit: { type: "number", description: "Max results (default: 10)" },
        },
        required: ["location"],
      },
    },
    {
      name: "trip_plan",
      description: "Plan a road trip between Spanish cities. Returns route options, estimated driving conditions, gas stations along the way, rest areas, radars to watch for, and current incidents.",
      inputSchema: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Origin city" },
          to: { type: "string", description: "Destination city" },
          stops: { type: "array", items: { type: "string" }, description: "Intermediate stops (optional)" },
          preferences: { type: "string", description: "Trip preferences: 'cheapest fuel', 'avoid tolls', 'ev charging', etc." },
        },
        required: ["from", "to"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result: string;
    switch (name) {
      case "route_check":
        result = await routeCheck(args as { from: string; to?: string; road?: string });
        break;
      case "nearby_search":
        result = await nearbySearch(args as { query: string; lat?: number; lng?: number; radius_km?: number });
        break;
      case "price_compare":
        result = await priceCompare(args as { location: string; fuel_type?: string; limit?: number });
        break;
      case "trip_plan":
        result = await tripPlan(args as { from: string; to: string; stops?: string[]; preferences?: string });
        break;
      default:
        result = `Unknown tool: ${name}`;
    }
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[trafico-mcp] Server running on stdio");
}

main().catch((error) => {
  console.error("[trafico-mcp] Fatal:", error);
  process.exit(1);
});
