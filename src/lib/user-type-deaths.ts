/**
 * Deaths at 30 days by user type, from AccidentMicrodata's 12 columns (filled
 * from the DGT's TOT_*_MU30DF fields on 2026-10-22, scripts/
 * backfill-microdata-deaths.ts). They count people of that type killed in the
 * accident, not the vehicles involved, which the DGT doesn't publish. The
 * pages built on them say so (CMO).
 */

import { cache } from "react";
import { prisma, isBuildWithoutDb } from "@/lib/db";
import { getOrCompute } from "@/lib/redis";

export type DeathField =
  | "pedestrianDeaths30d"
  | "cyclistDeaths30d"
  | "mopedDeaths30d"
  | "motorcycleDeaths30d"
  | "carDeaths30d"
  | "vanDeaths30d"
  | "lightTruckDeaths30d"
  | "heavyTruckDeaths30d"
  | "busDeaths30d"
  | "pmvDeaths30d"
  | "otherVehicleDeaths30d"
  | "unspecifiedDeaths30d";

export interface UserTypeDeaths {
  /** First and last year with data for these fields. */
  from: number;
  to: number;
  /** Deaths per field, per year; plus all deaths that year, for the share. */
  byYear: { year: number; deaths: Record<string, number>; allDeaths: number }[];
  /** Deaths per field by Madrid hour of the accident (0–23). */
  byHour: { hour: number; deaths: Record<string, number> }[];
  /** Deaths per field by day of week (1 Monday … 7 Sunday). */
  byDayOfWeek: { dayOfWeek: number; deaths: Record<string, number> }[];
  /** Deaths per field by INE province code, most first. */
  byProvince: { province: string; deaths: Record<string, number>; total: number }[];
  /** Deaths per field in urban and interurban roads (ZONA_AGRUPADA). */
  byZone: { urban: Record<string, number>; interurban: Record<string, number> };
  /** Deaths per field over the whole span. */
  totals: Record<string, number>;
}

type SumRow = { _sum: Partial<Record<DeathField, number | null>> };
const sums = (row: SumRow, fields: DeathField[]) => Object.fromEntries(fields.map((f) => [f, row._sum[f] ?? 0]));

/** The figures change once a year, with a new DGT file: an hour in Redis. */
const TTL_SECONDS = 3600;

/**
 * The deaths for these fields (comma-separated), or null when no row has them
 * or the DB can't be read. A null reads back from Redis as a miss, so a
 * failure lasts one request.
 */
export const userTypeDeaths = cache(async (fieldsKey: string): Promise<UserTypeDeaths | null> => {
  if (isBuildWithoutDb()) return null;
  return getOrCompute(`user-type-deaths:v1:${fieldsKey}`, TTL_SECONDS, () => compute(fieldsKey.split(",") as DeathField[]));
});

async function compute(fields: DeathField[]): Promise<UserTypeDeaths | null> {
  try {
    const _sum = Object.fromEntries(fields.map((f) => [f, true])) as Record<DeathField, true>;
    const filled = { OR: fields.map((f) => ({ [f]: { not: null } })) };
    const [years, all, hours, days, provinces, zones] = await Promise.all([
      prisma.accidentMicrodata.groupBy({ by: ["year"], where: filled, _sum, orderBy: { year: "asc" } }),
      prisma.accidentMicrodata.groupBy({ by: ["year"], where: filled, _sum: { fatalities: true }, orderBy: { year: "asc" } }),
      prisma.accidentMicrodata.groupBy({ by: ["hour"], where: { AND: [filled, { hour: { not: null } }] }, _sum, orderBy: { hour: "asc" } }),
      prisma.accidentMicrodata.groupBy({ by: ["dayOfWeek"], where: { AND: [filled, { dayOfWeek: { not: null } }] }, _sum, orderBy: { dayOfWeek: "asc" } }),
      prisma.accidentMicrodata.groupBy({ by: ["province"], where: { AND: [filled, { province: { not: null } }] }, _sum }),
      prisma.accidentMicrodata.groupBy({ by: ["isUrban"], where: { AND: [filled, { isUrban: { not: null } }] }, _sum }),
    ]);
    if (years.length === 0) return null;
    const allByYear = new Map(all.map((r) => [r.year, r._sum.fatalities ?? 0]));
    const totals = Object.fromEntries(fields.map((f) => [f, years.reduce((s, r) => s + ((r._sum as SumRow["_sum"])[f] ?? 0), 0)]));
    const zoneRow = (urban: boolean) => zones.find((z) => z.isUrban === urban);
    return {
      from: years[0].year,
      to: years[years.length - 1].year,
      byYear: years.map((r) => ({ year: r.year, deaths: sums(r as SumRow, fields), allDeaths: allByYear.get(r.year) ?? 0 })),
      byHour: hours.map((r) => ({ hour: r.hour as number, deaths: sums(r as SumRow, fields) })),
      byDayOfWeek: days.map((r) => ({ dayOfWeek: r.dayOfWeek as number, deaths: sums(r as SumRow, fields) })),
      byProvince: provinces
        .map((r) => {
          const deaths = sums(r as SumRow, fields);
          return { province: r.province as string, deaths, total: Object.values(deaths).reduce((a, b) => a + b, 0) };
        })
        .sort((a, b) => b.total - a.total),
      byZone: {
        urban: zoneRow(true) ? sums(zoneRow(true) as SumRow, fields) : Object.fromEntries(fields.map((f) => [f, 0])),
        interurban: zoneRow(false) ? sums(zoneRow(false) as SumRow, fields) : Object.fromEntries(fields.map((f) => [f, 0])),
      },
      totals,
    };
  } catch (err) {
    console.warn("[user-type-deaths] unavailable:", err instanceof Error ? err.name : typeof err);
    return null;
  }
}
