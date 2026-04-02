/**
 * price_compare — Compare fuel prices in a location
 */

import { Client as Typesense } from "typesense";

const ts = new Typesense({
  nodes: [{ host: process.env.TYPESENSE_HOST || "10.100.0.1", port: parseInt(process.env.TYPESENSE_PORT || "6442"), protocol: "http" }],
  apiKey: process.env.TYPESENSE_API_KEY || "",
  connectionTimeoutSeconds: 5,
});

const FUEL_FIELD_MAP: Record<string, string> = {
  diesel: "priceGasoleoA",
  gasolina95: "priceGasolina95",
  gasolina98: "priceGasolina98",
  glp: "priceGLP",
  gnc: "priceGNC",
};

const FUEL_LABEL_MAP: Record<string, string> = {
  diesel: "Diésel",
  gasolina95: "Gasolina 95",
  gasolina98: "Gasolina 98",
  glp: "GLP",
  gnc: "GNC",
};

export async function priceCompare(args: { location: string; fuel_type?: string; limit?: number }): Promise<string> {
  const fuelType = args.fuel_type || "diesel";
  const fuelField = FUEL_FIELD_MAP[fuelType] || "priceGasoleoA";
  const fuelLabel = FUEL_LABEL_MAP[fuelType] || "Diésel";
  const limit = Math.min(args.limit || 10, 30);

  const response = await ts.collections("gas_stations").documents().search({
    q: args.location,
    query_by: "name,locality,provinceName",
    filter_by: `${fuelField}:>0`,
    sort_by: `${fuelField}:asc`,
    per_page: limit,
  });

  const hits = response.hits || [];
  if (hits.length === 0) {
    return `No se encontraron gasolineras con ${fuelLabel} en "${args.location}".`;
  }

  const lines: string[] = [
    `## ${fuelLabel} más barato en ${args.location} (${hits.length} resultados)\n`,
  ];

  hits.forEach((h, i) => {
    const d = h.document as Record<string, unknown>;
    const price = Number(d[fuelField]).toFixed(3);
    const is24h = d.is24h ? " 🕐24H" : "";
    lines.push(`${i + 1}. **${d.name}** — ${price} €/L${is24h}`);
    lines.push(`   ${d.address || d.locality}, ${d.provinceName}`);
  });

  const prices = hits.map((h) => Number((h.document as Record<string, unknown>)[fuelField]));
  const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(3);
  const min = Math.min(...prices).toFixed(3);
  const max = Math.max(...prices).toFixed(3);

  lines.push(`\n---`);
  lines.push(`Media: ${avg} €/L | Mínimo: ${min} €/L | Máximo: ${max} €/L`);

  return lines.join("\n");
}
