/**
 * OurAirports Runway Geometry Collector
 * Source: ourairports.com (Public Domain, nightly updates)
 * Writes static JSON for frontend map rendering
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const TASK = "ourairports-runways";
const RUNWAYS_URL = "https://davidmegginson.github.io/ourairports-data/runways.csv";

interface Runway {
  id: string;
  lengthFt: number;
  widthFt: number;
  surface: string;
  lighted: boolean;
  closed: boolean;
  leIdent: string;
  leLat: number;
  leLon: number;
  leHeading: number;
  leElevFt: number | null;
  heIdent: string;
  heLat: number;
  heLon: number;
  heHeading: number;
  heElevFt: number | null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Fetching OurAirports runways.csv...");

  const res = await fetch(RUNWAYS_URL, {
    headers: { "User-Agent": "trafico.live collector/1.0" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    logError(TASK, `HTTP ${res.status}`);
    return;
  }

  const csv = await res.text();
  const lines = csv.split("\n").filter(l => l.trim());
  if (lines.length < 2) { logError(TASK, "Empty CSV"); return; }

  const header = parseCSVLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);

  const iIdent = idx("airport_ident");
  const iLen = idx("length_ft");
  const iWid = idx("width_ft");
  const iSurf = idx("surface");
  const iLit = idx("lighted");
  const iClosed = idx("closed");
  const iLeId = idx("le_ident");
  const iLeLat = idx("le_latitude_deg");
  const iLeLon = idx("le_longitude_deg");
  const iLeHead = idx("le_heading_degT");
  const iLeElev = idx("le_elevation_ft");
  const iHeId = idx("he_ident");
  const iHeLat = idx("he_latitude_deg");
  const iHeLon = idx("he_longitude_deg");
  const iHeHead = idx("he_heading_degT");
  const iHeElev = idx("he_elevation_ft");

  // Spanish ICAO prefixes
  const spanishPrefixes = ["LE", "GC", "GE"];
  const result: Record<string, Runway[]> = {};
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const icao = cols[iIdent] || "";
    if (!spanishPrefixes.some(p => icao.startsWith(p))) continue;

    const leLat = parseFloat(cols[iLeLat]);
    const leLon = parseFloat(cols[iLeLon]);
    const heLat = parseFloat(cols[iHeLat]);
    const heLon = parseFloat(cols[iHeLon]);
    if (isNaN(leLat) || isNaN(leLon) || isNaN(heLat) || isNaN(heLon)) continue;

    const runway: Runway = {
      id: cols[idx("id")] || `${i}`,
      lengthFt: parseInt(cols[iLen]) || 0,
      widthFt: parseInt(cols[iWid]) || 0,
      surface: cols[iSurf] || "unknown",
      lighted: cols[iLit] === "1",
      closed: cols[iClosed] === "1",
      leIdent: cols[iLeId] || "",
      leLat, leLon,
      leHeading: parseFloat(cols[iLeHead]) || 0,
      leElevFt: cols[iLeElev] ? parseInt(cols[iLeElev]) : null,
      heIdent: cols[iHeId] || "",
      heLat, heLon,
      heHeading: parseFloat(cols[iHeHead]) || 0,
      heElevFt: cols[iHeElev] ? parseInt(cols[iHeElev]) : null,
    };

    if (!result[icao]) result[icao] = [];
    result[icao].push(runway);
    total++;
  }

  const airportCount = Object.keys(result).length;
  log(TASK, `Parsed ${total} runways across ${airportCount} Spanish airports`);

  // Write static JSON for frontend
  try {
    const outDir = join(process.cwd(), "public", "data");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "runways.json"), JSON.stringify(result));
    log(TASK, `Wrote public/data/runways.json (${airportCount} airports, ${total} runways)`);
  } catch (err) {
    // In Docker, public/ may not exist — write to /tmp instead
    writeFileSync("/tmp/runways.json", JSON.stringify(result));
    log(TASK, `Wrote /tmp/runways.json (Docker fallback)`);
  }

  // Also update Airport.elevation from runway data
  let elevUpdated = 0;
  for (const [icao, runways] of Object.entries(result)) {
    const elev = runways[0].leElevFt ?? runways[0].heElevFt;
    if (elev === null) continue;
    const elevM = Math.round(elev * 0.3048);
    try {
      await prisma.airport.update({
        where: { icao },
        data: { elevation: elevM },
      });
      elevUpdated++;
    } catch { /* Airport may not exist in DB */ }
  }

  log(TASK, `Updated elevation for ${elevUpdated} airports`);
}
