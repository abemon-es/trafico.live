"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  Route,
  AlertTriangle,
  Loader2,
  Camera,
  Radar,
  TrendingUp,
  Home,
  Car,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Incident {
  id: string;
  description: string;
  effect: string;
  cause: string;
  road: string;
  km: number | null;
  province: string | null;
  startTime: string;
}

interface IncidentsResponse {
  success: boolean;
  count: number;
  data: Incident[];
}

interface RadarData {
  id: string;
  type: string;
  road: string;
  km: number;
  direction: string | null;
  speedLimit: number;
  province: string | null;
}

interface RadarsResponse {
  success: boolean;
  count: number;
  radars: RadarData[];
}

interface CameraData {
  id: string;
  name: string;
  road: string;
  km: number | null;
  province: string | null;
  imageUrl: string | null;
}

interface CamerasResponse {
  count: number;
  cameras: CameraData[];
}

interface IMDData {
  road: string;
  km: number;
  imd: number;
  imdLigeros: number | null;
  imdPesados: number | null;
  heavyVehiclesPercent: number | null;
  year: number;
  province: string | null;
}

interface IMDResponse {
  success: boolean;
  count: number;
  flows: IMDData[];
  summary: {
    avgIMD: number;
    maxIMD: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EFFECT_LABELS: Record<string, string> = {
  ROAD_CLOSED: "Carretera cortada",
  SLOW_TRAFFIC: "Tráfico lento",
  RESTRICTED: "Restringido",
  DIVERSION: "Desvío",
  OTHER_EFFECT: "Otro",
};

const CAUSE_LABELS: Record<string, string> = {
  ROADWORK: "Obras",
  ACCIDENT: "Accidente",
  WEATHER: "Meteorológico",
  RESTRICTION: "Restricción",
  OTHER_CAUSE: "Otra causa",
};

const RADAR_TYPES: Record<string, string> = {
  FIXED: "Fijo",
  SECTION: "Tramo",
  MOBILE: "Móvil",
};

export default function RoadDetailContent() {
  const params = useParams();
  const roadId = decodeURIComponent(params.roadId as string);

  const { data: incidentsData, isLoading: incidentsLoading } = useSWR<IncidentsResponse>(
    `/api/incidents?road=${encodeURIComponent(roadId)}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: radarsData, isLoading: radarsLoading } = useSWR<RadarsResponse>(
    `/api/radars?road=${encodeURIComponent(roadId)}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: camerasData, isLoading: camerasLoading } = useSWR<CamerasResponse>(
    `/api/cameras?road=${encodeURIComponent(roadId)}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: imdData, isLoading: imdLoading } = useSWR<IMDResponse>(
    `/api/imd?road=${encodeURIComponent(roadId)}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const isLoading = incidentsLoading || radarsLoading || camerasLoading || imdLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de {roadId}...</span>
        </div>
      </div>
    );
  }

  const incidents = incidentsData?.data || [];
  const radars = radarsData?.radars || [];
  const cameras = camerasData?.cameras || [];
  const imdFlows = imdData?.flows || [];

  const avgIMD = imdData?.summary?.avgIMD || 0;
  const maxIMD = imdData?.summary?.maxIMD || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/" className="hover:text-tl-600 dark:text-tl-400">
          <Home className="w-4 h-4" />
        </Link>
        <span>/</span>
        <Link href="/explorar/carreteras" className="hover:text-tl-600 dark:text-tl-400">
          Carreteras
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{roadId}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Route className="w-8 h-8 text-tl-600 dark:text-tl-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{roadId}</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Estado del tráfico en tiempo real en la carretera {roadId}.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-lg shadow-sm border p-4 ${
          incidents.length > 0 ? "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${incidents.length > 0 ? "bg-tl-amber-100" : "bg-gray-50 dark:bg-gray-950"}`}>
              <AlertTriangle className={`w-5 h-5 ${incidents.length > 0 ? "text-tl-amber-600 dark:text-tl-amber-400" : "text-gray-400"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${incidents.length > 0 ? "text-tl-amber-700 dark:text-tl-amber-300" : "text-gray-900 dark:text-gray-100"}`}>
            {incidents.length}
          </p>
          <p className={`text-sm ${incidents.length > 0 ? "text-tl-amber-600 dark:text-tl-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
            Incidencias activas
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Radar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{radars.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Radares</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
              <Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cameras.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cámaras</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Car className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgIMD > 0 ? (avgIMD / 1000).toFixed(0) + "k" : "-"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">IMD medio</p>
        </div>
      </div>

      {/* Active Incidents */}
      {incidents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-tl-amber-500" />
            Incidencias activas
          </h2>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        incident.effect === "ROAD_CLOSED"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                          : incident.effect === "SLOW_TRAFFIC"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                      }`}>
                        {EFFECT_LABELS[incident.effect] || incident.effect}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded">
                        {CAUSE_LABELS[incident.cause] || incident.cause}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-gray-100">{incident.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {incident.km && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          km {incident.km}
                        </span>
                      )}
                      {incident.province && (
                        <span>{incident.province}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(incident.startTime).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Radars */}
      {radars.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Radar className="w-5 h-5 text-yellow-500" />
            Radares ({radars.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radars.map((radar) => (
              <div
                key={radar.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    radar.type === "FIXED"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                      : radar.type === "SECTION"
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                      : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  }`}>
                    {RADAR_TYPES[radar.type] || radar.type}
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{radar.speedLimit} km/h</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>km {radar.km}</p>
                  {radar.direction && <p>Sentido: {radar.direction}</p>}
                  {radar.province && <p>{radar.province}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cameras */}
      {cameras.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-tl-500" />
            Cámaras ({cameras.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cameras.slice(0, 8).map((camera) => (
              <Link
                key={camera.id}
                href={`/camaras?id=${camera.id}`}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-tl-300 transition-all group"
              >
                {camera.imageUrl && (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={camera.imageUrl}
                      alt={camera.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-600 dark:text-tl-400 truncate">
                    {camera.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {camera.km && <span>km {camera.km}</span>}
                    {camera.province && <span>{camera.province}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {cameras.length > 8 && (
            <Link
              href={`/explorar/infraestructura?tab=camaras&road=${encodeURIComponent(roadId)}`}
              className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline"
            >
              Ver todas las {cameras.length} cámaras
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* IMD Data */}
      {imdFlows.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Intensidad Media Diaria (IMD)
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">IMD medio</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{avgIMD.toLocaleString("es-ES")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">IMD máximo</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{maxIMD.toLocaleString("es-ES")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Puntos de aforo</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{imdFlows.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Año de datos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{imdFlows[0]?.year || "-"}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">km</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Provincia</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">IMD total</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Ligeros</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Pesados</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">% Pesados</th>
                  </tr>
                </thead>
                <tbody>
                  {imdFlows.slice(0, 10).map((flow, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3">{flow.km}</td>
                      <td className="py-2 px-3">{flow.province || "-"}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        {flow.imd.toLocaleString("es-ES")}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {flow.imdLigeros != null ? flow.imdLigeros.toLocaleString("es-ES") : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {flow.imdPesados != null ? flow.imdPesados.toLocaleString("es-ES") : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {flow.heavyVehiclesPercent != null
                          ? `${flow.heavyVehiclesPercent.toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {imdFlows.length > 10 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-3">
                  Mostrando 10 de {imdFlows.length} puntos de aforo
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {incidents.length === 0 && radars.length === 0 && cameras.length === 0 && imdFlows.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Sin datos disponibles</h3>
          <p className="text-gray-500 dark:text-gray-400">
            No hay información disponible para la carretera {roadId} en este momento.
          </p>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-8">
        <Link
          href="/explorar/carreteras"
          className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline text-sm"
        >
          Volver al índice de carreteras
        </Link>
      </div>
    </div>
  );
}
