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

// Sample data - will be replaced with API data
const communityData = [
  { name: "Andalucía", count: 45, color: "#ef4444" },
  { name: "C. Madrid", count: 38, color: "#f97316" },
  { name: "C. Valenciana", count: 28, color: "#eab308" },
  { name: "Galicia", count: 22, color: "#22c55e" },
  { name: "Castilla y León", count: 18, color: "#3b82f6" },
  { name: "Cataluña*", count: 15, color: "#6b7280" },
];

const roadTypeData = [
  { name: "Autopista (AP)", count: 89, color: "#ef4444" },
  { name: "Autovía (A)", count: 67, color: "#f97316" },
  { name: "Nacional (N)", count: 45, color: "#eab308" },
  { name: "Comarcal", count: 23, color: "#22c55e" },
];

function ChartCard({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
    </div>
  );
}

export function BreakdownCharts() {
  return (
    <>
      <ChartCard title="Por Comunidad Autónoma" note="*Datos regionales (SCT)">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={communityData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {communityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Por Tipo de Vía">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={roadTypeData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={90}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {roadTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}
