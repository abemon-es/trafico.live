"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";

interface PriceComparison {
  fuelType: string;
  fuelLabel: string;
  stationPrice: number;
  municipalityAvg: number | null;
  municipalityName: string | null;
  municipalityCount: number | null;
  provinceAvg: number;
  provinceName: string;
  provinceCount: number;
  nationalAvg: number;
  nationalCount: number;
  municipalityPercentile: number | null;
  provincePercentile: number;
  nationalPercentile: number;
}

interface ComparisonResponse {
  stationId: string;
  stationName: string;
  comparisons: PriceComparison[];
  updatedAt: string;
}

interface PriceComparisonCardProps {
  stationId: string;
  stationType?: "terrestrial" | "maritime";
}

function ComparisonBar({
  label,
  stationPrice,
  avgPrice,
  percentile,
  count,
}: {
  label: string;
  stationPrice: number;
  avgPrice: number | null;
  percentile: number | null;
  count: number | null;
}) {
  if (avgPrice === null || count === null || count < 2) {
    return null;
  }

  const diff = stationPrice - avgPrice;
  const diffPercent = ((diff / avgPrice) * 100).toFixed(1);
  const isBelow = diff < -0.005;
  const isAbove = diff > 0.005;

  // Color based on percentile (lower = better/cheaper)
  const getBarColor = () => {
    if (percentile === null) return "bg-gray-200";
    if (percentile <= 25) return "bg-green-500";
    if (percentile <= 50) return "bg-green-300";
    if (percentile <= 75) return "bg-yellow-400";
    return "bg-red-400";
  };

  const getTextColor = () => {
    if (isBelow) return "text-green-600";
    if (isAbove) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-gray-500 truncate">{label}</div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all`}
            style={{ width: `${Math.min(100, 100 - (percentile || 50))}%` }}
          />
        </div>
        <div className="w-14 text-right">
          <span className="text-xs font-medium text-gray-700">
            {avgPrice.toFixed(3)}
          </span>
        </div>
        <div className={`w-16 text-right text-xs font-medium ${getTextColor()}`}>
          {isBelow ? (
            <span className="flex items-center justify-end gap-0.5">
              <TrendingDown className="w-3 h-3" />
              {diffPercent}%
            </span>
          ) : isAbove ? (
            <span className="flex items-center justify-end gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{diffPercent}%
            </span>
          ) : (
            <span className="flex items-center justify-end gap-0.5">
              <Minus className="w-3 h-3" />
              0%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FuelComparisonSection({ comparison }: { comparison: PriceComparison }) {
  const fuelColors: Record<string, { bg: string; text: string; border: string }> = {
    gasoleoA: { bg: "bg-tl-amber-50", text: "text-tl-amber-700", border: "border-tl-amber-200" },
    gasolina95: { bg: "bg-tl-50", text: "text-tl-700", border: "border-tl-200" },
    gasolina98: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    glp: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  };

  const colors = fuelColors[comparison.fuelType] || fuelColors.gasoleoA;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${colors.text}`}>{comparison.fuelLabel}</h4>
        <div className={`text-lg font-bold ${colors.text}`}>
          {comparison.stationPrice.toFixed(3)}
        </div>
      </div>

      <div className="space-y-2">
        {comparison.municipalityAvg && comparison.municipalityCount && comparison.municipalityCount >= 2 && (
          <ComparisonBar
            label={comparison.municipalityName || "Municipio"}
            stationPrice={comparison.stationPrice}
            avgPrice={comparison.municipalityAvg}
            percentile={comparison.municipalityPercentile}
            count={comparison.municipalityCount}
          />
        )}
        <ComparisonBar
          label={comparison.provinceName}
          stationPrice={comparison.stationPrice}
          avgPrice={comparison.provinceAvg}
          percentile={comparison.provincePercentile}
          count={comparison.provinceCount}
        />
        <ComparisonBar
          label="Nacional"
          stationPrice={comparison.stationPrice}
          avgPrice={comparison.nationalAvg}
          percentile={comparison.nationalPercentile}
          count={comparison.nationalCount}
        />
      </div>

      {/* Percentile summary */}
      <div className="mt-3 pt-3 border-t border-gray-200/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Posicion nacional:</span>
          <span className={`font-medium ${
            comparison.nationalPercentile <= 25 ? "text-green-600" :
            comparison.nationalPercentile <= 50 ? "text-green-500" :
            comparison.nationalPercentile <= 75 ? "text-yellow-600" :
            "text-red-600"
          }`}>
            Top {comparison.nationalPercentile}%
            {comparison.nationalPercentile <= 10 && " "}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PriceComparisonCard({ stationId, stationType = "terrestrial" }: PriceComparisonCardProps) {
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const baseUrl = stationType === "maritime"
          ? `/api/maritime-stations/${stationId}/comparison`
          : `/api/gas-stations/${stationId}/comparison`;

        const response = await fetch(baseUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch comparison data");
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

    fetchComparison();
  }, [stationId, stationType]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Comparativa de Precios</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !data || data.comparisons.length === 0) {
    return null; // Silently fail - comparison is an enhancement
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Comparativa de Precios</h3>
      <p className="text-sm text-gray-500 mb-4">
        Comparacion con la media del municipio, provincia y nacional.
        La barra indica tu posicion (mas llena = mas barato).
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {data.comparisons.map((comparison) => (
          <FuelComparisonSection key={comparison.fuelType} comparison={comparison} />
        ))}
      </div>
    </div>
  );
}
