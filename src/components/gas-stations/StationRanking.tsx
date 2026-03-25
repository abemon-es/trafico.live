"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy, Medal, Award, MapPin, Building, Globe } from "lucide-react";

interface RankingData {
  scope: "municipality" | "province" | "national";
  scopeName: string;
  rank: number;
  total: number;
  percentile: number;
  price: number;
  cheapestPrice: number;
  avgPrice: number;
}

interface RankingResponse {
  stationId: string;
  stationName: string;
  fuel: string;
  fuelLabel: string;
  rankings: RankingData[];
}

interface StationRankingProps {
  stationId: string;
  stationType?: "terrestrial" | "maritime";
  defaultFuel?: string;
}

const FUEL_OPTIONS = [
  { value: "gasoleoA", label: "Gasoleo A", color: "amber" },
  { value: "gasolina95", label: "Gasolina 95", color: "blue" },
  { value: "gasolina98", label: "Gasolina 98", color: "purple" },
  { value: "glp", label: "GLP", color: "green" },
];

function RankBadge({ rank, total, percentile }: { rank: number; total: number; percentile: number }) {
  // Top 3 badges
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
        <Trophy className="w-3 h-3" />
        #1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
        <Medal className="w-3 h-3" />
        #2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
        <Award className="w-3 h-3" />
        #3
      </span>
    );
  }

  // Top 10% badge
  if (percentile <= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
        <Trophy className="w-3 h-3" />
        Top 10%
      </span>
    );
  }

  return null;
}

function RankingRow({ ranking }: { ranking: RankingData }) {
  const ScopeIcon = ranking.scope === "municipality" ? MapPin :
    ranking.scope === "province" ? Building : Globe;

  const scopeLabel = ranking.scope === "municipality" ? "Municipio" :
    ranking.scope === "province" ? "Provincia" : "Nacional";

  const savingsVsAvg = ranking.avgPrice - ranking.price;
  const savingsPercent = ((savingsVsAvg / ranking.avgPrice) * 100).toFixed(1);

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <ScopeIcon className="w-4 h-4 text-gray-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {scopeLabel}: {ranking.scopeName}
          </div>
          <div className="text-xs text-gray-500 font-data">
            #{ranking.rank.toLocaleString("es-ES")} de {ranking.total.toLocaleString("es-ES")} gasolineras
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {savingsVsAvg > 0.005 && (
          <div className="text-xs text-green-600 font-data">
            -{savingsPercent}% vs media
          </div>
        )}
        <RankBadge rank={ranking.rank} total={ranking.total} percentile={ranking.percentile} />
        {!RankBadge({ rank: ranking.rank, total: ranking.total, percentile: ranking.percentile }) && (
          <span className={`text-sm font-medium font-data ${
            ranking.percentile <= 25 ? "text-green-600" :
            ranking.percentile <= 50 ? "text-green-500" :
            ranking.percentile <= 75 ? "text-yellow-600" :
            "text-red-600"
          }`}>
            Top {ranking.percentile}%
          </span>
        )}
      </div>
    </div>
  );
}

export function StationRanking({ stationId, stationType = "terrestrial", defaultFuel = "gasoleoA" }: StationRankingProps) {
  const [selectedFuel, setSelectedFuel] = useState(defaultFuel);
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        const baseUrl = stationType === "maritime"
          ? `/api/maritime-stations/${stationId}/ranking`
          : `/api/gas-stations/${stationId}/ranking`;

        const response = await fetch(`${baseUrl}?fuel=${selectedFuel}`);
        if (!response.ok) {
          throw new Error("Failed to fetch ranking data");
        }

        const json = await response.json();
        if (json.success) {
          setData(json.data);
        } else {
          throw new Error(json.error || "Unknown error");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, [stationId, stationType, selectedFuel]);

  // Filter fuel options based on what's available (terrestrial has more fuels)
  const availableFuels = stationType === "maritime"
    ? FUEL_OPTIONS.filter(f => f.value === "gasoleoA" || f.value === "gasolina95")
    : FUEL_OPTIONS;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Ranking de Precios</h3>

        {/* Fuel selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {availableFuels.map((fuel) => (
            <button
              key={fuel.value}
              onClick={() => setSelectedFuel(fuel.value)}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-colors
                ${selectedFuel === fuel.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {fuel.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error || !data ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No hay datos de ranking disponibles para este combustible.
        </div>
      ) : (
        <div>
          {/* Current price highlight */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{data.fuelLabel}</span>
              <span className="text-xl font-bold text-gray-900 font-data">
                {data.rankings[0]?.price.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Rankings by scope */}
          <div className="divide-y divide-gray-100">
            {data.rankings.map((ranking) => (
              <RankingRow key={ranking.scope} ranking={ranking} />
            ))}
          </div>

          {/* Future: Historic ranking toggle */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Ranking basado en precios actuales
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
