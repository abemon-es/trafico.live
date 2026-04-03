/**
 * AIS Stream Collector
 *
 * Real-time vessel tracking via aisstream.io WebSocket API.
 * Covers all Spanish waters: Peninsula, Canary Islands, Balearic Islands.
 *
 * Source: wss://stream.aisstream.io/v0/stream
 * Auth: API key (AISSTREAM_API_KEY env var)
 * Protocol: WebSocket, JSON frames
 * Service: BETA (no SLA)
 *
 * Stores vessel metadata in Vessel table and positions in VesselPosition
 * with a rolling 48h buffer.
 */

import { PrismaClient } from "@prisma/client";
import { createReconnectingWS } from "../../shared/ws-client.js";
import { log, logError } from "../../shared/utils.js";

const TASK = "ais-stream";

// Bounding boxes for all Spanish waters [SW, NE] as [lat, lng]
const SPAIN_BBOXES = [
  [[35.7, -9.5], [43.8, 3.3]],    // Peninsula (Mediterranean + Atlantic + Cantabrian)
  [[27.5, -18.2], [29.5, -13.3]], // Canary Islands
  [[38.6, 1.1], [40.1, 4.4]],    // Balearic Islands
];

// MMSI Maritime Identification Digit (MID) → country flag mapping
// First 3 digits of MMSI encode the country
const MID_FLAGS: Record<string, string> = {
  "224": "ES", "225": "ES",
  "226": "FR", "227": "FR", "228": "FR",
  "230": "FI", "231": "FI",
  "232": "GB", "233": "GB", "234": "GB", "235": "GB",
  "236": "GI", "237": "GR",
  "238": "HR", "239": "GR",
  "240": "GR", "241": "GR",
  "242": "MA", "243": "HU",
  "244": "NL", "245": "NL", "246": "NL",
  "247": "IT", "248": "MT",
  "249": "MT", "250": "IE",
  "255": "PT", "256": "MT",
  "257": "NO",
  "261": "PL", "263": "PT",
  "265": "SE", "266": "SE",
  "269": "CH", "270": "CZ",
  "271": "TR", "272": "UA",
  "273": "RU",
  "301": "AI",
  "303": "US",
  "305": "AG",
  "309": "BS", "311": "BS",
  "312": "BZ",
  "314": "BB",
  "316": "BM",
  "319": "KY",
  "325": "JM",
  "338": "US", "366": "US", "367": "US", "368": "US", "369": "US",
  "341": "NO",
  "345": "MX",
  "351": "FR",
  "352": "PA", "353": "PA", "354": "PA",
  "355": "PA", "356": "PA", "357": "PA",
  "370": "PA", "371": "PA", "372": "PA", "373": "PA",
  "374": "PA", "375": "PA", "376": "PA", "377": "PA",
  "378": "VC", "379": "VC",
  "412": "CN", "413": "CN", "414": "CN",
  "431": "JP", "432": "JP",
  "441": "KR",
  "470": "AE",
  "477": "HK",
  "503": "AU",
  "512": "NZ",
  "533": "MH", "538": "MH",
  "548": "PH",
  "563": "SG", "564": "SG", "565": "SG", "566": "SG",
  "572": "TV",
  "576": "TK",
  "577": "TO",
  "603": "ZA",
  "613": "MG",
  "616": "KM",
  "620": "KM",
  "621": "DJ",
  "622": "EG",
  "625": "ER",
  "626": "GA",
  "627": "GH",
  "636": "LR",
};

function getFlag(mmsi: number): string | undefined {
  const mid = mmsi.toString().substring(0, 3);
  return MID_FLAGS[mid];
}

// Ship type classification per ITU-R M.1371 Table 53
function classifyShipType(type: number | undefined): string | undefined {
  if (type === undefined || type === null) return undefined;
  if (type >= 20 && type <= 29) return "WIG";
  if (type === 30) return "FISHING";
  if (type >= 31 && type <= 32) return "TOWING";
  if (type === 33) return "DREDGING";
  if (type === 34) return "DIVING";
  if (type === 35) return "MILITARY";
  if (type === 36) return "SAILING";
  if (type === 37) return "PLEASURE";
  if (type >= 40 && type <= 49) return "HSC";
  if (type === 50) return "PILOT";
  if (type === 51) return "SAR";
  if (type === 52) return "TUG";
  if (type === 53) return "PORT_TENDER";
  if (type === 55) return "LAW_ENFORCEMENT";
  if (type === 58) return "MEDICAL";
  if (type >= 60 && type <= 69) return "PASSENGER";
  if (type >= 70 && type <= 79) return "CARGO";
  if (type >= 80 && type <= 89) return "TANKER";
  if (type >= 90 && type <= 99) return "OTHER";
  return undefined;
}

interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    ShipName?: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: Record<string, unknown>;
}

export async function run(prisma: PrismaClient): Promise<void> {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    logError(TASK, "AISSTREAM_API_KEY not set — skipping");
    return;
  }

  // Duration: 0 = indefinite, otherwise milliseconds
  const duration = parseInt(process.env.COLLECTOR_DURATION || "3300000", 10); // default 55 min
  const batchInterval = 10_000; // flush positions every 10 seconds
  const cleanupInterval = 3600_000; // cleanup every hour

  // Batching state
  const positionBatch: Array<{
    mmsi: number;
    latitude: number;
    longitude: number;
    sog: number | null;
    cog: number | null;
    heading: number | null;
    navStatus: number | null;
  }> = [];
  const vesselUpdates = new Map<number, {
    imo?: number;
    name?: string;
    callsign?: string;
    shipType?: number;
    flag?: string;
    length?: number;
    beam?: number;
    draught?: number;
    destination?: string;
    eta?: Date;
  }>();

  let messagesReceived = 0;
  let positionsStored = 0;
  let vesselsUpdated = 0;

  // Message handler
  function handleMessage(data: unknown) {
    const msg = data as AISMessage;
    if (!msg?.MetaData?.MMSI) return;
    messagesReceived++;

    const mmsi = msg.MetaData.MMSI;
    const type = msg.MessageType;

    if (
      type === "PositionReport" ||
      type === "StandardClassBPositionReport" ||
      type === "ExtendedClassBPositionReport"
    ) {
      const pos = msg.Message[type] as Record<string, unknown> | undefined;
      if (!pos) return;
      const lat = (pos.Latitude as number) ?? msg.MetaData.latitude;
      const lng = (pos.Longitude as number) ?? msg.MetaData.longitude;
      if (!lat || !lng || lat === 0 || lng === 0) return;

      // TrueHeading 511 = not available per AIS spec
      const rawHeading = pos.TrueHeading as number | undefined;
      const heading = rawHeading !== undefined && rawHeading !== 511 ? rawHeading : null;

      // Cap batch to prevent unbounded memory growth if DB is down
      if (positionBatch.length >= 50_000) {
        positionBatch.splice(0, 10_000); // drop oldest 10K
        log(TASK, "WARNING: position batch overflow, dropped 10K oldest entries");
      }
      positionBatch.push({
        mmsi,
        latitude: lat,
        longitude: lng,
        sog: (pos.Sog as number) ?? null,
        cog: (pos.Cog as number) ?? null,
        heading,
        navStatus: (pos.NavigationalStatus as number) ?? null,
      });
    } else if (type === "ShipStaticData") {
      const sd = msg.Message.ShipStaticData as Record<string, unknown> | undefined;
      if (!sd) return;
      const dim = sd.Dimension as Record<string, number> | undefined;
      const eta = sd.Eta as Record<string, number> | undefined;

      // AIS Dimension A+B = length, C+D = beam (all integer meters)
      const lengthCalc = dim ? (dim.A || 0) + (dim.B || 0) : 0;
      const beamCalc = dim ? (dim.C || 0) + (dim.D || 0) : 0;

      vesselUpdates.set(mmsi, {
        imo: (sd.ImoNumber as number) || undefined,
        name: (sd.Name as string)?.trim() || msg.MetaData.ShipName?.trim(),
        callsign: (sd.CallSign as string)?.trim() || undefined,
        shipType: sd.Type as number,
        flag: getFlag(mmsi),
        length: lengthCalc > 0 ? Math.round(lengthCalc) : undefined,
        beam: beamCalc > 0 ? Math.round(beamCalc) : undefined,
        draught: (sd.MaximumStaticDraught as number) || undefined,
        destination: (sd.Destination as string)?.replace(/@+$/, "").trim() || undefined,
        eta: eta ? parseETAToDate(eta) : undefined,
      });
    }
  }

  function parseETAToDate(eta: Record<string, number>): Date | undefined {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = (eta.Month || 1) - 1;
      const day = eta.Day || 1;
      const hour = eta.Hour || 0;
      const minute = eta.Minute || 0;
      const d = new Date(year, month, day, hour, minute);
      // If ETA is in the past, assume next year
      if (d < now) d.setFullYear(year + 1);
      return d;
    } catch {
      return undefined;
    }
  }

  // Flush batched positions to DB
  async function flushPositions() {
    if (positionBatch.length === 0) return;
    const batch = positionBatch.splice(0);
    try {
      await prisma.vesselPosition.createMany({
        data: batch.map((p) => ({
          mmsi: p.mmsi,
          latitude: p.latitude,
          longitude: p.longitude,
          sog: p.sog,
          cog: p.cog,
          heading: p.heading,
          navStatus: p.navStatus,
        })),
        skipDuplicates: true,
      });
      positionsStored += batch.length;
    } catch (err) {
      logError(TASK, `Failed to flush ${batch.length} positions`, err);
    }
  }

  // Flush vessel metadata updates
  async function flushVessels() {
    if (vesselUpdates.size === 0) return;
    const updates = new Map(vesselUpdates);
    vesselUpdates.clear();
    for (const [mmsi, data] of updates) {
      try {
        await prisma.vessel.upsert({
          where: { mmsi },
          create: { mmsi, ...data },
          update: data,
        });
        vesselsUpdated++;
      } catch (err) {
        logError(TASK, `Failed to upsert vessel ${mmsi}`, err);
      }
    }
  }

  // Cleanup old positions (rolling 48h buffer)
  async function cleanup() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    try {
      const result = await prisma.vesselPosition.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (result.count > 0) {
        log(TASK, `Cleaned ${result.count} positions older than 48h`);
      }
    } catch (err) {
      logError(TASK, "Cleanup failed", err);
    }
  }

  // Set up abort controller for duration-based shutdown
  const ac = new AbortController();

  const wsClient = createReconnectingWS(
    {
      url: "wss://stream.aisstream.io/v0/stream",
      subscriptionMessage: {
        api_key: apiKey,
        BoundingBoxes: SPAIN_BBOXES,
        FilterMessageTypes: [
          "PositionReport",
          "ShipStaticData",
          "StandardClassBPositionReport",
          "ExtendedClassBPositionReport",
        ],
      },
      onMessage: handleMessage,
      task: TASK,
    },
    ac.signal
  );

  // Periodic flush timers
  const flushTimer = setInterval(async () => {
    await flushPositions();
    await flushVessels();
  }, batchInterval);

  const cleanupTimer = setInterval(cleanup, cleanupInterval);

  // Stats logging every 60 seconds
  const statsTimer = setInterval(() => {
    log(
      TASK,
      `Stats: ${messagesReceived} received, ${positionsStored} positions stored, ${vesselsUpdated} vessels updated, ${positionBatch.length} pending`
    );
  }, 60_000);

  // Run initial cleanup
  await cleanup();

  // Wait for duration or indefinite
  if (duration > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, duration));
    log(TASK, `Duration ${duration}ms reached, shutting down`);
  } else {
    // Run indefinitely — wait for process signals
    await new Promise<void>((resolve) => {
      process.once("SIGTERM", () => {
        log(TASK, "SIGTERM received");
        resolve();
      });
      process.once("SIGINT", () => {
        log(TASK, "SIGINT received");
        resolve();
      });
    });
  }

  // Graceful shutdown
  clearInterval(flushTimer);
  clearInterval(cleanupTimer);
  clearInterval(statsTimer);
  await flushPositions();
  await flushVessels();
  ac.abort();

  log(
    TASK,
    `Final: ${messagesReceived} messages, ${positionsStored} positions, ${vesselsUpdated} vessels`
  );

  // Suppress unused warning — wsClient.stop() is called via AbortSignal
  void wsClient;
}
