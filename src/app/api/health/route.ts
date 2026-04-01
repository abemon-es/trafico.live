import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

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
    redis: {
      status: "ok" | "error" | "unavailable";
      latencyMs?: number;
    };
    collectors?: {
      v16: { lastUpdate: string | null; stale: boolean };
      incidents: { lastUpdate: string | null; stale: boolean };
      gasStations: { lastUpdate: string | null; stale: boolean };
      intensity: { lastUpdate: string | null; stale: boolean };
      weather: { lastUpdate: string | null; stale: boolean };
      panels: { lastUpdate: string | null; stale: boolean };
    };
  };
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

async function checkRedis(): Promise<HealthCheck["checks"]["redis"]> {
  if (!redis) {
    return { status: "unavailable" };
  }
  const start = Date.now();
  try {
    await redis.ping();
    return {
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch {
    return { status: "error" };
  }
}

async function checkCollectors(): Promise<HealthCheck["checks"]["collectors"]> {
  const staleThreshold = {
    v16: 10 * 60 * 1000,
    incidents: 10 * 60 * 1000,
    gasStations: 10 * 60 * 60 * 1000,
    intensity: 15 * 60 * 1000,
    weather: 8 * 60 * 60 * 1000,
    panels: 15 * 60 * 1000,
  };

  const now = Date.now();

  try {
    const [latestV16, latestIncident, latestGasStation, latestIntensity, latestWeather, latestPanel] = await Promise.all([
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
      prisma.trafficIntensity.findFirst({
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      }),
      prisma.weatherAlert.findFirst({
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      }),
      prisma.variablePanel.findFirst({
        orderBy: { lastUpdated: "desc" },
        select: { lastUpdated: true },
      }),
    ]);

    const check = (date: Date | null | undefined, threshold: number) => ({
      lastUpdate: date?.toISOString() || null,
      stale: date ? now - date.getTime() > threshold : true,
    });

    return {
      v16: check(latestV16?.lastSeenAt, staleThreshold.v16),
      incidents: check(latestIncident?.lastSeenAt, staleThreshold.incidents),
      gasStations: check(latestGasStation?.lastUpdated, staleThreshold.gasStations),
      intensity: check(latestIntensity?.recordedAt, staleThreshold.intensity),
      weather: check(latestWeather?.fetchedAt, staleThreshold.weather),
      panels: check(latestPanel?.lastUpdated, staleThreshold.panels),
    };
  } catch {
    return undefined;
  }
}

export async function GET() {
  const [database, redisCheck, collectors] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkCollectors(),
  ]);

  const isHealthy = database.status === "ok";
  const hasStaleness = collectors
    ? Object.values(collectors).some((c) => c.stale)
    : false;
  const redisDown = redisCheck.status === "error";

  const health: HealthCheck = {
    status: !isHealthy ? "unhealthy" : (hasStaleness || redisDown) ? "degraded" : "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database,
      redis: redisCheck,
      collectors,
    },
  };

  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
