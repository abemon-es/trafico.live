/**
 * Variable Message Panel Collector Service
 *
 * Fetches the DGT's variable message signs (PMV / VMS) and stores them in
 * PostgreSQL for fast API access. Runs every 5 minutes (collector-realtime).
 *
 * Data sources — DATEX II v3.7 on the DGT National Access Point:
 * - Devices (location): https://nap.dgt.es/datex2/v3/dgt/DevicePublication/vms_datex2_v37.xml
 * - Status (messages):  https://nap.dgt.es/datex2/v3/dgt/VmsPublication/datex2_v37.xml
 *
 * The DATEX II v1 feeds on infocar.dgt.es (.../paneles/content.xml) were
 * retired on 2026-09-30 and answer 404. This task failed on every run for 18
 * days while the site kept serving the last messages it had stored as if they
 * were live. The v3 device ids are the v1 ids without the "GUID_PMV_" prefix
 * (2,508 of 2,517 matched on 2026-10-18), so the prefix is kept to preserve
 * row identity instead of churning every panel.
 */

import { PrismaClient, PanelMessageType, Direction } from "@prisma/client";
import { PROVINCES, normalizeProvince } from "../../shared/provinces.js";
import { ensureArray } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "panel";

const DGT_PANELS_LOCATIONS_URL =
  "https://nap.dgt.es/datex2/v3/dgt/DevicePublication/vms_datex2_v37.xml";
const DGT_PANELS_MESSAGES_URL =
  "https://nap.dgt.es/datex2/v3/dgt/VmsPublication/datex2_v37.xml";

const PANEL_ID_PREFIX = "GUID_PMV_";

// Pictogram codes that show nothing useful: blank, black screen, DGT logo.
const BLANK_PICTOGRAMS = new Set(["0", "NEGRO", "XDGT"]);
// Lines that are only clock/date placeholders (@H = hora, @F = fecha).
const PLACEHOLDER_LINE = /^(@[A-Z]\s*)+$/;
// The status feed republishes every few minutes. Older than this means DGT
// froze it upstream: HTTP 200 with yesterday's messages is not "ok".
const MESSAGES_MAX_AGE_MS = 30 * 60 * 1000;

interface PanelLocation {
  panelId: string;
  name: string;
  latitude: number;
  longitude: number;
  roadNumber: string;
  kmPoint: number | null;
  direction: Direction | null;
  provinceCode: string | null;
}

interface PanelMessage {
  locationRef: string;
  message: string | null;
  pictograms: string[];
  messageType: PanelMessageType | null;
  startedAt: Date | null;
}

interface FeedResult<T> {
  items: Map<string, T>;
  /** Raw records in the feed, before filtering — 0 means the format changed. */
  records: number;
  publicationTime: Date | null;
}

const parser = createXMLParser({
  isArray: (name) => ["device", "vmsControllerStatus"].includes(name),
});

type XmlNode = unknown;

/**
 * Every leaf value stored under `key` anywhere below `node`.
 *
 * DATEX II v3 nests same-named wrappers (textLine > textLine > textLine) and
 * the exact depth differs between display types, so fixed paths are brittle.
 * Within one device or one controller status each key used here is
 * unambiguous, so a key walk is both simpler and sturdier.
 */
function leaves(node: XmlNode, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const n of node) leaves(n, key, out);
  } else if (node !== null && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k !== key) {
        leaves(v, key, out);
        continue;
      }
      for (const item of ensureArray(v)) {
        if (item === null || item === undefined) continue;
        if (typeof item !== "object") out.push(item);
        else if ("#text" in (item as Record<string, unknown>)) out.push((item as Record<string, unknown>)["#text"]);
        else leaves(item, key, out);
      }
    }
  }
  return out;
}

function leaf(node: XmlNode, key: string): string | null {
  const v = leaves(node, key)[0];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "LUGO" → "Lugo"; leaves already mixed-case names ("Cadiz") alone. */
function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s\-/(])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
}

function parseDirection(dir: string): Direction | null {
  switch (dir?.toLowerCase()) {
    case "positive":
    case "ascending":
      return "ASCENDING";
    case "negative":
    case "descending":
      return "DESCENDING";
    case "both":
      return "BOTH";
    default:
      return null;
  }
}

/**
 * Heuristic message type. Text first (it is what drivers read), then the DGT
 * pictogram code, which in v3 is a sign-catalogue id: R-301 speed limit,
 * P-17 narrowing, P-18 works, P-19 slippery, P-29 crosswind,
 * P-33 low visibility, P-34 ice/snow, P-50 other dangers.
 */
export function classifyMessage(pictograms: string[], message: string | null): PanelMessageType | null {
  const text = (message || "").toLowerCase();
  const codes = pictograms.map((p) => p.toUpperCase());
  const hasCode = (re: RegExp) => codes.some((c) => re.test(c));

  if (text.includes("velocidad") || text.includes("velocitat") || /\d{2,3}\s*km/i.test(text) || hasCode(/^R301/)) {
    return "SPEED_LIMIT";
  }

  if (/peligro|accidente|alerta|riesgo|evite desplaz|esenciales/.test(text) || hasCode(/^P50/)) {
    return "DANGER";
  }

  if (/viento|lluvia|pluja|niebla|boira|hielo|nieve|temporal/.test(text) || hasCode(/^P(19|29|33|34)/)) {
    return "PRECAUTION";
  }

  if (/carril|cerrad|cortad/.test(text) || hasCode(/^P17/)) {
    return "LANE_CLOSED";
  }

  if (/desv[ií]o|salida|eixida/.test(text)) {
    return "DETOUR";
  }

  if (/precauci[oó]n|modere|atenci[oó]n|prudencia/.test(text) || hasCode(/^P18/)) {
    return "PRECAUTION";
  }

  if (message || pictograms.length > 0) {
    return "INFO";
  }

  return null;
}

async function fetchPayload(url: string, label: "Locations" | "Messages"): Promise<Record<string, unknown>> {
  console.log(`[panel-collector] Fetching panel ${label.toLowerCase()} from ${url}`);
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (panel-collector)"
    },
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`DGT Panel ${label} API error: ${response.status} ${response.statusText}`);
  }

  // Parse errors propagate on purpose: an unparseable feed must surface as an
  // error heartbeat, not as an empty map that reads as "no messages today".
  const result = parser.parse(await response.text());
  const payload = result?.payload;
  if (!payload || typeof payload !== "object") {
    throw new Error(`DGT Panel ${label}: response has no DATEX II payload`);
  }
  return payload as Record<string, unknown>;
}

export async function fetchPanelLocations(): Promise<FeedResult<PanelLocation>> {
  const payload = await fetchPayload(DGT_PANELS_LOCATIONS_URL, "Locations");
  const devices = ensureArray(payload.device as Record<string, unknown>[] | undefined);
  const items = new Map<string, PanelLocation>();

  for (const device of devices) {
    const rawId = String(device["@_id"] ?? "").trim();
    if (!rawId) continue;

    const type = leaf(device, "typeOfDevice");
    if (type && type !== "vms") continue;

    const latitude = Number(leaf(device, "latitude"));
    const longitude = Number(leaf(device, "longitude"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !latitude || !longitude) continue;

    const roadNumber = leaf(device, "roadName") ?? "";
    const kmRaw = leaf(device, "kilometerPoint");
    const km = kmRaw === null ? NaN : Number(kmRaw);
    // Clamp to Decimal(7,2)
    const kmPoint = Number.isFinite(km) && km >= 0 && km <= 99999.99 ? Math.round(km * 100) / 100 : null;

    const provinceName = leaf(device, "province");
    const provinceCode = provinceName ? normalizeProvince(provinceName) : null;
    const destination = leaf(device, "roadDestination");
    const direction = parseDirection(leaf(device, "tpegDirectionRoad") ?? "");

    const name = [
      roadNumber ? `PMV ${roadNumber}` : "PMV",
      kmPoint !== null ? `km ${String(kmPoint).replace(".", ",")}` : null,
      destination ? `dir. ${titleCase(destination)}` : null,
    ].filter(Boolean).join(" · ");

    const panelId = PANEL_ID_PREFIX + rawId;
    items.set(panelId, {
      panelId,
      name,
      latitude,
      longitude,
      roadNumber,
      kmPoint,
      direction,
      provinceCode,
    });
  }

  return { items, records: devices.length, publicationTime: parseDate(payload.publicationTime) };
}

export async function fetchPanelMessages(): Promise<FeedResult<PanelMessage>> {
  const payload = await fetchPayload(DGT_PANELS_MESSAGES_URL, "Messages");
  const statuses = ensureArray(payload.vmsControllerStatus as Record<string, unknown>[] | undefined);
  const items = new Map<string, PanelMessage>();

  for (const status of statuses) {
    const ref = (status.vmsControllerReference as Record<string, unknown> | undefined)?.["@_id"];
    const rawId = String(ref ?? "").trim();
    if (!rawId) continue;

    // Each textLine leaf is one display area; DGT separates its rows with
    // "\n". Rows are joined with "/" like the v1 legend was, and distinct
    // pages of an alternating panel with " | ".
    const pages = [...new Set(
      leaves(status, "textLine")
        .map((t) => String(t).split(/\r?\n/).map((l) => l.trim())
          .filter((l) => l && !PLACEHOLDER_LINE.test(l)).join("/"))
        .filter(Boolean)
    )];
    const message = pages.length > 0 ? pages.join(" | ") : null;

    const pictograms = [...new Set(
      leaves(status, "customPictogramCode").map((c) => String(c).trim())
        .filter((c) => c && !BLANK_PICTOGRAMS.has(c))
    )];

    if (!message && pictograms.length === 0) continue; // panel is blank

    const times = leaves(status, "timeLastSet").map(parseDate).filter((d): d is Date => d !== null);
    const startedAt = times.length > 0 ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;

    const panelId = PANEL_ID_PREFIX + rawId;
    items.set(panelId, {
      locationRef: panelId,
      message,
      pictograms,
      messageType: classifyMessage(pictograms, message),
      startedAt,
    });
  }

  return { items, records: statuses.length, publicationTime: parseDate(payload.publicationTime) };
}

export async function run(prisma: PrismaClient) {
  const now = new Date();

  console.log(`[panel-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH both data sources
    const [locationFeed, messageFeed] = await Promise.all([
      fetchPanelLocations(),
      fetchPanelMessages()
    ]);
    const locations = locationFeed.items;
    const messages = messageFeed.items;

    console.log(`[panel-collector] Fetched ${locations.size} panel locations (${locationFeed.records} devices in feed)`);
    console.log(`[panel-collector] Fetched ${messages.size} panel messages (${messageFeed.records} controller statuses in feed)`);

    // An empty feed is a broken feed, not a quiet day: the device catalogue is
    // ~2,500 panels and every controller publishes a status even when blank.
    // Returning here used to leave the last heartbeat standing.
    if (locations.size === 0) {
      throw new Error(`DGT Panel Locations: 0 usable devices (${locationFeed.records} records) — feed format changed?`);
    }
    if (messageFeed.records === 0) {
      throw new Error("DGT Panel Messages: 0 controller statuses — feed format changed?");
    }

    // 2. Get existing panel IDs
    const existingPanels = await prisma.variablePanel.findMany({
      select: { panelId: true }
    });
    const existingIds = new Set(existingPanels.map(p => p.panelId));

    // 3. Batch upsert via raw SQL INSERT ... ON CONFLICT
    const fetchedIds = new Set<string>();
    let created = 0;
    let updated = 0;
    let withMessage = 0;
    let skipped = 0;

    const locationEntries = [...locations.entries()];
    const BATCH = 500;
    const COLS = 15;

    for (let i = 0; i < locationEntries.length; i += BATCH) {
      const batch = locationEntries.slice(i, i + BATCH);

      // Filter out invalid coordinates
      const validBatch = batch.filter(([_, loc]) =>
        Math.abs(loc.latitude) <= 90 && Math.abs(loc.longitude) <= 180
      );
      skipped += batch.length - validBatch.length;

      if (validBatch.length === 0) continue;

      const values = validBatch.map((_, idx) => {
        const b = idx * COLS;
        return `(gen_random_uuid()::text, $${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}::"Direction", $${b+8}, $${b+9}, $${b+10}, $${b+11}::"PanelMessageType", $${b+12}, $${b+13}, $${b+14}, $${b+15})`;
      }).join(", ");

      const params = validBatch.flatMap(([panelId, location]) => {
        fetchedIds.add(panelId);
        const msg = messages.get(panelId);
        const hasMsg = !!(msg?.message || (msg?.pictograms && msg.pictograms.length > 0));
        if (hasMsg) withMessage++;
        if (existingIds.has(panelId)) updated++; else created++;

        return [
          panelId, location.name, location.latitude, location.longitude,
          location.roadNumber || null, location.kmPoint,
          location.direction, // Direction enum — cast in SQL
          location.provinceCode, location.provinceCode ? PROVINCES[location.provinceCode] || null : null,
          msg?.message || null,
          msg?.messageType || null, // PanelMessageType enum — cast in SQL
          msg?.pictograms?.join(",") || null,
          msg?.startedAt || null,
          now,
          hasMsg
        ];
      });

      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "VariablePanel" (
            id, "panelId", name, latitude, longitude, "roadNumber", "kmPoint",
            direction, province, "provinceName", message, "messageType",
            "messageCode", "messageStartAt", "fetchedAt", "hasMessage"
          ) VALUES ${values}
          ON CONFLICT ("panelId") DO UPDATE SET
            name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
            "roadNumber" = EXCLUDED."roadNumber", "kmPoint" = EXCLUDED."kmPoint",
            direction = EXCLUDED.direction, province = EXCLUDED.province,
            "provinceName" = EXCLUDED."provinceName", message = EXCLUDED.message,
            "messageType" = EXCLUDED."messageType", "messageCode" = EXCLUDED."messageCode",
            "messageStartAt" = EXCLUDED."messageStartAt",
            "fetchedAt" = EXCLUDED."fetchedAt", "lastUpdated" = NOW(),
            "isActive" = true, "hasMessage" = EXCLUDED."hasMessage"
        `, ...params);
      } catch (err) {
        // If batch fails (e.g., one bad record), fall back to individual upserts for this batch
        console.warn(`[panel-collector] Batch ${i} failed, falling back to individual: ${(err as Error).message.slice(0, 60)}`);
        for (const [panelId, location] of validBatch) {
          fetchedIds.add(panelId);
          const msg = messages.get(panelId);
          const hasMessage = !!(msg?.message || (msg?.pictograms && msg.pictograms.length > 0));
          try {
            await prisma.variablePanel.upsert({
              where: { panelId },
              create: {
                panelId,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                roadNumber: location.roadNumber || null,
                kmPoint: location.kmPoint,
                direction: location.direction,
                province: location.provinceCode,
                provinceName: location.provinceCode ? PROVINCES[location.provinceCode] || null : null,
                message: msg?.message || null,
                messageType: msg?.messageType || null,
                messageCode: msg?.pictograms?.join(",") || null,
                messageStartAt: msg?.startedAt || null,
                fetchedAt: now,
                lastUpdated: now,
                isActive: true,
                hasMessage,
              },
              update: {
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                roadNumber: location.roadNumber || null,
                kmPoint: location.kmPoint,
                direction: location.direction,
                province: location.provinceCode,
                provinceName: location.provinceCode ? PROVINCES[location.provinceCode] || null : null,
                message: msg?.message || null,
                messageType: msg?.messageType || null,
                messageCode: msg?.pictograms?.join(",") || null,
                messageStartAt: msg?.startedAt || null,
                fetchedAt: now,
                lastUpdated: now,
                isActive: true,
                hasMessage,
              }
            });
          } catch (e) {
            skipped++;
            if (skipped <= 3) console.warn(`[panel-collector] Skipped ${panelId}: ${(e as Error).message?.slice(0, 80)}`);
          }
        }
      }
    }

    console.log(`[panel-collector] Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    console.log(`[panel-collector] Panels with active messages: ${withMessage}`);

    // 4. Mark panels not in API response as inactive
    const missingIds = [...existingIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      await prisma.variablePanel.updateMany({
        where: { panelId: { in: missingIds } },
        data: { isActive: false }
      });
      console.log(`[panel-collector] Marked ${missingIds.length} panels as inactive`);
    }

    // 5. Summary statistics
    const stats = await prisma.variablePanel.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true
    });

    console.log(`[panel-collector] Panels by province:`);
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    for (const stat of sortedStats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      console.log(`  ${provinceName}: ${stat._count}`);
    }
    if (stats.length > 10) {
      console.log(`  ... and ${stats.length - 10} more provinces`);
    }

    const totalActive = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[panel-collector] Total active panels: ${totalActive}`);

    // Message type breakdown
    const msgStats = await prisma.variablePanel.groupBy({
      by: ["messageType"],
      where: { isActive: true, hasMessage: true },
      _count: true
    });

    if (msgStats.length > 0) {
      console.log(`[panel-collector] Active messages by type:`);
      for (const stat of msgStats) {
        console.log(`  ${stat.messageType || "UNKNOWN"}: ${stat._count}`);
      }
    }

    console.log("[panel-collector] Collection completed successfully");

    // HTTP 200 with a frozen publication is stale data dressed as fresh.
    const messagesAgeMs = messageFeed.publicationTime ? now.getTime() - messageFeed.publicationTime.getTime() : null;
    const frozen = messagesAgeMs === null || messagesAgeMs > MESSAGES_MAX_AGE_MS;
    await heartbeat(prisma, TASK, frozen ? "partial" : "ok", {
      total: totalActive,
      withMessage,
      devicesInFeed: locationFeed.records,
      statusesInFeed: messageFeed.records,
      locationsPublishedAt: locationFeed.publicationTime?.toISOString() ?? null,
      messagesPublishedAt: messageFeed.publicationTime?.toISOString() ?? null,
      ...(frozen && {
        reason: messagesAgeMs === null
          ? "messages feed has no publicationTime"
          : `messages feed last published ${Math.round(messagesAgeMs / 60000)} min ago — frozen upstream`,
      }),
    });

  } catch (error) {
    console.error("[panel-collector] Fatal error:", error);
    await heartbeat(prisma, TASK, "error", { error: String(error) });
    throw error;
  }
}
