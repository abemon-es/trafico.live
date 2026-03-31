import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface HistoricalAccidentData {
  year: number;
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  nonHospitalized: number;
}

/**
 * POST /api/admin/seed-accidents?key=<API_KEY>
 *
 * Seeds the HistoricalAccidents table from data/historical-accidents.json.
 * Safe to call multiple times — it upserts by (year, province).
 *
 * Use this to populate production when prisma db seed wasn't run at build time.
 *
 * Coolify: curl -X POST "https://trafico.live/api/admin/seed-accidents?key=YOUR_KEY"
 */
export async function POST(request: NextRequest) {
  // Auth: require API key (via header or query param)
  const apiKey =
    request.headers.get("x-api-key") ||
    request.nextUrl.searchParams.get("key");
  const validKeys = process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];
  if (!apiKey || !validKeys.includes(apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  try {
    const jsonPath = path.join(process.cwd(), "data/historical-accidents.json");
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json(
        { success: false, error: "data/historical-accidents.json not found" },
        { status: 404 }
      );
    }

    const accidents = JSON.parse(
      fs.readFileSync(jsonPath, "utf-8")
    ) as HistoricalAccidentData[];

    if (!accidents.length) {
      return NextResponse.json(
        { success: false, error: "No records in historical-accidents.json" },
        { status: 422 }
      );
    }

    // Upsert in batches of 50 using createMany with skipDuplicates.
    // HistoricalAccidents has a unique constraint on (year, province).
    // We delete all and re-insert so updates to source data are reflected.
    await prisma.historicalAccidents.deleteMany({});

    const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < accidents.length; i += BATCH) {
      const batch = accidents.slice(i, i + BATCH);
      const result = await prisma.historicalAccidents.createMany({
        data: batch.map((a) => ({
          year: a.year,
          province: a.province,
          provinceName: a.provinceName,
          accidents: a.accidents,
          fatalities: a.fatalities,
          hospitalized: a.hospitalized,
          nonHospitalized: a.nonHospitalized,
        })),
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    const years = [...new Set(accidents.map((a) => a.year))].sort();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      inserted,
      total: accidents.length,
      years,
      elapsed: `${elapsed}s`,
    });
  } catch (error) {
    console.error("[admin/seed-accidents] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
