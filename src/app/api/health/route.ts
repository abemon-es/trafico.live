import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: {
      status: "ok" | "error";
      latencyMs?: number;
      error?: string;
    };
    collectors?: {
      v16: { lastUpdate: string | null; stale: boolean };
      incidents: { lastUpdate: string | null; stale: boolean };
      gasStations: { lastUpdate: string | null; stale: boolean };
    };
  };
  version: string;
}

async function checkDatabase(): Promise<HealthCheck["checks"]["database"]> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "error",
      error: "Database connection failed",
    };
  }
}

async function checkCollectors(): Promise<HealthCheck["checks"]["collectors"]> {
  const staleThreshold = {
    v16: 10 * 60 * 1000, // 10 minutes (runs every 5 min)
    incidents: 10 * 60 * 1000, // 10 minutes (runs every 5 min)
    gasStations: 10 * 60 * 60 * 1000, // 10 hours (runs 3x daily at 6:00, 13:00, 20:00 UTC)
  };

  const now = Date.now();

  try {
    const [latestV16, latestIncident, latestGasStation] = await Promise.all([
      prisma.v16BeaconEvent.findFirst({
        orderBy: { lastSeenAt: "desc" },
        select: { lastSeenAt: true },
      }),
      prisma.trafficIncident.findFirst({
        orderBy: { lastSeenAt: "desc" },
        select: { lastSeenAt: true },
      }),
      prisma.gasStation.findFirst({
        orderBy: { lastUpdated: "desc" },
        select: { lastUpdated: true },
      }),
    ]);

    return {
      v16: {
        lastUpdate: latestV16?.lastSeenAt?.toISOString() || null,
        stale: latestV16?.lastSeenAt
          ? now - latestV16.lastSeenAt.getTime() > staleThreshold.v16
          : true,
      },
      incidents: {
        lastUpdate: latestIncident?.lastSeenAt?.toISOString() || null,
        stale: latestIncident?.lastSeenAt
          ? now - latestIncident.lastSeenAt.getTime() > staleThreshold.incidents
          : true,
      },
      gasStations: {
        lastUpdate: latestGasStation?.lastUpdated?.toISOString() || null,
        stale: latestGasStation?.lastUpdated
          ? now - latestGasStation.lastUpdated.getTime() > staleThreshold.gasStations
          : true,
      },
    };
  } catch {
    return undefined;
  }
}

export async function GET() {
  const [database, collectors] = await Promise.all([
    checkDatabase(),
    checkCollectors(),
  ]);

  const isHealthy = database.status === "ok";
  const hasStaleness = collectors
    ? Object.values(collectors).some((c) => c.stale)
    : false;

  const health: HealthCheck = {
    status: !isHealthy ? "unhealthy" : hasStaleness ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database,
      collectors,
    },
    version: process.env.npm_package_version || "1.0.0",
  };

  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
