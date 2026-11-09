/**
 * Shared rules and helpers for the «estado de las carreteras» pages: the
 * national hub (/estado-carreteras) and the community pages (/espana/<ccaa>).
 */

import type { Prisma } from "@prisma/client";

/** A closed road: CLOSURE, or a DGT roadClosed / carriagewayClosures stored before #268 (same rule as incidentEffect). */
export const CLOSED: Prisma.TrafficIncidentWhereInput = {
  isActive: true,
  OR: [
    { type: "CLOSURE" },
    { managementType: { startsWith: "roadClosed" } },
    { managementType: { startsWith: "carriagewayClosures" } },
  ],
};

const NUM = new Intl.NumberFormat("es-ES");
export const formatCount = (v: number) => NUM.format(v);

/** «14:05», Madrid time. */
export function madridTime(d: Date): string {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" });
}

/** «las 14:05» today, «el 30 oct.» before (Madrid time). */
export function since(d: Date, now: Date): string {
  const day = (x: Date) => x.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
  return day(d) === day(now)
    ? `las ${madridTime(d)}`
    : `el ${d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}`;
}

export interface PlacedIncident {
  roadNumber: string | null;
  kmPoint: Prisma.Decimal | number | null;
  municipality: string | null;
  provinceName: string | null;
}

/** «A-1 km 23 · Alcobendas», «Vía sin identificar · Teruel». */
export function incidentPlace(i: PlacedIncident): string {
  const road = i.roadNumber
    ? `${i.roadNumber}${i.kmPoint != null ? ` km ${formatCount(Math.round(Number(i.kmPoint)))}` : ""}`
    : "Vía sin identificar";
  const place = i.municipality || i.provinceName;
  return place ? `${road} · ${place}` : road;
}
