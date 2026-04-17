/**
 * OD-pair generator for the /ir namespace.
 * Produces the cross-product of the top-50 Spanish cities by population
 * (minus same-city pairs) = 2,450 pairs.
 *
 * Each pair carries both city names, provinces, and the straight-line
 * (haversine) distance in km so pages can render it without a DB call.
 */

import { slugifyCity } from "./ir-slug";

// ---------------------------------------------------------------------------
// City catalog
// ---------------------------------------------------------------------------

interface CityDef {
  name: string;
  province: string;
  lat: number;
  lon: number;
}

const CITIES: CityDef[] = [
  { name: "Madrid",               province: "Madrid",           lat: 40.4168,  lon: -3.7038  },
  { name: "Barcelona",            province: "Barcelona",        lat: 41.3851,  lon: 2.1734   },
  { name: "Valencia",             province: "Valencia",         lat: 39.4699,  lon: -0.3763  },
  { name: "Sevilla",              province: "Sevilla",          lat: 37.3891,  lon: -5.9845  },
  { name: "Zaragoza",             province: "Zaragoza",         lat: 41.6488,  lon: -0.8891  },
  { name: "Málaga",               province: "Málaga",           lat: 36.7213,  lon: -4.4214  },
  { name: "Murcia",               province: "Murcia",           lat: 37.9922,  lon: -1.1307  },
  { name: "Palma",                province: "Islas Baleares",   lat: 39.5696,  lon: 2.6502   },
  { name: "Las Palmas",           province: "Las Palmas",       lat: 28.1235,  lon: -15.4363 },
  { name: "Bilbao",               province: "Vizcaya",          lat: 43.2630,  lon: -2.9350  },
  { name: "Alicante",             province: "Alicante",         lat: 38.3452,  lon: -0.4815  },
  { name: "Córdoba",              province: "Córdoba",          lat: 37.8882,  lon: -4.7794  },
  { name: "Valladolid",           province: "Valladolid",       lat: 41.6523,  lon: -4.7245  },
  { name: "Vigo",                 province: "Pontevedra",       lat: 42.2314,  lon: -8.7124  },
  { name: "Gijón",                province: "Asturias",         lat: 43.5453,  lon: -5.6615  },
  { name: "Hospitalet",           province: "Barcelona",        lat: 41.3600,  lon: 2.1100   },
  { name: "Vitoria",              province: "Álava",            lat: 42.8467,  lon: -2.6726  },
  { name: "A Coruña",             province: "A Coruña",         lat: 43.3623,  lon: -8.4115  },
  { name: "Elche",                province: "Alicante",         lat: 38.2660,  lon: -0.7014  },
  { name: "Granada",              province: "Granada",          lat: 37.1773,  lon: -3.5986  },
  { name: "Terrassa",             province: "Barcelona",        lat: 41.5631,  lon: 2.0089   },
  { name: "Badalona",             province: "Barcelona",        lat: 41.4467,  lon: 2.2473   },
  { name: "Oviedo",               province: "Asturias",         lat: 43.3614,  lon: -5.8496  },
  { name: "Cartagena",            province: "Murcia",           lat: 37.6057,  lon: -0.9869  },
  { name: "Móstoles",             province: "Madrid",           lat: 40.3224,  lon: -3.8647  },
  { name: "Jerez",                province: "Cádiz",            lat: 36.6864,  lon: -6.1362  },
  { name: "Sabadell",             province: "Barcelona",        lat: 41.5433,  lon: 2.1094   },
  { name: "Santa Cruz de Tenerife", province: "Santa Cruz de Tenerife", lat: 28.4636, lon: -16.2518 },
  { name: "Pamplona",             province: "Navarra",          lat: 42.8125,  lon: -1.6458  },
  { name: "Almería",              province: "Almería",          lat: 36.8340,  lon: -2.4637  },
  { name: "Alcalá de Henares",    province: "Madrid",           lat: 40.4818,  lon: -3.3636  },
  { name: "Fuenlabrada",          province: "Madrid",           lat: 40.2842,  lon: -3.7944  },
  { name: "Leganés",              province: "Madrid",           lat: 40.3280,  lon: -3.7641  },
  { name: "Donostia",             province: "Guipúzcoa",        lat: 43.3183,  lon: -1.9812  },
  { name: "Santander",            province: "Cantabria",        lat: 43.4623,  lon: -3.8099  },
  { name: "Castellón",            province: "Castellón",        lat: 39.9864,  lon: -0.0513  },
  { name: "Burgos",               province: "Burgos",           lat: 42.3439,  lon: -3.6969  },
  { name: "Albacete",             province: "Albacete",         lat: 38.9942,  lon: -1.8585  },
  { name: "Getafe",               province: "Madrid",           lat: 40.3050,  lon: -3.7323  },
  { name: "Alcorcón",             province: "Madrid",           lat: 40.3494,  lon: -3.8236  },
  { name: "Logroño",              province: "La Rioja",         lat: 42.4650,  lon: -2.4456  },
  { name: "Badajoz",              province: "Badajoz",          lat: 38.8794,  lon: -6.9706  },
  { name: "Salamanca",            province: "Salamanca",        lat: 40.9701,  lon: -5.6635  },
  { name: "Huelva",               province: "Huelva",           lat: 37.2614,  lon: -6.9447  },
  { name: "Lleida",               province: "Lleida",           lat: 41.6148,  lon: 0.6267   },
  { name: "Marbella",             province: "Málaga",           lat: 36.5101,  lon: -4.8825  },
  { name: "Tarragona",            province: "Tarragona",        lat: 41.1189,  lon: 1.2445   },
  { name: "Mataró",               province: "Barcelona",        lat: 41.5370,  lon: 2.4449   },
  { name: "Dos Hermanas",         province: "Sevilla",          lat: 37.2836,  lon: -5.9214  },
  { name: "León",                 province: "León",             lat: 42.5987,  lon: -5.5671  },
];

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---------------------------------------------------------------------------
// OD pair type
// ---------------------------------------------------------------------------

export interface ODPair {
  originSlug: string;
  originName: string;
  originProvince: string;
  destSlug: string;
  destName: string;
  destProvince: string;
  straightKm: number;
}

// ---------------------------------------------------------------------------
// Generator — computed once at module load, then frozen
// ---------------------------------------------------------------------------

let _cache: ODPair[] | null = null;

export function getAllODPairs(): ODPair[] {
  if (_cache) return _cache;

  const pairs: ODPair[] = [];
  for (let i = 0; i < CITIES.length; i++) {
    for (let j = 0; j < CITIES.length; j++) {
      if (i === j) continue;
      const o = CITIES[i];
      const d = CITIES[j];
      pairs.push({
        originSlug: slugifyCity(o.name),
        originName: o.name,
        originProvince: o.province,
        destSlug: slugifyCity(d.name),
        destName: d.name,
        destProvince: d.province,
        straightKm: haversineKm(o.lat, o.lon, d.lat, d.lon),
      });
    }
  }

  _cache = pairs;
  return _cache;
}

export function getODPairBySlugs(originSlug: string, destSlug: string): ODPair | null {
  return (
    getAllODPairs().find(
      (p) => p.originSlug === originSlug && p.destSlug === destSlug
    ) ?? null
  );
}
