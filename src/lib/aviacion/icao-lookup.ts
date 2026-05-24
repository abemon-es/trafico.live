/**
 * icao-lookup.ts
 *
 * Asignación de rangos ICAO24 a países según OACI Doc 9303 Annex 10.
 * Fuente pública: https://www.icao.int/publications/DOC8643/Pages/Search.aspx
 *
 * Rangos: hex [start, end] inclusive.
 * Esta tabla cubre los rangos más relevantes para el espacio aéreo español
 * y europeo, más los grandes emisores mundiales.
 *
 * Uso: icaoLookup("34a1b2") → { country: "España", flag: "🇪🇸", prefix: "34" }
 */

export interface IcaoCountryInfo {
  country: string;
  /** ISO 3166-1 alpha-2 code */
  iso2: string;
  flag: string;
}

interface RangeEntry {
  start: number;
  end: number;
  info: IcaoCountryInfo;
}

// ---------------------------------------------------------------------------
// Range table — hex ranges, inclusive [start, end]
// ---------------------------------------------------------------------------

const RANGES: RangeEntry[] = [
  // Spain — 34xxxx through 37xxxx (assigned 340000–37FFFF)
  { start: 0x340000, end: 0x37ffff, info: { country: "España", iso2: "ES", flag: "🇪🇸" } },

  // Portugal — 491000–495FFF
  { start: 0x491000, end: 0x495fff, info: { country: "Portugal", iso2: "PT", flag: "🇵🇹" } },

  // France — 380000–3BFFFF
  { start: 0x380000, end: 0x3bffff, info: { country: "Francia", iso2: "FR", flag: "🇫🇷" } },

  // Germany — 3C0000–3FFFFF
  { start: 0x3c0000, end: 0x3fffff, info: { country: "Alemania", iso2: "DE", flag: "🇩🇪" } },

  // United Kingdom — 400000–43FFFF
  { start: 0x400000, end: 0x43ffff, info: { country: "Reino Unido", iso2: "GB", flag: "🇬🇧" } },

  // Ireland — 4CA000–4CBFFF
  { start: 0x4ca000, end: 0x4cbfff, info: { country: "Irlanda", iso2: "IE", flag: "🇮🇪" } },

  // Italy — 300000–33FFFF
  { start: 0x300000, end: 0x33ffff, info: { country: "Italia", iso2: "IT", flag: "🇮🇹" } },

  // Netherlands — 480000–487FFF
  { start: 0x480000, end: 0x487fff, info: { country: "Países Bajos", iso2: "NL", flag: "🇳🇱" } },

  // Belgium — 448000–44FFFF
  { start: 0x448000, end: 0x44ffff, info: { country: "Bélgica", iso2: "BE", flag: "🇧🇪" } },

  // Switzerland — 4B0000–4B7FFF
  { start: 0x4b0000, end: 0x4b7fff, info: { country: "Suiza", iso2: "CH", flag: "🇨🇭" } },

  // Austria — 440000–447FFF
  { start: 0x440000, end: 0x447fff, info: { country: "Austria", iso2: "AT", flag: "🇦🇹" } },

  // Greece — 4680BB–46FFFF (approximate)
  { start: 0x468000, end: 0x46ffff, info: { country: "Grecia", iso2: "GR", flag: "🇬🇷" } },

  // Sweden — 4A0000–4A7FFF
  { start: 0x4a0000, end: 0x4a7fff, info: { country: "Suecia", iso2: "SE", flag: "🇸🇪" } },

  // Norway — 470000–477FFF
  { start: 0x470000, end: 0x477fff, info: { country: "Noruega", iso2: "NO", flag: "🇳🇴" } },

  // Denmark — 458000–45FFFF
  { start: 0x458000, end: 0x45ffff, info: { country: "Dinamarca", iso2: "DK", flag: "🇩🇰" } },

  // Finland — 460000–467FFF
  { start: 0x460000, end: 0x467fff, info: { country: "Finlandia", iso2: "FI", flag: "🇫🇮" } },

  // Poland — 489000–489FFF (approximate)
  { start: 0x489000, end: 0x489fff, info: { country: "Polonia", iso2: "PL", flag: "🇵🇱" } },

  // Czech Republic — 49D000–49FFFF
  { start: 0x49d000, end: 0x49ffff, info: { country: "Rep. Checa", iso2: "CZ", flag: "🇨🇿" } },

  // Hungary — 470000–473FFF (overlaps — note: approximate)
  // Romania — 4A8000–4AFFFF
  { start: 0x4a8000, end: 0x4affff, info: { country: "Rumanía", iso2: "RO", flag: "🇷🇴" } },

  // USA — A00000–AFFFFF
  { start: 0xa00000, end: 0xafffff, info: { country: "Estados Unidos", iso2: "US", flag: "🇺🇸" } },

  // Canada — C00000–C3FFFF
  { start: 0xc00000, end: 0xc3ffff, info: { country: "Canadá", iso2: "CA", flag: "🇨🇦" } },

  // Mexico — 0D0000–0DFFFF
  { start: 0x0d0000, end: 0x0dffff, info: { country: "México", iso2: "MX", flag: "🇲🇽" } },

  // Brazil — E40000–E7FFFF
  { start: 0xe40000, end: 0xe7ffff, info: { country: "Brasil", iso2: "BR", flag: "🇧🇷" } },

  // Argentina — E80000–E9FFFF (approximate)
  { start: 0xe80000, end: 0xe9ffff, info: { country: "Argentina", iso2: "AR", flag: "🇦🇷" } },

  // Russia — 100000–1FFFFF
  { start: 0x100000, end: 0x1fffff, info: { country: "Rusia", iso2: "RU", flag: "🇷🇺" } },

  // China — 780000–7FFFFF
  { start: 0x780000, end: 0x7fffff, info: { country: "China", iso2: "CN", flag: "🇨🇳" } },

  // Japan — 840000–87FFFF
  { start: 0x840000, end: 0x87ffff, info: { country: "Japón", iso2: "JP", flag: "🇯🇵" } },

  // Australia — 7C0000–7FFFFF (subset of 7C block)
  { start: 0x7c0000, end: 0x7fffff, info: { country: "Australia", iso2: "AU", flag: "🇦🇺" } },

  // India — 800000–87FFFF (approximate — shared range, Japan 84-87)
  // Use tighter sub-range: 800000–83FFFF for India
  { start: 0x800000, end: 0x83ffff, info: { country: "India", iso2: "IN", flag: "🇮🇳" } },

  // Turkey — 4B8000–4BFFFF
  { start: 0x4b8000, end: 0x4bffff, info: { country: "Turquía", iso2: "TR", flag: "🇹🇷" } },

  // Saudi Arabia — 710000–717FFF
  { start: 0x710000, end: 0x717fff, info: { country: "Arabia Saudí", iso2: "SA", flag: "🇸🇦" } },

  // UAE — 896000–896FFF
  { start: 0x896000, end: 0x896fff, info: { country: "Emiratos Árabes", iso2: "AE", flag: "🇦🇪" } },

  // Qatar — 06A000–06AFFF
  { start: 0x06a000, end: 0x06afff, info: { country: "Catar", iso2: "QA", flag: "🇶🇦" } },

  // Morocco — 020000–027FFF
  { start: 0x020000, end: 0x027fff, info: { country: "Marruecos", iso2: "MA", flag: "🇲🇦" } },

  // South Korea — 71800x–71FFFF (approximate)
  { start: 0x718000, end: 0x71ffff, info: { country: "Corea del Sur", iso2: "KR", flag: "🇰🇷" } },

  // Singapore — 76C000–76CFFF
  { start: 0x76c000, end: 0x76cfff, info: { country: "Singapur", iso2: "SG", flag: "🇸🇬" } },

  // Indonesia — 8A0000–8A7FFF
  { start: 0x8a0000, end: 0x8a7fff, info: { country: "Indonesia", iso2: "ID", flag: "🇮🇩" } },

  // Thailand — 880000–887FFF
  { start: 0x880000, end: 0x887fff, info: { country: "Tailandia", iso2: "TH", flag: "🇹🇭" } },
];

// ---------------------------------------------------------------------------
// Lookup function
// ---------------------------------------------------------------------------

/**
 * Returns country information for a given ICAO24 hex address.
 * Returns null if the address is outside all known ranges.
 */
export function lookupIcaoCountry(icao24: string): IcaoCountryInfo | null {
  const num = parseInt(icao24.trim().toLowerCase(), 16);
  if (isNaN(num)) return null;

  for (const entry of RANGES) {
    if (num >= entry.start && num <= entry.end) {
      return entry.info;
    }
  }
  return null;
}

/**
 * Returns the country prefix description (first 2 hex chars mapping).
 */
export function getIcaoPrefix(icao24: string): string {
  return icao24.trim().toLowerCase().slice(0, 2).toUpperCase();
}

/**
 * Total range entries in the lookup table.
 */
export const ICAO_RANGE_COUNT = RANGES.length;
