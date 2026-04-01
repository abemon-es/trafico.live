"use client";

import { fetcher } from "@/lib/fetcher";
import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  Loader2,
  Filter,
  BarChart3,
  Radio,
  ChevronDown,
  Info,
} from "lucide-react";

const StationMap = dynamic(() => import("./station-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center rounded-lg">
      <MapIcon className="w-12 h-12 text-gray-400" />
    </div>
  ),
});


interface Station {
  id: string;
  stationCode: string;
  province: string | null;
  provinceName: string | null;
  roadNumber: string;
  roadType: string | null;
  kmPoint: number;
  stationType: string | null;
  population: string | null;
  latitude: number;
  longitude: number;
  year: number;
  imd: number | null;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: number | null;
}

interface StationsResponse {
  success: boolean;
  data: {
    stations: Station[];
    pagination: { total: number; hasMore: boolean };
    stats: {
      totalStations: number;
      avgIMD: number;
      maxIMD: number | null;
      minIMD: number | null;
      byType: Record<string, number>;
    };
  };
}

const STATION_TYPE_LABELS: Record<string, string> = {
  PERMANENT: "Permanente",
  SEMI_PERMANENT: "Semipermanente",
  PRIMARY: "Primaria",
  SECONDARY: "Secundaria",
  COVERAGE: "Cobertura",
};

function imdColor(imd: number | null): string {
  if (!imd) return "bg-gray-200 dark:bg-gray-700";
  if (imd >= 100000) return "bg-red-500";
  if (imd >= 50000) return "bg-orange-500";
  if (imd >= 20000) return "bg-yellow-500";
  if (imd >= 10000) return "bg-green-500";
  if (imd >= 5000) return "bg-tl-500";
  return "bg-tl-300";
}

function imdLabel(imd: number | null): string {
  if (!imd) return "Sin datos";
  if (imd >= 100000) return "Muy alto";
  if (imd >= 50000) return "Alto";
  if (imd >= 20000) return "Medio-alto";
  if (imd >= 10000) return "Medio";
  if (imd >= 5000) return "Medio-bajo";
  return "Bajo";
}

export default function EstacionesAforoContent() {
  const [province, setProvince] = useState("");
  const [road, setRoad] = useState("");
  const [stationType, setStationType] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const filterParams = new URLSearchParams();
  if (province) filterParams.set("province", province);
  if (road) filterParams.set("road", road);
  if (stationType) filterParams.set("type", stationType);

  // GeoJSON for map (lightweight, all stations with coords only)
  const mapParams = new URLSearchParams(filterParams);
  mapParams.set("format", "geojson");
  mapParams.set("limit", "3000");
  const { data: geoData, isLoading: mapLoading } = useSWR(
    `/api/estaciones-aforo?${mapParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Paginated JSON for table + stats (only 100 rows)
  const tableParams = new URLSearchParams(filterParams);
  tableParams.set("limit", "100");
  const { data, isLoading: tableLoading } = useSWR<StationsResponse>(
    `/api/estaciones-aforo?${tableParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = mapLoading || tableLoading;
  const stations = data?.data?.stations || [];
  const stats = data?.data?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Estaciones de Aforo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Red de {stats?.totalStations?.toLocaleString("es-ES") || "3.458"} estaciones de medición de tráfico en la Red de Carreteras del Estado.
          Datos de Intensidad Media Diaria (IMD) del Ministerio de Transportes.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Estaciones</p>
            <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">
              {stats.totalStations.toLocaleString("es-ES")}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">IMD medio</p>
            <p className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 font-mono">
              {stats.avgIMD.toLocaleString("es-ES")}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">IMD máximo</p>
            <p className="text-2xl font-heading font-bold text-tl-600 dark:text-tl-400 font-mono">
              {stats.maxIMD?.toLocaleString("es-ES") || "-"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Por tipo</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(stats.byType).map(([type, count]) => (
                <span
                  key={type}
                  className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  {STATION_TYPE_LABELS[type] || type}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Carretera (ej: A-1)"
            value={road}
            onChange={(e) => setRoad(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-tl-500 focus:border-transparent"
          />
        </div>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todas las provincias</option>
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={stationType}
          onChange={(e) => setStationType(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(STATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 mb-8">
        {isLoading ? (
          <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-tl-500" />
          </div>
        ) : (
          <StationMap
            stations={stations}
            geojson={geoData}
            onStationClick={setSelectedStation}
            selectedStation={selectedStation}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">IMD (veh/día):</span>
        {[
          { label: "<5.000", color: "bg-tl-300" },
          { label: "5k–10k", color: "bg-tl-500" },
          { label: "10k–20k", color: "bg-green-500" },
          { label: "20k–50k", color: "bg-yellow-500" },
          { label: "50k–100k", color: "bg-orange-500" },
          { label: ">100k", color: "bg-red-500" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>

      {/* Selected Station Detail */}
      {selectedStation && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-200 dark:border-tl-800 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
                {selectedStation.roadNumber} · km {selectedStation.kmPoint.toFixed(1)}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Estación {selectedStation.stationCode}
                {selectedStation.population && ` · ${selectedStation.population}`}
                {selectedStation.provinceName && ` · ${selectedStation.provinceName}`}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${imdColor(selectedStation.imd)}`}>
              {imdLabel(selectedStation.imd)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">IMD total</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.imd?.toLocaleString("es-ES") || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ligeros</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.imdLigeros?.toLocaleString("es-ES") || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pesados</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.imdPesados?.toLocaleString("es-ES") || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">% Pesados</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">
                {selectedStation.percentPesados != null
                  ? `${selectedStation.percentPesados.toFixed(1)}%`
                  : "-"}
              </p>
            </div>
          </div>
          {selectedStation.stationType && (
            <p className="text-xs text-gray-400 mt-3">
              Tipo: {STATION_TYPE_LABELS[selectedStation.stationType] || selectedStation.stationType}
              {selectedStation.year && ` · Datos de ${selectedStation.year}`}
            </p>
          )}
        </div>
      )}

      {/* Stations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-tl-500" />
            Listado de estaciones
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({stations.length.toLocaleString("es-ES")} resultados)
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Estación</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Carretera</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Provincia</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Ligeros</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Pesados</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">% Pesados</th>
              </tr>
            </thead>
            <tbody>
              {stations.slice(0, 100).map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => setSelectedStation(s)}
                >
                  <td className="py-2 px-3">
                    <span className="font-mono text-xs">{s.stationCode}</span>
                  </td>
                  <td className="py-2 px-3 font-medium">{s.roadNumber} km {s.kmPoint.toFixed(1)}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{s.provinceName || "-"}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium">
                    {s.imd?.toLocaleString("es-ES") || "-"}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                    {s.imdLigeros?.toLocaleString("es-ES") || "-"}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                    {s.imdPesados?.toLocaleString("es-ES") || "-"}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                    {s.percentPesados != null ? `${s.percentPesados.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stations.length > 100 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">
              Mostrando 100 de {stations.length.toLocaleString("es-ES")} estaciones
            </p>
          )}
        </div>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
        <Info className="w-3 h-3" />
        Datos: Ministerio de Transportes y Movilidad Sostenible — Red de Carreteras del Estado
      </p>
    </div>
  );
}

const PROVINCE_OPTIONS = [
  { code: "01", name: "Álava" }, { code: "02", name: "Albacete" },
  { code: "03", name: "Alicante" }, { code: "04", name: "Almería" },
  { code: "05", name: "Ávila" }, { code: "06", name: "Badajoz" },
  { code: "07", name: "Baleares" }, { code: "08", name: "Barcelona" },
  { code: "09", name: "Burgos" }, { code: "10", name: "Cáceres" },
  { code: "11", name: "Cádiz" }, { code: "12", name: "Castellón" },
  { code: "13", name: "Ciudad Real" }, { code: "14", name: "Córdoba" },
  { code: "15", name: "A Coruña" }, { code: "16", name: "Cuenca" },
  { code: "17", name: "Girona" }, { code: "18", name: "Granada" },
  { code: "19", name: "Guadalajara" }, { code: "20", name: "Gipuzkoa" },
  { code: "21", name: "Huelva" }, { code: "22", name: "Huesca" },
  { code: "23", name: "Jaén" }, { code: "24", name: "León" },
  { code: "25", name: "Lleida" }, { code: "26", name: "La Rioja" },
  { code: "27", name: "Lugo" }, { code: "28", name: "Madrid" },
  { code: "29", name: "Málaga" }, { code: "30", name: "Murcia" },
  { code: "31", name: "Navarra" }, { code: "32", name: "Ourense" },
  { code: "33", name: "Asturias" }, { code: "34", name: "Palencia" },
  { code: "35", name: "Las Palmas" }, { code: "36", name: "Pontevedra" },
  { code: "37", name: "Salamanca" }, { code: "38", name: "Santa Cruz de Tenerife" },
  { code: "39", name: "Cantabria" }, { code: "40", name: "Segovia" },
  { code: "41", name: "Sevilla" }, { code: "42", name: "Soria" },
  { code: "43", name: "Tarragona" }, { code: "44", name: "Teruel" },
  { code: "45", name: "Toledo" }, { code: "46", name: "Valencia" },
  { code: "47", name: "Valladolid" }, { code: "48", name: "Bizkaia" },
  { code: "49", name: "Zamora" }, { code: "50", name: "Zaragoza" },
  { code: "51", name: "Ceuta" }, { code: "52", name: "Melilla" },
];
