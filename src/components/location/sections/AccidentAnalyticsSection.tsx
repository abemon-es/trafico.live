import type { GeoEntity } from "@/lib/geo/types";
import { prisma } from "@/lib/db";
import { getOrCompute } from "@/lib/redis";
import { buildAccidentsWhere } from "@/lib/geo/query-builders";

// -----------------------------------------------------------------------
// Road type labels & colors
// -----------------------------------------------------------------------

const ROAD_TYPE_LABELS: Record<string, string> = {
  HIGHWAY: "Autopista",
  DUAL_CARRIAGEWAY: "Autovia",
  NATIONAL: "Nacional",
  URBAN: "Urbana",
  CONVENTIONAL: "Convencional",
};

const ROAD_TYPE_COLORS: Record<string, string> = {
  HIGHWAY: "bg-blue-200",
  DUAL_CARRIAGEWAY: "bg-tl-200",
  NATIONAL: "bg-red-100",
  URBAN: "bg-gray-200",
  CONVENTIONAL: "bg-amber-100",
};

// National average fatalities per 100k population (Spain ~2023)
const NATIONAL_RATE_PER_100K = 3.6;

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export async function AccidentAnalyticsSection({
  entity,
}: {
  entity: GeoEntity;
}) {
  const where = buildAccidentsWhere(entity);

  if (!where.province) return null;

  const cacheKey = `loc:${entity.level}:${entity.provinceCode ?? entity.slug}:accidentAnalytics`;

  const result = await getOrCompute(cacheKey, 86_400, async () => {
    const [allYears, province] = await Promise.all([
      prisma.historicalAccidents.findMany({
        where,
        orderBy: { year: "desc" },
      }),
      entity.provinceCode
        ? prisma.province.findUnique({
            where: { code: entity.provinceCode },
            select: { population: true, name: true },
          })
        : null,
    ]);

    // Provincial ranking: count provinces with more accidents in latest year
    const latestYear = allYears.length > 0 ? allYears[0].year : null;
    let ranking: { rank: number; total: number } | null = null;

    if (latestYear) {
      const allProvinceTotals = await prisma.$queryRawUnsafe<
        { province: string; total: number }[]
      >(
        `SELECT province, SUM(accidents)::int AS total
         FROM "HistoricalAccidents"
         WHERE year = $1
         GROUP BY province
         ORDER BY total DESC`,
        latestYear
      );

      const thisTotal = allProvinceTotals.find(
        (p) => p.province === entity.provinceCode
      )?.total;
      if (thisTotal !== undefined) {
        const rank =
          allProvinceTotals.filter((p) => p.total > thisTotal).length + 1;
        ranking = { rank, total: allProvinceTotals.length };
      }
    }

    return { allYears, province, ranking };
  });

  const { allYears, province, ranking } = result;

  if (allYears.length === 0) return null;

  // -----------------------------------------------------------------------
  // Aggregate by year
  // -----------------------------------------------------------------------

  const yearMap = new Map<
    number,
    {
      accidents: number;
      fatalities: number;
      hospitalized: number;
      nonHospitalized: number;
      roadTypes: Map<string, number>;
    }
  >();

  for (const row of allYears) {
    const existing = yearMap.get(row.year) ?? {
      accidents: 0,
      fatalities: 0,
      hospitalized: 0,
      nonHospitalized: 0,
      roadTypes: new Map<string, number>(),
    };
    existing.accidents += row.accidents;
    existing.fatalities += row.fatalities;
    existing.hospitalized += row.hospitalized;
    existing.nonHospitalized += row.nonHospitalized;
    if (row.roadType) {
      existing.roadTypes.set(
        row.roadType,
        (existing.roadTypes.get(row.roadType) ?? 0) + row.accidents
      );
    }
    yearMap.set(row.year, existing);
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => b - a);
  const latestYear = years[0];
  const prevYear = years[1] ?? null;
  const latest = yearMap.get(latestYear)!;
  const prev = prevYear ? yearMap.get(prevYear) : null;

  const minYear = years[years.length - 1];
  const maxYear = latestYear;

  // YoY changes
  const accidentYoY =
    prev && prev.accidents > 0
      ? Math.round(((latest.accidents - prev.accidents) / prev.accidents) * 100)
      : null;
  const fatalityYoY =
    prev && prev.fatalities > 0
      ? Math.round(
          ((latest.fatalities - prev.fatalities) / prev.fatalities) * 100
        )
      : null;

  // Per-capita rate
  const population = province?.population ?? null;
  const perCapitaRate =
    population && population > 0
      ? (latest.fatalities / (population / 100_000))
      : null;

  // Severity donut data
  const totalForDonut =
    latest.fatalities + latest.hospitalized + latest.nonHospitalized;
  const donutSegments =
    totalForDonut > 0
      ? [
          {
            label: "Leves",
            value: latest.nonHospitalized,
            pct: (latest.nonHospitalized / totalForDonut) * 100,
            color: "#22c55e",
          },
          {
            label: "Graves",
            value: latest.hospitalized,
            pct: (latest.hospitalized / totalForDonut) * 100,
            color: "#f59e0b",
          },
          {
            label: "Mortales",
            value: latest.fatalities,
            pct: (latest.fatalities / totalForDonut) * 100,
            color: "#ef4444",
          },
        ]
      : [];

  // SVG donut stroke-dasharray calculation
  const DONUT_R = 15.915;
  const DONUT_C = 2 * Math.PI * DONUT_R; // ~100
  let donutOffset = 0;
  const donutPaths = donutSegments.map((seg) => {
    const dashLen = (seg.pct / 100) * DONUT_C;
    const offset = donutOffset;
    donutOffset += dashLen;
    return { ...seg, dashLen, offset };
  });

  // Road type breakdown (from latest year)
  const roadTypeEntries = Array.from(latest.roadTypes.entries());
  const roadTypeTotal = roadTypeEntries.reduce((s, [, v]) => s + v, 0);

  // 5-year trend bars
  const trendYears = years.slice(0, 5).reverse();
  const maxYearTotal = Math.max(...trendYears.map((y) => yearMap.get(y)!.accidents), 1);

  // Projection for next year
  let projectedAccidents: number | null = null;
  if (trendYears.length >= 2) {
    const changes: number[] = [];
    for (let i = 1; i < trendYears.length; i++) {
      const curr = yearMap.get(trendYears[i])!.accidents;
      const prevVal = yearMap.get(trendYears[i - 1])!.accidents;
      if (prevVal > 0) changes.push((curr - prevVal) / prevVal);
    }
    if (changes.length > 0) {
      const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
      projectedAccidents = Math.round(latest.accidents * (1 + avgChange));
    }
  }

  return (
    <section
      id="accidentes-historicos"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* A. Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">
              Accidentes historicos
            </h2>
            <p className="text-xs text-gray-500">
              {province?.name ? `Provincia de ${province.name}` : entity.name}{" "}
              &middot; {minYear}–{maxYear}
            </p>
          </div>
        </div>
      </div>

      {/* B. Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {/* Accidents */}
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
          <p className="font-data text-xl font-extrabold text-gray-900">
            {latest.accidents.toLocaleString("es-ES")}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Accidentes {latestYear}
          </p>
          {accidentYoY !== null && (
            <p
              className={`text-[10px] font-medium mt-1 ${
                accidentYoY < 0 ? "text-signal-green" : "text-signal-red"
              }`}
            >
              {accidentYoY > 0 ? "+" : ""}
              {accidentYoY}% vs {prevYear}
            </p>
          )}
        </div>

        {/* Fatalities */}
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
          <p className="font-data text-xl font-extrabold text-red-800">
            {latest.fatalities.toLocaleString("es-ES")}
          </p>
          <p className="text-[10px] text-red-600 mt-1">
            Fallecidos {latestYear}
          </p>
          {fatalityYoY !== null && (
            <p
              className={`text-[10px] font-medium mt-1 ${
                fatalityYoY < 0 ? "text-signal-green" : "text-signal-red"
              }`}
            >
              {fatalityYoY > 0 ? "+" : ""}
              {fatalityYoY}% vs {prevYear}
            </p>
          )}
        </div>

        {/* Per-capita rate */}
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
          {perCapitaRate !== null ? (
            <>
              <p className="font-data text-xl font-extrabold text-gray-900">
                {perCapitaRate.toFixed(1)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Fallecidos / 100k hab.
              </p>
              <div className="h-[4px] bg-gray-100 rounded-full mt-2 mx-2">
                <div
                  className={`h-full rounded-full ${
                    perCapitaRate < NATIONAL_RATE_PER_100K
                      ? "bg-signal-green"
                      : perCapitaRate <= 5
                        ? "bg-tl-amber-400"
                        : "bg-signal-red"
                  }`}
                  style={{
                    width: `${Math.min((perCapitaRate / 5.0) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-[8px] text-gray-400 mt-1">
                Media nacional: {NATIONAL_RATE_PER_100K}
              </p>
            </>
          ) : (
            <>
              <p className="font-data text-xl font-extrabold text-gray-400">
                —
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Tasa per capita</p>
            </>
          )}
        </div>

        {/* Severity donut */}
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
          {donutPaths.length > 0 ? (
            <>
              <svg
                viewBox="0 0 36 36"
                className="w-12 h-12 mx-auto"
                aria-label="Distribucion de severidad"
              >
                <circle
                  cx="18"
                  cy="18"
                  r={DONUT_R}
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3"
                />
                {donutPaths.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="18"
                    cy="18"
                    r={DONUT_R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="3"
                    strokeDasharray={`${seg.dashLen.toFixed(2)} ${(DONUT_C - seg.dashLen).toFixed(2)}`}
                    strokeDashoffset={(-seg.offset).toFixed(2)}
                    transform="rotate(-90 18 18)"
                  />
                ))}
              </svg>
              <div className="flex items-center justify-center gap-2 mt-1">
                {donutSegments.map((seg) => (
                  <span
                    key={seg.label}
                    className="text-[8px] text-gray-500 flex items-center gap-0.5"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: seg.color }}
                    />
                    {seg.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="font-data text-xl font-extrabold text-gray-400">—</p>
          )}
          <p className="text-[10px] text-gray-500 mt-1">Severidad</p>
        </div>
      </div>

      {/* C. Road type breakdown */}
      {roadTypeEntries.length > 1 && roadTypeTotal > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Accidentes por tipo de via
          </p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {roadTypeEntries.map(([type, count]) => {
              const widthPct = (count / roadTypeTotal) * 100;
              return (
                <div
                  key={type}
                  className={ROAD_TYPE_COLORS[type] ?? "bg-gray-100"}
                  style={{ width: `${widthPct}%` }}
                  title={`${ROAD_TYPE_LABELS[type] ?? type}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {roadTypeEntries.map(([type, count]) => (
              <span
                key={type}
                className="text-[10px] text-gray-500 flex items-center gap-1"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-sm ${ROAD_TYPE_COLORS[type] ?? "bg-gray-100"}`}
                />
                {ROAD_TYPE_LABELS[type] ?? type}{" "}
                {Math.round((count / roadTypeTotal) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* D. 5-year trend with projection */}
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-600 mb-2">
          Tendencia {trendYears[0]}–{trendYears[trendYears.length - 1]}
        </p>
        <div className="space-y-1.5">
          {trendYears.map((year) => {
            const data = yearMap.get(year)!;
            const widthPct = (data.accidents / maxYearTotal) * 100;
            const isLatest = year === latestYear;
            return (
              <div key={year} className="flex items-center gap-2">
                <span className="font-data text-[10px] text-gray-500 w-8">
                  {year}
                </span>
                <div className="flex-1 h-[14px] bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isLatest
                        ? "bg-gradient-to-r from-tl-200 to-tl-300"
                        : "bg-tl-100"
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="font-data text-[10px] text-gray-600 w-12 text-right">
                  {data.accidents.toLocaleString("es-ES")}
                </span>
              </div>
            );
          })}

          {/* Projection row */}
          {projectedAccidents !== null && (
            <div className="flex items-center gap-2">
              <span className="font-data text-[10px] text-tl-600 w-8">
                {latestYear + 1}*
              </span>
              <div className="flex-1 h-[14px] border border-tl-200 border-dashed bg-tl-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tl-200 rounded-full opacity-50"
                  style={{
                    width: `${Math.min((projectedAccidents / maxYearTotal) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="font-data text-[10px] text-tl-600 w-12 text-right">
                ~{projectedAccidents.toLocaleString("es-ES")}
              </span>
            </div>
          )}
        </div>
        {projectedAccidents !== null && (
          <p className="text-[8px] text-gray-400 mt-1">
            * Proyeccion basada en la tendencia interanual
          </p>
        )}
      </div>

      {/* E. Provincial ranking */}
      {ranking && (
        <div className="bg-tl-50 rounded-xl p-3 border border-tl-200">
          <div className="flex items-center gap-3">
            <span className="font-data text-xl font-extrabold text-tl-600">
              {ranking.rank}
              <span className="text-xs font-normal align-top">a</span>
            </span>
            <p className="text-xs text-gray-700">
              {province?.name ?? entity.name} es la{" "}
              <span className="font-semibold">{ranking.rank}a</span> provincia
              por accidentes de {ranking.total}
            </p>
          </div>
        </div>
      )}

      {/* Attribution */}
      <p className="mt-5 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
