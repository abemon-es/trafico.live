/**
 * Positions for the ports of the Port table (UN/LOCODE) that have none.
 * 5,757 of the 17,520 fnPort rows came in without coordinates, among them
 * Algeciras, Ceuta, Tánger Med and Tarifa, and resolvePort() only looks at
 * rows with a latitude: stops at those ports were stored with no port.
 *
 * Sources, in order:
 *   1. FERRY_TERMINALS (this folder), the positions the detector already uses
 *      for the Strait and the Alborán Sea. Tarifa is only here.
 *   2. data/wpi-port-coords.csv: NGA World Port Index (Pub. 150, public
 *      domain), UpdatedPub150.csv downloaded 30-10-2026 from
 *      msi.nga.mil/api/publications/download?key=16920959/SFH00000/UpdatedPub150.csv,
 *      trimmed to the entries with a UN/LOCODE (3,299). A LOCODE that WPI lists
 *      more than once is kept only when every entry lies within 5 nm of the
 *      others (the lowest index number wins); the 16 that don't are left out.
 *
 * A WPI position is used only when its port name and the table's share a
 * word: a LOCODE mislabelled in WPI would otherwise pull port calls to a port
 * on the other side of the world. Those are reported, not filled.
 */

import { readFileSync } from "fs";
import { FERRY_TERMINALS } from "./ferry-terminals.js";

export interface WpiEntry {
  latitude: number;
  longitude: number;
  name: string;
}

export interface PortWithoutCoords {
  id: string;
  name: string;
  nameLocal: string | null;
}

export interface PortCoordFill {
  id: string;
  latitude: number;
  longitude: number;
  source: "ferry-terminal" | "wpi";
  sourceName: string;
}

export interface PortCoordPlan {
  fill: PortCoordFill[];
  /** WPI has the LOCODE, but under a name that shares no word with the table's. */
  nameMismatch: { id: string; name: string; wpiName: string }[];
  /** Neither source has the LOCODE. */
  notFound: number;
}

/** data/wpi-port-coords.csv: locode,latitude,longitude,wpi_name,wpi_number. */
export function parseWpiCsv(text: string): Map<string, WpiEntry> {
  const out = new Map<string, WpiEntry>();
  const lines = text.split("\n").filter((l) => l.trim());
  for (const line of lines.slice(1)) {
    // No WPI name holds a comma or a quote, so a plain split is enough; anything else is refused.
    const fields = line.split(",");
    const [code, lat, lon, name] = fields;
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (fields.length !== 5 || !/^[A-Z]{2}[A-Z0-9]{3}$/.test(code) || !lat || !lon || !(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
      throw new Error(`wpi-port-coords.csv: bad line ${JSON.stringify(line)}`);
    }
    out.set(code, { latitude, longitude, name });
  }
  return out;
}

export function loadWpiCoords(path = new URL("../../data/wpi-port-coords.csv", import.meta.url)): Map<string, WpiEntry> {
  return parseWpiCsv(readFileSync(path, "utf8"));
}

const NAME_NOISE = new Set(["port", "porto", "puerto", "harbor", "harbour", "de", "del", "la", "el", "le", "the", "of", "san", "santa", "saint", "st"]);

function nameWords(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !NAME_NOISE.has(w))
  );
}

/** True when the two names share a word (accents, case and words like «port» aside). */
export function namesAgree(a: string, b: string): boolean {
  const wa = nameWords(a);
  for (const w of nameWords(b)) if (wa.has(w)) return true;
  return false;
}

export function planPortCoords(
  ports: PortWithoutCoords[],
  wpi: Map<string, WpiEntry>,
  terminals = FERRY_TERMINALS
): PortCoordPlan {
  const byTerminal = new Map(terminals.map((t) => [t.code, t]));
  const plan: PortCoordPlan = { fill: [], nameMismatch: [], notFound: 0 };
  for (const port of ports) {
    const terminal = byTerminal.get(port.id);
    if (terminal) {
      plan.fill.push({ id: port.id, latitude: terminal.latitude, longitude: terminal.longitude, source: "ferry-terminal", sourceName: terminal.name });
      continue;
    }
    const entry = wpi.get(port.id);
    if (!entry) {
      plan.notFound++;
      continue;
    }
    if (!namesAgree(port.name, entry.name) && !(port.nameLocal && namesAgree(port.nameLocal, entry.name))) {
      plan.nameMismatch.push({ id: port.id, name: port.name, wpiName: entry.name });
      continue;
    }
    plan.fill.push({ id: port.id, latitude: entry.latitude, longitude: entry.longitude, source: "wpi", sourceName: entry.name });
  }
  return plan;
}
