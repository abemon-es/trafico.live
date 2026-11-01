/**
 * «Estrecho hoy»: the Strait of Gibraltar ferry crossing at a glance.
 * Pure helpers and constants; the page does the queries.
 */

/** Waters of the crossing: Algeciras/Gibraltar bay, Tarifa, Ceuta, Tánger Med and Tánger Ciudad. */
export const STRAIT_BOX = { minLat: 35.75, maxLat: 36.2, minLng: -5.85, maxLng: -5.2 };

/** Ports of the crossing, by the UN/LOCODE port calls are filed under. */
export const STRAIT_PORTS = [
  { code: "ESALG", name: "Algeciras" },
  { code: "ESTRF", name: "Tarifa" },
  { code: "ESCEU", name: "Ceuta" },
  { code: "MAPTM", name: "Tánger Med" },
  { code: "MATNG", name: "Tánger Ciudad" },
] as const;

/** AEMET coastal forecast zone that covers the Strait («Andalucía Occidental y Ceuta»). */
export const STRAIT_FORECAST_ZONE = "42";

/** INE province codes whose AEMET coastal warnings cover the crossing: Cádiz and Ceuta. */
export const STRAIT_ALERT_PROVINCES = ["11", "51"];

const STRAIT_NAME = /estrecho|tarifa|ceuta|algeciras|trafalgar/i;
const MAX_PASSAGE_CHARS = 800;

export interface ForecastPassage {
  name: string;
  text: string;
}

/**
 * The parts of an AEMET coastal forecast that talk about the Strait.
 * The stored forecast is `{ text }`, where text is AEMET's body: JSON with
 * named areas (`nombre` + `texto`) or, failing that, plain prose.
 */
export function straitForecastPassages(forecast: unknown): ForecastPassage[] {
  const raw =
    forecast && typeof forecast === "object" && typeof (forecast as { text?: unknown }).text === "string"
      ? (forecast as { text: string }).text
      : null;
  if (!raw) return [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  const passages: ForecastPassage[] = [];
  const seen = new Set<string>();
  const push = (name: string, text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    passages.push({
      name: name.replace(/\s+/g, " ").replace(/\.$/, "").trim(),
      text: clean.length > MAX_PASSAGE_CHARS ? `${clean.slice(0, MAX_PASSAGE_CHARS - 1)}…` : clean,
    });
  };

  if (parsed !== null) {
    const walk = (node: unknown, depth: number) => {
      if (depth > 8 || node === null || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((n) => walk(n, depth + 1));
        return;
      }
      const obj = node as Record<string, unknown>;
      if (typeof obj.nombre === "string" && typeof obj.texto === "string" && STRAIT_NAME.test(obj.nombre)) {
        push(obj.nombre, obj.texto);
      }
      Object.values(obj).forEach((v) => walk(v, depth + 1));
    };
    walk(parsed, 0);
    return passages;
  }

  for (const paragraph of raw.split(/\n\s*\n|\r\n\s*\r\n/)) {
    if (STRAIT_NAME.test(paragraph)) push("Previsión costera", paragraph);
    if (passages.length >= 3) break;
  }
  return passages;
}

/** Whether the passages forecast levante (easterly wind), the usual cause of cancelled crossings. */
export function forecastsLevante(passages: ForecastPassage[]): boolean {
  return passages.some((p) => /\blevante\b/i.test(p.text));
}

/** AIS types 40–49: high-speed craft, the fast ferries of the crossing. */
export function isFastFerry(shipType: number | null | undefined): boolean {
  return typeof shipType === "number" && shipType >= 40 && shipType <= 49;
}

/** Ships that carry passengers across: passenger ships and ro-pax (60–69) and fast ferries (40–49). */
export function isFerryShip(shipType: number | null | undefined): boolean {
  return isFastFerry(shipType) || (typeof shipType === "number" && shipType >= 60 && shipType <= 69);
}

/** A crossing takes about an hour; a gap longer than this is not one crossing. */
export const MAX_CROSSING_HOURS = 3;

export interface StraitCall {
  mmsi: number;
  portCode: string | null;
  arrivedAt: Date;
  departedAt: Date | null;
}

export interface Crossing {
  mmsi: number;
  from: string;
  to: string;
  departedAt: Date;
  arrivedAt: Date;
}

/**
 * Crossings from port calls: a ship leaves one port and its next call is at
 * another port within MAX_CROSSING_HOURS. Calls without a port break the chain.
 */
export function pairCrossings(calls: StraitCall[]): Crossing[] {
  const byShip = new Map<number, StraitCall[]>();
  for (const c of calls) {
    const list = byShip.get(c.mmsi);
    if (list) list.push(c);
    else byShip.set(c.mmsi, [c]);
  }
  const crossings: Crossing[] = [];
  for (const list of byShip.values()) {
    list.sort((a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime());
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (!a.portCode || !b.portCode || !a.departedAt || a.portCode === b.portCode) continue;
      const gap = b.arrivedAt.getTime() - a.departedAt.getTime();
      if (gap <= 0 || gap > MAX_CROSSING_HOURS * 3_600_000) continue;
      crossings.push({ mmsi: a.mmsi, from: a.portCode, to: b.portCode, departedAt: a.departedAt, arrivedAt: b.arrivedAt });
    }
  }
  return crossings.sort((x, y) => x.departedAt.getTime() - y.departedAt.getTime());
}

/** Calendar day in Madrid, YYYY-MM-DD. */
export function madridDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
