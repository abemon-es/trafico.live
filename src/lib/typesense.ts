/**
 * Typesense Client & Collection Schemas
 *
 * Singleton client for the Typesense search engine.
 * Used by the search API route and (indirectly) by the sync collector.
 */

import { Client as TypesenseClient } from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

const globalForTypesense = globalThis as unknown as {
  typesenseClient: TypesenseClient | undefined;
};

function createTypesenseClient(): TypesenseClient | null {
  const rawUrl = process.env.TYPESENSE_URL;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!rawUrl || !apiKey) {
    console.warn(
      "[Typesense] TYPESENSE_URL or TYPESENSE_API_KEY not set — search disabled"
    );
    return null;
  }

  try {
    const url = new URL(rawUrl);
    return new TypesenseClient({
      nodes: [
        {
          host: url.hostname,
          port: parseInt(url.port || "8108", 10),
          protocol: url.protocol.replace(":", "") as "http" | "https",
        },
      ],
      apiKey,
      connectionTimeoutSeconds: 5,
    });
  } catch (error) {
    console.error("[Typesense] Failed to create client:", error);
    return null;
  }
}

export const typesenseClient =
  globalForTypesense.typesenseClient ?? createTypesenseClient();

if (process.env.NODE_ENV !== "production" && typesenseClient) {
  globalForTypesense.typesenseClient = typesenseClient;
}

// ---------------------------------------------------------------------------
// Collection schemas
// ---------------------------------------------------------------------------

export const COLLECTIONS: Record<string, CollectionCreateSchema> = {
  pages: {
    name: "pages",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "subtitle", type: "string", optional: true },
      { name: "href", type: "string" },
      { name: "category", type: "string", facet: true },
      { name: "icon", type: "string" },
      { name: "keywords", type: "string[]", optional: true },
    ] as CollectionFieldSchema[],
  },

  incidents: {
    name: "incidents",
    fields: [
      { name: "id", type: "string" },
      { name: "type", type: "string", facet: true },
      { name: "severity", type: "string", facet: true },
      { name: "roadNumber", type: "string", optional: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "municipality", type: "string", optional: true },
      { name: "description", type: "string", optional: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "source", type: "string", optional: true, facet: true },
      { name: "startedAt", type: "int64", sort: true },
    ] as CollectionFieldSchema[],
    default_sorting_field: "startedAt",
    token_separators: ["-"],
  },

  weather_alerts: {
    name: "weather_alerts",
    fields: [
      { name: "id", type: "string" },
      { name: "type", type: "string", facet: true },
      { name: "severity", type: "string", facet: true },
      { name: "province", type: "string", facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "description", type: "string", optional: true },
      { name: "startedAt", type: "int64", sort: true },
    ] as CollectionFieldSchema[],
    default_sorting_field: "startedAt",
  },

  gas_stations: {
    name: "gas_stations",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "address", type: "string", optional: true },
      { name: "locality", type: "string", optional: true, facet: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "priceGasoleoA", type: "float", optional: true, sort: true },
      { name: "priceGasoleoB", type: "float", optional: true },
      { name: "priceGasoleoPremium", type: "float", optional: true, sort: true },
      { name: "priceGasolina95", type: "float", optional: true, sort: true },
      { name: "priceGasolina95E10", type: "float", optional: true },
      { name: "priceGasolina98", type: "float", optional: true, sort: true },
      { name: "priceGasolina98E10", type: "float", optional: true },
      { name: "priceGLP", type: "float", optional: true, sort: true },
      { name: "priceGNC", type: "float", optional: true },
      { name: "priceGNL", type: "float", optional: true },
      { name: "priceHidrogeno", type: "float", optional: true },
      { name: "priceBioetanol", type: "float", optional: true },
      { name: "priceBiodiesel", type: "float", optional: true },
      { name: "is24h", type: "bool", optional: true, facet: true },
      { name: "nearestRoad", type: "string", optional: true },
      { name: "fuelTypes", type: "string[]", optional: true, facet: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-", "/"],
  },

  roads: {
    name: "roads",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", optional: true },
      { name: "roadNumber", type: "string" },
      { name: "roadType", type: "string", facet: true },
      { name: "provinces", type: "string[]", facet: true },
      { name: "totalKm", type: "float", optional: true, sort: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
  },

  cameras: {
    name: "cameras",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "roadNumber", type: "string", optional: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
  },

  articles: {
    name: "articles",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "slug", type: "string" },
      { name: "summary", type: "string" },
      { name: "category", type: "string", facet: true },
      { name: "tags", type: "string[]", facet: true },
      { name: "publishedAt", type: "int64", sort: true },
    ] as CollectionFieldSchema[],
    default_sorting_field: "publishedAt",
  },

  provinces: {
    name: "provinces",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "slug", type: "string" },
      { name: "code", type: "string" },
      { name: "community", type: "string", facet: true },
    ] as CollectionFieldSchema[],
  },

  cities: {
    name: "cities",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "slug", type: "string" },
      { name: "province", type: "string", facet: true },
      { name: "provinceName", type: "string", optional: true },
      { name: "location", type: "geopoint", optional: true },
    ] as CollectionFieldSchema[],
  },
  ev_chargers: {
    name: "ev_chargers",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "address", type: "string", optional: true },
      { name: "city", type: "string", optional: true, facet: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "powerKw", type: "float", optional: true, sort: true },
      { name: "connectors", type: "int32", optional: true },
      { name: "network", type: "string", optional: true, facet: true },
      { name: "operator", type: "string", optional: true },
      { name: "chargerTypes", type: "string[]", optional: true, facet: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-", "/"],
  },
  radars: {
    name: "radars",
    fields: [
      { name: "id", type: "string" },
      { name: "roadNumber", type: "string" },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "type", type: "string", facet: true },
      { name: "speedLimit", type: "int32", optional: true, sort: true },
      { name: "kmPoint", type: "float", optional: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
  },
  railway_stations: {
    name: "railway_stations",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "municipality", type: "string", optional: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "serviceTypes", type: "string[]", optional: true, facet: true },
    ] as CollectionFieldSchema[],
  },
  railway_routes: {
    name: "railway_routes",
    fields: [
      { name: "id", type: "string" },
      { name: "shortName", type: "string", optional: true },
      { name: "longName", type: "string", optional: true },
      { name: "brand", type: "string", optional: true, facet: true },
      { name: "serviceType", type: "string", facet: true },
      { name: "network", type: "string", optional: true, facet: true },
      { name: "originName", type: "string", optional: true },
      { name: "destName", type: "string", optional: true },
      { name: "stopNames", type: "string[]", optional: true },
      { name: "stopsCount", type: "int32", optional: true },
    ] as CollectionFieldSchema[],
  },
  railway_alerts: {
    name: "railway_alerts",
    fields: [
      { name: "id", type: "string" },
      { name: "headerText", type: "string", optional: true },
      { name: "description", type: "string" },
      { name: "cause", type: "string", optional: true, facet: true },
      { name: "effect", type: "string", facet: true },
      { name: "serviceType", type: "string", optional: true, facet: true },
      { name: "routeNames", type: "string[]", optional: true },
      { name: "startedAt", type: "int64", sort: true },
    ] as CollectionFieldSchema[],
    default_sorting_field: "startedAt",
  },
  zbe_zones: {
    name: "zbe_zones",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "cityName", type: "string", facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "activeAllYear", type: "bool", optional: true, facet: true },
    ] as CollectionFieldSchema[],
  },
  risk_zones: {
    name: "risk_zones",
    fields: [
      { name: "id", type: "string" },
      { name: "type", type: "string", facet: true },
      { name: "road", type: "string" },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "description", type: "string", optional: true },
      { name: "location", type: "geopoint", optional: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
  },
  variable_panels: {
    name: "variable_panels",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string", optional: true },
      { name: "roadNumber", type: "string", optional: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "message", type: "string", optional: true },
      { name: "messageType", type: "string", optional: true, facet: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
  },
  maritime_stations: {
    name: "maritime_stations",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "port", type: "string", optional: true, facet: true },
      { name: "locality", type: "string", optional: true },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "priceGasoleoA", type: "float", optional: true, sort: true },
      { name: "priceGasoleoB", type: "float", optional: true },
      { name: "priceGasolina95", type: "float", optional: true, sort: true },
      { name: "priceGasolina98", type: "float", optional: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-", "/"],
  },
  portugal_stations: {
    name: "portugal_stations",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "address", type: "string", optional: true },
      { name: "locality", type: "string", optional: true, facet: true },
      { name: "district", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "priceGasoleoSimples", type: "float", optional: true, sort: true },
      { name: "priceGasolina95", type: "float", optional: true, sort: true },
      { name: "priceGPL", type: "float", optional: true },
      { name: "fuelTypes", type: "string[]", optional: true, facet: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-", "/"],
  },
  traffic_stations: {
    name: "traffic_stations",
    fields: [
      { name: "id", type: "string" },
      { name: "stationCode", type: "string" },
      { name: "roadNumber", type: "string" },
      { name: "province", type: "string", optional: true, facet: true },
      { name: "provinceName", type: "string", optional: true, facet: true },
      { name: "location", type: "geopoint", optional: true },
      { name: "imd", type: "int32", optional: true, sort: true },
      { name: "year", type: "int32", sort: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
    default_sorting_field: "year",
  },
};

// ---------------------------------------------------------------------------
// Search synonyms
// ---------------------------------------------------------------------------

export interface TypesenseSynonym {
  id: string;
  synonyms: string[];
}

export const SYNONYMS: Record<string, TypesenseSynonym[]> = {
  gas_stations: [
    { id: "gasolinera-estacion", synonyms: ["gasolinera", "estación de servicio", "gasinera", "surtidor"] },
    { id: "diesel-gasoleo", synonyms: ["diesel", "gasóleo", "gasoleo", "gasoil"] },
    { id: "glp-autogas", synonyms: ["glp", "autogas", "gas licuado"] },
  ],
  ev_chargers: [
    { id: "cargador-electrolinera", synonyms: ["cargador", "electrolinera", "punto de carga", "estación de carga"] },
  ],
  roads: [
    { id: "autovia-autopista", synonyms: ["autovía", "autopista", "autovia"] },
    { id: "carretera-nacional", synonyms: ["nacional", "carretera nacional", "N-"] },
  ],
  zbe_zones: [
    { id: "zbe-bajas-emisiones", synonyms: ["zbe", "zona de bajas emisiones", "zona bajas emisiones"] },
  ],
  railway_stations: [
    { id: "tren-ferrocarril", synonyms: ["tren", "ferrocarril", "estación de tren", "renfe"] },
    { id: "cercanias-commuter", synonyms: ["cercanías", "cercanias", "commuter"] },
    { id: "ave-alta-velocidad", synonyms: ["ave", "alta velocidad", "tav"] },
  ],
  radars: [
    { id: "radar-cinemometro", synonyms: ["radar", "cinemómetro", "control de velocidad"] },
  ],
};

// ---------------------------------------------------------------------------
// Sync helper
// ---------------------------------------------------------------------------

/**
 * Create or update a collection and upsert documents in batches.
 *
 * 1. Drops the existing collection if schema changed (field count mismatch).
 * 2. Creates the collection if it doesn't exist.
 * 3. Upserts documents in batches of `batchSize`.
 *
 * Returns the number of successfully upserted documents.
 */
export async function syncCollection(
  client: TypesenseClient,
  name: string,
  schema: CollectionCreateSchema,
  documents: Record<string, unknown>[],
  batchSize = 1000
): Promise<number> {
  // Ensure collection exists — drop + recreate if schema drifted
  try {
    const existing = await client.collections(name).retrieve();
    if (existing.fields.length !== (schema.fields?.length ?? 0)) {
      console.log(
        `[Typesense] Schema drift detected for ${name}, recreating...`
      );
      await client.collections(name).delete();
      await client.collections().create(schema);
    }
  } catch {
    // Collection doesn't exist — create it
    await client.collections().create(schema);
    console.log(`[Typesense] Created collection: ${name}`);
  }

  if (documents.length === 0) return 0;

  let upserted = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    try {
      const results = await client
        .collections(name)
        .documents()
        .import(batch as Record<string, unknown>[], {
          action: "upsert",
          batch_size: batchSize,
        });

      const succeeded = results.filter((r) => r.success).length;
      upserted += succeeded;

      if (succeeded < batch.length) {
        const failures = results.filter((r) => !r.success);
        console.warn(
          `[Typesense] ${name}: ${failures.length} failures in batch ${Math.floor(i / batchSize) + 1}`,
          failures.slice(0, 3).map((f) => f.error)
        );
      }
    } catch (error) {
      console.error(
        `[Typesense] ${name}: batch ${Math.floor(i / batchSize) + 1} failed:`,
        error
      );
    }
  }

  return upserted;
}

/**
 * Check if the Typesense client is available and healthy.
 */
export async function isTypesenseHealthy(): Promise<boolean> {
  if (!typesenseClient) return false;
  try {
    await typesenseClient.health.retrieve();
    return true;
  } catch {
    return false;
  }
}
