/**
 * «Vehículos detenidos»: stopped or broken-down vehicles (V16 beacons,
 * averías). They are counted on their own line and never as «incidencias»
 * (CMO, 2026-10-22). On 2026-10-20 they were 17,726 of the 20,184 situations
 * DGT opened (88 %); of the ~1,380 active at 23:00Z, 181.
 *
 * The definition, in one place: DATEX causeType «vehicleObstruction», or our
 * own type VEHICLE_BREAKDOWN. The reports and the home read it from here.
 * Pure (no Prisma or Next imports): the collector image compiles this file.
 */

export const VEHICLE_STOP_CAUSE = "vehicleObstruction" as const;
export const VEHICLE_STOP_TYPE = "VEHICLE_BREAKDOWN" as const;

export function isVehicleStop(incident: { type: string; causeType?: string | null }): boolean {
  return incident.causeType === VEHICLE_STOP_CAUSE || incident.type === VEHICLE_STOP_TYPE;
}

/** Prisma `where` for vehicle stops only. Combine with AND, not a spread. */
export const VEHICLE_STOP_WHERE = {
  OR: [{ causeType: VEHICLE_STOP_CAUSE }, { type: VEHICLE_STOP_TYPE }],
};

/**
 * Prisma `where` for every other incident. Spelled out for NULL: `NOT
 * (causeType = …)` is NULL, not true, when causeType is NULL, and would drop
 * most incidents without a word.
 */
export const NOT_VEHICLE_STOP_WHERE = {
  type: { not: VEHICLE_STOP_TYPE },
  OR: [{ causeType: null }, { causeType: { not: VEHICLE_STOP_CAUSE } }],
};
