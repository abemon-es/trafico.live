/**
 * Typesense Sync Collector
 *
 * Indexes all searchable data from PostgreSQL into Typesense collections.
 * Runs daily at 05:00 via cron. Can also be triggered manually.
 *
 * Collections synced:
 *   - gas_stations  (~12,000 records)
 *   - roads         (~600 records)
 *   - cameras       (~900 records)
 *   - articles      (variable)
 *   - provinces     (52 records)
 *   - cities        (~8,000 records)
 */

import type { PrismaClient } from "@prisma/client";
import Typesense from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection";
import { getTypesenseClient } from "../../shared/typesense.js";

// ---------------------------------------------------------------------------
// Collection schemas (mirror of src/lib/typesense.ts — kept separate to avoid
// cross-dependency between Next.js app and collector)
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
      { name: "priceGasolina95", type: "float", optional: true, sort: true },
      { name: "is24h", type: "bool", optional: true, facet: true },
      { name: "nearestRoad", type: "string", optional: true },
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
    ] as CollectionFieldSchema[],
  },
};

// ---------------------------------------------------------------------------
// Sync helper (inline to avoid importing from Next.js app)
// ---------------------------------------------------------------------------

async function syncCollection(
  client: Typesense.Client,
  name: string,
  schema: CollectionCreateSchema,
  documents: Record<string, unknown>[],
  batchSize = 1000
): Promise<number> {
  // Ensure collection exists
  try {
    const existing = await client.collections(name).retrieve();
    if (existing.fields.length !== (schema.fields?.length ?? 0)) {
      console.log(`[typesense-sync] Schema drift for ${name}, recreating...`);
      await client.collections(name).delete();
      await client.collections().create(schema);
    }
  } catch {
    await client.collections().create(schema);
    console.log(`[typesense-sync] Created collection: ${name}`);
  }

  if (documents.length === 0) {
    console.log(`[typesense-sync] ${name}: 0 documents, skipping`);
    return 0;
  }

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
          `[typesense-sync] ${name}: ${failures.length} failures in batch ${Math.floor(i / batchSize) + 1}`,
          failures.slice(0, 3).map((f) => f.error)
        );
      }
    } catch (error) {
      console.error(
        `[typesense-sync] ${name}: batch ${Math.floor(i / batchSize) + 1} failed:`,
        error
      );
    }
  }

  return upserted;
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

async function loadGasStations(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const stations = await prisma.gasStation.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      locality: true,
      province: true,
      provinceName: true,
      latitude: true,
      longitude: true,
      priceGasoleoA: true,
      priceGasolina95E5: true,
      is24h: true,
      nearestRoad: true,
    },
  });

  return stations.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address || "",
    locality: s.locality || "",
    province: s.province || "",
    provinceName: s.provinceName || "",
    location:
      s.latitude && s.longitude
        ? [Number(s.latitude), Number(s.longitude)]
        : undefined,
    priceGasoleoA: s.priceGasoleoA ? Number(s.priceGasoleoA) : undefined,
    priceGasolina95: s.priceGasolina95E5
      ? Number(s.priceGasolina95E5)
      : undefined,
    is24h: s.is24h,
    nearestRoad: s.nearestRoad || "",
  }));
}

async function loadRoads(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const roads = await prisma.road.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      provinces: true,
      totalKm: true,
    },
  });

  return roads.map((r) => ({
    id: r.id,
    name: r.name || "",
    roadNumber: r.id,
    roadType: r.type,
    provinces: r.provinces || [],
    totalKm: r.totalKm ? Number(r.totalKm) : undefined,
  }));
}

async function loadCameras(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const cameras = await prisma.camera.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      roadNumber: true,
      province: true,
      provinceName: true,
      latitude: true,
      longitude: true,
    },
  });

  return cameras.map((c) => ({
    id: c.id,
    name: c.name,
    roadNumber: c.roadNumber || "",
    province: c.province || "",
    provinceName: c.provinceName || "",
    location:
      c.latitude && c.longitude
        ? [Number(c.latitude), Number(c.longitude)]
        : undefined,
  }));
}

async function loadArticles(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      category: true,
      publishedAt: true,
      tags: {
        select: {
          tag: {
            select: { name: true },
          },
        },
      },
    },
  });

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary.slice(0, 500),
    category: a.category,
    tags: a.tags.map((t) => t.tag.name),
    publishedAt: Math.floor(a.publishedAt.getTime() / 1000),
  }));
}

async function loadProvinces(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const provinces = await prisma.province.findMany({
    select: {
      code: true,
      name: true,
      slug: true,
      community: {
        select: { name: true },
      },
    },
  });

  return provinces.map((p) => ({
    id: p.code,
    name: p.name,
    slug: p.slug,
    code: p.code,
    community: p.community.name,
  }));
}

async function loadCities(prisma: PrismaClient): Promise<Record<string, unknown>[]> {
  const cities = await prisma.municipality.findMany({
    select: {
      code: true,
      name: true,
      slug: true,
      provinceCode: true,
      province: {
        select: { name: true },
      },
    },
  });

  return cities.map((c) => ({
    id: c.code,
    name: c.name,
    slug: c.slug,
    province: c.provinceCode,
    provinceName: c.province.name,
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  console.log("[typesense-sync] Starting full sync...");
  const start = Date.now();

  const client = getTypesenseClient();

  // Verify Typesense is reachable
  try {
    await client.health.retrieve();
    console.log("[typesense-sync] Typesense is healthy");
  } catch (error) {
    throw new Error(`Typesense unreachable: ${error}`);
  }

  // Load and sync each collection
  const loaders: [string, (p: PrismaClient) => Promise<Record<string, unknown>[]>][] = [
    ["gas_stations", loadGasStations],
    ["roads", loadRoads],
    ["cameras", loadCameras],
    ["articles", loadArticles],
    ["provinces", loadProvinces],
    ["cities", loadCities],
  ];

  const totals: Record<string, number> = {};

  for (const [name, loader] of loaders) {
    const loadStart = Date.now();
    const docs = await loader(prisma);
    const loadTime = ((Date.now() - loadStart) / 1000).toFixed(1);
    console.log(
      `[typesense-sync] Loaded ${docs.length} ${name} documents in ${loadTime}s`
    );

    const schema = COLLECTIONS[name];
    const count = await syncCollection(client, name, schema, docs);
    totals[name] = count;
    console.log(`[typesense-sync] Synced ${count} ${name} documents`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("[typesense-sync] Full sync complete in", elapsed + "s");
  console.log("[typesense-sync] Totals:", totals);
}
