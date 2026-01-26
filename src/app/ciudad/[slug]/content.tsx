"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  MapPin,
  AlertTriangle,
  Camera,
  Fuel,
  Zap,
  Ban,
  Loader2,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface CityData {
  name: string;
  province: string;
  community: string;
  lat: number;
  lng: number;
}

interface CiudadContentProps {
  slug: string;
  cityData: CityData;
}

interface IncidentsResponse {
  success: boolean;
  count: number;
  incidents: Array<{
    id: string;
    type: string;
    description: string;
    road: string | null;
    startDate: string;
  }>;
}

interface CamerasResponse {
  count: number;
  cameras: Array<{
    id: string;
    name: string;
    road: string;
    imageUrl: string | null;
  }>;
}

interface ChargersResponse {
  success: boolean;
  count: number;
  chargers: Array<{
    id: string;
    name: string;
    powerKw: number | null;
    city: string | null;
    province: string | null;
  }>;
}

interface ZBEResponse {
  success: boolean;
  count: number;
  zones: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CiudadContent({ slug, cityData }: CiudadContentProps) {
  // Fetch data for this city/province
  const { data: incidentsData, isLoading: incidentsLoading } = useSWR<IncidentsResponse>(
    `/api/incidents?province=${cityData.province}&limit=10`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: camerasData, isLoading: camerasLoading } = useSWR<CamerasResponse>(
    `/api/cameras?province=${cityData.province}&limit=8`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: chargersData, isLoading: chargersLoading } = useSWR<ChargersResponse>(
    "/api/chargers?limit=500",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: zbeData, isLoading: zbeLoading } = useSWR<ZBEResponse>(
    "/api/zbe",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Filter chargers for this city
  const cityChargers = chargersData?.chargers?.filter(
    (c) =>
      c.city?.toLowerCase().includes(cityData.name.toLowerCase()) ||
      c.province?.toLowerCase().includes(cityData.province.toLowerCase())
  );

  // Filter ZBE for this city
  const cityZBE = zbeData?.zones?.filter(
    (z) => z.city.toLowerCase().includes(cityData.name.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/ciudad"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a ciudades
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tráfico en {cityData.name}
              </h1>
              <p className="text-gray-600">
                {cityData.province} · {cityData.community}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {incidentsLoading ? "-" : incidentsData?.count || 0}
            </p>
            <p className="text-sm text-gray-500">Incidencias activas</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Camera className="w-6 h-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {camerasLoading ? "-" : camerasData?.count || 0}
            </p>
            <p className="text-sm text-gray-500">Cámaras disponibles</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Zap className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {chargersLoading ? "-" : cityChargers?.length || 0}
            </p>
            <p className="text-sm text-gray-500">Cargadores EV</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Ban className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {zbeLoading ? "-" : cityZBE?.length || 0}
            </p>
            <p className="text-sm text-gray-500">Zonas ZBE</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incidents Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Incidencias activas</h2>
              </div>
              <Link
                href="/incidencias"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {incidentsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
              {!incidentsLoading && (!incidentsData?.incidents?.length) && (
                <p className="text-center text-gray-500 py-8">
                  No hay incidencias activas en {cityData.name}
                </p>
              )}
              {!incidentsLoading && incidentsData?.incidents?.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  className="py-3 border-b border-gray-100 last:border-0"
                >
                  <p className="text-sm text-gray-900">{incident.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {incident.road && `${incident.road} · `}
                    {new Date(incident.startDate).toLocaleString("es-ES")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cameras Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-gray-900">Cámaras de tráfico</h2>
              </div>
              <Link
                href="/camaras"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {camerasLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
              {!camerasLoading && (!camerasData?.cameras?.length) && (
                <p className="text-center text-gray-500 py-8">
                  No hay cámaras disponibles en {cityData.province}
                </p>
              )}
              {!camerasLoading && camerasData?.cameras && (
                <div className="grid grid-cols-2 gap-3">
                  {camerasData.cameras.slice(0, 4).map((camera) => (
                    <div
                      key={camera.id}
                      className="bg-gray-100 rounded-lg overflow-hidden"
                    >
                      {camera.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={camera.imageUrl}
                          alt={camera.name}
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gray-200 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {camera.name}
                        </p>
                        <p className="text-xs text-gray-500">{camera.road}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* EV Chargers Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-gray-900">Cargadores eléctricos</h2>
              </div>
              <Link
                href={`/carga-ev/${slug}`}
                className="text-sm text-green-600 hover:underline flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {chargersLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
              {!chargersLoading && (!cityChargers?.length) && (
                <p className="text-center text-gray-500 py-8">
                  No hay cargadores registrados en {cityData.name}
                </p>
              )}
              {!chargersLoading && cityChargers && (
                <div className="space-y-3">
                  {cityChargers.slice(0, 4).map((charger) => (
                    <div
                      key={charger.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {charger.name}
                        </p>
                        <p className="text-xs text-gray-500">{charger.city}</p>
                      </div>
                      {charger.powerKw && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            charger.powerKw >= 50
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {charger.powerKw} kW
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ZBE Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-gray-900">Zonas Bajas Emisiones</h2>
              </div>
              <Link
                href="/profesional/restricciones"
                className="text-sm text-red-600 hover:underline flex items-center gap-1"
              >
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4">
              {zbeLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              )}
              {!zbeLoading && (!cityZBE?.length) && (
                <p className="text-center text-gray-500 py-8">
                  No hay ZBE activas en {cityData.name}
                </p>
              )}
              {!zbeLoading && cityZBE?.map((zone) => (
                <div
                  key={zone.id}
                  className="py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        zone.status === "ACTIVE"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {zone.status === "ACTIVE" ? "Activa" : "Planificada"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{zone.city}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Links */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Explorar más</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/gasolineras"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <Fuel className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Gasolineras</span>
            </Link>
            <Link
              href="/carreteras"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Carreteras</span>
            </Link>
            <Link
              href={`/carga-ev/${slug}`}
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Cargadores EV</span>
            </Link>
            <a
              href={`https://www.google.com/maps/@${cityData.lat},${cityData.lng},12z`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <ExternalLink className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <span className="text-sm text-gray-700">Ver en mapa</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
