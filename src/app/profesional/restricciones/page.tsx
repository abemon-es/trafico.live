"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Ban,
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Truck,
  Scale,
  Ruler,
} from "lucide-react";

interface ZBEData {
  id: string;
  name: string;
  city: string;
  province: string | null;
  status: string;
  startDate: string | null;
  vehicleRestrictions: string[];
  description: string | null;
}

interface ZBEResponse {
  success: boolean;
  count: number;
  zones: ZBEData[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ZBE_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activa", color: "bg-red-100 text-red-700" },
  PLANNED: { label: "Planificada", color: "bg-amber-100 text-amber-700" },
  SUSPENDED: { label: "Suspendida", color: "bg-gray-100 text-gray-700" },
};

// Sample tunnel/road restrictions
const ROAD_RESTRICTIONS = [
  {
    name: "Túnel de Somport",
    road: "N-330",
    type: "tunnel",
    restriction: "Altura máx: 4.5m, Ancho máx: 2.5m",
    notes: "Mercancías peligrosas: ver regulación específica",
  },
  {
    name: "Túnel del Cadí",
    road: "C-16",
    type: "tunnel",
    restriction: "Altura máx: 4.5m",
    notes: "Peaje obligatorio",
  },
  {
    name: "Túnel de Bielsa",
    road: "A-138",
    type: "tunnel",
    restriction: "Tonelaje máx: 19t",
    notes: "Cerrado en condiciones meteorológicas adversas",
  },
];

export default function RestriccionesPage() {
  const [activeTab, setActiveTab] = useState<"zbe" | "roads">("zbe");

  const { data: zbeData, isLoading: zbeLoading } = useSWR<ZBEResponse>(
    activeTab === "zbe" ? "/api/zbe" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/profesional"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal profesional
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Restricciones activas
              </h1>
              <p className="text-gray-600">
                ZBE, túneles y limitaciones para transporte pesado
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("zbe")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "zbe"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Ban className="w-4 h-4 inline mr-2" />
            Zonas Bajas Emisiones
          </button>
          <button
            onClick={() => setActiveTab("roads")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "roads"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Túneles y carreteras
          </button>
        </div>

        {/* ZBE Tab */}
        {activeTab === "zbe" && (
          <>
            {/* Info Banner */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Zonas de Bajas Emisiones</h3>
                <p className="text-sm text-red-700 mt-1">
                  Las ZBE restringen el acceso de vehículos según su distintivo ambiental.
                  Verifica las restricciones específicas de cada zona antes de circular.
                </p>
              </div>
            </div>

            {/* Loading */}
            {zbeLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Cargando zonas ZBE...</span>
                </div>
              </div>
            )}

            {/* ZBE List */}
            {!zbeLoading && zbeData && (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {zbeData.count} zonas de bajas emisiones registradas
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {zbeData.zones.map((zone) => (
                    <div
                      key={zone.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{zone.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            ZBE_STATUS[zone.status]?.color || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {ZBE_STATUS[zone.status]?.label || zone.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {zone.city}
                          {zone.province && `, ${zone.province}`}
                        </p>
                        {zone.startDate && (
                          <p className="text-gray-500 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Desde: {new Date(zone.startDate).toLocaleDateString("es-ES")}
                          </p>
                        )}
                        {zone.description && (
                          <p className="text-gray-500 mt-2">{zone.description}</p>
                        )}
                      </div>

                      {zone.vehicleRestrictions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Vehículos afectados:</p>
                          <div className="flex flex-wrap gap-1">
                            {zone.vehicleRestrictions.map((restriction) => (
                              <span
                                key={restriction}
                                className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded"
                              >
                                {restriction}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Roads/Tunnels Tab */}
        {activeTab === "roads" && (
          <>
            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Restricciones de infraestructura</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Algunos túneles y tramos tienen limitaciones de altura, peso o anchura.
                  Consulta siempre la normativa actualizada antes de planificar tu ruta.
                </p>
              </div>
            </div>

            {/* Restriction Types */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <Ruler className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Altura</p>
                <p className="text-xs text-gray-500">Límites verticales</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <Scale className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Peso</p>
                <p className="text-xs text-gray-500">Tonelaje máximo</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <Truck className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Anchura</p>
                <p className="text-xs text-gray-500">Límites laterales</p>
              </div>
            </div>

            {/* Restrictions List */}
            <div className="space-y-4">
              {ROAD_RESTRICTIONS.map((restriction) => (
                <div
                  key={restriction.name}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{restriction.name}</h3>
                      <p className="text-sm text-blue-600">{restriction.road}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                      {restriction.type === "tunnel" ? "Túnel" : "Carretera"}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <p className="text-sm font-medium text-gray-900">
                      {restriction.restriction}
                    </p>
                    {restriction.notes && (
                      <p className="text-xs text-gray-500 mt-1">{restriction.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mt-6 bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Esta lista es orientativa. Consulta siempre la información oficial de la DGT
                y los gestores de infraestructuras antes de circular con vehículos especiales.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
