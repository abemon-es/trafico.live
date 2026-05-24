"use client";

import { useState } from "react";
import {
  Car,
  Fuel,
  Train,
  CloudRain,
  BarChart3,
  AlertTriangle,
  Anchor,
  Plane,
  Search,
  Wind,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Top 30 endpoints across all categories
// ---------------------------------------------------------------------------

type Method = "GET" | "POST";
type Tier = "FREE" | "PRO" | "ENTERPRISE";

interface EndpointDef {
  method: Method;
  path: string;
  description: string;
  tier: Tier;
  category: string;
}

const CATEGORIES = [
  { id: "trafico", label: "Tráfico en tiempo real", icon: Car },
  { id: "combustible", label: "Combustible y carburantes", icon: Fuel },
  { id: "ferrocarril", label: "Ferrocarril y Renfe", icon: Train },
  { id: "meteorologia", label: "Meteorología vial", icon: CloudRain },
  { id: "movilidad", label: "Movilidad y datos O-D", icon: BarChart3 },
  { id: "seguridad", label: "Seguridad vial", icon: AlertTriangle },
  { id: "maritimo", label: "Marítimo y AIS", icon: Anchor },
  { id: "aviacion", label: "Aviación", icon: Plane },
  { id: "calidad-aire", label: "Calidad del aire", icon: Wind },
  { id: "busqueda", label: "Búsqueda", icon: Search },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const ENDPOINTS: EndpointDef[] = [
  // Tráfico
  {
    method: "GET",
    path: "/api/incidents",
    description: "Incidencias activas (DGT DATEX II). Filtros: province, severity, type. Actualización 60 s.",
    tier: "FREE",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/trafico/intensidad",
    description: "6.117 sensores de Madrid: intensidad veh/h, ocupación, nivel de servicio. Actualización 5 min.",
    tier: "FREE",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/v16",
    description: "Balizas V16 de emergencia activas con posición GPS en tiempo real.",
    tier: "FREE",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/panels",
    description: "Paneles de mensaje variable (PMV) en accesos a Madrid con texto actualizado.",
    tier: "FREE",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/trafico/ciudades",
    description: "Sensores de Barcelona, Valencia y Zaragoza con intensidad y nivel de servicio.",
    tier: "PRO",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/trafico/obras",
    description: "Zonas de obras activas (conos conectados DGT). Actualización diaria.",
    tier: "PRO",
    category: "trafico",
  },
  // Combustible
  {
    method: "GET",
    path: "/api/gas-stations",
    description: "11.000+ gasolineras con precios por tipo de combustible, operador y coordenadas.",
    tier: "FREE",
    category: "combustible",
  },
  {
    method: "GET",
    path: "/api/combustible/historico",
    description: "Serie histórica de precios medios nacionales y provinciales (CNMC, desde 2016).",
    tier: "PRO",
    category: "combustible",
  },
  {
    method: "GET",
    path: "/api/combustible/tendencia",
    description: "Tendencia y variación de precios: 7d/30d/90d/1y. Útil para alertas de precio.",
    tier: "PRO",
    category: "combustible",
  },
  // Ferrocarril
  {
    method: "GET",
    path: "/api/trenes/alertas",
    description: "Alertas de servicio Renfe en tiempo real: cancelaciones, retrasos >5 min. Cadencia 2 min.",
    tier: "FREE",
    category: "ferrocarril",
  },
  {
    method: "GET",
    path: "/api/trenes/estaciones",
    description: "2.154 estaciones ferroviarias (Cercanías + AVE + LD) con coordenadas y red. GeoJSON.",
    tier: "FREE",
    category: "ferrocarril",
  },
  {
    method: "GET",
    path: "/api/trenes/rutas",
    description: "1.248 rutas con geometría GeoJSON, brand Renfe (AVE, Alvia, Cercanías…) y paradas.",
    tier: "FREE",
    category: "ferrocarril",
  },
  {
    method: "GET",
    path: "/api/trenes/flota",
    description: "Posiciones GPS de ~115 trenes de Larga Distancia en tiempo real. Actualización 2 min.",
    tier: "PRO",
    category: "ferrocarril",
  },
  // Meteorología
  {
    method: "GET",
    path: "/api/weather",
    description: "Alertas meteorológicas relevantes para la conducción: viento, lluvia, nieve, niebla.",
    tier: "FREE",
    category: "meteorologia",
  },
  {
    method: "GET",
    path: "/api/clima/estaciones",
    description: "Catálogo GeoJSON de ~900 estaciones AEMET con coordenadas y altitud.",
    tier: "FREE",
    category: "meteorologia",
  },
  {
    method: "GET",
    path: "/api/clima/historico",
    description: "Registros climáticos diarios (temp, precip, viento) por estación AEMET desde 2019.",
    tier: "PRO",
    category: "meteorologia",
  },
  // Movilidad
  {
    method: "GET",
    path: "/api/movilidad",
    description: "Matrices O-D interprovinciales de viajes diarios (Ministerio BigData, 2022+).",
    tier: "PRO",
    category: "movilidad",
  },
  {
    method: "GET",
    path: "/api/movilidad/corredores",
    description: "Top corredores por volumen de viajes: IMD, variación interanual, perfil horario.",
    tier: "PRO",
    category: "movilidad",
  },
  {
    method: "GET",
    path: "/api/estadisticas",
    description: "Estadísticas de transporte INE agrupadas por modo, año y provincia.",
    tier: "PRO",
    category: "movilidad",
  },
  // Seguridad vial
  {
    method: "GET",
    path: "/api/accidentes/microdata",
    description: "Microdatos de accidentes DGT con víctimas desde 2019 (500K registros). Paginado.",
    tier: "PRO",
    category: "seguridad",
  },
  {
    method: "GET",
    path: "/api/accidentes/hotspots",
    description: "Puntos negros de siniestralidad calculados por densidad kernel. GeoJSON.",
    tier: "PRO",
    category: "seguridad",
  },
  // Marítimo
  {
    method: "GET",
    path: "/api/maritimo",
    description: "Posiciones AIS de buques en aguas españolas: tipo, velocidad, rumbo. GeoJSON, buffer 48 h.",
    tier: "FREE",
    category: "maritimo",
  },
  {
    method: "GET",
    path: "/api/maritimo/ferries",
    description: "Rutas de ferry activas, paradas y horarios (Fred. Olsen, Baleària, Vizcaya).",
    tier: "FREE",
    category: "maritimo",
  },
  // Aviación
  {
    method: "GET",
    path: "/api/aviacion",
    description: "Posiciones en tiempo real de aeronaves sobre España (OpenSky). GeoJSON. Actualización 15 min.",
    tier: "PRO",
    category: "aviacion",
  },
  {
    method: "GET",
    path: "/api/aviacion/aeropuertos",
    description: "42 aeropuertos AENA con estadísticas de tráfico de pasajeros (Eurostat AVIA_PAOA).",
    tier: "PRO",
    category: "aviacion",
  },
  // Calidad del aire
  {
    method: "GET",
    path: "/api/calidad-aire",
    description: "Índice de Calidad del Aire (ICA) en 506 estaciones MITECO. Niveles 1-6, actualización horaria.",
    tier: "FREE",
    category: "calidad-aire",
  },
  // Búsqueda
  {
    method: "GET",
    path: "/api/search",
    description: "Búsqueda full-text sobre 26 colecciones Typesense: gasolineras, radares, estaciones, ZBE…",
    tier: "FREE",
    category: "busqueda",
  },
  {
    method: "GET",
    path: "/api/estaciones-aforo",
    description: "14.400+ estaciones de aforo del Ministerio. Coordenadas, IMD y tipo de carretera. GeoJSON.",
    tier: "FREE",
    category: "trafico",
  },
  {
    method: "GET",
    path: "/api/trafico/imd",
    description: "Segmentos de IMD con agrupación por provincia, carretera, año y tipo de vía.",
    tier: "PRO",
    category: "movilidad",
  },
  {
    method: "GET",
    path: "/api/transporte",
    description: "Operadores de transporte público (15+), rutas y paradas GTFS. Metro, bus, tram.",
    tier: "FREE",
    category: "busqueda",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_BADGE: Record<Tier, string> = {
  FREE: "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200",
  PRO: "bg-[color:var(--tl-primary)] text-white",
  ENTERPRISE: "bg-tl-amber-400 text-tl-amber-950",
};

const METHOD_BADGE: Record<Method, string> = {
  GET: "bg-tl-100 dark:bg-tl-800 text-tl-700 dark:text-tl-200",
  POST: "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EndpointCatalog() {
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">("all");
  const [activeTier, setActiveTier] = useState<Tier | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = ENDPOINTS.filter((ep) => {
    const catMatch = activeCategory === "all" || ep.category === activeCategory;
    const tierMatch = activeTier === "all" || ep.tier === activeTier;
    return catMatch && tierMatch;
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeCategory === "all"
                ? "bg-[color:var(--tl-primary)] text-white"
                : "bg-tl-100 dark:bg-tl-800 text-tl-600 dark:text-tl-300 hover:bg-tl-200 dark:hover:bg-tl-700"
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeCategory === cat.id
                    ? "bg-[color:var(--tl-primary)] text-white"
                    : "bg-tl-100 dark:bg-tl-800 text-tl-600 dark:text-tl-300 hover:bg-tl-200 dark:hover:bg-tl-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Tier filter */}
        <div className="flex gap-1.5 ml-auto">
          {(["all", "FREE", "PRO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTier(t)}
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeTier === t
                  ? t === "all"
                    ? "bg-gray-700 text-white"
                    : t === "FREE"
                      ? "bg-tl-600 text-white"
                      : "bg-[color:var(--tl-primary)] text-white"
                  : "bg-tl-100 dark:bg-tl-800 text-tl-600 dark:text-tl-300 hover:bg-tl-200 dark:hover:bg-tl-700"
              }`}
            >
              {t === "all" ? "Todos" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-tl-400 dark:text-tl-500 mb-3">
        Mostrando {filtered.length} de {ENDPOINTS.length} endpoints
      </p>

      {/* Endpoint list */}
      <div className="divide-y divide-tl-100 dark:divide-tl-800 border border-tl-200 dark:border-tl-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-tl-400 dark:text-tl-500">
            No hay endpoints con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((ep) => {
            const isOpen = expanded.has(ep.path);
            const catDef = CATEGORIES.find((c) => c.id === ep.category);
            const CatIcon = catDef?.icon ?? Car;

            return (
              <div
                key={ep.path}
                className="bg-white dark:bg-gray-900 hover:bg-tl-50 dark:hover:bg-tl-900/40 transition-colors"
              >
                <button
                  type="button"
                  className="w-full flex items-start gap-3 px-5 py-4 text-left"
                  onClick={() => toggleExpand(ep.path)}
                >
                  {/* Method badge */}
                  <span
                    className={`font-mono text-xs font-bold px-2 py-1 rounded flex-shrink-0 mt-0.5 ${METHOD_BADGE[ep.method]}`}
                  >
                    {ep.method}
                  </span>

                  {/* Path + description */}
                  <div className="flex-1 min-w-0">
                    <code className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                      {ep.path}
                    </code>
                    {isOpen && (
                      <p className="text-xs text-tl-500 dark:text-tl-400 mt-1.5 leading-relaxed">
                        {ep.description}
                      </p>
                    )}
                  </div>

                  {/* Category icon */}
                  <span className="flex-shrink-0 mt-0.5 text-tl-300 dark:text-tl-600" title={catDef?.label}>
                    <CatIcon className="w-4 h-4" />
                  </span>

                  {/* Tier badge */}
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${TIER_BADGE[ep.tier]}`}
                  >
                    {ep.tier}
                  </span>

                  {/* Expand toggle */}
                  <span className="flex-shrink-0 text-tl-400 mt-0.5">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Link to full docs */}
      <p className="text-xs text-center text-tl-400 dark:text-tl-500 mt-4">
        Documentación completa de los 121 endpoints en{" "}
        <a
          href="/api-docs"
          className="text-[color:var(--tl-primary)] hover:underline"
        >
          /api-docs
        </a>
      </p>
    </div>
  );
}
