"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Zap,
  MapPin,
  Loader2,
  ExternalLink,
  Navigation,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

interface ChargerData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  powerKw: number | null;
  connectorTypes: string[];
  operatorName: string | null;
  isPublic: boolean;
  latitude: number;
  longitude: number;
}

interface ChargersResponse {
  success: boolean;
  count: number;
  chargers: ChargerData[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Haversine distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CercaClient() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Has denegado el acceso a tu ubicación");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("No se pudo obtener tu ubicación");
            break;
          case error.TIMEOUT:
            setLocationError("La solicitud de ubicación ha expirado");
            break;
          default:
            setLocationError("Error al obtener la ubicación");
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  const { data, isLoading } = useSWR<ChargersResponse>(
    location ? "/api/chargers?limit=1000" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Sort chargers by distance
  const sortedChargers = location && data?.chargers
    ? data.chargers
        .map((charger) => ({
          ...charger,
          distance: getDistance(location.lat, location.lng, charger.latitude, charger.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/carga-ev"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a cargadores
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cargadores cerca de ti</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Los puntos de carga más cercanos a tu ubicación actual
          </p>
        </div>

        {/* Location Status */}
        {isLocating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-center mb-8">
            <Loader2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Obteniendo ubicación...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Por favor, permite el acceso a tu ubicación
            </p>
          </div>
        )}

        {locationError && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 p-6 text-center mb-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h3 className="font-medium text-red-800 mb-1">{locationError}</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Para encontrar cargadores cercanos, necesitamos acceso a tu ubicación
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Location info */}
        {location && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 p-4 mb-6 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800">Ubicación detectada</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            </div>
          </div>
        )}

        {/* Loading chargers */}
        {location && isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Buscando cargadores cercanos...</span>
            </div>
          </div>
        )}

        {/* Chargers list */}
        {location && !isLoading && sortedChargers.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Los 20 puntos de carga más cercanos a tu ubicación
            </p>
            {sortedChargers.map((charger, index) => (
              <div
                key={charger.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{charger.name}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {charger.powerKw && (
                          <span
                            className={`text-sm font-bold px-2 py-0.5 rounded ${
                              charger.powerKw >= 50
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : charger.powerKw >= 22
                                ? "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300"
                                : "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300"
                            }`}
                          >
                            {charger.powerKw} kW
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {charger.distance < 1
                            ? `${Math.round(charger.distance * 1000)} m`
                            : `${charger.distance.toFixed(1)} km`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      {charger.address && (
                        <p className="text-gray-600 dark:text-gray-400">{charger.address}</p>
                      )}
                      <p className="text-gray-500 dark:text-gray-400">
                        {charger.city}
                        {charger.province && `, ${charger.province}`}
                      </p>
                      {charger.operatorName && (
                        <p className="text-gray-400">Operador: {charger.operatorName}</p>
                      )}
                    </div>

                    {charger.connectorTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {charger.connectorTypes.map((type) => (
                          <span
                            key={type}
                            className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Cómo llegar
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://www.google.com/maps?q=${charger.latitude},${charger.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 dark:text-gray-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Ver en mapa
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No chargers */}
        {location && !isLoading && sortedChargers.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No se encontraron cargadores
            </h3>
            <p className="text-gray-500 dark:text-gray-400">No hay puntos de carga registrados cerca de tu ubicación</p>
          </div>
        )}
      </div>
    </div>
  );
}
