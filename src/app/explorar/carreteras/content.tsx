"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Route,
  AlertTriangle,
  Loader2,
  Camera,
  Radar,
  TrendingUp,
  Filter,
  ChevronRight,
  Car,
} from "lucide-react";

interface RoadStats {
  roadName: string;
  incidentCount: number;
  v16Count: number;
  cameraCount: number;
  radarCount: number;
  avgIMD: number | null;
  riskScore: number | null;
}

interface RoadsResponse {
  success: boolean;
  roads: RoadStats[];
  summary: {
    totalRoads: number;
    totalIncidents: number;
    avgIMD: number;
    byType: Record<string, number>;
  };
}

interface RankingsResponse {
  success: boolean;
  roads: {
    byIncidentsTotal: Array<{ roadName: string; totalIncidents: number }>;
    byRiskScore: Array<{ roadName: string; riskScore: number }>;
    byIMD: Array<{ roadName: string; avgIMD: number }>;
    mostDangerous: Array<{ roadName: string; riskScore: number; incidentsPerKm: number }>;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Road type categories
const ROAD_TYPES = [
  { prefix: "AP-", label: "Autopistas de peaje", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { prefix: "A-", label: "Autovías", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { prefix: "N-", label: "Carreteras Nacionales", color: "bg-green-100 text-green-700 border-green-200" },
  { prefix: "M-", label: "Madrid (Circunvalación)", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { prefix: "B-", label: "Barcelona", color: "bg-red-100 text-red-700 border-red-200" },
  { prefix: "C-", label: "Comarcales", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

function getRoadType(roadName: string): string {
  for (const type of ROAD_TYPES) {
    if (roadName.startsWith(type.prefix)) {
      return type.prefix;
    }
  }
  return "OTHER";
}

function getRoadTypeInfo(prefix: string) {
  return ROAD_TYPES.find((t) => t.prefix === prefix) || {
    prefix: "OTHER",
    label: "Otras carreteras",
    color: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

export default function CarreterasContent() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "incidents" | "risk" | "imd">("incidents");

  const { data: rankingsData, isLoading: rankingsLoading } = useSWR<RankingsResponse>(
    "/api/rankings",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: incidentsData, isLoading: incidentsLoading } = useSWR<{ count: number; byRoad: Record<string, number> }>(
    "/api/incidencias?active=true",
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = rankingsLoading || incidentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de carreteras...</span>
        </div>
      </div>
    );
  }

  // Build road list from rankings data
  const roadList: RoadStats[] = [];
  const roadMap = new Map<string, RoadStats>();

  // Add roads from rankings
  if (rankingsData?.roads) {
    for (const road of rankingsData.roads.byIncidentsTotal || []) {
      if (!roadMap.has(road.roadName)) {
        roadMap.set(road.roadName, {
          roadName: road.roadName,
          incidentCount: road.totalIncidents,
          v16Count: 0,
          cameraCount: 0,
          radarCount: 0,
          avgIMD: null,
          riskScore: null,
        });
      }
    }

    for (const road of rankingsData.roads.byRiskScore || []) {
      const existing = roadMap.get(road.roadName);
      if (existing) {
        existing.riskScore = road.riskScore;
      }
    }

    for (const road of rankingsData.roads.byIMD || []) {
      const existing = roadMap.get(road.roadName);
      if (existing) {
        existing.avgIMD = road.avgIMD;
      }
    }
  }

  // Convert map to array
  roadMap.forEach((road) => roadList.push(road));

  // Group by type
  const roadsByType: Record<string, RoadStats[]> = {};
  for (const road of roadList) {
    const type = getRoadType(road.roadName);
    if (!roadsByType[type]) {
      roadsByType[type] = [];
    }
    roadsByType[type].push(road);
  }

  // Sort roads within each type
  const sortRoads = (roads: RoadStats[]) => {
    return [...roads].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.roadName.localeCompare(b.roadName);
        case "incidents":
          return b.incidentCount - a.incidentCount;
        case "risk":
          return (b.riskScore || 0) - (a.riskScore || 0);
        case "imd":
          return (b.avgIMD || 0) - (a.avgIMD || 0);
        default:
          return 0;
      }
    });
  };

  // Filter by selected type
  const filteredRoadsByType = selectedType
    ? { [selectedType]: roadsByType[selectedType] || [] }
    : roadsByType;

  // Calculate summary stats
  const totalRoads = roadList.length;
  const totalIncidents = roadList.reduce((sum, r) => sum + r.incidentCount, 0);
  const roadsWithIMD = roadList.filter((r) => r.avgIMD);
  const avgIMD = roadsWithIMD.length > 0
    ? Math.round(roadsWithIMD.reduce((sum, r) => sum + (r.avgIMD || 0), 0) / roadsWithIMD.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalRoads}</p>
          <p className="text-sm text-gray-500">Carreteras con datos</p>
        </div>
        <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700">{incidentsData?.count || totalIncidents}</p>
          <p className="text-sm text-amber-600">Incidencias activas</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Car className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgIMD.toLocaleString("es-ES")}</p>
          <p className="text-sm text-gray-500">IMD medio (veh/día)</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(roadsByType).length}</p>
          <p className="text-sm text-gray-500">Tipos de vía</p>
        </div>
      </div>

      {/* Top Dangerous Roads */}
      {rankingsData?.roads?.mostDangerous && rankingsData.roads.mostDangerous.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Carreteras con mayor riesgo
          </h3>
          <div className="flex flex-wrap gap-2">
            {rankingsData.roads.mostDangerous.slice(0, 10).map((road, idx) => (
              <Link
                key={road.roadName}
                href={`/explorar/carreteras/${encodeURIComponent(road.roadName)}`}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full text-sm border border-red-200 hover:bg-red-100 transition-colors"
              >
                <span className="font-medium text-red-700">#{idx + 1}</span>
                <span className="font-semibold text-gray-900">{road.roadName}</span>
                <span className="text-xs text-red-600">
                  {road.riskScore.toFixed(1)} riesgo
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filtrar por tipo:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              selectedType === null
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Todas
          </button>
          {ROAD_TYPES.map((type) => (
            <button
              key={type.prefix}
              onClick={() => setSelectedType(type.prefix)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedType === type.prefix
                  ? type.color
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {type.prefix.replace("-", "")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="incidents">Incidencias</option>
            <option value="risk">Riesgo</option>
            <option value="imd">IMD</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>

      {/* Roads by Type */}
      <div className="space-y-8">
        {Object.entries(filteredRoadsByType)
          .filter(([, roads]) => roads.length > 0)
          .sort(([a], [b]) => {
            const orderA = ROAD_TYPES.findIndex((t) => t.prefix === a);
            const orderB = ROAD_TYPES.findIndex((t) => t.prefix === b);
            return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
          })
          .map(([typePrefix, roads]) => {
            const typeInfo = getRoadTypeInfo(typePrefix);
            const sortedRoads = sortRoads(roads);

            return (
              <div key={typePrefix}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${typeInfo.color}`}>
                    {typePrefix.replace("-", "")}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900">{typeInfo.label}</h2>
                  <span className="text-sm text-gray-500">({roads.length} carreteras)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedRoads.slice(0, selectedType ? 100 : 12).map((road) => (
                    <Link
                      key={road.roadName}
                      href={`/explorar/carreteras/${encodeURIComponent(road.roadName)}`}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                          {road.roadName}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {road.incidentCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="text-gray-600">{road.incidentCount} incid.</span>
                          </div>
                        )}
                        {road.avgIMD && road.avgIMD > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600">{(road.avgIMD / 1000).toFixed(0)}k IMD</span>
                          </div>
                        )}
                        {road.riskScore && road.riskScore > 0 && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-red-500" />
                            <span className="text-gray-600">{road.riskScore.toFixed(1)} riesgo</span>
                          </div>
                        )}
                        {road.cameraCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600">{road.cameraCount} cám.</span>
                          </div>
                        )}
                        {road.radarCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Radar className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-600">{road.radarCount} radares</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {!selectedType && sortedRoads.length > 12 && (
                  <button
                    onClick={() => setSelectedType(typePrefix)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Ver todas las {sortedRoads.length} carreteras {typeInfo.label.toLowerCase()}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {roadList.length === 0 && (
        <div className="text-center py-20">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de carreteras</h3>
          <p className="text-gray-500">
            No se encontraron carreteras con datos de tráfico disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
