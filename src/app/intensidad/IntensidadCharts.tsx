"use client";

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
import { TrendingUp, BarChart3 } from "lucide-react";

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

interface YearData {
  year: number;
  recordCount: number;
  avgIMD: number;
}

interface ChartDataPoint {
  name: string;
  imd: number;
  maxIMD: number;
}

interface IntensidadChartsProps {
  years: YearData[];
  chartData: ChartDataPoint[];
}

export default function IntensidadCharts({ years, chartData }: IntensidadChartsProps) {
  return (
    <>
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
    </>
  );
}
