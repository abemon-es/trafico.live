/**
 * nearby_search — Find entities near a location
 */

import { Client as Typesense } from "typesense";

const ts = new Typesense({
  nodes: [{ host: process.env.TYPESENSE_HOST || "10.100.0.1", port: parseInt(process.env.TYPESENSE_PORT || "6442"), protocol: "http" }],
  apiKey: process.env.TYPESENSE_API_KEY || "",
  connectionTimeoutSeconds: 5,
});

const GEO_COLLECTIONS = [
  { collection: "gas_stations", queryBy: "name,locality,provinceName,fuelTypes", label: "Gasolineras" },
  { collection: "ev_chargers", queryBy: "name,city,provinceName,chargerTypes", label: "Cargadores EV" },
  { collection: "cameras", queryBy: "name,roadNumber,provinceName", label: "Cámaras" },
  { collection: "radars", queryBy: "roadNumber,provinceName", label: "Radares" },
  { collection: "railway_stations", queryBy: "name,provinceName", label: "Estaciones de tren" },
];

export async function nearbySearch(args: { query: string; lat?: number; lng?: number; radius_km?: number }): Promise<string> {
  const radius = Math.min(args.radius_km || 10, 100);
  const radiusM = radius * 1000;

  // If no coords, do a text-only search
  if (!args.lat || !args.lng) {
    const response = await ts.multiSearch.perform({
      searches: GEO_COLLECTIONS.map((c) => ({
        collection: c.collection,
        q: args.query,
        query_by: c.queryBy,
        per_page: 5,
      })),
    }, {});

    const results = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown> }> }> }).results;
    const lines: string[] = [`Resultados para "${args.query}":\n`];
    results.forEach((r, i) => {
      const hits = r.hits || [];
      if (hits.length > 0) {
        lines.push(`## ${GEO_COLLECTIONS[i].label} (${hits.length})`);
        hits.forEach((h) => {
          const d = h.document;
          lines.push(`- ${d.name || d.roadNumber || d.id} — ${d.provinceName || d.city || ""}`);
        });
        lines.push("");
      }
    });
    return lines.join("\n");
  }

  // Geo search
  const response = await ts.multiSearch.perform({
    searches: GEO_COLLECTIONS.map((c) => ({
      collection: c.collection,
      q: args.query || "*",
      query_by: c.queryBy,
      filter_by: `location:(${args.lat}, ${args.lng}, ${radiusM} m)`,
      sort_by: `location(${args.lat}, ${args.lng}):asc`,
      per_page: 5,
    })),
  }, {});

  const results = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown>; geo_distance_meters?: { location: number } }> }> }).results;
  const lines: string[] = [`Resultados cerca de (${args.lat?.toFixed(4)}, ${args.lng?.toFixed(4)}), radio ${radius}km:\n`];
  results.forEach((r, i) => {
    const hits = r.hits || [];
    if (hits.length > 0) {
      lines.push(`## ${GEO_COLLECTIONS[i].label} (${hits.length})`);
      hits.forEach((h) => {
        const d = h.document;
        const dist = h.geo_distance_meters?.location;
        const distStr = dist ? ` (${(dist / 1000).toFixed(1)}km)` : "";
        lines.push(`- ${d.name || d.roadNumber || d.id}${distStr} — ${d.provinceName || d.city || ""}`);
      });
      lines.push("");
    }
  });
  return lines.join("\n");
}
