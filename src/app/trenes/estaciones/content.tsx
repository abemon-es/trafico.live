"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import {
  Train,
  Search,
  Filter,
  Loader2,
  MapPin,
  Accessibility,
  ChevronDown,
  Info,
  Building2,
  Network,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string;
  stopId: string;
  code: string | null;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  serviceTypes: string[];
  network: string | null;
  province: string | null;
  provinceName: string | null;
  communityName: string | null;
  municipality: string | null;
  locationType: string | null;
  parentId: string | null;
  wheelchair: number | null;
}

interface StationsResponse {
  success: boolean;
  data: {
    stations: Station[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    stats: {
      totalStations: number;
    };
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NETWORKS = [
  { id: "", label: "Todas" },
  { id: "Madrid", label: "Madrid" },
  { id: "Barcelona", label: "Barcelona" },
  { id: "Valencia", label: "Valencia" },
  { id: "Sevilla", label: "Sevilla" },
  { id: "Málaga", label: "Málaga" },
  { id: "Bilbao", label: "Bilbao" },
  { id: "Asturias", label: "Asturias" },
  { id: "Santander", label: "Santander" },
  { id: "Cádiz", label: "Cádiz" },
  { id: "Murcia/Alicante", label: "Murcia/Alicante" },
  { id: "Zaragoza", label: "Zaragoza" },
  { id: "San Sebastián", label: "San Sebastián" },
];

const SERVICE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  CERCANIAS:     { label: "Cercanías",      color: "bg-tl-100 text-tl-700 dark:bg-tl-900 dark:text-tl-300" },
  AVE:           { label: "AVE",            color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  LARGA:         { label: "Larga Dist.",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  MEDIA:         { label: "Media Dist.",    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  REGIONAL:      { label: "Regional",       color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  METRO:         { label: "Metro",          color: "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300" },
  RODALIES:      { label: "Rodalies",       color: "bg-tl-100 text-tl-700 dark:bg-tl-900 dark:text-tl-300" },
  FEVE:          { label: "FEVE",           color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

const SORT_OPTIONS = [
  { value: "name", label: "Nombre" },
  { value: "network", label: "Red" },
  { value: "province", label: "Provincia" },
];

const PAGE_SIZE = 100;

// ─── Helper ───────────────────────────────────────────────────────────────────

function ServiceBadge({ type }: { type: string }) {
  const cfg = SERVICE_TYPE_LABELS[type];
  if (!cfg) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {type}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StationCard({ station }: { station: Station }) {
  return (
    <a
      href={`/trenes/estaciones/${station.slug}`}
      className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-tl-300 dark:hover:border-tl-700 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 truncate">
            {station.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {[station.municipality, station.provinceName].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
        {station.wheelchair === 1 && (
          <Accessibility className="w-4 h-4 text-tl-500 shrink-0 mt-0.5" aria-label="Accesible" />
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {station.serviceTypes.slice(0, 4).map((t) => (
          <ServiceBadge key={t} type={t} />
        ))}
      </div>
      {station.network && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Red: {station.network}
        </p>
      )}
    </a>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EstacionesTrenContent() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [network, setNetwork] = useState("");
  const [province, setProvince] = useState("");
  const [sort, setSort] = useState("name");
  const [offset, setOffset] = useState(0);
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
    setAllStations([]);
    const timer = setTimeout(() => setDebouncedSearch(value), 350);
    return () => clearTimeout(timer);
  }, []);

  // Build query string
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (network) p.set("serviceType", network);
    if (province) p.set("province", province);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }, [debouncedSearch, network, province, offset]);

  // Stats fetch (always with no filters, for the global counters)
  const { data: statsData } = useSWR<StationsResponse>(
    `/api/trenes/estaciones?limit=1&offset=0`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Main paginated fetch
  const { data, isLoading } = useSWR<StationsResponse>(
    `/api/trenes/estaciones?${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (newData) => {
        if (offset === 0) {
          setAllStations(newData.data.stations);
        } else {
          setAllStations((prev) => [...prev, ...newData.data.stations]);
        }
      },
    }
  );

  const totalFiltered = data?.data?.pagination?.total ?? 0;
  const totalGlobal = statsData?.data?.stats?.totalStations ?? 0;
  const hasMore = data?.data?.pagination?.hasMore ?? false;

  // Sort stations client-side
  const sorted = useMemo(() => {
    const list = [...allStations];
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else if (sort === "network") {
      list.sort((a, b) =>
        (a.network || "zzz").localeCompare(b.network || "zzz", "es")
      );
    } else if (sort === "province") {
      list.sort((a, b) =>
        (a.provinceName || "zzz").localeCompare(b.provinceName || "zzz", "es")
      );
    }
    return list;
  }, [allStations, sort]);

  // Count unique networks and provinces from current result
  const uniqueNetworks = useMemo(
    () => new Set(allStations.map((s) => s.network).filter(Boolean)).size,
    [allStations]
  );
  const uniqueProvinces = useMemo(
    () => new Set(allStations.map((s) => s.provinceName).filter(Boolean)).size,
    [allStations]
  );

  const handleNetworkFilter = (net: string) => {
    setNetwork(net);
    setOffset(0);
    setAllStations([]);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setNetwork("");
    setProvince("");
    setOffset(0);
    setAllStations([]);
  };

  const hasActiveFilters = debouncedSearch || network || province;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Estaciones de tren en España
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
          Directorio completo de{" "}
          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            {totalGlobal > 0 ? totalGlobal.toLocaleString("es-ES") : "—"}
          </span>{" "}
          estaciones ferroviarias en España: Cercanías, AVE, Larga y Media
          Distancia, Rodalies y redes autonómicas.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <Train className="w-5 h-5 text-tl-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estaciones</p>
            <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {totalGlobal > 0 ? totalGlobal.toLocaleString("es-ES") : "—"}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
          <Network className="w-5 h-5 text-tl-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Redes</p>
            <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {uniqueNetworks > 0 ? uniqueNetworks : "—"}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 col-span-2 sm:col-span-1">
          <Building2 className="w-5 h-5 text-tl-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Provincias</p>
            <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
              {uniqueProvinces > 0 ? uniqueProvinces : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Search + filter controls */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar estación por nombre..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Ordenar: {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown
                className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Expanded filter panel */}
        {filtersOpen && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Provincia
              </p>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setOffset(0);
                  setAllStations([]);
                }}
                className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500"
              >
                <option value="">Todas las provincias</option>
                {PROVINCE_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Network filter chips */}
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNetworkFilter(n.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                network === n.id
                  ? "bg-tl-600 text-white dark:bg-tl-500 dark:text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-tl-100 dark:hover:bg-tl-900/40 hover:text-tl-700 dark:hover:text-tl-300"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Active filter summary + clear */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {totalFiltered.toLocaleString("es-ES")} resultado
              {totalFiltered !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearFilters}
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && allStations.length === 0 && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Mobile: cards / Desktop: table */}
      {sorted.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 sm:hidden">
            {sorted.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Train className="w-5 h-5 text-tl-500" />
                Listado de estaciones
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({sorted.length.toLocaleString("es-ES")}{" "}
                  {hasMore ? `de ${totalFiltered.toLocaleString("es-ES")}` : ""})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Estación
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Red
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Provincia
                    </th>
                    <th className="text-left py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Servicios
                    </th>
                    <th className="text-center py-2.5 px-3 font-medium text-gray-700 dark:text-gray-300">
                      Accesibilidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((station, idx) => (
                    <tr
                      key={station.id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${
                        idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-800/20"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <a
                          href={`/trenes/estaciones/${station.slug}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-[var(--tl-primary)] transition-colors"
                        >
                          {station.name}
                        </a>
                        {station.municipality && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {station.municipality}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                        {station.network || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                        {station.provinceName || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {station.serviceTypes.slice(0, 3).map((t) => (
                            <ServiceBadge key={t} type={t} />
                          ))}
                          {station.serviceTypes.length > 3 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              +{station.serviceTypes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {station.wheelchair === 1 ? (
                          <Accessibility
                            className="w-4 h-4 text-tl-500 mx-auto"
                            aria-label="Accesible"
                          />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700" aria-hidden="true">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Train className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No se encontraron estaciones</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Load more */}
      {hasMore && sorted.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-600 dark:hover:text-tl-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Cargar más estaciones
          </button>
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <Info className="w-3 h-3 shrink-0" />
        Datos: Renfe Viajeros, GTFS operadores regionales — Red Ferroviaria Española
      </p>
    </div>
  );
}

// ─── Province options ─────────────────────────────────────────────────────────

const PROVINCE_OPTIONS = [
  { code: "01", name: "Álava" },
  { code: "02", name: "Albacete" },
  { code: "03", name: "Alicante" },
  { code: "04", name: "Almería" },
  { code: "05", name: "Ávila" },
  { code: "06", name: "Badajoz" },
  { code: "07", name: "Baleares" },
  { code: "08", name: "Barcelona" },
  { code: "09", name: "Burgos" },
  { code: "10", name: "Cáceres" },
  { code: "11", name: "Cádiz" },
  { code: "12", name: "Castellón" },
  { code: "13", name: "Ciudad Real" },
  { code: "14", name: "Córdoba" },
  { code: "15", name: "A Coruña" },
  { code: "16", name: "Cuenca" },
  { code: "17", name: "Girona" },
  { code: "18", name: "Granada" },
  { code: "19", name: "Guadalajara" },
  { code: "20", name: "Gipuzkoa" },
  { code: "21", name: "Huelva" },
  { code: "22", name: "Huesca" },
  { code: "23", name: "Jaén" },
  { code: "24", name: "León" },
  { code: "25", name: "Lleida" },
  { code: "26", name: "La Rioja" },
  { code: "27", name: "Lugo" },
  { code: "28", name: "Madrid" },
  { code: "29", name: "Málaga" },
  { code: "30", name: "Murcia" },
  { code: "31", name: "Navarra" },
  { code: "32", name: "Ourense" },
  { code: "33", name: "Asturias" },
  { code: "34", name: "Palencia" },
  { code: "35", name: "Las Palmas" },
  { code: "36", name: "Pontevedra" },
  { code: "37", name: "Salamanca" },
  { code: "38", name: "Santa Cruz de Tenerife" },
  { code: "39", name: "Cantabria" },
  { code: "40", name: "Segovia" },
  { code: "41", name: "Sevilla" },
  { code: "42", name: "Soria" },
  { code: "43", name: "Tarragona" },
  { code: "44", name: "Teruel" },
  { code: "45", name: "Toledo" },
  { code: "46", name: "Valencia" },
  { code: "47", name: "Valladolid" },
  { code: "48", name: "Bizkaia" },
  { code: "49", name: "Zamora" },
  { code: "50", name: "Zaragoza" },
  { code: "51", name: "Ceuta" },
  { code: "52", name: "Melilla" },
];
