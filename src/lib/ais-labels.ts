// ---------------------------------------------------------------------------
// AIS canonical label tables — ITU-R M.1371-5
// ---------------------------------------------------------------------------

/** Navigation Status codes 0-15 */
export const NAV_STATUS: Record<number, string> = {
  0: "En marcha",
  1: "Fondeado",
  2: "Sin gobierno",
  3: "Maniobra restringida",
  4: "Restringido por calado",
  5: "Amarrado",
  6: "Varado",
  7: "Faenando",
  8: "Navegando a vela",
  9: "Mercancías peligrosas (alta velocidad)",
  10: "Mercancías peligrosas",
  11: "Reservado",
  12: "Reservado",
  13: "Reservado",
  14: "AIS-SART activo",
  15: "Indefinido",
};

/** Ship type codes (ITU AIS Annex 8) — selected entries + decade fallbacks */
export const SHIP_TYPE: Record<number, string> = {
  // WIG
  20: "WIG",
  // Fishing / Towing / Special
  30: "Faenando",
  31: "Remolcador",
  32: "Remolcador (grande)",
  33: "Draga",
  34: "Sumergible",
  35: "Militar",
  36: "Velero",
  37: "Yate",
  // High-Speed Craft
  40: "Embarcacion rapida",
  // Special purpose
  50: "Piloto",
  51: "SAR",
  52: "Remolcador",
  53: "Port Tender",
  54: "Anti-pollution",
  55: "Policia",
  // Passenger
  60: "Pasaje",
  // Cargo
  70: "Carga",
  // Tanker
  80: "Tanquero",
  // Other
  90: "Otro",
};

/**
 * Returns a human-readable ship type label.
 * Falls back to decade-level category, then generic "Tipo NNN".
 */
export function shipTypeLabel(code: number | null | undefined): string {
  if (code == null) return "Desconocido";
  const exact = SHIP_TYPE[code];
  if (exact) return exact;
  const tens = Math.floor(code / 10) * 10;
  return SHIP_TYPE[tens] ?? `Tipo ${code}`;
}

/**
 * Sanitizes an AIS destination field.
 * Strips non-printable chars, AIS padding (@, ^, >), garbage sequences.
 * Returns null if result is too short or lacks letters.
 */
export function cleanDestination(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[@^>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || !/[A-Za-z]/.test(cleaned)) return null;
  return cleaned.toUpperCase();
}

/**
 * Normalizes an AIS ETA date.
 * AIS ETAs carry no year — the year may land in the far future/past.
 * Returns null if the date is more than 90 days away or more than 2 days past.
 */
export function cleanEta(raw: Date | null | undefined): Date | null {
  if (!raw) return null;
  const now = new Date();
  const diffDays = (raw.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < -2 || diffDays > 90) return null;
  return raw;
}
