/**
 * Typesense Sync Collector — 14 collections, parallel load + parallel write
 *
 * Modes:
 *   - Full sync (default): drop+recreate all collections (purges orphans)
 *   - Single collection: SYNC_COLLECTION=gas_stations (post-ingestion upsert)
 *
 * Performance:
 *   - All DB loads run in parallel (Promise.allSettled)
 *   - Typesense writes run in parallel batches of 4 (avoids overwhelming)
 */

import type { PrismaClient } from "@prisma/client";
import Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection";
import { getTypesenseClient } from "../../shared/typesense.js";

// ---------------------------------------------------------------------------
// Collection schemas (mirror of src/lib/typesense.ts)
// ---------------------------------------------------------------------------

const COLLECTIONS: Record<string, CollectionCreateSchema> = {
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
      { name: "embedding", type: "float[]", embed: { from: ["title", "subtitle", "keywords"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "causeType", type: "string", optional: true, facet: true },
      { name: "startedAt", type: "int64", sort: true },
      { name: "embedding", type: "float[]", embed: { from: ["description", "type", "roadNumber", "provinceName"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["name", "locality", "provinceName", "fuelTypes"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["roadNumber", "name"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["title", "summary", "tags"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["name", "city", "provinceName", "chargerTypes"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["shortName", "longName", "brand", "originName", "destName"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
      { name: "embedding", type: "float[]", embed: { from: ["headerText", "description", "routeNames"], model_config: { model_name: "ts/multilingual-e5-small" } } } as CollectionFieldSchema,
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
  toll_roads: {
    name: "toll_roads",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "subtitle", type: "string", optional: true },
      { name: "href", type: "string" },
      { name: "category", type: "string", facet: true },
      { name: "icon", type: "string" },
      { name: "keywords", type: "string[]", optional: true },
      { name: "operator", type: "string", facet: true },
      { name: "maxPrice", type: "float", sort: true },
      { name: "totalKm", type: "float", optional: true },
      { name: "isSeitt", type: "bool", facet: true },
    ] as CollectionFieldSchema[],
    token_separators: ["-"],
    default_sorting_field: "maxPrice",
  },
};

// ---------------------------------------------------------------------------
// Search synonyms (mirror of src/lib/typesense.ts SYNONYMS)
// ---------------------------------------------------------------------------

const SYNONYM_RULES: Record<string, Array<{ id: string; synonyms: string[] }>> = {
  gas_stations: [
    { id: "gasolinera-estacion", synonyms: ["gasolinera", "estación de servicio", "gasinera", "surtidor"] },
    { id: "diesel-gasoleo", synonyms: ["diesel", "gasóleo", "gasoleo", "gasoil"] },
    { id: "glp-autogas", synonyms: ["glp", "autogas", "gas licuado"] },
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
  incidents: [
    { id: "accidente-siniestro", synonyms: ["accidente", "siniestro", "colisión", "choque"] },
    { id: "obras-mantenimiento", synonyms: ["obras", "mantenimiento", "reparación", "trabajos"] },
    { id: "corte-cierre", synonyms: ["corte", "cierre", "cortado", "cerrada"] },
    { id: "retencion-atasco", synonyms: ["retención", "atasco", "cola", "embotellamiento", "congestión"] },
  ],
  cameras: [
    { id: "camara-webcam", synonyms: ["cámara", "webcam", "camara", "videovigilancia"] },
  ],
  ev_chargers: [
    { id: "cargador-electrolinera", synonyms: ["cargador", "electrolinera", "punto de carga", "estación de carga"] },
    { id: "ccs-mennekes", synonyms: ["ccs", "combo", "ccs2", "tipo 2", "mennekes"] },
    { id: "chademo-rapida", synonyms: ["chademo", "carga rápida", "fast charge"] },
    { id: "supercharger-tesla", synonyms: ["supercharger", "tesla", "destination charger"] },
  ],
  maritime_stations: [
    { id: "puerto-marina", synonyms: ["puerto", "marina", "muelle", "embarcadero"] },
    { id: "nautico-maritimo", synonyms: ["náutico", "marítimo", "barco", "embarcación"] },
  ],
  railway_routes: [
    { id: "cercanias-rodalies", synonyms: ["cercanías", "rodalies", "commuter"] },
    { id: "ave-altavelocidad", synonyms: ["ave", "alta velocidad", "tav", "bullet train"] },
    { id: "alvia-larga", synonyms: ["alvia", "larga distancia", "talgo"] },
  ],
  railway_alerts: [
    { id: "retraso-demora", synonyms: ["retraso", "demora", "retardo", "tardanza"] },
    { id: "cancelacion-supresion", synonyms: ["cancelación", "supresión", "suprimido", "anulado"] },
    { id: "averia-incidencia", synonyms: ["avería", "incidencia", "fallo", "problema técnico"] },
  ],
  portugal_stations: [
    { id: "gasoleo-diesel-pt", synonyms: ["gasóleo", "gasoleo simples", "diesel"] },
  ],
};

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

async function importBatched(
  client: Typesense.Client,
  name: string,
  documents: Record<string, unknown>[],
  action: "create" | "upsert",
  batchSize = 1000
): Promise<number> {
  if (documents.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    try {
      const results = await client.collections(name).documents()
        .import(batch as Record<string, unknown>[], { action, batch_size: batchSize });
      count += results.filter((r: { success: boolean }) => r.success).length;
    } catch (error) {
      console.error(`[typesense-sync] ${name}: batch ${Math.floor(i / batchSize) + 1} failed:`, error);
    }
  }
  return count;
}

async function applySynonyms(
  client: Typesense.Client,
  name: string,
  synonyms: Array<{ id: string; synonyms: string[] }>
): Promise<void> {
  for (const syn of synonyms) {
    try {
      await client.collections(name).synonyms().upsert(syn.id, { synonyms: syn.synonyms });
    } catch (error) {
      console.error(`[typesense-sync] Failed to upsert synonym ${syn.id} for ${name}:`, error);
    }
  }
}

async function replaceCollection(
  client: Typesense.Client, name: string, schema: CollectionCreateSchema,
  documents: Record<string, unknown>[]
): Promise<number> {
  try { await client.collections(name).delete(); } catch { /* ok */ }
  await client.collections().create(schema);
  const count = await importBatched(client, name, documents, "create");
  // Apply synonyms if defined
  const syns = SYNONYM_RULES[name];
  if (syns) await applySynonyms(client, name, syns);
  return count;
}

async function upsertCollection(
  client: Typesense.Client, name: string, schema: CollectionCreateSchema,
  documents: Record<string, unknown>[]
): Promise<number> {
  try { await client.collections(name).retrieve(); } catch {
    await client.collections().create(schema);
  }
  return importBatched(client, name, documents, "upsert");
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

async function loadPages(prisma: PrismaClient) {
  const staticPages = [
    // Combustible
    { id: "p-precio-gasolina", title: "Precio Gasolina Hoy", subtitle: "Precios actualizados", href: "/precio-gasolina-hoy", category: "Combustible", icon: "Fuel", keywords: ["gasolina", "precio", "hoy", "95", "98"] },
    { id: "p-precio-diesel", title: "Precio Diésel Hoy", subtitle: "Precios actualizados", href: "/precio-diesel-hoy", category: "Combustible", icon: "Fuel", keywords: ["diesel", "gasoleo", "precio", "hoy"] },
    { id: "p-mapa-gasolineras", title: "Mapa de Gasolineras", href: "/gasolineras/mapa", category: "Combustible", icon: "MapPin", keywords: ["mapa", "gasolinera", "estacion"] },
    { id: "p-gasolineras-baratas", title: "Gasolineras Baratas", subtitle: "Mejores precios", href: "/gasolineras/baratas", category: "Combustible", icon: "Fuel", keywords: ["barata", "barato", "precio", "economica"] },
    { id: "p-gasolineras-24h", title: "Gasolineras 24 Horas", href: "/gasolineras-24-horas", category: "Combustible", icon: "Fuel", keywords: ["24h", "abierta", "nocturna"] },
    { id: "p-precios-provincia", title: "Precios por Provincia", subtitle: "Comparar 52 provincias", href: "/gasolineras/precios", category: "Combustible", icon: "MapPin", keywords: ["provincia", "comparar", "ranking"] },
    { id: "p-gasolineras-marcas", title: "Gasolineras por Marcas", subtitle: "Repsol, Cepsa, BP...", href: "/gasolineras/marcas", category: "Combustible", icon: "Fuel", keywords: ["repsol", "cepsa", "bp", "shell", "marca"] },
    { id: "p-cargadores-ev", title: "Cargadores Eléctricos", subtitle: "Puntos de carga EV", href: "/carga-ev", category: "Combustible", icon: "Zap", keywords: ["electrico", "carga", "ev", "punto"] },
    { id: "p-electrolineras", title: "Electrolineras", subtitle: "Carga rápida", href: "/electrolineras", category: "Combustible", icon: "Zap", keywords: ["electrolinera", "rapida", "ccs", "chademo"] },
    { id: "p-cuanto-cuesta-cargar", title: "Cuánto Cuesta Cargar", href: "/cuanto-cuesta-cargar", category: "Combustible", icon: "Calculator", keywords: ["coste", "precio", "kwh", "carga"] },
    { id: "p-etiqueta-ambiental", title: "Etiqueta Ambiental", href: "/etiqueta-ambiental", category: "Combustible", icon: "Fuel", keywords: ["etiqueta", "dgt", "eco", "c", "b", "cero"] },
    { id: "p-combustible-portugal", title: "Combustible Portugal", subtitle: "3.000+ estaciones DGEG", href: "/portugal/combustible", category: "Combustible", icon: "Fuel", keywords: ["portugal", "dgeg", "gasoleo"] },

    // Marítimo
    { id: "p-combustible-maritimo", title: "Combustible Marítimo", subtitle: "Precios en puertos", href: "/maritimo/combustible", category: "Marítimo", icon: "Anchor", keywords: ["maritimo", "puerto", "barco", "nautico"] },
    { id: "p-puertos", title: "Puertos de España", subtitle: "Directorio", href: "/maritimo/puertos", category: "Marítimo", icon: "Anchor", keywords: ["puerto", "directorio", "maritimo"] },
    { id: "p-mapa-maritimo", title: "Mapa Marítimo", href: "/maritimo/mapa", category: "Marítimo", icon: "Map", keywords: ["mapa", "maritimo", "costa"] },
    { id: "p-meteo-costera", title: "Meteorología Costera", subtitle: "AEMET", href: "/maritimo/meteorologia", category: "Marítimo", icon: "Wind", keywords: ["meteo", "costa", "aemet", "viento", "oleaje"] },
    { id: "p-seguridad-maritima", title: "Seguridad Marítima", subtitle: "SASEMAR", href: "/maritimo/seguridad", category: "Marítimo", icon: "ShieldAlert", keywords: ["sasemar", "salvamento", "rescate"] },
    { id: "p-noticias-maritimas", title: "Noticias Marítimas", href: "/maritimo/noticias", category: "Marítimo", icon: "Newspaper", keywords: ["noticias", "maritimo"] },

    // Herramientas
    { id: "p-radares", title: "Radares DGT", subtitle: "737 radares fijos", href: "/radares", category: "Herramientas", icon: "Radar", keywords: ["radar", "dgt", "fijo", "multa", "velocidad"] },
    { id: "p-camaras", title: "Cámaras de Tráfico", subtitle: "1.917 cámaras", href: "/camaras", category: "Herramientas", icon: "Camera", keywords: ["camara", "trafico", "dgt", "webcam"] },
    { id: "p-operaciones", title: "Operaciones Especiales", href: "/operaciones", category: "Herramientas", icon: "Calendar", keywords: ["operacion", "especial", "dgt", "puente", "navidad"] },
    { id: "p-restricciones", title: "Restricciones", href: "/restricciones", category: "Herramientas", icon: "Ban", keywords: ["restriccion", "camion", "pesado", "prohibido"] },
    { id: "p-puntos-negros", title: "Puntos Negros", href: "/puntos-negros", category: "Herramientas", icon: "AlertCircle", keywords: ["punto negro", "peligroso", "accidente", "siniestro"] },
    { id: "p-calculadora", title: "Calculadora de Ruta", href: "/calculadora", category: "Herramientas", icon: "Calculator", keywords: ["calculadora", "ruta", "distancia", "peaje"] },
    { id: "p-incidencias", title: "Incidencias", subtitle: "En tiempo real", href: "/incidencias", category: "Herramientas", icon: "AlertTriangle", keywords: ["incidencia", "accidente", "corte", "retención"] },
    { id: "p-mapa", title: "Mapa en Vivo", subtitle: "Tráfico en tiempo real", href: "/mapa", category: "Herramientas", icon: "Map", keywords: ["mapa", "vivo", "directo", "trafico"] },
    { id: "p-atascos", title: "Atascos", subtitle: "Retenciones actuales", href: "/atascos", category: "Herramientas", icon: "AlertTriangle", keywords: ["atasco", "retencion", "cola", "embotellamiento"] },
    { id: "p-alertas-meteo", title: "Alertas Meteo", subtitle: "Avisos AEMET", href: "/alertas-meteo", category: "Herramientas", icon: "AlertTriangle", keywords: ["alerta", "meteo", "aemet", "lluvia", "nieve", "viento"] },
    { id: "p-cortes-trafico", title: "Cortes de Tráfico", href: "/cortes-trafico", category: "Herramientas", icon: "Ban", keywords: ["corte", "carretera", "obra", "cerrada"] },
    { id: "p-mejor-hora", title: "Mejor Hora para Viajar", href: "/mejor-hora", category: "Herramientas", icon: "Calendar", keywords: ["hora", "viajar", "salir", "trafico"] },
    { id: "p-zbe", title: "Zonas ZBE", subtitle: "Bajas emisiones", href: "/zbe", category: "Herramientas", icon: "Ban", keywords: ["zbe", "baja emision", "madrid", "barcelona"] },
    { id: "p-imd", title: "Intensidad (IMD)", subtitle: "Tráfico por carretera", href: "/intensidad", category: "Herramientas", icon: "Route", keywords: ["imd", "intensidad", "aforo", "trafico"] },
    { id: "p-estaciones-aforo", title: "Estaciones de Aforo", subtitle: "14.400+ puntos", href: "/estaciones-aforo", category: "Herramientas", icon: "Activity", keywords: ["estacion", "aforo", "imd", "contador"] },
    { id: "p-estadisticas", title: "Estadísticas", href: "/estadisticas", category: "Herramientas", icon: "AlertCircle", keywords: ["estadistica", "dato", "grafico"] },
    { id: "p-historico", title: "Histórico", href: "/historico", category: "Herramientas", icon: "Calendar", keywords: ["historico", "pasado", "archivo"] },
    { id: "p-noticias", title: "Noticias", href: "/noticias", category: "Herramientas", icon: "Newspaper", keywords: ["noticia", "articulo", "blog"] },
    { id: "p-informe-diario", title: "Informe Diario", href: "/informe-diario", category: "Herramientas", icon: "BookOpen", keywords: ["informe", "diario", "resumen"] },

    // Seasonal / temporal
    { id: "p-semana-santa", title: "Tráfico Semana Santa", subtitle: "Operación especial", href: "/operaciones/semana-santa", category: "Herramientas", icon: "Calendar", keywords: ["semana santa", "operacion", "vacaciones"] },
    { id: "p-verano", title: "Tráfico Verano", subtitle: "Operación salida", href: "/operaciones/verano", category: "Herramientas", icon: "Calendar", keywords: ["verano", "operacion", "salida", "agosto"] },
    { id: "p-navidad", title: "Tráfico Navidad", subtitle: "Operación Navidad", href: "/operaciones/navidad", category: "Herramientas", icon: "Calendar", keywords: ["navidad", "operacion", "diciembre"] },
    { id: "p-puente", title: "Tráfico Puentes", subtitle: "Festivos nacionales", href: "/operaciones/puentes", category: "Herramientas", icon: "Calendar", keywords: ["puente", "festivo", "operacion"] },

    // Trenes
    { id: "p-trenes", title: "Red Ferroviaria", subtitle: "Cercanías, AVE, Larga Distancia", href: "/trenes", category: "Transporte", icon: "TrainFront", keywords: ["tren", "renfe", "cercanias", "ave", "ferrocarril"] },
    { id: "p-trenes-cercanias", title: "Cercanías", subtitle: "12 núcleos", href: "/trenes/cercanias", category: "Transporte", icon: "TrainFront", keywords: ["cercanias", "commuter", "renfe"] },

    { id: "p-portugal", title: "Portugal", subtitle: "Combustible, alertas y tráfico", href: "/portugal", category: "Herramientas", icon: "Globe", keywords: ["portugal", "lisboa", "porto"] },
    { id: "p-andorra", title: "Andorra", subtitle: "Tráfico e incidencias", href: "/andorra", category: "Herramientas", icon: "Mountain", keywords: ["andorra", "pirineos"] },
  ];

  // Dynamic municipality pages — top cities by population/relevance
  const municipalities = await prisma.municipality.findMany({
    where: { slug: { not: null } },
    select: { code: true, name: true, slug: true, provinceCode: true, province: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: 300,
  });

  const municipalityPages = municipalities.map((m) => ({
    id: `p-ciudad-${m.code}`,
    title: `Tráfico ${m.name}`,
    subtitle: m.province.name,
    href: `/ciudad/${m.slug}`,
    category: "Ciudades",
    icon: "Building2",
    keywords: [m.name.toLowerCase(), "trafico", "ciudad", m.province.name.toLowerCase()],
  }));

  return [...staticPages, ...municipalityPages];
}

async function loadGasStations(prisma: PrismaClient) {
  const rows = await prisma.gasStation.findMany({
    select: { id: true, name: true, address: true, locality: true, province: true,
      provinceName: true, latitude: true, longitude: true, is24h: true, nearestRoad: true,
      priceGasoleoA: true, priceGasoleoB: true, priceGasoleoPremium: true,
      priceGasolina95E5: true, priceGasolina95E10: true, priceGasolina98E5: true, priceGasolina98E10: true,
      priceGLP: true, priceGNC: true, priceGNL: true, priceHidrogeno: true,
      priceBioetanol: true, priceBiodiesel: true },
  });
  const toF = (v: unknown) => v ? Number(v) : undefined;
  return rows.map((s) => {
    const ft: string[] = [];
    if (s.priceGasoleoA) ft.push("Gasoleo A");
    if (s.priceGasoleoB) ft.push("Gasoleo B");
    if (s.priceGasoleoPremium) ft.push("Gasoleo Premium");
    if (s.priceGasolina95E5) ft.push("Gasolina 95");
    if (s.priceGasolina98E5) ft.push("Gasolina 98");
    if (s.priceGLP) ft.push("GLP");
    if (s.priceGNC) ft.push("GNC");
    if (s.priceGNL) ft.push("GNL");
    if (s.priceHidrogeno) ft.push("Hidrogeno");
    if (s.priceBioetanol) ft.push("Bioetanol");
    if (s.priceBiodiesel) ft.push("Biodiesel");
    return {
      id: s.id, name: s.name, address: s.address || "", locality: s.locality || "",
      province: s.province || "", provinceName: s.provinceName || "",
      location: s.latitude && s.longitude ? [Number(s.latitude), Number(s.longitude)] : undefined,
      priceGasoleoA: toF(s.priceGasoleoA), priceGasoleoB: toF(s.priceGasoleoB),
      priceGasoleoPremium: toF(s.priceGasoleoPremium),
      priceGasolina95: toF(s.priceGasolina95E5), priceGasolina95E10: toF(s.priceGasolina95E10),
      priceGasolina98: toF(s.priceGasolina98E5), priceGasolina98E10: toF(s.priceGasolina98E10),
      priceGLP: toF(s.priceGLP), priceGNC: toF(s.priceGNC), priceGNL: toF(s.priceGNL),
      priceHidrogeno: toF(s.priceHidrogeno), priceBioetanol: toF(s.priceBioetanol),
      priceBiodiesel: toF(s.priceBiodiesel),
      is24h: s.is24h, nearestRoad: s.nearestRoad || "", fuelTypes: ft,
    };
  });
}

async function loadRoads(prisma: PrismaClient) {
  const rows = await prisma.road.findMany({ select: { id: true, name: true, type: true, provinces: true, totalKm: true } });
  return rows.map((r) => ({ id: r.id, name: r.name || "", roadNumber: r.id, roadType: r.type,
    provinces: r.provinces || [], totalKm: r.totalKm ? Number(r.totalKm) : undefined }));
}

async function loadCameras(prisma: PrismaClient) {
  const rows = await prisma.camera.findMany({ where: { isActive: true },
    select: { id: true, name: true, roadNumber: true, province: true, provinceName: true, latitude: true, longitude: true } });
  return rows.map((c) => ({ id: c.id, name: c.name, roadNumber: c.roadNumber || "",
    province: c.province || "", provinceName: c.provinceName || "",
    location: c.latitude && c.longitude ? [Number(c.latitude), Number(c.longitude)] : undefined }));
}

async function loadArticles(prisma: PrismaClient) {
  const rows = await prisma.article.findMany({ where: { status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, summary: true, category: true, publishedAt: true,
      tags: { select: { tag: { select: { name: true } } } } } });
  return rows.map((a) => ({ id: a.id, title: a.title, slug: a.slug, summary: a.summary.slice(0, 500),
    category: a.category, tags: a.tags.map((t) => t.tag.name),
    publishedAt: Math.floor(a.publishedAt.getTime() / 1000) }));
}

async function loadProvinces(prisma: PrismaClient) {
  const rows = await prisma.province.findMany({ select: { code: true, name: true, slug: true, community: { select: { name: true } } } });
  return rows.map((p) => ({ id: p.code, name: p.name, slug: p.slug, code: p.code, community: p.community.name }));
}

async function loadCities(prisma: PrismaClient) {
  const rows = await prisma.municipality.findMany({
    select: { code: true, name: true, slug: true, provinceCode: true, latitude: true, longitude: true,
      province: { select: { name: true } } } });
  return rows.map((c) => ({ id: c.code, name: c.name, slug: c.slug, province: c.provinceCode,
    provinceName: c.province.name,
    location: c.latitude && c.longitude ? [Number(c.latitude), Number(c.longitude)] : undefined }));
}

async function loadEVChargers(prisma: PrismaClient) {
  const rows = await prisma.eVCharger.findMany({ where: { isPublic: true },
    select: { id: true, name: true, address: true, city: true, province: true, provinceName: true,
      latitude: true, longitude: true, powerKw: true, connectors: true, network: true, operator: true, chargerTypes: true } });
  return rows.map((c) => ({ id: c.id, name: c.name, address: c.address || "", city: c.city || "",
    province: c.province || "", provinceName: c.provinceName || "",
    location: [Number(c.latitude), Number(c.longitude)],
    powerKw: c.powerKw ? Number(c.powerKw) : undefined, connectors: c.connectors ?? undefined,
    network: c.network || "", operator: c.operator || "", chargerTypes: c.chargerTypes || [] }));
}

async function loadRadars(prisma: PrismaClient) {
  const rows = await prisma.radar.findMany({ where: { isActive: true },
    select: { id: true, roadNumber: true, province: true, provinceName: true, latitude: true,
      longitude: true, type: true, speedLimit: true, kmPoint: true } });
  return rows.map((r) => ({ id: r.id, roadNumber: r.roadNumber, province: r.province || "",
    provinceName: r.provinceName || "", location: [Number(r.latitude), Number(r.longitude)],
    type: r.type, speedLimit: r.speedLimit ?? undefined, kmPoint: r.kmPoint ? Number(r.kmPoint) : undefined }));
}

async function loadRailwayStations(prisma: PrismaClient) {
  const rows = await prisma.railwayStation.findMany({ where: { locationType: 1 },
    select: { id: true, name: true, province: true, provinceName: true, municipality: true,
      latitude: true, longitude: true, serviceTypes: true } });
  return rows.map((s) => ({ id: s.id, name: s.name, province: s.province || "",
    provinceName: s.provinceName || "", municipality: s.municipality || "",
    location: [Number(s.latitude), Number(s.longitude)], serviceTypes: s.serviceTypes || [] }));
}

async function loadRailwayRoutes(prisma: PrismaClient) {
  const rows = await prisma.railwayRoute.findMany({
    select: { id: true, shortName: true, longName: true, brand: true, serviceType: true,
      network: true, originName: true, destName: true, stopNames: true, stopsCount: true },
  });
  return rows.map((r) => ({
    id: r.id, shortName: r.shortName || "", longName: r.longName || "",
    brand: r.brand || "", serviceType: r.serviceType, network: r.network || "",
    originName: r.originName || "", destName: r.destName || "",
    stopNames: r.stopNames || [], stopsCount: r.stopsCount ?? undefined,
  }));
}

async function loadRailwayAlerts(prisma: PrismaClient) {
  const rows = await prisma.railwayAlert.findMany({
    where: { isActive: true },
    select: { id: true, headerText: true, description: true, cause: true, effect: true,
      serviceType: true, routeIds: true, activePeriodStart: true },
    orderBy: { activePeriodStart: "desc" },
  });
  // Resolve route names from routeIds
  const allRoutes = await prisma.railwayRoute.findMany({
    select: { routeId: true, shortName: true, brand: true },
  });
  const routeMap = new Map(allRoutes.map((r) => [r.routeId, `${r.brand || ""} ${r.shortName || ""}`.trim()]));

  return rows.map((r) => ({
    id: r.id, headerText: r.headerText || "", description: r.description,
    cause: r.cause || "", effect: r.effect, serviceType: r.serviceType || "",
    routeNames: r.routeIds.map((id) => routeMap.get(id) || id).filter(Boolean),
    startedAt: Math.floor(r.activePeriodStart.getTime() / 1000),
  }));
}

async function loadZBEZones(prisma: PrismaClient) {
  const rows = await prisma.zBEZone.findMany({ select: { id: true, name: true, cityName: true, centroid: true, activeAllYear: true } });
  return rows.map((z) => {
    const c = z.centroid as { lat: number; lng: number } | null;
    return { id: z.id, name: z.name, cityName: z.cityName,
      location: c ? [c.lat, c.lng] : undefined, activeAllYear: z.activeAllYear };
  });
}

async function loadRiskZones(prisma: PrismaClient) {
  const rows = await prisma.roadRiskZone.findMany({ where: { isActive: true },
    select: { id: true, type: true, road: true, province: true, description: true, startLat: true, startLng: true } });
  return rows.map((z) => ({ id: z.id, type: z.type, road: z.road, province: z.province || "",
    description: z.description || "",
    location: z.startLat && z.startLng ? [z.startLat, z.startLng] : undefined }));
}

async function loadVariablePanels(prisma: PrismaClient) {
  const rows = await prisma.variablePanel.findMany({
    select: { id: true, name: true, roadNumber: true, province: true, provinceName: true,
      latitude: true, longitude: true, message: true, messageType: true } });
  return rows.map((p) => ({ id: p.id, name: p.name || "", roadNumber: p.roadNumber || "",
    province: p.province || "", provinceName: p.provinceName || "",
    location: [Number(p.latitude), Number(p.longitude)],
    message: p.message || "", messageType: p.messageType || "" }));
}

async function loadMaritimeStations(prisma: PrismaClient) {
  const rows = await prisma.maritimeStation.findMany({
    select: { id: true, name: true, port: true, locality: true, province: true, provinceName: true,
      latitude: true, longitude: true, priceGasoleoA: true, priceGasoleoB: true,
      priceGasolina95E5: true, priceGasolina98E5: true } });
  const toF = (v: unknown) => v ? Number(v) : undefined;
  return rows.map((s) => ({ id: s.id, name: s.name, port: s.port || "", locality: s.locality || "",
    province: s.province || "", provinceName: s.provinceName || "",
    location: [Number(s.latitude), Number(s.longitude)],
    priceGasoleoA: toF(s.priceGasoleoA), priceGasoleoB: toF(s.priceGasoleoB),
    priceGasolina95: toF(s.priceGasolina95E5), priceGasolina98: toF(s.priceGasolina98E5) }));
}

async function loadPortugalStations(prisma: PrismaClient) {
  const rows = await prisma.portugalGasStation.findMany({
    select: { id: true, name: true, address: true, locality: true, district: true,
      latitude: true, longitude: true, priceGasoleoSimples: true, priceGasolina95: true,
      priceGPL: true, priceGasolina98: true, priceGNC: true } });
  const toF = (v: unknown) => v ? Number(v) : undefined;
  return rows.map((s) => {
    const ft: string[] = [];
    if (s.priceGasoleoSimples) ft.push("Gasoleo");
    if (s.priceGasolina95) ft.push("Gasolina 95");
    if (s.priceGasolina98) ft.push("Gasolina 98");
    if (s.priceGPL) ft.push("GPL");
    if (s.priceGNC) ft.push("GNC");
    return { id: s.id, name: s.name, address: s.address || "", locality: s.locality || "",
      district: s.district || "",
      location: s.latitude && s.longitude ? [Number(s.latitude), Number(s.longitude)] : undefined,
      priceGasoleoSimples: toF(s.priceGasoleoSimples), priceGasolina95: toF(s.priceGasolina95),
      priceGPL: toF(s.priceGPL), fuelTypes: ft };
  });
}

async function loadTrafficStations(prisma: PrismaClient) {
  const rows = await prisma.trafficStation.findMany({ orderBy: { year: "desc" }, distinct: ["stationCode"],
    select: { id: true, stationCode: true, roadNumber: true, province: true, provinceName: true,
      latitude: true, longitude: true, imd: true, year: true } });
  return rows.map((s) => ({ id: s.id, stationCode: s.stationCode, roadNumber: s.roadNumber,
    province: s.province || "", provinceName: s.provinceName || "",
    location: [Number(s.latitude), Number(s.longitude)], imd: s.imd ?? undefined, year: s.year }));
}

async function loadIncidents(prisma: PrismaClient) {
  const rows = await prisma.trafficIncident.findMany({
    where: { isActive: true },
    select: { id: true, type: true, severity: true, roadNumber: true, province: true,
      provinceName: true, municipality: true, description: true, latitude: true,
      longitude: true, source: true, causeType: true, startedAt: true },
    orderBy: { startedAt: "desc" },
    take: 5000,
  });
  return rows.map((r) => ({
    id: r.id, type: r.type, severity: r.severity, roadNumber: r.roadNumber || "",
    province: r.province || "", provinceName: r.provinceName || "",
    municipality: r.municipality || "", description: r.description || "",
    location: [Number(r.latitude), Number(r.longitude)],
    source: r.source || "", causeType: r.causeType || "",
    startedAt: Math.floor(r.startedAt.getTime() / 1000),
  }));
}

async function loadWeatherAlerts(prisma: PrismaClient) {
  const rows = await prisma.weatherAlert.findMany({
    where: { isActive: true },
    select: { id: true, type: true, severity: true, province: true, provinceName: true,
      description: true, startedAt: true },
  });
  return rows.map((r) => ({
    id: r.id, type: r.type, severity: r.severity, province: r.province,
    provinceName: r.provinceName || "", description: r.description || "",
    startedAt: Math.floor(r.startedAt.getTime() / 1000),
  }));
}

async function loadTollRoads(prisma: PrismaClient) {
  const roads = await prisma.tollRoad.findMany({
    include: { segments: { orderBy: { sortOrder: "asc" } } },
  });
  return roads.map((r) => ({
    id: r.id,
    title: `Peaje ${r.id} — ${r.fromCity} a ${r.toCity}`,
    subtitle: `${r.operator} · ${Number(r.maxPrice).toFixed(2)}€ · ${Number(r.totalKm)} km`,
    href: `/peajes/${r.slug}`,
    category: "Peajes",
    icon: "Route",
    keywords: [
      r.id, r.name, r.operator, r.fromCity, r.toCity,
      "peaje", "autopista", "toll",
      ...(r.isSeitt ? ["SEITT", "radial"] : []),
      ...r.segments.map((s) => `${s.fromPoint} ${s.toPoint}`),
    ],
    operator: r.operator,
    maxPrice: Number(r.maxPrice),
    totalKm: Number(r.totalKm),
    isSeitt: r.isSeitt,
  }));
}

// ---------------------------------------------------------------------------
// Loader registry
// ---------------------------------------------------------------------------

const LOADERS: Record<string, (p: PrismaClient) => Promise<Record<string, unknown>[]>> = {
  pages: loadPages,
  incidents: loadIncidents, weather_alerts: loadWeatherAlerts,
  gas_stations: loadGasStations, roads: loadRoads, cameras: loadCameras,
  articles: loadArticles, provinces: loadProvinces, cities: loadCities,
  ev_chargers: loadEVChargers, radars: loadRadars, railway_stations: loadRailwayStations,
  railway_routes: loadRailwayRoutes, railway_alerts: loadRailwayAlerts,
  zbe_zones: loadZBEZones, risk_zones: loadRiskZones, variable_panels: loadVariablePanels,
  maritime_stations: loadMaritimeStations, portugal_stations: loadPortugalStations,
  traffic_stations: loadTrafficStations, toll_roads: loadTollRoads,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Incremental delta loaders (only records updated since last sync)
// Returns null if the collection doesn't support delta updates (falls back to full)
// ---------------------------------------------------------------------------

type DeltaLoader = (p: PrismaClient, since: Date) => Promise<Record<string, unknown>[] | null>;

const DELTA_LOADERS: Partial<Record<string, DeltaLoader>> = {
  gas_stations: async (prisma, since) => {
    const rows = await prisma.gasStation.findMany({
      where: { lastPriceUpdate: { gte: since } },
      select: { id: true, name: true, province: true, provinceName: true, locality: true,
        latitude: true, longitude: true, priceGasoleoA: true, priceGasolina95E5: true,
        priceGasolina98E5: true, priceGLP: true, priceGNC: true, priceHidrogeno: true,
        priceGasoleoB: true, priceGasoleoPremium: true, priceGasolina95E5Premium: true,
        priceGasolina98E10: true, priceGNL: true, priceAdBlue: true, priceBioetanol: true,
        priceBiodiesel: true, lastPriceUpdate: true },
    });
    if (rows.length === 0) return [];
    return rows.map((s) => ({
      id: s.id, title: s.name,
      subtitle: s.locality ? `${s.locality}, ${s.provinceName || ""}` : s.provinceName || "",
      href: `/gasolineras/terrestres/${s.id}`,
      category: "Gasolineras", icon: "Fuel",
      keywords: [s.name, s.locality, s.provinceName].filter(Boolean) as string[],
      province: s.province || "", provinceName: s.provinceName || "",
      location: s.latitude && s.longitude ? [Number(s.latitude), Number(s.longitude)] : undefined,
      priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : 0,
      priceGasolina95: s.priceGasolina95E5 ? Number(s.priceGasolina95E5) : 0,
      priceGasolina98: s.priceGasolina98E5 ? Number(s.priceGasolina98E5) : 0,
      lastUpdated: s.lastPriceUpdate ? Math.floor(s.lastPriceUpdate.getTime() / 1000) : 0,
    }));
  },
  incidents: async (prisma, since) => {
    const rows = await prisma.trafficIncident.findMany({
      where: { updatedAt: { gte: since }, isActive: true },
      select: { id: true, type: true, severity: true, roadNumber: true, province: true,
        provinceName: true, municipality: true, description: true, latitude: true,
        longitude: true, source: true, causeType: true, startedAt: true },
    });
    if (rows.length === 0) return [];
    return rows.map((r) => ({
      id: r.id, type: r.type, severity: r.severity, roadNumber: r.roadNumber || "",
      province: r.province || "", provinceName: r.provinceName || "",
      municipality: r.municipality || "", description: r.description || "",
      location: r.latitude && r.longitude ? [Number(r.latitude), Number(r.longitude)] : undefined,
      source: r.source || "", causeType: r.causeType || "",
      startedAt: Math.floor(r.startedAt.getTime() / 1000),
    }));
  },
  cameras: async (prisma, since) => {
    const rows = await prisma.camera.findMany({
      where: { lastUpdated: { gte: since } },
      select: { id: true, name: true, roadNumber: true, province: true, provinceName: true,
        latitude: true, longitude: true },
    });
    if (rows.length === 0) return [];
    return rows.map((c) => ({
      id: c.id, title: c.name, roadNumber: c.roadNumber || "",
      province: c.province || "", provinceName: c.provinceName || "",
      href: `/camaras/camara/${c.id}`, category: "Camaras", icon: "Camera",
      location: c.latitude && c.longitude ? [Number(c.latitude), Number(c.longitude)] : undefined,
    }));
  },
  ev_chargers: async (prisma, since) => {
    const rows = await prisma.eVCharger.findMany({
      where: { lastUpdated: { gte: since } },
      select: { id: true, name: true, city: true, province: true, provinceName: true,
        operator: true, powerKw: true, latitude: true, longitude: true },
    });
    if (rows.length === 0) return [];
    return rows.map((c) => ({
      id: c.id, title: c.name, city: c.city || "", province: c.province || "",
      provinceName: c.provinceName || "", operator: c.operator || "",
      powerKw: c.powerKw ? Number(c.powerKw) : 0,
      href: `/carga-ev/punto/${c.id}`, category: "Cargadores EV", icon: "Zap",
      location: c.latitude && c.longitude ? [Number(c.latitude), Number(c.longitude)] : undefined,
    }));
  },
};

// Redis key for tracking last sync time per collection
const SYNC_TS_PREFIX = "typesense:last_sync:";

async function getLastSyncTime(collectionName: string): Promise<Date | null> {
  try {
    const redis = await import("ioredis").then((m) => {
      const url = process.env.REDIS_URL;
      return url ? new m.default(url) : null;
    });
    if (!redis) return null;
    const ts = await redis.get(`${SYNC_TS_PREFIX}${collectionName}`);
    await redis.quit();
    return ts ? new Date(ts) : null;
  } catch { return null; }
}

async function setLastSyncTime(collectionName: string, time: Date): Promise<void> {
  try {
    const redis = await import("ioredis").then((m) => {
      const url = process.env.REDIS_URL;
      return url ? new m.default(url) : null;
    });
    if (!redis) return;
    await redis.set(`${SYNC_TS_PREFIX}${collectionName}`, time.toISOString());
    await redis.quit();
  } catch { /* non-critical */ }
}

export async function run(prisma: PrismaClient): Promise<void> {
  const target = process.env.SYNC_COLLECTION;
  const incremental = process.env.SYNC_MODE === "incremental";
  const mode = target ? "single" : incremental ? "incremental" : "full";
  console.log(`[typesense-sync] ${mode} sync${target ? ` (${target})` : ""}...`);
  const start = Date.now();

  const client = getTypesenseClient();
  await client.health.retrieve().catch((e: unknown) => { throw new Error(`Typesense unreachable: ${e}`); });

  const names = target ? [target] : Object.keys(LOADERS);
  if (target && !LOADERS[target]) throw new Error(`Unknown collection: ${target}`);

  // Phase 1: Parallel DB loads (full or incremental)
  const syncStartTime = new Date();
  const loadStart = Date.now();
  const loaded = await Promise.allSettled(
    names.map(async (name) => {
      const t0 = Date.now();
      let docs: Record<string, unknown>[];

      if (incremental && DELTA_LOADERS[name]) {
        const lastSync = await getLastSyncTime(name);
        if (lastSync) {
          const delta = await DELTA_LOADERS[name]!(prisma, lastSync);
          if (delta !== null) {
            console.log(`[typesense-sync] Delta ${name}: ${delta.length} updated since ${lastSync.toISOString()} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
            return { name, docs: delta, isDelta: true };
          }
        }
        // Fall back to full load if no lastSync or delta not supported
        console.log(`[typesense-sync] No delta for ${name}, falling back to full load`);
      }

      docs = await LOADERS[name](prisma);
      console.log(`[typesense-sync] Loaded ${docs.length} ${name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return { name, docs, isDelta: false };
    })
  );
  console.log(`[typesense-sync] All loads in ${((Date.now() - loadStart) / 1000).toFixed(1)}s`);

  // Phase 2: Parallel Typesense writes (batches of 4 to avoid overwhelming)
  // Delta loads always upsert, full loads replace
  const defaultSyncFn = mode === "full" ? replaceCollection : upsertCollection;
  const totals: Record<string, number> = {};
  const successes = loaded.filter((r): r is PromiseFulfilledResult<{ name: string; docs: Record<string, unknown>[]; isDelta: boolean }> => r.status === "fulfilled");

  for (let i = 0; i < successes.length; i += 4) {
    const batch = successes.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const { name, docs, isDelta } = r.value;
        if (isDelta && docs.length === 0) {
          console.log(`[typesense-sync] Skip ${name} (no changes)`);
          return { name, count: 0 };
        }
        const t0 = Date.now();
        const fn = isDelta ? upsertCollection : defaultSyncFn;
        const count = await fn(client, name, COLLECTIONS[name], docs);
        console.log(`[typesense-sync] Synced ${count} ${name}${isDelta ? " (delta)" : ""} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        // Track last sync time for incremental collections
        if (DELTA_LOADERS[name]) await setLastSyncTime(name, syncStartTime);
        return { name, count };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") totals[r.value.name] = r.value.count;
      else console.error("[typesense-sync] Write failed:", r.reason);
    }
  }

  console.log(`[typesense-sync] ${mode} sync complete in ${((Date.now() - start) / 1000).toFixed(1)}s`, totals);
}
