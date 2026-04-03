/**
 * seed-ports.ts
 *
 * Derives Spanish port records from the MaritimeStation table.
 * Groups stations by port name, computes centroids and stats,
 * classifies port type, maps to AEMET coastal zone, then
 * upserts each port into the SpanishPort table.
 *
 * Usage: npx tsx scripts/seed-ports.ts
 *
 * Idempotent — safe to re-run; uses upsert on slug.
 */

import "dotenv/config";
import { PrismaClient, PortType } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Port type classification
// ---------------------------------------------------------------------------

/** Major commercial ports by canonical name fragment (case-insensitive). */
const COMMERCIAL_PORT_NAMES = [
  "barcelona",
  "valencia",
  "algeciras",
  "bilbao",
  "las palmas",
  "tarragona",
  "castellon",
  "castellón",
  "huelva",
  "cartagena",
  "ferrol",
];

function classifyPortType(portName: string): PortType {
  const lower = portName.toLowerCase();

  // Sports / recreational
  if (/club|deportivo|naútico|nautico|recreo|recreativ/.test(lower)) {
    return PortType.SPORTS;
  }

  // Fishing
  if (/pesca|lonja|pesquero/.test(lower)) {
    return PortType.FISHING;
  }

  // Commercial — explicit keyword or named major port
  if (/comercial/.test(lower)) {
    return PortType.COMMERCIAL;
  }
  if (COMMERCIAL_PORT_NAMES.some((name) => lower.includes(name))) {
    return PortType.COMMERCIAL;
  }

  return PortType.MIXED;
}

// ---------------------------------------------------------------------------
// AEMET coastal zone mapping
// Province code (2-digit string) → AEMET coastal zone name
// ---------------------------------------------------------------------------

const PROVINCE_TO_COASTAL_ZONE: Record<string, string> = {
  // Galicia
  "15": "Galicia",
  "27": "Galicia",
  "32": "Galicia",
  "36": "Galicia",
  // Cantábrico
  "33": "Cantábrico",
  "39": "Cantábrico",
  "48": "Cantábrico",
  "20": "Cantábrico",
  "01": "Cantábrico",
  // Atlántico Sur / Estrecho
  "21": "Estrecho y Golfo de Cádiz",
  "11": "Estrecho y Golfo de Cádiz",
  // Mediterráneo Norte (Cataluña)
  "17": "Catalano-balear",
  "08": "Catalano-balear",
  "43": "Catalano-balear",
  // Mediterráneo Central (Valencia)
  "12": "Mediterráneo occidental",
  "46": "Mediterráneo occidental",
  "03": "Mediterráneo occidental",
  // Mediterráneo Sur (Murcia / Almería)
  "30": "Mediterráneo occidental",
  "04": "Mediterráneo occidental",
  // Baleares
  "07": "Catalano-balear",
  // Canarias
  "35": "Canarias",
  "38": "Canarias",
  // Ceuta / Melilla
  "51": "Estrecho y Golfo de Cádiz",
  "52": "Alborán",
  // Málaga / Cádiz (Atlántico-Med boundary)
  "29": "Alborán",
};

function getCoastalZone(provinceCode: string | null): string | null {
  if (!provinceCode) return null;
  return PROVINCE_TO_COASTAL_ZONE[provinceCode.padStart(2, "0")] ?? null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("seed-ports: starting...\n");

  // Fetch all maritime stations that have a port value
  const stations = await prisma.maritimeStation.findMany({
    where: { port: { not: null } },
    select: {
      port: true,
      latitude: true,
      longitude: true,
      province: true,
      provinceName: true,
    },
  });

  if (stations.length === 0) {
    console.warn(
      "No maritime stations found with port data.\n" +
        "Make sure the gas-station collector has run and populated MaritimeStation rows."
    );
    return;
  }

  console.log(`Found ${stations.length} maritime stations across ports.\n`);

  // Group by port name
  const portMap = new Map<
    string,
    {
      latitudes: number[];
      longitudes: number[];
      province: string | null;
      provinceName: string | null;
    }
  >();

  for (const s of stations) {
    const name = s.port!;
    if (!portMap.has(name)) {
      portMap.set(name, {
        latitudes: [],
        longitudes: [],
        province: s.province,
        provinceName: s.provinceName,
      });
    }
    const entry = portMap.get(name)!;
    entry.latitudes.push(Number(s.latitude));
    entry.longitudes.push(Number(s.longitude));
    // Keep the first non-null province encountered
    if (!entry.province && s.province) {
      entry.province = s.province;
      entry.provinceName = s.provinceName;
    }
  }

  console.log(`Unique ports to upsert: ${portMap.size}\n`);

  let created = 0;
  let updated = 0;

  for (const [portName, data] of portMap.entries()) {
    const avgLat =
      data.latitudes.reduce((a, b) => a + b, 0) / data.latitudes.length;
    const avgLon =
      data.longitudes.reduce((a, b) => a + b, 0) / data.longitudes.length;
    const stationCount = data.latitudes.length;
    const type = classifyPortType(portName);
    const coastalZone = getCoastalZone(data.province);
    const slug = slugify(portName);

    const payload = {
      name: portName,
      slug,
      type,
      latitude: avgLat,
      longitude: avgLon,
      province: data.province,
      provinceName: data.provinceName,
      coastalZone,
      stationCount,
    };

    const existing = await prisma.spanishPort.findUnique({ where: { slug } });

    await prisma.spanishPort.upsert({
      where: { slug },
      update: payload,
      create: payload,
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }

    console.log(
      `  [${type.padEnd(10)}] ${portName} (${stationCount} station${stationCount !== 1 ? "s" : ""}) → ${coastalZone ?? "no coastal zone"}`
    );
  }

  console.log(`\nDone. Created: ${created}, updated: ${updated}`);
  console.log(`Total ports in SpanishPort table: ${created + updated}`);
}

main()
  .catch((e) => {
    console.error("seed-ports failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
