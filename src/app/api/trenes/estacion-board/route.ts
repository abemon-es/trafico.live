import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { reportApiError } from "@/lib/api-error";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 60;

/**
 * GET /api/trenes/estacion-board
 *
 * Returns arrivals and/or departures for a station derived from
 * the latest RailwayDelaySnapshot fleet data (brandStats JSON) and
 * the RailwayStation.code (codEstSig in the LD fleet API).
 *
 * Query params:
 *   slug     — RailwayStation.slug (required)
 *   code     — RailwayStation.code override (optional)
 *   variant  — "arrivals" | "departures" | "both" (default "both")
 */
export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const codeOverride = searchParams.get("code");
  const variant = searchParams.get("variant") ?? "both";

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "slug is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Resolve station
    const station = await prisma.railwayStation.findUnique({
      where: { slug },
      select: { name: true, code: true, stopId: true, serviceTypes: true },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    const stationCode = codeOverride ?? station.code ?? null;

    // 2. Fetch latest snapshot(s) — last 30 min to find trains near this station
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const snapshots = await prisma.railwayDelaySnapshot.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "desc" },
      take: 15,
      select: { recordedAt: true, brandStats: true },
    });

    if (!snapshots.length || !stationCode) {
      // No live data available — return empty with static metadata
      return NextResponse.json({
        success: true,
        data: {
          stationName: station.name,
          stationCode: stationCode ?? "",
          trains: [],
          updatedAt: new Date().toISOString(),
          source: "empty" as const,
        },
      });
    }

    // 3. Parse brandStats JSON from the latest snapshot.
    //    brandStats shape: { "AVE": { total, onTime, avgDelay, trains?: TrainEntry[] }, ... }
    //    The collector stores individual train details in trains[] when available.
    const latestWithTrains = snapshots.find((s) => {
      const bs = s.brandStats as Record<string, unknown> | null;
      if (!bs) return false;
      return Object.values(bs).some(
        (v) =>
          typeof v === "object" &&
          v !== null &&
          "trains" in v &&
          Array.isArray((v as { trains: unknown }).trains) &&
          (v as { trains: unknown[] }).trains.length > 0
      );
    });

    if (!latestWithTrains) {
      return NextResponse.json({
        success: true,
        data: {
          stationName: station.name,
          stationCode: stationCode,
          trains: [],
          updatedAt: snapshots[0]?.recordedAt?.toISOString() ?? new Date().toISOString(),
          source: "empty" as const,
        },
      });
    }

    const brandStats = latestWithTrains.brandStats as Record<
      string,
      {
        total?: number;
        onTime?: number;
        avgDelay?: number;
        trains?: Array<{
          codTren: string;
          codComercial?: string;
          delayMinutes?: number;
          estacionSiguiente?: string;
          estacionSiguienteCodigo?: string;
          origen?: string;
          destino?: string;
          latitude?: number;
          longitude?: number;
          eta?: string;
          scheduledArrival?: string;
          platform?: string;
        }>;
      }
    >;

    // 4. Collect trains where codEstSig matches our station code (next stop)
    //    or where the station appears in the route origin/destination
    const boardTrains: Array<{
      codTren: string;
      codComercial?: string;
      brand: string;
      origin: string;
      destination: string;
      scheduledTime: string;
      estimatedTime?: string;
      delayMinutes: number;
      platform?: string;
      direction: "arrival" | "departure";
    }> = [];

    const now = new Date();

    for (const [brand, stats] of Object.entries(brandStats)) {
      if (!stats.trains) continue;
      for (const train of stats.trains) {
        // Match if next stop code equals our station code
        const isNextStop =
          stationCode &&
          train.estacionSiguienteCodigo &&
          train.estacionSiguienteCodigo === stationCode;

        // Also loosely match by station name in origin/destination
        const nameMatch =
          train.origen
            ?.toLowerCase()
            .includes(station.name.toLowerCase().split(" ")[0]) ||
          train.destino
            ?.toLowerCase()
            .includes(station.name.toLowerCase().split(" ")[0]);

        if (!isNextStop && !nameMatch) continue;

        const delay = train.delayMinutes ?? 0;
        const sched = train.scheduledArrival ?? train.eta ?? now.toISOString();
        const estimated = delay
          ? new Date(new Date(sched).getTime() + delay * 60_000).toISOString()
          : undefined;

        // Determine direction: arriving = destination matches / next stop matches
        const direction: "arrival" | "departure" =
          isNextStop || train.destino?.toLowerCase().includes(station.name.toLowerCase().split(" ")[0])
            ? "arrival"
            : "departure";

        boardTrains.push({
          codTren: train.codTren,
          codComercial: train.codComercial,
          brand,
          origin: train.origen ?? "—",
          destination: train.destino ?? "—",
          scheduledTime: sched,
          estimatedTime: estimated,
          delayMinutes: delay,
          platform: train.platform,
          direction,
        });
      }
    }

    // Sort by scheduled time
    boardTrains.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );

    // Filter by variant
    const filtered =
      variant === "arrivals"
        ? boardTrains.filter((t) => t.direction === "arrival")
        : variant === "departures"
        ? boardTrains.filter((t) => t.direction === "departure")
        : boardTrains;

    return NextResponse.json({
      success: true,
      data: {
        stationName: station.name,
        stationCode: stationCode,
        trains: filtered,
        updatedAt: latestWithTrains.recordedAt.toISOString(),
        source: filtered.length > 0 ? "live" : "empty",
      },
    });
  } catch (error) {
    reportApiError(error, "Station board API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch station board" },
      { status: 500 }
    );
  }
}
