/**
 * speedlimit and an unusable TN-ITS feed (BACKLOG cycle 128). On 2026-10-23
 * the NAP's dataset (16-10) had 2,438 records, every MaximumSpeedLimit 0. The
 * parser skipped them all and run() returned with no heartbeat, so the task
 * kept its last success. The filter also dropped Remove records, which carry
 * no speed.
 *   1. a record as the NAP publishes it, speed 0: unusable, not a record;
 *      the same record at 120 km/h: road, km and a position in Spain;
 *   2. a Remove with speed 0 is kept;
 *   3. run() on a feed whose adds are all unusable throws before any write;
 *      an empty feed throws too; both as an upstream outage (DGT's data), so
 *      the dispatcher reports it once and /api/health shows cause upstream;
 *   4. run() on a remove-only feed deletes by sourceId.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure. Run it
 * in a collector image (its @prisma/client and node_modules).
 *   npm run test:speedlimit-feed
 */

import assert from "node:assert/strict";

// Loaded at run time: the collector's modules live outside the web tsc's
// resolution (it type-checks tests/).
const TASK_MODULE = "../services/collector/tasks/speedlimit/collector";
const CAUSE_MODULE = "../services/collector/shared/error-cause";
type Rec = { uuid: string; operation: string; road: string; kmStart: number; speedLimit: number; lat?: number; lng?: number };
type Mod = {
  parseRecords: (xml: string) => { records: Rec[]; unusable: number };
  run: (prisma: unknown) => Promise<void>;
};

// A record from the NAP's limitesVelocidad.xml (2026-10-23), with its
// operation, speed and id as parameters.
const feature = (op: string, kmph: number, uuid = "0b625dad-bd88-4807-9603-cc9ba9af0055") =>
  `<rst:GenericSafetyFeature gml:id="70204"> <rst:id> <rst:SafetyFeatureId> <rst:providerId>ANTEA GROUP</rst:providerId> <rst:id>${uuid}</rst:id> </rst:SafetyFeatureId> </rst:id> <rst:locationReference> <rst:INSPIRELinearLocation gml:id="0"> <net:SimpleLinearReference> <net:element xlink:href=""/> <net:applicableDirection>Unknown</net:applicableDirection> <net:fromPosition uom="meter">18.837</net:fromPosition> <net:toPosition uom="meter">18.838</net:toPosition> <net:road>A-1</net:road> <net:caracter></net:caracter> </net:SimpleLinearReference> </rst:INSPIRELinearLocation> </rst:locationReference> <rst:locationReference> <rst:OpenLRLocationString gml:id=""/> </rst:locationReference> <rst:updateInfo> <rst:UpdateInfo> <rst:type>${op}</rst:type> </rst:UpdateInfo> </rst:updateInfo> <rst:source>Regulation</rst:source> <rst:encodedGeometry> <gml:LineString gml:id="0" srsDimension="2"> <gml:posList>4488642.28908333 ,448509.85999213</gml:posList> </gml:LineString> </rst:encodedGeometry> <rst:type>SpeedLimit</rst:type> <rst:properties> <rst:SafetyFeaturePropertyValue> <rst:type>MaximumSpeedLimit</rst:type> <rst:propertyValue> <gml:measure uom="kmph">${kmph}</gml:measure> </rst:propertyValue> </rst:SafetyFeaturePropertyValue> </rst:properties> </rst:GenericSafetyFeature>`;
const dataset = (...features: string[]) => `<?xml version="1.0" encoding="UTF-8"?><rst:ROSATTESafetyFeatureDataset>${features.join("\n")}</rst:ROSATTESafetyFeatureDataset>`;

/** A Prisma stub that records every call and touches no database. */
function stub(calls: string[]) {
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, m: string) => async (args: unknown) => {
        calls.push(`${name}.${m} ${JSON.stringify(args ?? null).slice(0, 200)}`);
        if (m === "groupBy" || m === "findMany") return [];
        if (m === "count") return 0;
        if (m.endsWith("Many")) return { count: 0 };
        if (m === "findFirst" || m === "findUnique") return null;
        return {};
      },
    });
  return new Proxy({}, { get: (_t, k: string) => (k === "then" ? undefined : k.startsWith("$") ? async () => 0 : model(k)) });
}

async function runOn(mod: Mod, xml: string) {
  const calls: string[] = [];
  globalThis.fetch = (async () => new Response(xml, { status: 200 })) as typeof fetch;
  let error: Error | null = null;
  try {
    await mod.run(stub(calls));
  } catch (e) {
    error = e as Error;
  }
  return { calls, error };
}

async function main() {
  const mod = (await import(TASK_MODULE)) as Mod;
  const { errorCause } = (await import(CAUSE_MODULE)) as { errorCause: (e: unknown) => string | undefined };

  // 1. As published: unusable. At 120 km/h: a record.
  assert.deepEqual(mod.parseRecords(dataset(feature("Add", 0))), { records: [], unusable: 1 });
  {
    const { records, unusable } = mod.parseRecords(dataset(feature("Add", 120)));
    assert.equal(unusable, 0);
    assert.equal(records.length, 1);
    const r = records[0];
    assert.equal(r.road, "A-1");
    assert.equal(r.speedLimit, 120);
    assert.ok(r.lat! > 40 && r.lat! < 41 && r.lng! > -4 && r.lng! < -3, `A-1 near Madrid (${r.lat}, ${r.lng})`);
  }

  // 2. A removal carries no speed and is kept.
  {
    const { records, unusable } = mod.parseRecords(dataset(feature("Remove", 0, "b387173b-56b8-4136-850a-fff079554a2c")));
    assert.equal(unusable, 0);
    assert.deepEqual(records.map((r) => [r.operation, r.uuid]), [["Remove", "b387173b-56b8-4136-850a-fff079554a2c"]]);
  }

  // 3. All adds unusable: a failed run, before any write. Empty: the same.
  {
    const { calls, error } = await runOn(mod, dataset(feature("Add", 0), feature("Modify", 0, "x-1"), feature("Remove", 0, "x-2")));
    assert.match(error?.message ?? "", /2 add\/modify records, none usable/);
    assert.equal(errorCause(error), "upstream", "DGT's data: an upstream outage");
    assert.deepEqual(calls, [], "nothing written, not even a removal");
  }
  {
    const { calls, error } = await runOn(mod, dataset());
    assert.match(error?.message ?? "", /no records/);
    assert.equal(errorCause(error), "upstream");
    assert.deepEqual(calls, []);
  }

  // 4. Removals only: deleted by sourceId.
  {
    const { calls, error } = await runOn(mod, dataset(feature("Remove", 0, "x-2")));
    assert.equal(error, null);
    assert.ok(calls.some((c) => c.startsWith("speedLimit.deleteMany") && c.includes('"x-2"')), `deleteMany by sourceId: ${calls[0]}`);
  }

  console.log("speedlimit-feed: ok (speed 0 unusable, a real limit parsed; removals kept; an all-unusable or empty feed fails before any write, as upstream; removals applied)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
