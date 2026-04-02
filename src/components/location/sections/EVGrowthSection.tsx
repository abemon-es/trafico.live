import type { GeoEntity } from "@/lib/geo/types";
import { prisma } from "@/lib/db";
import { getOrCompute } from "@/lib/redis";
import { buildEVChargerWhere } from "@/lib/geo/query-builders";
import { Zap } from "lucide-react";

interface EVGrowthSectionProps {
  entity: GeoEntity;
}

interface TimelineEntry {
  month: string;
  label: string;
  cumulative: number;
}

function formatMonth(yyyymm: string): string {
  const MONTHS = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const [year, m] = yyyymm.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${year}`;
}

async function getEVGrowthTimeline(
  entity: GeoEntity
): Promise<TimelineEntry[]> {
  const cacheKey = `ev:growth:${entity.level}:${entity.provinceCode ?? entity.slug}`;

  return getOrCompute(cacheKey, 3600, async () => {
    const where = buildEVChargerWhere(entity);

    const chargers = await prisma.eVCharger.findMany({
      where,
      select: { lastUpdated: true },
      orderBy: { lastUpdated: "asc" },
    });

    if (chargers.length === 0) return [];

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const c of chargers) {
      const month = new Date(c.lastUpdated).toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] ?? 0) + 1;
    }

    // Convert to cumulative timeline
    const timeline: TimelineEntry[] = [];
    let running = 0;
    for (const month of Object.keys(byMonth).sort()) {
      running += byMonth[month];
      timeline.push({
        month,
        label: formatMonth(month),
        cumulative: running,
      });
    }

    return timeline;
  });
}

export async function EVGrowthSection({ entity }: EVGrowthSectionProps) {
  const timeline = await getEVGrowthTimeline(entity);

  // Need at least 2 months of data to show growth
  if (timeline.length < 2) return null;

  const first = timeline[0];
  const current = timeline[timeline.length - 1];
  const totalMonths = timeline.length;

  // Growth percentage
  const growthPct =
    first.cumulative > 0
      ? Math.round(
          ((current.cumulative - first.cumulative) / first.cumulative) * 100
        )
      : 0;

  // Monthly growth rate for projection
  const monthlyRate =
    totalMonths > 1
      ? (current.cumulative - first.cumulative) / (totalMonths - 1)
      : 0;

  // Project to end of current year
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const decemberMonth = now.getFullYear() * 12 + 11;
  const monthsRemaining = decemberMonth - currentMonth;
  const projected =
    monthlyRate > 0
      ? Math.round(current.cumulative + monthlyRate * monthsRemaining)
      : null;

  // Max for bar heights
  const maxCumulative = current.cumulative;

  // Pick labels: start, middle, end
  const midIdx = Math.floor(timeline.length / 2);
  const labelIndices = new Set([0, midIdx, timeline.length - 1]);

  return (
    <section
      id="ev-crecimiento"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-signal-green" />
        <h2 className="font-heading text-lg font-bold text-gray-900">
          Crecimiento de la red de carga EV
        </h2>
      </div>

      {/* Growth summary card */}
      <div className="bg-signal-green/5 rounded-xl border border-signal-green/15 p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          {growthPct > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-data font-bold text-signal-green bg-signal-green/10 px-2 py-0.5 rounded-full">
              +{growthPct}% en {totalMonths} meses
            </span>
          )}
        </div>

        <p className="text-sm text-gray-700">
          <span className="font-data text-gray-500">{first.label}:</span>{" "}
          <strong className="font-data">{first.cumulative}</strong> puntos{" "}
          <span className="text-gray-400 mx-1">&rarr;</span>{" "}
          <span className="font-data text-gray-500">{current.label}:</span>{" "}
          <strong className="font-data">{current.cumulative}</strong> puntos
        </p>

        {projected != null && monthsRemaining > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-gray-400">&rarr;</span> Dic{" "}
            {now.getFullYear()}:{" "}
            <span className="font-data">~{projected}</span> est.
          </p>
        )}
      </div>

      {/* Sparkline bar chart */}
      <div className="flex items-end gap-px h-20">
        {timeline.map((entry, i) => {
          const heightPct =
            maxCumulative > 0
              ? Math.max((entry.cumulative / maxCumulative) * 100, 4)
              : 4;

          // Opacity gradient: oldest = 20%, newest = 60%
          const opacityPct =
            timeline.length > 1
              ? 20 + (40 * i) / (timeline.length - 1)
              : 40;

          return (
            <div
              key={entry.month}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${heightPct}%`,
                backgroundColor: `oklch(0.723 0.219 142.1 / ${opacityPct}%)`,
              }}
              title={`${entry.label}: ${entry.cumulative} puntos de carga`}
            />
          );
        })}
      </div>

      {/* Month labels */}
      <div className="flex justify-between mt-1.5">
        {timeline.map((entry, i) =>
          labelIndices.has(i) ? (
            <span key={entry.month} className="text-[10px] text-gray-400">
              {entry.label}
            </span>
          ) : (
            <span key={entry.month} />
          )
        )}
      </div>

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: MITERD</p>
    </section>
  );
}
