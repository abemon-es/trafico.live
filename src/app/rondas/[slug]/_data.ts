// Static definitions for Spanish urban ring roads.
// Each entry contains geographic, descriptive, and SEO data.
// Live incident and intensity data is queried at render time from the DB.

export interface RondaDefinition {
  slug: string;
  name: string;
  shortName: string; // e.g. "M-30" for display in badges
  city: string;
  province: string;
  provinceCode: string; // 2-digit INE province code
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  length_km: number;
  description: string; // 100-150 word description
  roadIds: string[];   // Road identifiers used to filter TrafficIncident.road
  relatedSlugs: string[]; // Other ring roads in the same city
  openedYear: number | null;
  type: "autopista" | "autovía" | "vía rápida" | "carretera urbana";
  keywords: string[];
}

export const RONDAS: RondaDefinition[] = [
  {
    slug: "m-30",
    name: "M-30 Madrid",
    shortName: "M-30",
    city: "Madrid",
    province: "Madrid",
    provinceCode: "28",
    centerLat: 40.4168,
    centerLng: -3.7038,
    zoomLevel: 12,
    length_km: 32.5,
    description:
      "La M-30 es la primera ronda de circunvalación de Madrid y una de las vías urbanas de mayor densidad de tráfico de Europa. Discurre en su mayor parte bajo tierra (Calle 30) tras la profunda remodelación urbana completada en 2007, que transformó las riberas del Manzanares en un parque lineal. Con 32,5 km de longitud, la M-30 conecta todos los barrios interiores de Madrid y sirve como límite entre el centro y la almendra central. Cuenta con más de 90 accesos y salidas y soporta una intensidad media diaria superior a 150.000 vehículos en sus tramos más transitados. Las horas punta (8:00-10:00 y 18:00-20:00) concentran la mayor parte de las incidencias.",
    roadIds: ["M-30", "M30", "Calle 30"],
    relatedSlugs: ["m-40"],
    openedYear: 1974,
    type: "autopista",
    keywords: [
      "M-30 Madrid ahora",
      "estado M-30 hoy",
      "tráfico M-30 Madrid",
      "M-30 atascos tiempo real",
      "M-30 incidencias",
      "calle 30 Madrid tráfico",
      "M-30 cámaras DGT",
    ],
  },
  {
    slug: "m-40",
    name: "M-40 Madrid",
    shortName: "M-40",
    city: "Madrid",
    province: "Madrid",
    provinceCode: "28",
    centerLat: 40.4168,
    centerLng: -3.7038,
    zoomLevel: 11,
    length_km: 63.3,
    description:
      "La M-40 es la segunda ronda de circunvalación de Madrid y la autovía de mayor longitud de la Comunidad de Madrid. Con 63,3 km completa un anillo exterior que rodea prácticamente toda la capital y conecta con las principales radiales (A-1, A-2, A-3, A-4, A-5 y A-6). Es el eje vertebrador del tráfico de paso por Madrid y la vía más utilizada para evitar el centro de la ciudad en desplazamientos transversales. Los tramos más congestionados son el sur (entre la A-5 y la A-4) y el este (entre la A-3 y la N-II). La M-40 soporta intensidades medias superiores a 120.000 vehículos/día en sus tramos más cargados y es punto crítico durante las operaciones especiales de salida y retorno.",
    roadIds: ["M-40", "M40"],
    relatedSlugs: ["m-30"],
    openedYear: 1999,
    type: "autovía",
    keywords: [
      "M-40 Madrid ahora",
      "estado M-40 hoy",
      "tráfico M-40 Madrid",
      "M-40 atascos tiempo real",
      "M-40 incidencias",
      "M-40 accidente hoy",
      "M-40 retenciones",
    ],
  },
  {
    slug: "ronda-dalt",
    name: "Ronda de Dalt (B-20) Barcelona",
    shortName: "Ronda de Dalt",
    city: "Barcelona",
    province: "Barcelona",
    provinceCode: "08",
    centerLat: 41.4230,
    centerLng: 2.1534,
    zoomLevel: 12,
    length_km: 13.6,
    description:
      "La Ronda de Dalt (B-20) es la ronda superior de Barcelona y forma junto con la Ronda del Litoral el cinturón de rondas de la ciudad. Discurre por la parte alta de Barcelona, bordeando los distritos de Nou Barris, Horta-Guinardó, Gràcia y Sarrià-Sant Gervasi antes de conectar con la autopista A-7 en el norte. Con 13,6 km de longitud, canaliza el tráfico de paso entre el Vallès y el litoral barcelonés y actúa como descongestionante del centro de la ciudad. Los túneles del Carmel son su punto más crítico, con retenciones frecuentes en hora punta. La Ronda de Dalt soporta intensidades medias superiores a 100.000 vehículos/día en los tramos más cargados.",
    roadIds: ["B-20", "B20", "Ronda de Dalt", "Ronda Dalt"],
    relatedSlugs: ["ronda-litoral"],
    openedYear: 1992,
    type: "autovía",
    keywords: [
      "Ronda de Dalt Barcelona ahora",
      "estado Ronda de Dalt hoy",
      "B-20 Barcelona tráfico",
      "Ronda Dalt atascos",
      "Ronda de Dalt incidencias",
      "B-20 cámaras tráfico Barcelona",
    ],
  },
  {
    slug: "ronda-litoral",
    name: "Ronda del Litoral (B-10) Barcelona",
    shortName: "Ronda del Litoral",
    city: "Barcelona",
    province: "Barcelona",
    provinceCode: "08",
    centerLat: 41.3835,
    centerLng: 2.1777,
    zoomLevel: 12,
    length_km: 13.4,
    description:
      "La Ronda del Litoral (B-10) es la ronda inferior de Barcelona y uno de los ejes viarios más transitados de Cataluña. Discurre por la franja costera de la ciudad, bordeando los barrios de Poble Sec, la Barceloneta, el Poblenou y Diagonal Mar antes de conectar con la autopista C-31 en el delta del Besòs. Con 13,4 km de longitud, canaliza el acceso al puerto de Barcelona, a las playas y al cinturón logístico portuario. Los accesos al puerto y el nudo del Morrot son sus puntos más conflictivos. La Ronda del Litoral es esencial para los movimientos entre el Llobregat y el Besòs y para los accesos al aeropuerto de El Prat desde el norte de la ciudad.",
    roadIds: ["B-10", "B10", "Ronda del Litoral", "Ronda Litoral"],
    relatedSlugs: ["ronda-dalt"],
    openedYear: 1992,
    type: "autovía",
    keywords: [
      "Ronda del Litoral Barcelona ahora",
      "B-10 Barcelona tráfico",
      "estado Ronda Litoral hoy",
      "Ronda del Litoral atascos",
      "B-10 incidencias Barcelona",
      "Ronda Litoral cámaras tráfico",
    ],
  },
  {
    slug: "bypass-valencia",
    name: "Bypass de Valencia (V-30 / CV-400)",
    shortName: "Bypass Valencia",
    city: "Valencia",
    province: "Valencia",
    provinceCode: "46",
    centerLat: 39.4699,
    centerLng: -0.3763,
    zoomLevel: 12,
    length_km: 11.8,
    description:
      "El bypass de Valencia es el sistema de rondas que rodea la ciudad de Valencia y canaliza el tráfico de paso entre las autopistas radiales. Formado principalmente por la V-30 (autovía del Saler) al sur y la CV-400 al oeste, el bypass permite circunvalar Valencia sin pasar por el centro urbano. La V-30 discurre por el sur de la ciudad, bordeando la Albufera y conectando la A-7 con la autopista AP-7. Este corredor es especialmente crítico durante los meses de verano, cuando el tráfico hacia las playas del sur de Valencia se suma al tráfico de paso del Corredor Mediterráneo. Los accesos al puerto de Valencia y los enlaces con la A-3 concentran las mayores retenciones.",
    roadIds: ["V-30", "V30", "CV-400", "CV400", "bypass Valencia"],
    relatedSlugs: [],
    openedYear: 2003,
    type: "autovía",
    keywords: [
      "bypass Valencia ahora",
      "V-30 Valencia tráfico",
      "estado bypass Valencia hoy",
      "V-30 atascos tiempo real",
      "bypass Valencia incidencias",
      "CV-400 Valencia tráfico",
      "ronda Valencia tráfico",
    ],
  },
];

export const RONDA_SLUGS = RONDAS.map((r) => r.slug);

export function getRonda(slug: string): RondaDefinition | undefined {
  return RONDAS.find((r) => r.slug === slug);
}

export function getRondasByCity(city: string): RondaDefinition[] {
  return RONDAS.filter((r) => r.city.toLowerCase() === city.toLowerCase());
}
