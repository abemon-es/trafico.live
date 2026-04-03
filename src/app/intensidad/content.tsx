"use client";

import { fetcher } from "@/lib/fetcher";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BarChart3,
  TrendingUp,
  Map,
  Filter,
  ChevronRight,
  Info,
  Loader2,
  ArrowUpDown,
} from "lucide-react";

const IntensityMap = dynamic(() => import("./intensity-map"), { ssr: false });
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrafficComparison } from "@/components/stats/TrafficComparison";


interface ProvinceData {
  province: string;
  provinceName: string;
  recordCount: number;
  avgIMD: number;
  maxIMD: number;
  avgPercentPesados: number | null;
}

interface RoadTypeData {
  roadType: string;
  recordCount: number;
  avgIMD: number;
  maxIMD: number;
  minIMD: number;
  avgPercentPesados: number | null;
}

interface RoadData {
  roadNumber: string;
  roadType: string | null;
  segmentCount: number;
  avgIMD: number;
  maxIMD: number;
  avgPercentPesados: number | null;
}

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopistas",
  AUTOVIA: "Autovías",
  NACIONAL: "Nacionales",
  COMARCAL: "Comarcales",
  PROVINCIAL: "Provinciales",
  OTHER: "Otras",
};

const ROAD_TYPE_COLORS: Record<string, string> = {
  AUTOPISTA: "#7c3aed",
  AUTOVIA: "#1b4bd5",
  NACIONAL: "#059669",
  COMARCAL: "#d97706",
  PROVINCIAL: "#6b7280",
  OTHER: "#9ca3af",
};

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

export default function IntensidadContent() {
  const [yearFilter, setYearFilter] = useState("");
  const [sortField, setSortField] = useState<"avgIMD" | "maxIMD" | "recordCount">("avgIMD");

  const yearParam = yearFilter ? `&year=${yearFilter}` : "";

  const { data: byProvince, isLoading: loadingProv } = useSWR(
    `/api/trafico/imd?groupBy=province${yearParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: byRoadType, isLoading: loadingType } = useSWR(
    `/api/trafico/imd?groupBy=roadType${yearParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: byRoad, isLoading: loadingRoad } = useSWR(
    `/api/trafico/imd?groupBy=road${yearParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: byYear } = useSWR(
    `/api/trafico/imd?groupBy=year`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const provinces: ProvinceData[] = byProvince?.data?.results || [];
  const roadTypes: RoadTypeData[] = byRoadType?.data?.results || [];
  const roads: RoadData[] = byRoad?.data?.results || [];
  const years: { year: number; recordCount: number; avgIMD: number }[] =
    byYear?.data?.results || [];

  const sortedProvinces = [...provinces].sort((a, b) => b[sortField] - a[sortField]);

  // Top 20 provinces for the bar chart
  const chartData = sortedProvinces.slice(0, 20).map((p) => ({
    name: p.provinceName || p.province,
    imd: p.avgIMD,
    maxIMD: p.maxIMD,
  }));

  const isLoading = loadingProv || loadingType || loadingRoad;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Intensidad de Tráfico
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Intensidad Media Diaria (IMD) del tráfico en la Red de Carreteras del Estado.
          Datos oficiales del Ministerio de Transportes y Movilidad Sostenible.
        </p>
      </div>

      {/* Live vs normal comparison */}
      <TrafficComparison className="mb-6" />

      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos los años</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
        <Link
          href="/estaciones-aforo"
          className="text-sm text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1"
        >
          <Map className="w-4 h-4" /> Ver mapa de estaciones
        </Link>
      </div>

      {/* Sensor + station map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 mb-8">
        <IntensityMap height="450px" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-tl-500" />
        </div>
      ) : (
        <>
          {/* Road Type Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {roadTypes.map((rt) => (
              <div
                key={rt.roadType}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ROAD_TYPE_COLORS[rt.roadType] || "#9ca3af" }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {ROAD_TYPE_LABELS[rt.roadType] || rt.roadType}
                  </span>
                </div>
                <p className="text-xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                  {formatNumber(rt.avgIMD)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  IMD medio · {formatNumber(rt.recordCount)} tramos
                </p>
              </div>
            ))}
          </div>

          {/* Year Evolution */}
          {years.length > 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-tl-500" />
                Evolución anual del IMD
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={years}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "IMD medio"]}
                    labelFormatter={(label) => `Año ${label}`}
                  />
                  <Bar dataKey="avgIMD" fill="#1b4bd5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Province Comparison Chart */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-tl-500" />
                IMD medio por provincia
              </h2>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "IMD medio"]}
                  />
                  <Bar dataKey="imd" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx < 5 ? "#1b4bd5" : idx < 10 ? "#366cf8" : "#94b6ff"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Roads Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-tl-500" />
                Carreteras con mayor tráfico
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">#</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Carretera</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Tipo</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD medio</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD máx</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Tramos</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">% Pesados</th>
                  </tr>
                </thead>
                <tbody>
                  {roads.slice(0, 30).map((r, idx) => (
                    <tr key={r.roadNumber} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/carreteras/${r.roadNumber}`}
                          className="font-medium text-tl-600 dark:text-tl-400 hover:underline"
                        >
                          {r.roadNumber}
                        </Link>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${ROAD_TYPE_COLORS[r.roadType || "OTHER"]}20`,
                            color: ROAD_TYPE_COLORS[r.roadType || "OTHER"],
                          }}
                        >
                          {ROAD_TYPE_LABELS[r.roadType || "OTHER"] || r.roadType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {formatNumber(r.avgIMD)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatNumber(r.maxIMD)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                        {r.segmentCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {r.avgPercentPesados != null ? `${r.avgPercentPesados.toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Province Detail Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                IMD por provincia
              </h2>
              <div className="flex gap-2">
                {(["avgIMD", "maxIMD", "recordCount"] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => setSortField(field)}
                    className={`text-xs px-2 py-1 rounded ${
                      sortField === field
                        ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {field === "avgIMD" ? "IMD medio" : field === "maxIMD" ? "IMD máx" : "Tramos"}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Provincia</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD medio</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD máx</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Tramos</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">% Pesados</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProvinces.map((p) => (
                    <tr key={p.province} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium">{p.provinceName || p.province}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {formatNumber(p.avgIMD)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatNumber(p.maxIMD)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                        {p.recordCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {p.avgPercentPesados != null ? `${p.avgPercentPesados.toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
        <Info className="w-3 h-3" />
        Datos: Ministerio de Transportes y Movilidad Sostenible — Mapa de Tráfico de la Red de Carreteras del Estado
      </p>
    </div>
  );
}
