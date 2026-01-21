"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Search, Camera, Filter, Loader2, AlertTriangle } from "lucide-react";
import { CameraCard, type Camera as CameraType } from "@/components/cameras/CameraCard";
import { CameraModal } from "@/components/cameras/CameraModal";

interface CamerasResponse {
  count: number;
  cameras: CameraType[];
  provinces: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CamarasContent() {
  const [search, setSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);

  const { data, error, isLoading } = useSWR<CamerasResponse>(
    "/api/cameras",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Filter cameras based on search and province
  const filteredCameras = useMemo(() => {
    if (!data?.cameras) return [];

    return data.cameras.filter((camera) => {
      // Filter by province
      if (selectedProvince && camera.province !== selectedProvince) {
        return false;
      }

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          camera.road.toLowerCase().includes(searchLower) ||
          camera.province.toLowerCase().includes(searchLower) ||
          camera.direction.toLowerCase().includes(searchLower) ||
          (camera.kmPoint !== null &&
            camera.kmPoint.toString().includes(search))
        );
      }

      return true;
    });
  }, [data?.cameras, search, selectedProvince]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            Cámaras de Tráfico
          </h1>
          <p className="mt-2 text-gray-600">
            Imágenes en tiempo real de las cámaras de la DGT en las carreteras
            españolas.
          </p>
        </div>

        {/* Stats bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "-" : data?.count || 0}
                </p>
                <p className="text-sm text-gray-500">Cámaras totales</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredCameras.length}
                </p>
                <p className="text-sm text-gray-500">Mostrando</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data?.provinces.length || 0}
                </p>
                <p className="text-sm text-gray-500">Provincias</p>
              </div>
            </div>

            {/* Search and filter */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar carretera, km..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Province filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas las provincias</option>
                  {data?.provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {(search || selectedProvince) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedProvince("");
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Cargando cámaras...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-red-600">
            <AlertTriangle className="w-8 h-8 mb-4" />
            <p>Error al cargar las cámaras</p>
            <p className="text-sm text-gray-500 mt-1">
              Por favor, inténtalo de nuevo más tarde
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredCameras.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Camera className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No se encontraron cámaras</p>
            <p className="text-sm mt-1">
              {search || selectedProvince
                ? "Prueba con otros filtros de búsqueda"
                : "No hay cámaras disponibles"}
            </p>
          </div>
        )}

        {/* Camera grid */}
        {!isLoading && !error && filteredCameras.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCameras.map((camera) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                onClick={() => setSelectedCamera(camera)}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedCamera && (
          <CameraModal
            camera={selectedCamera}
            onClose={() => setSelectedCamera(null)}
          />
        )}
      </main>
    </div>
  );
}
