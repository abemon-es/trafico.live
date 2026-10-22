/**
 * Whether AccidentMicrodata holds vehicle types at all. On 2026-10-22 the six
 * involves* flags were false in all 466,123 rows (the import didn't map
 * them), so the vehicle pages showed every accident under titles about
 * trucks, motorcycles or cyclists. Until a flag is filled, those pages render
 * VehicleDataPending instead.
 */

import { cache } from "react";
import { prisma, isBuildWithoutDb } from "@/lib/db";

export type VehicleFlag =
  | "involvesCar"
  | "involvesMotorcycle"
  | "involvesTruck"
  | "involvesBus"
  | "involvesBicycle"
  | "involvesPedestrian";

/** True when at least one accident has this flag set. */
export const hasVehicleFlag = cache(async (flag: VehicleFlag): Promise<boolean> => {
  if (isBuildWithoutDb()) return false;
  try {
    const row = await prisma.accidentMicrodata.findFirst({ where: { [flag]: true }, select: { id: true } });
    return row != null;
  } catch (err) {
    console.warn(`[accident-vehicles] ${flag} unavailable:`, err instanceof Error ? err.name : typeof err);
    return false;
  }
});
