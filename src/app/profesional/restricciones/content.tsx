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

interface ZBEZone {
  id: string;
  name: string;
  cityName: string;
  centroid: { lat: number; lng: number } | null;
  restrictions: Record<string, string>;
  schedule: Record<string, string | null> | null;
  activeAllYear: boolean;
  fineAmount: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  sourceUrl: string | null;
  lastUpdated: string;
}

interface ZBEResponse {
  success: boolean;
  data?: {
    zones: ZBEZone[];
    summary: {
      totalZones: number;
      activeZones: number;
      cities: string[];
    };
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getZBEStatus(zone: ZBEZone): { label: string; color: string } {
  const now = new Date();
  const from = new Date(zone.effectiveFrom);
  const until = zone.effectiveUntil ? new Date(zone.effectiveUntil) : null;

  if (from > now) return { label: "Planificada", color: "bg-tl-amber-100 text-tl-amber-700" };
  if (until && until < now) return { label: "Expirada", color: "bg-gray-100 text-gray-700" };
  return { label: "Activa", color: "bg-red-100 text-red-700" };
}

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

export default function RestriccionesContent() {
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
            {!zbeLoading && zbeData?.data && (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-data">{zbeData.data.summary.totalZones}</span> zonas de bajas emisiones registradas
                  (<span className="font-data">{zbeData.data.summary.activeZones}</span> activas)
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {zbeData.data.zones.map((zone) => {
                    const status = getZBEStatus(zone);
                    const restrictionEntries = Object.entries(zone.restrictions || {});

                    return (
                      <div
                        key={zone.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{zone.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {zone.cityName}
                          </p>
                          {zone.effectiveFrom && (
                            <p className="text-gray-500 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              Desde: {new Date(zone.effectiveFrom).toLocaleDateString("es-ES")}
                            </p>
                          )}
                          {zone.activeAllYear && (
                            <p className="text-xs text-red-600 mt-1">Activa todo el año</p>
                          )}
                        </div>

                        {restrictionEntries.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Restricciones:</p>
                            <div className="flex flex-wrap gap-1">
                              {restrictionEntries.map(([key, value]) => (
                                <span
                                  key={key}
                                  className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded"
                                >
                                  {value || key}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Roads/Tunnels Tab */}
        {activeTab === "roads" && (
          <>
            {/* Info Banner */}
            <div className="bg-tl-amber-50 border border-tl-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-tl-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-tl-amber-800">Restricciones de infraestructura</h3>
                <p className="text-sm text-tl-amber-700 mt-1">
                  Algunos túneles y tramos tienen limitaciones de altura, peso o anchura.
                  Consulta siempre la normativa actualizada antes de planificar tu ruta.
                </p>
              </div>
            </div>

            {/* Restriction Types */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <Ruler className="w-6 h-6 text-tl-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Altura</p>
                <p className="text-xs text-gray-500">Límites verticales</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <Scale className="w-6 h-6 text-tl-amber-600 mx-auto mb-2" />
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
                      <p className="text-sm text-tl-600">{restriction.road}</p>
                    </div>
                    <span className="text-xs bg-tl-amber-100 text-tl-amber-700 px-2 py-1 rounded">
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
