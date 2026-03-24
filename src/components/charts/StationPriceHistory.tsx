"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

interface PricePoint {
  date: string;
  avgGasoleoA: number | null;
  avgGasolina95: number | null;
  avgGasolina98: number | null;
  avgGLP: number | null;
}

interface StationPriceHistoryProps {
  stationId: string;
}

export function StationPriceHistory({ stationId }: StationPriceHistoryProps) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gas-stations/${stationId}/history`);
        if (!response.ok) throw new Error("Failed to fetch");
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

    fetchHistory();
  }, [stationId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  const formatPrice = (value: number) => `${value.toFixed(3)}€`;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Historial de precios</h3>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || data.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Historial de precios</h3>
        <p className="text-sm text-gray-500">
          Historial de precios disponible próximamente
        </p>
      </div>
    );
  }

  const hasDiesel = data.some((d) => d.avgGasoleoA != null);
  const hasGas95 = data.some((d) => d.avgGasolina95 != null);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Historial de precios</h3>
        <span className="text-xs text-gray-400">Últimos 30 días</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {hasDiesel && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" />
            Gasóleo A
          </span>
        )}
        {hasGas95 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" />
            Gasolina 95
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            domain={["auto", "auto"]}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => {
              const numValue = typeof value === "number" ? value : 0;
              const label =
                name === "avgGasoleoA"
                  ? "Gasóleo A"
                  : name === "avgGasolina95"
                  ? "Gasolina 95"
                  : String(name);
              return [formatPrice(numValue), label];
            }}
            labelFormatter={(label: string) =>
              new Date(label).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            }
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
          />
          {hasDiesel && (
            <Line
              type="monotone"
              dataKey="avgGasoleoA"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}
          {hasGas95 && (
            <Line
              type="monotone"
              dataKey="avgGasolina95"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
