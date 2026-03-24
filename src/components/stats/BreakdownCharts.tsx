"use client";

import useSWR from "swr";
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Color palette for charts
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
];

export interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  note?: string;
}

function ChartCard({ title, children, note }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
      {note && <p className="text-xs text-gray-500 mt-2">{note}</p>}
    </div>
  );
}

interface BreakdownChartProps {
  title: string;
  data: ChartDataItem[];
  note?: string;
  dataKey?: string;
  labelWidth?: number;
}

export function BreakdownChart({
  title,
  data,
  note,
  dataKey = "value",
  labelWidth = 80,
}: BreakdownChartProps) {
  // Add colors to data if not present
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <ChartCard title={title} note={note}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={dataWithColors}
          layout="vertical"
          margin={{ top: 5, right: 30, left: labelWidth, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={labelWidth}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
            formatter={(value) => [typeof value === "number" ? value.toLocaleString("es-ES") : String(value), ""]}
          />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Props for the composite BreakdownCharts component
interface BreakdownChartsProps {
  communityData?: ChartDataItem[];
  roadTypeData?: ChartDataItem[];
  provinceData?: ChartDataItem[];
  isLoading?: boolean;
}

// Empty charts fallback component
function EmptyChart({ title, message }: { title: string; message: string }) {
  return (
    <ChartCard title={title}>
      <div className="h-[250px] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </ChartCard>
  );
}

export function BreakdownCharts({
  communityData: communityDataProp,
  roadTypeData: roadTypeDataProp,
  provinceData: provinceDataProp,
  isLoading: isLoadingProp = false,
}: BreakdownChartsProps) {
  // Self-fetch when no props provided (e.g. homepage)
  const needsFetch = !communityDataProp && !roadTypeDataProp && !provinceDataProp && !isLoadingProp;
  const { data: apiData, isLoading: apiLoading } = useSWR(
    needsFetch ? "/api/historico/provinces?days=30" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const provinceData = provinceDataProp ?? apiData?.data?.provinceRanking?.map((p: { name: string; count: number }) => ({ name: p.name, value: p.count })) ?? [];
  const roadTypeData = roadTypeDataProp ?? apiData?.data?.roadTypeBreakdown?.map((r: { type: string; count: number }) => ({ name: r.type, value: r.count })) ?? [];
  const communityData = communityDataProp ?? apiData?.data?.communityRanking?.map((c: { name: string; count: number }) => ({ name: c.name, value: c.count })) ?? [];
  const isLoading = isLoadingProp || apiLoading;

  if (isLoading) {
    return (
      <>
        <ChartCard title="Por Comunidad Autónoma">
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Cargando datos...</div>
          </div>
        </ChartCard>
        <ChartCard title="Por Tipo de Vía">
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Cargando datos...</div>
          </div>
        </ChartCard>
      </>
    );
  }

  return (
    <>
      {provinceData && provinceData.length > 0 ? (
        <BreakdownChart
          title="Top 10 Provincias por Accidentes"
          data={provinceData}
          note="Datos históricos de DGT en Cifras"
          labelWidth={100}
        />
      ) : communityData && communityData.length > 0 ? (
        <BreakdownChart
          title="Por Comunidad Autónoma"
          data={communityData}
          note="*Datos regionales (SCT)"
        />
      ) : (
        <EmptyChart title="Por Comunidad Autónoma" message="No hay datos disponibles" />
      )}

      {roadTypeData && roadTypeData.length > 0 ? (
        <BreakdownChart
          title="Por Tipo de Vía"
          data={roadTypeData}
          labelWidth={90}
        />
      ) : (
        <EmptyChart title="Por Tipo de Vía" message="No hay datos disponibles" />
      )}
    </>
  );
}
