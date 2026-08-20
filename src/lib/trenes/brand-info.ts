/**
 * Editorial knowledge about Renfe commercial brands and rolling stock.
 * Shared by /trenes/tren/[trainId] and /trenes/linea/[slug] to render the
 * explanatory SEO copy ("qué es un AVE", "qué tren es la serie 102").
 * Facts kept deliberately stable (top speeds, families) — no schedules here.
 */

export interface BrandInfo {
  /** Canonical display name */
  name: string;
  /** One-line category ("alta velocidad", "media distancia"…) */
  category: string;
  /** 2–3 sentence description, plain Spanish, factual */
  description: string;
  /** Commercial top speed, km/h (0 = varies) */
  topSpeedKmh: number;
  /** What kind of traveller uses it / what it's good for */
  audience: string;
}

export const BRAND_INFO: Record<string, BrandInfo> = {
  AVE: {
    name: "AVE",
    category: "Alta velocidad",
    description:
      "AVE es el servicio de alta velocidad de Renfe, con velocidades comerciales de hasta 310 km/h sobre líneas exclusivas de ancho internacional. Une las principales ciudades del país en tiempos que compiten con el avión, con compromiso de puntualidad y clases Estándar, Elige y Prémium.",
    topSpeedKmh: 310,
    audience:
      "Viajes rápidos entre grandes ciudades: Madrid, Barcelona, Sevilla, Málaga, Valencia, Alicante o Zaragoza.",
  },
  AVLO: {
    name: "Avlo",
    category: "Alta velocidad low cost",
    description:
      "Avlo es la marca de alta velocidad de bajo coste de Renfe. Circula por las mismas líneas y a la misma velocidad que el AVE (hasta 310 km/h), con una única clase y tarifas más ajustadas a cambio de servicios opcionales de pago.",
    topSpeedKmh: 310,
    audience: "Quien prioriza el precio en corredores de alta velocidad.",
  },
  Alvia: {
    name: "Alvia",
    category: "Larga distancia · ancho variable",
    description:
      "Alvia es el servicio de larga distancia con trenes de ancho variable: aprovechan la alta velocidad donde existe (hasta 250 km/h) y continúan por la red convencional hasta destinos sin línea AVE. Es la conexión habitual entre Madrid y el norte y noroeste peninsular.",
    topSpeedKmh: 250,
    audience:
      "Destinos que combinan tramo AVE y red convencional: Galicia, Asturias, Cantabria, País Vasco o Huelva.",
  },
  Avant: {
    name: "Avant",
    category: "Media distancia de alta velocidad",
    description:
      "Avant cubre trayectos cortos por líneas de alta velocidad (hasta 250 km/h), pensado para viajeros recurrentes y desplazamientos diarios entre ciudades cercanas, con abonos específicos.",
    topSpeedKmh: 250,
    audience:
      "Commuting interurbano: Madrid–Toledo, Madrid–Segovia–Valladolid, Sevilla–Córdoba–Málaga o Barcelona–Girona–Figueres.",
  },
  Euromed: {
    name: "Euromed",
    category: "Larga distancia · corredor mediterráneo",
    description:
      "Euromed recorre el corredor mediterráneo entre Barcelona y Alicante a hasta 200 km/h, enlazando Tarragona, Castellón y Valencia con frecuencias diarias.",
    topSpeedKmh: 200,
    audience: "El eje Barcelona–Valencia–Alicante sin transbordos.",
  },
  Intercity: {
    name: "Intercity",
    category: "Larga distancia convencional",
    description:
      "Intercity agrupa servicios de larga distancia con paradas selectivas, tanto por líneas de alta velocidad como convencionales según el trayecto. Conecta capitales de provincia con menos paradas que un Media Distancia.",
    topSpeedKmh: 200,
    audience: "Conexiones directas entre capitales sin la tarifa de la alta velocidad.",
  },
  MD: {
    name: "Media Distancia",
    category: "Media distancia",
    description:
      "Los trenes de Media Distancia (MD) vertebran los desplazamientos regionales de entre 100 y 300 km sobre la red convencional, con paradas en ciudades intermedias y tarifas reguladas como servicio público.",
    topSpeedKmh: 160,
    audience: "Trayectos regionales con paradas intermedias.",
  },
  "Media Distancia": {
    name: "Media Distancia",
    category: "Media distancia",
    description:
      "Los trenes de Media Distancia vertebran los desplazamientos regionales de entre 100 y 300 km sobre la red convencional, con paradas en ciudades intermedias y tarifas reguladas como servicio público.",
    topSpeedKmh: 160,
    audience: "Trayectos regionales con paradas intermedias.",
  },
  Regional: {
    name: "Regional",
    category: "Media distancia · regional",
    description:
      "Los servicios Regional paran en la práctica totalidad de estaciones de su recorrido, dando servicio público a poblaciones intermedias sobre la red convencional.",
    topSpeedKmh: 160,
    audience: "Poblaciones intermedias sin parada de larga distancia.",
  },
  "REG.EXP": {
    name: "Regional Exprés",
    category: "Media distancia · regional",
    description:
      "El Regional Exprés es la variante rápida del Regional: mismo recorrido troncal con menos paradas, lo que recorta tiempos entre las poblaciones principales del trayecto.",
    topSpeedKmh: 160,
    audience: "Trayectos regionales priorizando tiempo de viaje.",
  },
  Cercanías: {
    name: "Cercanías",
    category: "Red de proximidad",
    description:
      "Cercanías es la red de proximidad de Renfe en los grandes núcleos urbanos: frecuencias altas, tarifas por zonas e integración con metro y autobús. Doce núcleos en España, de Madrid a Sevilla pasando por Bilbao o Valencia.",
    topSpeedKmh: 140,
    audience: "Movilidad diaria dentro de un área metropolitana.",
  },
  Rodalies: {
    name: "Rodalies",
    category: "Red de proximidad · Cataluña",
    description:
      "Rodalies de Catalunya es la red de proximidad y regionales de Cataluña, operada por Renfe bajo titularidad de la Generalitat. Las líneas R conectan el área de Barcelona y las comarcas con frecuencias de tipo metro en el tramo central.",
    topSpeedKmh: 140,
    audience: "Movilidad diaria en el área de Barcelona y comarcas.",
  },
  FEVE: {
    name: "FEVE (ancho métrico)",
    category: "Red de ancho métrico",
    description:
      "Los servicios de ancho métrico (histórica FEVE) recorren la cornisa cantábrica y otras líneas de vía estrecha, uniendo poblaciones que ningún otro ferrocarril alcanza.",
    topSpeedKmh: 100,
    audience: "La cornisa cantábrica pueblo a pueblo.",
  },
};

/** Look up brand info tolerating case and minor naming differences. */
export function getBrandInfo(brand: string | null | undefined): BrandInfo | null {
  if (!brand) return null;
  const direct = BRAND_INFO[brand];
  if (direct) return direct;
  const lower = brand.toLowerCase();
  for (const [key, info] of Object.entries(BRAND_INFO)) {
    if (key.toLowerCase() === lower) return info;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rolling stock — Renfe series, keyed by the leading digits of the material
// code the fleet API reports (e.g. mat "102011" → series 102).
// ---------------------------------------------------------------------------

export interface RollingStockInfo {
  series: string;
  name: string;
  description: string;
  topSpeedKmh: number;
}

const ROLLING_STOCK: Record<string, RollingStockInfo> = {
  "100": { series: "S-100", name: "Alstom TGV Atlántico", description: "El tren que inauguró el AVE Madrid–Sevilla en 1992, derivado del TGV francés.", topSpeedKmh: 300 },
  "102": { series: "S-102", name: "Talgo 350 «Pato»", description: "Composición Talgo-Bombardier apodada «Pato» por su morro aerodinámico.", topSpeedKmh: 330 },
  "103": { series: "S-103", name: "Siemens Velaro E", description: "El tren comercial más rápido de España: certificado a 350 km/h.", topSpeedKmh: 350 },
  "104": { series: "S-104", name: "Alstom-CAF (Avant)", description: "Unidades de alta velocidad para media distancia Avant.", topSpeedKmh: 250 },
  "106": { series: "S-106", name: "Talgo Avril", description: "La generación más reciente de Talgo: ancho variable y hasta 330 km/h.", topSpeedKmh: 330 },
  "112": { series: "S-112", name: "Talgo 350 «Pato»", description: "Evolución del S-102 con mayor capacidad.", topSpeedKmh: 330 },
  "114": { series: "S-114", name: "Alstom-CAF (Avant)", description: "Unidades Avant de segunda generación.", topSpeedKmh: 250 },
  "120": { series: "S-120", name: "CAF-Alstom ancho variable", description: "Tren de ancho variable para servicios Alvia.", topSpeedKmh: 250 },
  "121": { series: "S-121", name: "CAF-Alstom ancho variable", description: "Variante del S-120 para servicios Avant y Media Distancia.", topSpeedKmh: 250 },
  "130": { series: "S-130", name: "Talgo 250", description: "Composición Talgo de ancho variable, base de la flota Alvia.", topSpeedKmh: 250 },
  "730": { series: "S-730", name: "Talgo 250 híbrido", description: "Versión dual diésel-eléctrica del S-130: llega donde no hay catenaria.", topSpeedKmh: 250 },
  "252": { series: "S-252", name: "Locomotora Siemens", description: "Locomotora eléctrica de línea, habitual en Talgos convencionales.", topSpeedKmh: 220 },
  "449": { series: "S-449", name: "CAF Media Distancia", description: "Unidades eléctricas de media distancia.", topSpeedKmh: 160 },
  "470": { series: "S-470", name: "UT 470", description: "Unidades eléctricas clásicas de media distancia.", topSpeedKmh: 140 },
  "446": { series: "S-446", name: "Cercanías CAF/Alstom", description: "La unidad clásica de Cercanías de los grandes núcleos.", topSpeedKmh: 100 },
  "447": { series: "S-447", name: "Cercanías CAF/Alstom", description: "Evolución del 446 para servicios de proximidad.", topSpeedKmh: 120 },
  "450": { series: "S-450", name: "Cercanías dos pisos", description: "Unidades de dos pisos para los núcleos de mayor demanda.", topSpeedKmh: 140 },
  "462": { series: "Civia", name: "CAF Civia", description: "Plataforma modular de Cercanías, accesible y de piso bajo.", topSpeedKmh: 120 },
  "463": { series: "Civia", name: "CAF Civia", description: "Plataforma modular de Cercanías, accesible y de piso bajo.", topSpeedKmh: 120 },
  "464": { series: "Civia", name: "CAF Civia", description: "Plataforma modular de Cercanías, accesible y de piso bajo.", topSpeedKmh: 120 },
  "465": { series: "Civia", name: "CAF Civia", description: "Plataforma modular de Cercanías, accesible y de piso bajo.", topSpeedKmh: 120 },
  "599": { series: "S-599", name: "CAF diésel MD", description: "Unidades diésel de media distancia para líneas sin electrificar.", topSpeedKmh: 160 },
  "598": { series: "S-598", name: "CAF diésel MD", description: "Unidades diésel basculantes de media distancia.", topSpeedKmh: 160 },
};

/** "102011" → S-102 info; tolerates 3-digit prefixes and unknown codes. */
export function getRollingStock(mat: string | null | undefined): RollingStockInfo | null {
  if (!mat) return null;
  const digits = mat.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return ROLLING_STOCK[digits.slice(0, 3)] ?? null;
}
