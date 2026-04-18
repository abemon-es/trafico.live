import prisma from "@/lib/db";

export type CollectorStatus = "healthy" | "degraded" | "down";
export type OverallStatus = "healthy" | "degraded" | "down";

export interface CollectorHealth {
  task: string;
  lastBeat: string;
  status: CollectorStatus;
  collectorStatus: string;
  errorMessage: string | null;
  ageMinutes: number;
}

export interface DailyHealth {
  date: string;
  task: string;
  healthyPct: number;
  incidents: number;
}

/**
 * Classify a heartbeat timestamp.
 * healthy <10min · degraded 10-30min · down >30min (or never)
 */
export function classifyHeartbeat(lastBeatIso: string | null): CollectorStatus {
  if (!lastBeatIso) return "down";
  const ageMin = (Date.now() - new Date(lastBeatIso).getTime()) / 60_000;
  if (ageMin < 10) return "healthy";
  if (ageMin < 30) return "degraded";
  return "down";
}

export function classifyOverall(collectors: CollectorHealth[]): OverallStatus {
  if (collectors.length === 0) return "degraded";
  const down = collectors.filter((c) => c.status === "down").length;
  const degraded = collectors.filter((c) => c.status === "degraded").length;
  if (down > collectors.length * 0.3) return "down";
  if (down > 0 || degraded > collectors.length * 0.3) return "degraded";
  return "healthy";
}

export async function getCollectorStatuses(): Promise<CollectorHealth[]> {
  const rows = await prisma.collectorHeartbeat.findMany({
    orderBy: { task: "asc" },
  });
  return rows.map((r) => {
    const lastBeatIso = r.lastRunAt.toISOString();
    const ageMinutes = Math.round((Date.now() - r.lastRunAt.getTime()) / 60_000);
    return {
      task: r.task,
      lastBeat: lastBeatIso,
      status: classifyHeartbeat(lastBeatIso),
      collectorStatus: r.status,
      errorMessage: r.errorMessage,
      ageMinutes,
    };
  });
}

/**
 * 7-day per-task healthy % based on current state (placeholder until
 * StatusIncident + heartbeat history is persisted). Proposes: 100% healthy
 * if currently healthy, else 0% for simplicity — upgrade once T3.6 adds
 * time-series retention on CollectorHeartbeat.
 */
export async function getSevenDayHistory(): Promise<DailyHealth[]> {
  const current = await getCollectorStatuses();
  const out: DailyHealth[] = [];
  const today = new Date();
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - d);
    const iso = date.toISOString().slice(0, 10);
    for (const c of current) {
      out.push({
        date: iso,
        task: c.task,
        healthyPct: d === 0 && c.status !== "healthy" ? 0 : 100,
        incidents: 0,
      });
    }
  }
  return out;
}
