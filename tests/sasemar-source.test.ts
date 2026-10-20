/**
 * sasemar (services/collector/tasks/sasemar/collector.ts): only SASEMAR's own
 * EMERGENCIAS_<year> layers are read, and they are parsed as they are.
 *
 * Until 2026-10-20 a global ArcGIS search fed it "Emergencias Cuernavaca" and
 * other organisations' layers, and the stats page published them as SASEMAR.
 * The items and the feature below are copied from the real responses.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:sasemar
 */

import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import {
  inSpainSar,
  parseFeature,
  parseFechaEjec,
  run,
  sasemarLayer,
  type ArcGisItem,
} from "../services/collector/tasks/sasemar/collector";

const SASEMAR_2024: ArcGisItem = {
  title: "EMERGENCIAS_2024",
  owner: "OpenDataSASEMAR",
  type: "Feature Service",
  url: "https://services5.arcgis.com/z9EodtVMNDMSeW4E/arcgis/rest/services/EMERGENCIAS_2024/FeatureServer",
};
const CUERNAVACA: ArcGisItem = {
  title: "Emergencias Cuernavaca",
  owner: "solucionessig",
  type: "Feature Service",
  url: "https://services9.arcgis.com/fp5f46XvVGKIUi0R/arcgis/rest/services/Emergencias_Cuernavaca/FeatureServer/0",
};
const FEATURE_TARIFA = {
  type: "Feature" as const,
  geometry: { type: "Point", coordinates: [-5.50833, 36.0117] },
  properties: {
    FID: 1, fecha_ejec: "03/06/2024", centro: "CCS Tarifa", latitud: "36.0117", longitud: "-5.50833",
    tipo: "SALVAMENTO-MARITIMO", subtipo: "BUQUE A LA DERIVA/ SIN GOBIERNO",
    numbuqmer: 0, numbuqpes: 0, numbuqrec: 0, numbuqotr: 1, numperres: 0,
  },
};
const feature = (fid: number, lon: number, lat: number, tipo = "SALVAMENTO-MARITIMO") => ({
  type: "Feature" as const,
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { FID: fid, fecha_ejec: "15/08/2024", centro: "CCS Palma", latitud: String(lat), longitud: String(lon), tipo, subtipo: "X", numbuqrec: 2, numperres: 3 },
});

function fakePrisma() {
  const rows: Array<Record<string, unknown>> = [];
  let heartbeat: { status: string; meta: Record<string, unknown> } | null = null;
  const prisma = {
    maritimeEmergency: {
      upsert: async ({ create }: { create: Record<string, unknown> }) => {
        rows.push(create);
        return create;
      },
    },
    collectorHeartbeat: {
      upsert: async ({ create }: { create: { status: string; meta: Record<string, unknown> } }) => {
        heartbeat = { status: create.status, meta: create.meta };
      },
    },
  };
  return { prisma: prisma as unknown as PrismaClient, rows, heartbeat: () => heartbeat! };
}

async function runWith(items: ArcGisItem[], layerFeatures: Record<string, unknown[]>) {
  const db = fakePrisma();
  const fetched: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetched.push(url);
    if (url.startsWith("https://www.arcgis.com/sharing/rest/search")) return new Response(JSON.stringify({ results: items }));
    for (const [title, features] of Object.entries(layerFeatures)) {
      if (url.includes(`/${title}/FeatureServer/0/query`)) {
        const offset = Number(new URL(url).searchParams.get("resultOffset"));
        return new Response(JSON.stringify({ type: "FeatureCollection", features: offset === 0 ? features : [] }));
      }
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  try {
    await run(db.prisma);
  } finally {
    globalThis.fetch = real;
  }
  return { ...db, fetched };
}

async function main() {
  // 1. Only SASEMAR's yearly emergencies layers are accepted.
  assert.deepEqual(sasemarLayer(SASEMAR_2024), {
    title: "EMERGENCIAS_2024",
    year: 2024,
    url: "https://services5.arcgis.com/z9EodtVMNDMSeW4E/arcgis/rest/services/EMERGENCIAS_2024/FeatureServer/0",
  });
  assert.equal(sasemarLayer(CUERNAVACA), null, "another organisation's layer");
  assert.equal(sasemarLayer({ ...CUERNAVACA, title: "EMERGENCIAS_2024" }), null, "right title, foreign owner and host");
  assert.equal(sasemarLayer({ ...SASEMAR_2024, url: CUERNAVACA.url }), null, "right owner, foreign host");
  assert.equal(sasemarLayer({ ...SASEMAR_2024, owner: "SigoAdmin" }), null, "SASEMAR host, another owner");
  assert.equal(sasemarLayer({ ...SASEMAR_2024, title: "ZonaContigua" }), null);
  assert.equal(sasemarLayer({ ...SASEMAR_2024, type: "CSV" }), null);
  assert.equal(sasemarLayer({ ...SASEMAR_2024, url: null }), null);

  // 2. fecha_ejec is day first.
  assert.equal(parseFechaEjec("03/06/2024")?.toISOString(), "2024-06-03T00:00:00.000Z");
  assert.equal(parseFechaEjec("31/02/2024"), null);
  assert.equal(parseFechaEjec(""), null);
  assert.equal(parseFechaEjec(null), null);

  // 3. A real feature, as SASEMAR serves it.
  const layer = sasemarLayer(SASEMAR_2024)!;
  const rec = parseFeature(FEATURE_TARIFA, layer)!;
  assert.equal(rec.sourceId, "sasemar-2024-1", "FID restarts every year, so the year is in the id");
  assert.equal(rec.year, 2024);
  assert.equal(rec.occurredAt?.toISOString(), "2024-06-03T00:00:00.000Z");
  assert.equal(rec.type, "RESCUE");
  assert.equal(rec.subtype, "BUQUE A LA DERIVA/ SIN GOBIERNO");
  assert.equal(rec.zone, "CCS Tarifa");
  assert.equal(rec.provinceName, "Cádiz");
  assert.equal(rec.vesselType, "otro");
  assert.equal(rec.personsInvolved, 0);
  assert.equal(rec.personsSaved, null, "numperres is not stored as rescued");
  assert.equal(rec.dataSource, "sasemar-arcgis:EMERGENCIAS_2024");
  assert.equal(parseFeature({ ...FEATURE_TARIFA, properties: { ...FEATURE_TARIFA.properties, tipo: "MEDIO-AMBIENTE" } }, layer)!.type, "POLLUTION");
  assert.equal(parseFeature({ ...FEATURE_TARIFA, properties: { ...FEATURE_TARIFA.properties, FID: undefined } }, layer), null);
  assert.equal(inSpainSar(36.0117, -5.50833), true);
  assert.equal(inSpainSar(18.910321, -99.210052), false, "Cuernavaca");
  assert.equal(inSpainSar(37.421998, -122.084), false);

  // 4. run(): the search also returns other organisations' layers; only SASEMAR's is fetched.
  const ok = await runWith(
    [SASEMAR_2024, CUERNAVACA, { ...CUERNAVACA, title: "EMERGENCIAS_2023" }],
    { EMERGENCIAS_2024: [FEATURE_TARIFA, feature(2, 2.65, 39.57), feature(3, -70.1, 12.5)] },
  );
  assert.ok(!ok.fetched.some((u) => u.includes("fp5f46XvVGKIUi0R")), "no request to a foreign layer");
  assert.equal(ok.heartbeat().status, "ok");
  assert.deepEqual(ok.heartbeat().meta.layers, ["EMERGENCIAS_2024"]);
  assert.equal(ok.rows.length, 3, "a case SASEMAR coordinated abroad is kept");
  assert.equal(ok.rows.find((r) => r.sourceId === "sasemar-2024-3")!.province, undefined, "…without a province");

  // 5. A SASEMAR-named layer whose points are mostly not in Spain is rejected whole.
  const away = await runWith([SASEMAR_2024], {
    EMERGENCIAS_2024: [feature(1, -99.21, 18.91), feature(2, -99.31, 19.55), feature(3, -75.02, -14.0), FEATURE_TARIFA],
  });
  assert.equal(away.rows.length, 0);
  assert.equal(away.heartbeat().status, "error");
  const failed = away.heartbeat().meta.failedLayers as { layer: string; error: string }[];
  assert.equal(failed[0].layer, "EMERGENCIAS_2024");
  assert.match(failed[0].error, /3 of 4 points outside Spain's SAR area/);

  // 6. No SASEMAR layer at all: error, nothing stored.
  const none = await runWith([CUERNAVACA], {});
  assert.equal(none.rows.length, 0);
  assert.equal(none.heartbeat().status, "error");
  assert.equal(none.fetched.length, 1, "only the search");

  console.log("sasemar: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
