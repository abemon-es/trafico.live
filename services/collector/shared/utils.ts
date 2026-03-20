export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseDateTime(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

export function log(task: string, message: string): void {
  console.log(`[${task}] ${message}`);
}

export function logError(task: string, message: string, error?: unknown): void {
  console.error(`[${task}] ${message}`, error || "");
}

import { RoadType } from "@prisma/client";

export function inferRoadType(roadNumber: string | undefined): RoadType | undefined {
  if (!roadNumber) return undefined;
  const road = roadNumber.toUpperCase().trim();
  if (road.startsWith("AP-")) return "AUTOPISTA";
  if (road.startsWith("A-")) return "AUTOVIA";
  if (road.startsWith("N-")) return "NACIONAL";
  if (road.startsWith("C-")) return "COMARCAL";
  if (road.startsWith("E-")) return "AUTOVIA";
  if (road.match(/^[A-Z]{1,3}-\d/)) return "PROVINCIAL";
  return "OTHER";
}
