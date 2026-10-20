/**
 * AEMET's maritime forecast zones, exactly as its OpenData spec lists them
 * (https://opendata.aemet.es/AEMET_OpenData_specification.json, parameters
 * `costa` and `area`, read 2026-10-20).
 *
 * Until 2026-10-20 this list was written by hand and did not match AEMET:
 * 5 of its 14 codes do not exist (costa 48/49, area 3-5) and came back as
 * estado 404 on every run, Galicia (40) and Asturias–País Vasco (41) were never
 * requested, and most names were wrong — zone 42 was stored as "Galicia" but is
 * Andalucía Occidental y Ceuta, 43 (Canarias) as "Cantábrico occidental", and
 * the two Atlantic areas were swapped. tests/maritime-forecast-zones.test.ts
 * checks this list against the spec's tables (tests/fixtures).
 */

import type { MaritimeZoneType } from "@prisma/client";

export const AEMET_BASE_URL = "https://opendata.aemet.es/opendata/api";

export interface ZoneDefinition {
  id: string;
  name: string;
  zoneType: MaritimeZoneType;
  endpoint: string;
}

const coastal = (code: number, name: string): ZoneDefinition => ({
  id: String(code),
  name,
  zoneType: "COASTAL",
  endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/${code}`,
});

// Stored ids keep the "hs" prefix the table already uses for high seas.
const highSeas = (code: number, name: string): ZoneDefinition => ({
  id: `hs${code}`,
  name,
  zoneType: "HIGH_SEAS",
  endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/${code}`,
});

export const COASTAL_ZONES: ZoneDefinition[] = [
  coastal(40, "Costa de Galicia"),
  coastal(41, "Costa de Asturias, Cantabria y País Vasco"),
  coastal(42, "Costa de Andalucía Occidental y Ceuta"),
  coastal(43, "Costa de las Islas Canarias"),
  coastal(44, "Costa de Illes Balears"),
  coastal(45, "Costa de Cataluña"),
  coastal(46, "Costa de Valencia y Murcia"),
  coastal(47, "Costa de Andalucía Oriental y Melilla"),
];

export const HIGH_SEAS_AREAS: ZoneDefinition[] = [
  highSeas(0, "Océano Atlántico al sur de 35º N"),
  highSeas(1, "Océano Atlántico al norte de 30º N"),
  highSeas(2, "Mar Mediterráneo"),
];

export const ALL_ZONES: ZoneDefinition[] = [...COASTAL_ZONES, ...HIGH_SEAS_AREAS];

/**
 * Body of an AEMET datos URL as text. The datos server sends Latin-1 bytes
 * (ISO-8859-15) without declaring it, and fetch's .json()/.text() always decode
 * UTF-8, so every accented letter was stored as U+FFFD ("Andaluc�a").
 * Same approach as aemet-historical: UTF-8 if it decodes cleanly, else Latin-1.
 */
export function decodeAemetBody(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}
