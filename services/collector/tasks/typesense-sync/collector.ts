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

async function replaceCollection(
  client: Typesense.Client, name: string, schema: CollectionCreateSchema,
  documents: Record<string, unknown>[]
): Promise<number> {
  try { await client.collections(name).delete(); } catch { /* ok */ }
  await client.collections().create(schema);
  return importBatched(client, name, documents, "create");
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

// ---------------------------------------------------------------------------
// Loader registry
// ---------------------------------------------------------------------------

const LOADERS: Record<string, (p: PrismaClient) => Promise<Record<string, unknown>[]>> = {
  gas_stations: loadGasStations, roads: loadRoads, cameras: loadCameras,
  articles: loadArticles, provinces: loadProvinces, cities: loadCities,
  ev_chargers: loadEVChargers, radars: loadRadars, railway_stations: loadRailwayStations,
  zbe_zones: loadZBEZones, risk_zones: loadRiskZones, variable_panels: loadVariablePanels,
  maritime_stations: loadMaritimeStations, portugal_stations: loadPortugalStations,
  traffic_stations: loadTrafficStations,
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const target = process.env.SYNC_COLLECTION;
  const mode = target ? "single" : "full";
  console.log(`[typesense-sync] ${mode} sync${target ? ` (${target})` : ""}...`);
  const start = Date.now();

  const client = getTypesenseClient();
  await client.health.retrieve().catch((e: unknown) => { throw new Error(`Typesense unreachable: ${e}`); });

  const names = target ? [target] : Object.keys(LOADERS);
  if (target && !LOADERS[target]) throw new Error(`Unknown collection: ${target}`);

  // Phase 1: Parallel DB loads
  const loadStart = Date.now();
  const loaded = await Promise.allSettled(
    names.map(async (name) => {
      const t0 = Date.now();
      const docs = await LOADERS[name](prisma);
      console.log(`[typesense-sync] Loaded ${docs.length} ${name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return { name, docs };
    })
  );
  console.log(`[typesense-sync] All loads in ${((Date.now() - loadStart) / 1000).toFixed(1)}s`);

  // Phase 2: Parallel Typesense writes (batches of 4 to avoid overwhelming)
  const syncFn = mode === "full" ? replaceCollection : upsertCollection;
  const totals: Record<string, number> = {};
  const successes = loaded.filter((r): r is PromiseFulfilledResult<{ name: string; docs: Record<string, unknown>[] }> => r.status === "fulfilled");

  for (let i = 0; i < successes.length; i += 4) {
    const batch = successes.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const { name, docs } = r.value;
        const t0 = Date.now();
        const count = await syncFn(client, name, COLLECTIONS[name], docs);
        console.log(`[typesense-sync] Synced ${count} ${name} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
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
