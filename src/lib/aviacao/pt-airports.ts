/**
 * Portuguese airport catalog — ANA Aeroportos de Portugal
 * 18 airports including mainland, Azores and Madeira.
 * Source: ANA Aeroportos de Portugal / ICAO EUR/SAM
 */

export interface PTAirport {
  iata: string;
  icao: string;
  name: string;
  namePt: string;
  city: string;
  region: "continental" | "madeira" | "acores";
  latitude: number;
  longitude: number;
  elevation: number; // ft
  isAna: boolean; // ANA Aeroportos operator
  phoneInfo?: string;
  website?: string;
}

export const PT_AIRPORTS: PTAirport[] = [
  // Continental Portugal
  {
    iata: "LIS",
    icao: "LPPT",
    name: "Aeroporto Humberto Delgado",
    namePt: "Aeroporto de Lisboa",
    city: "Lisboa",
    region: "continental",
    latitude: 38.7742,
    longitude: -9.1342,
    elevation: 374,
    isAna: true,
    website: "https://www.ana.pt/aeroporto/lisboa",
  },
  {
    iata: "OPO",
    icao: "LPPR",
    name: "Aeroporto Francisco Sá Carneiro",
    namePt: "Aeroporto do Porto",
    city: "Porto",
    region: "continental",
    latitude: 41.2481,
    longitude: -8.6814,
    elevation: 228,
    isAna: true,
    website: "https://www.ana.pt/aeroporto/porto",
  },
  {
    iata: "FAO",
    icao: "LPFR",
    name: "Aeroporto de Faro",
    namePt: "Aeroporto de Faro",
    city: "Faro",
    region: "continental",
    latitude: 37.0144,
    longitude: -7.9659,
    elevation: 24,
    isAna: true,
    website: "https://www.ana.pt/aeroporto/faro",
  },
  // Madeira
  {
    iata: "FNC",
    icao: "LPMA",
    name: "Aeroporto da Madeira Cristiano Ronaldo",
    namePt: "Aeroporto da Madeira",
    city: "Funchal",
    region: "madeira",
    latitude: 32.6979,
    longitude: -16.7745,
    elevation: 192,
    isAna: true,
    website: "https://www.ana.pt/aeroporto/madeira",
  },
  {
    iata: "SMA",
    icao: "LPAZ",
    name: "Aeroporto de Santa Maria",
    namePt: "Aeroporto de Santa Maria",
    city: "Vila do Porto",
    region: "acores",
    latitude: 36.9714,
    longitude: -25.1706,
    elevation: 308,
    isAna: true,
  },
  // Azores
  {
    iata: "PDL",
    icao: "LPPD",
    name: "Aeroporto João Paulo II",
    namePt: "Aeroporto de Ponta Delgada",
    city: "Ponta Delgada",
    region: "acores",
    latitude: 37.7412,
    longitude: -25.6979,
    elevation: 259,
    isAna: true,
    website: "https://www.ana.pt/aeroporto/ponta-delgada",
  },
  {
    iata: "TER",
    icao: "LPLA",
    name: "Aeroporto das Lajes",
    namePt: "Aeroporto da Terceira",
    city: "Lajes",
    region: "acores",
    latitude: 38.7615,
    longitude: -27.0908,
    elevation: 180,
    isAna: true,
  },
  {
    iata: "GRW",
    icao: "LPGR",
    name: "Aeroporto da Graciosa",
    namePt: "Aeroporto da Graciosa",
    city: "Santa Cruz da Graciosa",
    region: "acores",
    latitude: 39.0922,
    longitude: -28.0298,
    elevation: 86,
    isAna: true,
  },
  {
    iata: "SJZ",
    icao: "LPSJ",
    name: "Aeroporto de São Jorge",
    namePt: "Aeroporto de São Jorge",
    city: "Velas",
    region: "acores",
    latitude: 38.6655,
    longitude: -28.1756,
    elevation: 311,
    isAna: true,
  },
  {
    iata: "PIX",
    icao: "LPPI",
    name: "Aeroporto do Pico",
    namePt: "Aeroporto do Pico",
    city: "Madalena",
    region: "acores",
    latitude: 38.5543,
    longitude: -28.4413,
    elevation: 109,
    isAna: true,
  },
  {
    iata: "HOR",
    icao: "LPHR",
    name: "Aeroporto da Horta",
    namePt: "Aeroporto da Horta",
    city: "Horta",
    region: "acores",
    latitude: 38.5199,
    longitude: -28.7159,
    elevation: 118,
    isAna: true,
  },
  {
    iata: "FLW",
    icao: "LPFL",
    name: "Aeroporto das Flores",
    namePt: "Aeroporto das Flores",
    city: "Santa Cruz das Flores",
    region: "acores",
    latitude: 39.4553,
    longitude: -31.1314,
    elevation: 112,
    isAna: true,
  },
  {
    iata: "CVU",
    icao: "LPCR",
    name: "Aeroporto do Corvo",
    namePt: "Aeroporto do Corvo",
    city: "Vila do Corvo",
    region: "acores",
    latitude: 39.6715,
    longitude: -31.1135,
    elevation: 0,
    isAna: false,
  },
  {
    iata: "VXE",
    icao: "LPVR",
    name: "Aeroporto de São Pedro",
    namePt: "Aeroporto de São Vicente",
    city: "São Vicente",
    region: "acores",
    latitude: 16.8332,
    longitude: -24.9946,
    elevation: 262,
    isAna: false,
  },
  {
    iata: "BYJ",
    icao: "LPBJ",
    name: "Aeroporto de Beja",
    namePt: "Aeroporto de Beja",
    city: "Beja",
    region: "continental",
    latitude: 38.0789,
    longitude: -7.9324,
    elevation: 636,
    isAna: false,
  },
  {
    iata: "CHC",
    icao: "LPCO",
    name: "Aeroporto de Coimbra",
    namePt: "Aeroporto de Coimbra",
    city: "Coimbra",
    region: "continental",
    latitude: 40.1558,
    longitude: -8.4731,
    elevation: 197,
    isAna: false,
  },
];

/** Main 3 airports for hub display */
export const PT_HUB_AIRPORTS = PT_AIRPORTS.filter((a) =>
  ["LIS", "OPO", "FNC"].includes(a.iata)
);

export function getPTAirport(iata: string): PTAirport | undefined {
  return PT_AIRPORTS.find(
    (a) => a.iata.toLowerCase() === iata.toLowerCase()
  );
}

/** Portugal bounding box for OpenSky/map filtering */
export const PT_BBOX = {
  minLat: 29.9,  // includes Madeira and Azores approximately
  maxLat: 42.2,
  minLng: -31.6,
  maxLng: -6.2,
};

/** Per-airport bounding box (~30km radius) */
export function airportBbox(lat: number, lng: number, radiusKm = 30) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export const REGION_LABELS: Record<PTAirport["region"], string> = {
  continental: "Portugal Continental",
  madeira: "Madeira",
  acores: "Açores",
};
