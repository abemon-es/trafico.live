"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  Train,
  Loader2,
  AlertTriangle,
  Search,
  X,
  ArrowRight,
  Route,
  Network,
  LayoutGrid,
  List,
  Info,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Brand / service type config
// ──────────────────────────────────────────────────────────────

interface BrandConfig {
  label: string;
  color: string;
  textColor: string;
  serviceTypes: string[];
  description: string;
}

const BRAND_CONFIG: Record<string, BrandConfig> = {
  AVE: {
    label: "AVE",
    color: "#6b21a8",
    textColor: "#ffffff",
    serviceTypes: ["AVE"],
    description: "Alta Velocidad Española",
  },
  AVLO: {
    label: "AVLO",
    color: "#7c3aed",
    textColor: "#ffffff",
    serviceTypes: ["AVLO"],
    description: "AVE de bajo coste",
  },
  Alvia: {
    label: "Alvia",
    color: "#d48139",
    textColor: "#ffffff",
    serviceTypes: ["ALVIA"],
    description: "Alta velocidad + anchos",
  },
  Avant: {
    label: "Avant",
    color: "#7c3aed",
    textColor: "#ffffff",
    serviceTypes: ["AVANT"],
    description: "Media distancia en AVE",
  },
  Euromed: {
    label: "Euromed",
    color: "#0891b2",
    textColor: "#ffffff",
    serviceTypes: ["EUROMED"],
    description: "Corredor mediterráneo",
  },
  Intercity: {
    label: "Intercity",
    color: "#4b5563",
    textColor: "#ffffff",
    serviceTypes: ["INTERCITY"],
    description: "Larga distancia convencional",
  },
  "Larga Distancia": {
    label: "Larga Distancia",
    color: "#374151",
    textColor: "#ffffff",
    serviceTypes: ["LARGA_DISTANCIA"],
    description: "Servicios de larga distancia",
  },
  "Media Distancia": {
    label: "Media Distancia",
    color: "#366cf8",
    textColor: "#ffffff",
    serviceTypes: ["MEDIA_DISTANCIA"],
    description: "Servicios regionales principales",
  },
  Regional: {
    label: "Regional",
    color: "#6b7280",
    textColor: "#ffffff",
    serviceTypes: ["REGIONAL", "REGIONAL_EXPRESS"],
    description: "Servicios de ámbito regional",
  },
  "Cercanías": {
    label: "Cercanías",
    color: "#059669",
    textColor: "#ffffff",
    serviceTypes: ["CERCANIAS", "PROXIMIDAD"],
    description: "Red de cercanías urbanas",
  },
  Rodalies: {
    label: "Rodalies",
    color: "#059669",
    textColor: "#ffffff",
    serviceTypes: ["RODALIES"],
    description: "Cercanías de Cataluña",
  },
  TrenHotel: {
    label: "TrenHotel",
    color: "#1e3a5f",
    textColor: "#ffffff",
    serviceTypes: ["TRENHOTEL"],
    description: "Trenes nocturnos",
  },
  "Tren Celta": {
    label: "Tren Celta",
    color: "#065f46",
    textColor: "#ffffff",
    serviceTypes: ["TRENCELTA"],
    description: "Servicio internacional con Portugal",
  },
  FEVE: {
    label: "FEVE",
    color: "#92400e",
    textColor: "#ffffff",
    serviceTypes: ["FEVE"],
    description: "Ferrocarriles de vía estrecha",
  },
};

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface RailwayRoute {
  id: string;
  routeId: string;
  slug: string;
  shortName: string;
  longName: string;
  brand: string | null;
  serviceType: string;
  color: string | null;
  textColor: string | null;
  originName: string | null;
  originCode: string | null;
  destName: string | null;
  destCode: string | null;
  network: string | null;
  stopsCount: number | null;
  tripCount: number | null;
}

interface ApiResponse {
  success: boolean;
  data: {
    routes: RailwayRoute[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    stats: {
      totalRoutes: number;
      byServiceType: Record<string, number>;
      byNetwork: Record<string, number>;
      byBrand: Record<string, number>;
    };
  };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function resolveBrandKey(route: RailwayRoute): string {
  if (route.brand) {
    for (const [key, cfg] of Object.entries(BRAND_CONFIG)) {
      if (key.toLowerCase() === route.brand.toLowerCase()) return key;
      if (cfg.label.toLowerCase() === route.brand.toLowerCase()) return key;
    }
  }
  for (const [key, cfg] of Object.entries(BRAND_CONFIG)) {
    if (cfg.serviceTypes.includes(route.serviceType)) return key;
  }
  return "Regional";
}

function routeDisplayColor(route: RailwayRoute): string {
  if (route.color) return `#${route.color.replace("#", "")}`;
  const key = resolveBrandKey(route);
  return BRAND_CONFIG[key]?.color ?? "#6b7280";
}

function routeDisplayName(route: RailwayRoute): string {
  if (route.shortName && route.shortName.trim()) return route.shortName;
  return route.routeId;
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function ServiceTypeBadge({ serviceType }: { serviceType: string }) {
  const label = serviceType.replace(/_/g, " ");
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
      {label}
    </span>
  );
}

function BrandCard({
  brandKey,
  config,
  count,
  routes,
  isSelected,
  onClick,
}: {
  brandKey: string;
  config: BrandConfig;
  count: number;
  routes: RailwayRoute[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const exampleRoutes = routes.slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left w-full rounded-xl border transition-all duration-150 overflow-hidden",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tl-primary)]",
        isSelected
          ? "border-[var(--tl-primary)] ring-2 ring-[var(--tl-primary)] shadow-md"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
      ].join(" ")}
    >
      {/* Color accent header */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2"
        style={{ backgroundColor: config.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Train className="w-4 h-4 flex-shrink-0" style={{ color: config.textColor }} />
          <span
            className="font-heading font-bold text-base leading-tight truncate"
            style={{ color: config.textColor }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="font-mono font-bold text-lg leading-none flex-shrink-0"
          style={{ color: config.textColor, opacity: 0.9 }}
        >
          {count}
        </span>
      </div>

      {/* Card body */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 space-y-2.5">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{config.description}</p>

        {exampleRoutes.length > 0 ? (
          <ul className="space-y-1">
            {exampleRoutes.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 min-w-0"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="truncate">
                  {r.originName ? (
                    <>
                      {r.originName}
                      {r.destName && (
                        <>
                          <ArrowRight className="inline w-2.5 h-2.5 mx-0.5 text-gray-400" />
                          {r.destName}
                        </>
                      )}
                    </>
                  ) : (
                    r.longName || r.shortName || r.routeId
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin rutas disponibles</p>
        )}

        {isSelected && (
          <span className="inline-block text-[10px] font-semibold text-[var(--tl-primary)] uppercase tracking-wide">
            Filtro activo
          </span>
        )}
      </div>
    </button>
  );
}

function RouteRow({ route }: { route: RailwayRoute }) {
  const color = routeDisplayColor(route);
  const name = routeDisplayName(route);

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Marca */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: color, color: "#fff" }}
          >
            {name}
          </span>
          <ServiceTypeBadge serviceType={route.serviceType} />
        </div>
      </td>

      {/* Origen → Destino */}
      <td className="px-4 py-3">
        {route.originName || route.destName ? (
          <span className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200 min-w-0">
            <span className="font-medium truncate max-w-[140px]">{route.originName ?? "—"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate max-w-[140px]">{route.destName ?? "—"}</span>
          </span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400 italic truncate max-w-xs block">
            {route.longName ?? "—"}
          </span>
        )}
      </td>

      {/* Red */}
      <td className="px-4 py-3 whitespace-nowrap">
        {route.network ? (
          <span className="text-xs text-gray-600 dark:text-gray-400">{route.network}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Paradas */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {route.stopsCount != null ? route.stopsCount : "—"}
        </span>
      </td>

      {/* Trenes/día */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          {route.tripCount != null ? route.tripCount : "—"}
        </span>
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────

export default function LineasContent() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useSWR<ApiResponse>(
    `/api/trenes/rutas?limit=500`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const allRoutes: RailwayRoute[] = data?.data?.routes ?? [];
  const stats = data?.data?.stats;
  const totalRoutes = data?.data?.pagination?.total ?? 0;

  const brandRoutes = useMemo<Record<string, RailwayRoute[]>>(() => {
    const map: Record<string, RailwayRoute[]> = {};
    for (const route of allRoutes) {
      const key = resolveBrandKey(route);
      if (!map[key]) map[key] = [];
      map[key].push(route);
    }
    return map;
  }, [allRoutes]);

  const brandCount = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const [key, routes] of Object.entries(brandRoutes)) {
      counts[key] = routes.length;
    }
    return counts;
  }, [brandRoutes]);

  const activeBrands = Object.keys(BRAND_CONFIG).filter(
    (k) => (brandCount[k] ?? 0) > 0
  );

  const networkCount = stats ? Object.keys(stats.byNetwork).length : 0;
  const brandTotalCount = activeBrands.length;

  const filteredRoutes = useMemo<RailwayRoute[]>(() => {
    let base = allRoutes;
    if (selectedBrand) {
      base = brandRoutes[selectedBrand] ?? [];
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (r) =>
          r.originName?.toLowerCase().includes(q) ||
          r.destName?.toLowerCase().includes(q) ||
          r.longName?.toLowerCase().includes(q) ||
          r.shortName?.toLowerCase().includes(q) ||
          r.network?.toLowerCase().includes(q)
      );
    }
    return base;
  }, [allRoutes, brandRoutes, selectedBrand, search]);

  const handleBrandClick = useCallback((key: string) => {
    setSelectedBrand((prev) => (prev === key ? null : key));
    setSearch("");
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedBrand(null);
    setSearch("");
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="text-sm">Cargando catálogo de líneas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
        <AlertTriangle className="w-8 h-8 text-[var(--tl-danger)]" />
        <p className="text-sm">No se han podido cargar las líneas. Inténtalo de nuevo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Líneas y marcas de tren
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          Catálogo completo de servicios ferroviarios operados por Renfe en España. Selecciona una
          marca para filtrar las rutas.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            icon: Route,
            label: "Líneas totales",
            value: totalRoutes.toLocaleString("es-ES"),
            color: "text-[var(--tl-primary)]",
          },
          {
            icon: LayoutGrid,
            label: "Marcas",
            value: brandTotalCount.toString(),
            color: "text-[var(--tl-warning)]",
          },
          {
            icon: Network,
            label: "Redes",
            value: networkCount.toString(),
            color: "text-[var(--tl-success)]",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </div>
            <p className={`font-heading font-bold text-2xl font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Brand cards grid */}
      <section>
        <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg mb-4 flex items-center gap-2">
          <Train className="w-5 h-5 text-[var(--tl-primary)]" />
          Marcas y servicios
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(BRAND_CONFIG).map(([key, cfg]) => {
            const count = brandCount[key] ?? 0;
            if (count === 0) return null;
            return (
              <BrandCard
                key={key}
                brandKey={key}
                config={cfg}
                count={count}
                routes={(brandRoutes[key] ?? []).slice(0, 3)}
                isSelected={selectedBrand === key}
                onClick={() => handleBrandClick(key)}
              />
            );
          })}
        </div>
      </section>

      {/* Route table */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-lg flex items-center gap-2">
            <List className="w-5 h-5 text-[var(--tl-primary)]" />
            {selectedBrand
              ? `Líneas de ${BRAND_CONFIG[selectedBrand]?.label ?? selectedBrand}`
              : "Todas las líneas"}
            <span className="font-mono text-sm font-normal text-gray-500 dark:text-gray-400">
              ({filteredRoutes.length.toLocaleString("es-ES")})
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar origen o destino..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--tl-primary)] w-52"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(selectedBrand || search) && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Active filter chip */}
        {selectedBrand && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Filtro activo:</span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: BRAND_CONFIG[selectedBrand]?.color }}
            >
              {BRAND_CONFIG[selectedBrand]?.label}
              <button
                type="button"
                onClick={clearFilters}
                className="hover:opacity-70 transition-opacity"
                aria-label="Eliminar filtro de marca"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Route className="w-8 h-8" />
              <p className="text-sm">No se encontraron líneas con los filtros actuales.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-[var(--tl-primary)] hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Marca
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Origen — Destino
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Red
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Paradas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Trenes/día
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((route) => (
                    <RouteRow key={route.id} route={route} />
                  ))}
                </tbody>
              </table>

              {filteredRoutes.length >= 500 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Mostrando las primeras 500 líneas. Usa el buscador para acotar los resultados.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Attribution */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <Info className="w-3 h-3 flex-shrink-0" />
        Fuente: Renfe Operadora (GTFS, CC-BY 4.0). Datos actualizados semanalmente.
      </p>
    </div>
  );
}
