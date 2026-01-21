"use client";

import useSWR from "swr";
import { AlertTriangle, Users, Car, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { BreakdownChart, type ChartDataItem } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart, type YearlyDataPoint } from "@/components/stats/TimeSeriesChart";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HistoricalApiResponse {
  success: boolean;
  data: {
    totals: {
      accidents: number;
      fatalities: number;
      hospitalized: number;
      nonHospitalized: number;
    };
    provinceBreakdown: Array<{
      name: string;
      accidents: number;
      fatalities: number;
    }>;
    yearlyData: YearlyDataPoint[];
    yearOverYearChange: number | null;
  };
}

function StatCard({
  icon: Icon,
  iconBgColor,
  iconColor,
  value,
  label,
  trend,
  isLoading,
}: {
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  value: number | string;
  label: string;
  trend?: { value: number; isPositive: boolean } | null;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      {trend && !isLoading && (
        <div
          className={`flex items-center gap-1 mt-1 text-sm ${
            trend.isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.isPositive ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}
          <span>{Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export function EstadisticasContent() {
  const { data, error, isLoading } = useSWR<HistoricalApiResponse>(
    "/api/historical",
    fetcher,
    { revalidateOnFocus: false }
  );

  const historicalData = data?.data;
  const hasData = data?.success && historicalData;

  // Convert province breakdown to chart format
  const provinceChartData: ChartDataItem[] =
    historicalData?.provinceBreakdown?.map((p) => ({
      name: p.name,
      value: p.accidents,
    })) || [];

  // Get the latest year from data
  const latestYear =
    historicalData?.yearlyData?.[historicalData.yearlyData.length - 1]?.year || 2023;

  // Year-over-year trend
  const yoyTrend = historicalData?.yearOverYearChange
    ? {
        value: historicalData.yearOverYearChange,
        // For accidents, negative change is positive (fewer accidents)
        isPositive: historicalData.yearOverYearChange < 0,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Tráfico</h1>
          <p className="mt-2 text-gray-600">
            Análisis histórico de siniestralidad vial en España. Datos oficiales de DGT en
            Cifras.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error al cargar los datos históricos. Por favor, intente de nuevo más tarde.
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={AlertTriangle}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            value={hasData ? historicalData.totals.accidents : "-"}
            label={`Accidentes (${latestYear})`}
            isLoading={isLoading}
          />
          <StatCard
            icon={Users}
            iconBgColor="bg-gray-100"
            iconColor="text-gray-600"
            value={hasData ? historicalData.totals.fatalities : "-"}
            label={`Fallecidos (${latestYear})`}
            isLoading={isLoading}
          />
          <StatCard
            icon={Car}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            value={hasData ? historicalData.totals.hospitalized : "-"}
            label="Heridos graves"
            isLoading={isLoading}
          />
          <StatCard
            icon={yoyTrend?.isPositive ? TrendingDown : TrendingUp}
            iconBgColor={yoyTrend?.isPositive ? "bg-green-50" : "bg-red-50"}
            iconColor={yoyTrend?.isPositive ? "text-green-600" : "text-red-600"}
            value={
              yoyTrend
                ? `${yoyTrend.isPositive ? "-" : "+"}${Math.abs(yoyTrend.value).toFixed(1)}%`
                : "-"
            }
            label="Variación anual"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Yearly Trend Chart */}
          <div className="lg:col-span-2">
            <TimeSeriesChart
              yearlyData={historicalData?.yearlyData}
              mode="yearly"
              title={`Evolución anual de siniestralidad (${
                historicalData?.yearlyData?.[0]?.year || "2023"
              }-${latestYear})`}
              isLoading={isLoading}
            />
          </div>

          {/* Province Ranking */}
          {provinceChartData.length > 0 ? (
            <BreakdownChart
              title="Top 10 Provincias por Accidentes"
              data={provinceChartData}
              note="Datos históricos de DGT en Cifras"
              labelWidth={100}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                Ranking por provincia
              </h2>
              <div className="h-64 flex items-center justify-center text-gray-500">
                {isLoading ? (
                  <div className="animate-pulse">Cargando datos...</div>
                ) : (
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fatalities by Province */}
          {historicalData?.provinceBreakdown && historicalData.provinceBreakdown.length > 0 && (
            <BreakdownChart
              title="Fallecidos por Provincia"
              data={historicalData.provinceBreakdown.map((p) => ({
                name: p.name,
                value: p.fatalities,
              }))}
              note="Datos históricos de DGT en Cifras"
              labelWidth={100}
            />
          )}
        </div>

        {/* Data Sources */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuentes de datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900">DGT en Cifras</h3>
              <p className="text-sm text-gray-500 mt-1">
                Estadísticas anuales oficiales de siniestralidad vial publicadas por la
                Dirección General de Tráfico.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">NAP DATEX II</h3>
              <p className="text-sm text-gray-500 mt-1">
                Datos en tiempo real de incidencias y balizas V16 a través del Punto de Acceso
                Nacional.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">INE</h3>
              <p className="text-sm text-gray-500 mt-1">
                Datos demográficos y de censo de vehículos del Instituto Nacional de
                Estadística.
              </p>
            </div>
          </div>
        </div>

        {/* Methodology Note */}
        <div className="mt-4 text-sm text-gray-500">
          <p>
            * Los datos mostrados corresponden a los registros disponibles en la base de datos.
            Para información completa, consulte los informes oficiales de DGT en Cifras.
          </p>
        </div>
      </main>
    </div>
  );
}
