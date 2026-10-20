#!/usr/bin/env node
/**
 * Builds services/collector/data/cyl-pks.json: the kilometre points of Castilla
 * y León's road network, from IDECyL's WFS layer viascomunicacion:carr_cyl_pks
 * (GPS-captured from the roadside markers; revised yearly). The CyL incident
 * feed gives road + km and no coordinates, and these points are how we place
 * it. Static on purpose: a task that runs every 2 minutes must not depend on
 * a remote fetch of data that changes once a year.
 *
 * Licence (IDECyL metadata SPAGOBCYLCITDTSTNCPK): free use, citing the Junta
 * de Castilla y León.
 *
 * Run once a year:  node bin/build-cyl-pks.mjs > services/collector/data/cyl-pks.json
 * Then, once deployed, check 20 live CyL incidents against OpenStreetMap:
 *   python3 bin/check-cyl-points.py incidents.json   (must give >= 90 % hits)
 */

const WFS = "https://idecyl.jcyl.es/geoserver/viascomunicacion/wfs";
const PAGE = 5000; // the server's maximum per request (it reports numberMatched as the page size)

const roads = new Map(); // road -> Map(km -> [sumLat, sumLon, n])
let start = 0;
for (;;) {
  const url = `${WFS}?service=WFS&version=2.0.0&request=GetFeature&typeNames=viascomunicacion:carr_cyl_pks` +
    `&outputFormat=application/json&srsName=EPSG:4326&count=${PAGE}&startIndex=${start}&sortBy=fid`;
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`WFS ${res.status} at startIndex ${start}`);
  const page = await res.json();
  const features = page.features ?? [];
  for (const f of features) {
    const road = String(f.properties?.nombre ?? "").trim().toUpperCase();
    const km = Number(f.properties?.numero);
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (!road || !Number.isFinite(km) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!roads.has(road)) roads.set(road, new Map());
    const byKm = roads.get(road);
    const acc = byKm.get(km) ?? [0, 0, 0];
    acc[0] += lat; acc[1] += lon; acc[2] += 1;
    byKm.set(km, acc);
  }
  start += features.length;
  process.stderr.write(`${start}\n`);
  if (features.length < PAGE) break;
}

const out = {};
for (const [road, byKm] of [...roads].sort(([a], [b]) => a.localeCompare(b))) {
  out[road] = [...byKm]
    .sort(([a], [b]) => a - b)
    .map(([km, [la, lo, n]]) => [km, Number((la / n).toFixed(5)), Number((lo / n).toFixed(5))]);
}

process.stdout.write(JSON.stringify({
  source: "IDECyL, capa viascomunicacion:carr_cyl_pks (Junta de Castilla y León)",
  licence: "Uso libre y gratuito con cita obligada a la Junta de Castilla y León",
  builtAt: new Date().toISOString(),
  points: start,
  roads: out,
}));
process.stderr.write(`${Object.keys(out).length} roads\n`);
