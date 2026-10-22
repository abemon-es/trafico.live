/**
 * What counts as an «incidencia» (CMO, 2026-10-22). Every TrafficIncident row
 * is exactly one of three classes, and the reports, the home, its counter and
 * ticker and «activas» read only from here:
 *
 *   - vehicleStop: a stopped or broken-down vehicle (V16 beacon, avería):
 *     DATEX causeType «vehicleObstruction», or our type VEHICLE_BREAKDOWN.
 *   - citySensor: the state of a city measurement point or road section
 *     (Madrid informo, Barcelona, Valencia), counted by sensor.
 *   - reported: everything else, from the authorities' feeds (DGT, SCT,
 *     Euskadi, CyL…). Only these are «incidencias».
 *
 * On 2026-10-20 DGT opened 17,741 vehicle stops out of 20,183 situations; on
 * 2026-10-21, 3,201 Madrid sensors went congested at least once. Counted as
 * incidents, either one swamped the headline.
 *
 * Pure (no Prisma or Next imports): the collector image compiles this file.
 */

export type IncidentClass = "reported" | "vehicleStop" | "citySensor";

export const VEHICLE_STOP_CAUSE = "vehicleObstruction" as const;
export const VEHICLE_STOP_TYPE = "VEHICLE_BREAKDOWN" as const;
/** Sources whose rows are measurement-point states, not reported incidents. */
export const CITY_SENSOR_SOURCES = ["MADRID", "BARCELONA", "VALENCIA"];

export function incidentClass(i: { type: string; causeType?: string | null; source?: string | null }): IncidentClass {
  if (i.causeType === VEHICLE_STOP_CAUSE || i.type === VEHICLE_STOP_TYPE) return "vehicleStop";
  if (i.source != null && CITY_SENSOR_SOURCES.includes(i.source)) return "citySensor";
  return "reported";
}

/** Prisma `where` per class. Combine with AND, never a spread. */
export const VEHICLE_STOP_WHERE = {
  OR: [{ causeType: VEHICLE_STOP_CAUSE }, { type: VEHICLE_STOP_TYPE }],
};

/**
 * Not a vehicle stop. Spelled out for NULL: `NOT (causeType = …)` is NULL, not
 * true, when causeType is NULL, and would drop most incidents without a word.
 */
const NOT_VEHICLE_STOP = {
  type: { not: VEHICLE_STOP_TYPE },
  OR: [{ causeType: null }, { causeType: { not: VEHICLE_STOP_CAUSE } }],
};

export const CITY_SENSOR_WHERE = {
  AND: [NOT_VEHICLE_STOP, { source: { in: CITY_SENSOR_SOURCES } }],
};

/** Reported incidents: neither a vehicle stop nor a city sensor (NULL source is reported). */
export const REPORTED_WHERE = {
  AND: [NOT_VEHICLE_STOP, { OR: [{ source: null }, { source: { notIn: CITY_SENSOR_SOURCES } }] }],
};

/** «feed»: a move that one source explains, which no headline may call a trend. */
export type Trend = "up" | "down" | "normal" | "feed";

/**
 * The automatic headline («más intensa de lo habitual», «tranquila»): only
 * when reported incidents moved by a quarter or more against the mean of the
 * earlier period, and the move survives without the source that moved most.
 * A feed's own change (a new parser, an outage) is not a busier road; a broad
 * rise is still a rise even if DGT, three quarters of the volume, carries most
 * of it.
 *
 * `current` and `earlier` are reported incidents by source; `earlierPeriods`
 * is how many periods `earlier` spans (7 days, 1 week). Null without a base.
 */
export function trend(current: Record<string, number>, earlier: Record<string, number>, earlierPeriods: number): Trend | null {
  const verdict = (cur: Record<string, number>, ear: Record<string, number>): Trend | null => {
    const now = Object.values(cur).reduce((s, n) => s + n, 0);
    const base = Object.values(ear).reduce((s, n) => s + n, 0) / earlierPeriods;
    if (!(base > 0)) return null;
    const ratio = now / base;
    return ratio >= 1.25 ? "up" : ratio <= 0.75 ? "down" : "normal";
  };
  const overall = verdict(current, earlier);
  if (overall !== "up" && overall !== "down") return overall;
  // The source whose own change pushes hardest in the move's direction.
  const sign = overall === "up" ? 1 : -1;
  const sources = [...new Set([...Object.keys(current), ...Object.keys(earlier)])];
  const top = sources.reduce((a, b) => {
    const d = (s: string) => sign * ((current[s] ?? 0) - (earlier[s] ?? 0) / earlierPeriods);
    return d(b) > d(a) ? b : a;
  });
  const without = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([s]) => s !== top));
  return verdict(without(current), without(earlier)) === overall ? overall : "feed";
}
