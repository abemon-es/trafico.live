import { Metadata } from "next";
import { BarChart3, TrendingDown, AlertTriangle, Calendar, Car, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Estadísticas",
  description: "Estadísticas históricas de siniestralidad vial en España. Datos de accidentes, víctimas y tendencias desde 2015 hasta la actualidad.",
};

export default function EstadisticasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Tráfico</h1>
          <p className="mt-2 text-gray-600">
            Análisis histórico de siniestralidad vial en España. Datos oficiales de DGT en Cifras.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Accidentes (2024)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Fallecidos (2024)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Car className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-500">Heridos graves</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">-</p>
            <p className="text-sm text-gray-500">Variación anual</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Yearly Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Evolución anual (2015-2024)
            </h2>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Gráfico de evolución próximamente</p>
                <p className="text-sm mt-2">Se importarán datos históricos de DGT en Cifras</p>
              </div>
            </div>
          </div>

          {/* Province Comparison */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Ranking por provincia
            </h2>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Comparativa provincial próximamente</p>
                <p className="text-sm mt-2">Se mostrará el ranking de provincias por siniestralidad</p>
              </div>
            </div>
          </div>

          {/* Road Type Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Por tipo de vía
            </h2>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Car className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Desglose por tipo de carretera</p>
                <p className="text-sm mt-2">Autopistas, autovías, nacionales, comarcales...</p>
              </div>
            </div>
          </div>

          {/* Time of Day Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Por hora del día
            </h2>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Análisis horario próximamente</p>
                <p className="text-sm mt-2">Horas de mayor siniestralidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuentes de datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900">DGT en Cifras</h3>
              <p className="text-sm text-gray-500 mt-1">
                Estadísticas anuales oficiales de siniestralidad vial publicadas por la Dirección General de Tráfico.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">NAP DATEX II</h3>
              <p className="text-sm text-gray-500 mt-1">
                Datos en tiempo real de incidencias y balizas V16 a través del Punto de Acceso Nacional.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">INE</h3>
              <p className="text-sm text-gray-500 mt-1">
                Datos demográficos y de censo de vehículos del Instituto Nacional de Estadística.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
