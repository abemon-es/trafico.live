/**
 * GTFS ZIP Parser
 *
 * Extracts and parses GTFS text files from a ZIP buffer.
 * Handles Renfe's quirky single-quote CSV wrapping.
 */

export interface GTFSRoute {
  route_id: string;
  route_short_name?: string;
  route_long_name?: string;
  route_type: number;
  route_color?: string;
  agency_id?: string;
}

export interface GTFSStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  parent_station?: string;
  location_type?: number;
}

export interface GTFSTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign?: string;
  shape_id?: string;
}

export interface GTFSShape {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

export interface GTFSStopTime {
  trip_id: string;
  stop_id: string;
  arrival_time?: string;
  departure_time?: string;
  stop_sequence: number;
}

export interface ParsedGTFS {
  routes: GTFSRoute[];
  stops: GTFSStop[];
  trips: GTFSTrip[];
  shapes: GTFSShape[];
  stopTimes: GTFSStopTime[];
}

/**
 * Parse a GTFS ZIP buffer into structured data.
 * Uses jszip for extraction (available as transitive dependency via exceljs).
 */
export async function parseGTFS(zipBuffer: Buffer): Promise<ParsedGTFS> {
  // Dynamic import to avoid bundler issues
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(zipBuffer);

  const fileMap = new Map<string, string>();
  const textFiles = Object.keys(zip.files).filter((name) => name.endsWith(".txt"));

  await Promise.all(
    textFiles.map(async (name) => {
      const baseName = name.replace(/^.*\//, ""); // strip directory prefix
      const content = await zip.files[name].async("string");
      fileMap.set(baseName, content);
    })
  );

  return {
    routes: parseCSV<GTFSRoute>(fileMap.get("routes.txt") || "", {
      route_type: "number",
    }),
    stops: parseCSV<GTFSStop>(fileMap.get("stops.txt") || "", {
      stop_lat: "number",
      stop_lon: "number",
      location_type: "number",
    }),
    trips: parseCSV<GTFSTrip>(fileMap.get("trips.txt") || ""),
    shapes: parseCSV<GTFSShape>(fileMap.get("shapes.txt") || "", {
      shape_pt_lat: "number",
      shape_pt_lon: "number",
      shape_pt_sequence: "number",
    }),
    stopTimes: parseCSV<GTFSStopTime>(fileMap.get("stop_times.txt") || "", {
      stop_sequence: "number",
    }),
  };
}

/**
 * Parse CSV text into typed objects.
 * Handles:
 * - Standard double-quote wrapping
 * - Renfe single-quote wrapping (e.g., 'field value')
 * - Empty files (returns [])
 * - BOM markers
 */
function parseCSV<T extends Record<string, unknown>>(
  text: string,
  numberFields?: Record<string, "number">
): T[] {
  if (!text.trim()) return [];

  // Remove BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const header = parseLine(lines[0]);
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;

    const obj: Record<string, unknown> = {};
    for (let j = 0; j < header.length; j++) {
      let val: unknown = values[j] ?? "";
      if (numberFields?.[header[j]] === "number" && val !== "") {
        val = parseFloat(val as string);
        if (isNaN(val as number)) val = undefined;
      }
      obj[header[j]] = val;
    }
    results.push(obj as T);
  }

  return results;
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = '"';

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (!inQuote && (ch === '"' || ch === "'") && current === "") {
      inQuote = true;
      quoteChar = ch;
    } else if (inQuote && ch === quoteChar) {
      // Check for escaped quote (double)
      if (i + 1 < line.length && line[i + 1] === quoteChar) {
        current += ch;
        i++;
      } else {
        inQuote = false;
      }
    } else if (!inQuote && ch === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());

  return fields;
}

/**
 * Convert shapes into GeoJSON LineStrings grouped by shape_id.
 */
export function shapesToGeoJSON(
  shapes: GTFSShape[]
): Record<string, { type: "LineString"; coordinates: [number, number][] }> {
  const grouped = new Map<string, GTFSShape[]>();
  for (const s of shapes) {
    const arr = grouped.get(s.shape_id) || [];
    arr.push(s);
    grouped.set(s.shape_id, arr);
  }

  const result: Record<string, { type: "LineString"; coordinates: [number, number][] }> = {};
  for (const [id, pts] of grouped) {
    pts.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);
    result[id] = {
      type: "LineString",
      coordinates: pts.map((p) => [p.shape_pt_lon, p.shape_pt_lat]),
    };
  }
  return result;
}
