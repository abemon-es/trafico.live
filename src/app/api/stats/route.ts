import { NextResponse } from "next/server";
import {
  parseDatexResponse,
  extractV16Beacons,
  extractTrafficIncidents,
} from "@/lib/parsers/datex2";

// Cache the response for 60 seconds
export const revalidate = 60;

const DGT_DATEX_URL =
  process.env.DGT_DATEX_URL ||
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";
const DGT_NAP_URL =
  process.env.DGT_NAP_URL || "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

interface Stats {
  v16Active: number;
  v16Change: number | null;
  incidents: number;
  incidentsChange: number | null;
  cameras: number;
  chargers: number;
  zbeZones: number;
  lastUpdated: string;
  bySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    VERY_HIGH: number;
  };
  byRoadType: Record<string, number>;
}

async function fetchV16Data(): Promise<{ count: number; bySeverity: Stats["bySeverity"]; byRoadType: Record<string, number> }> {
  try {
    const response = await fetch(DGT_DATEX_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { count: 0, bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 }, byRoadType: {} };
    }

    const xml = await response.text();
    const situations = parseDatexResponse(xml);
    const beacons = extractV16Beacons(situations);

    // Aggregate by severity
    const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 };
    const byRoadType: Record<string, number> = {};

    for (const beacon of beacons) {
      bySeverity[beacon.severity]++;

      // Categorize road type from road number
      const road = beacon.roadNumber || "Unknown";
      if (road.startsWith("AP-")) {
        byRoadType["Autopista"] = (byRoadType["Autopista"] || 0) + 1;
      } else if (road.startsWith("A-") || road.match(/^A\d/)) {
        byRoadType["Autovía"] = (byRoadType["Autovía"] || 0) + 1;
      } else if (road.startsWith("N-")) {
        byRoadType["Nacional"] = (byRoadType["Nacional"] || 0) + 1;
      } else if (road.startsWith("C-") || road.startsWith("CM-")) {
        byRoadType["Comarcal"] = (byRoadType["Comarcal"] || 0) + 1;
      } else {
        byRoadType["Otras"] = (byRoadType["Otras"] || 0) + 1;
      }
    }

    return { count: beacons.length, bySeverity, byRoadType };
  } catch (error) {
    console.error("Error fetching V16 data:", error);
    return { count: 0, bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 }, byRoadType: {} };
  }
}

async function fetchIncidentData(): Promise<number> {
  try {
    const response = await fetch(DGT_NAP_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return 0;
    }

    const xml = await response.text();
    const situations = parseDatexResponse(xml);
    const incidents = extractTrafficIncidents(situations);

    return incidents.length;
  } catch (error) {
    console.error("Error fetching incident data:", error);
    return 0;
  }
}

export async function GET() {
  try {
    // Fetch data in parallel
    const [v16Data, incidentCount] = await Promise.all([
      fetchV16Data(),
      fetchIncidentData(),
    ]);

    // Static counts for now (would come from separate API endpoints)
    // These are approximate values based on available data
    const stats: Stats = {
      v16Active: v16Data.count,
      v16Change: null, // Would need historical comparison
      incidents: incidentCount,
      incidentsChange: null,
      cameras: 512, // Static - from DGT camera list
      chargers: 8432, // Static - from puntos-recarga API
      zbeZones: 156, // Static - from ZBE API
      lastUpdated: new Date().toISOString(),
      bySeverity: v16Data.bySeverity,
      byRoadType: v16Data.byRoadType,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        v16Active: 0,
        incidents: 0,
        cameras: 512,
        chargers: 8432,
        zbeZones: 156,
        lastUpdated: new Date().toISOString(),
        bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 },
        byRoadType: {},
      },
      { status: 500 }
    );
  }
}
