"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Fuel,
  MapPin,
  Loader2,
  Navigation,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Clock,
  LocateFixed,
} from "lucide-react";

// --- Types ---

interface GasStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  locality: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  is24h: boolean;
  schedule: string | null;
}

interface GasStationsResponse {
  success: boolean;
  data: GasStation[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface StationWithDistance extends GasStation {
  distance: number;
}

// --- Helpers ---

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Haversine distance in km */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Build bbox string from center + radius (km) */
function buildBbox(lat: number, lng: number, radiusKm: number): string {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [
    (lng - lngDelta).toFixed(5),
    (lat - latDelta).toFixed(5),
    (lng + lngDelta).toFixed(5),
    (lat + latDelta).toFixed(5),
  ].join(",");
}

function formatPrice(price: number | null): string {
  if (price == null) return "N/D";
  return `${price.toFixed(3)} €`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// --- Related links ---

const RELATED_LINKS = [
  { href: "/gasolineras/baratas", label: "Gasolineras baratas por ciudad" },
  { href: "/gasolineras/terrestres", label: "Todas las gasolineras" },
  { href: "/gasolineras/mapa", label: "Ver mapa de gasolineras" },
  { href: "/gasolineras/precios", label: "Precios por provincia" },
  { href: "/precio-gasolina-hoy", label: "Precio gasolina hoy" },
  { href: "/precio-diesel-hoy", label: "Precio diésel hoy" },
];

// --- Radius options ---

const RADIUS_OPTIONS = [5, 10, 20] as const;
type Radius = (typeof RADIUS_OPTIONS)[number];

// --- Main component ---

export default function GasolinerasCercaContent() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [radius, setRadius] = useState<Radius>(10);
  const [sortBy, setSortBy] = useState<"distance" | "diesel" | "gas95">("distance");

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError(
              "Has denegado el acceso a tu ubicación. Actívala en la configuración del navegador."
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("No se pudo obtener tu ubicación. Inténtalo de nuevo.");
            break;
          case err.TIMEOUT:
            setLocationError("La solicitud de ubicación ha expirado. Inténtalo de nuevo.");
            break;
          default:
            setLocationError("Error desconocido al obtener la ubicación.");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  }, []);

  // Build API URL once we have location
  const apiUrl = location
    ? `/api/gas-stations?bbox=${buildBbox(location.lat, location.lng, radius)}&pageSize=200`
    : null;

  const { data, isLoading } = useSWR<GasStationsResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  // Compute distance, filter to radius, sort
  const stations: StationWithDistance[] = location && data?.data
    ? data.data
        .map((s) => ({
          ...s,
          distance: haversine(location.lat, location.lng, s.latitude, s.longitude),
        }))
        .filter((s) => s.distance <= radius)
        .sort((a, b) => {
          if (sortBy === "diesel") {
            if (a.priceGasoleoA == null) return 1;
            if (b.priceGasoleoA == null) return -1;
            return a.priceGasoleoA - b.priceGasoleoA;
          }
          if (sortBy === "gas95") {
            if (a.priceGasolina95E5 == null) return 1;
            if (b.priceGasolina95E5 == null) return -1;
            return a.priceGasolina95E5 - b.priceGasolina95E5;
          }
          return a.distance - b.distance;
        })
        .slice(0, 20)
    : [];

  const mapUrl = location
    ? `/gasolineras/mapa?lat=${location.lat.toFixed(5)}&lng=${location.lng.toFixed(5)}&zoom=13`
    : "/gasolineras/mapa";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-gray-700 dark:text-gray-300 transition-colors">
            Inicio
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/gasolineras" className="hover:text-gray-700 dark:text-gray-300 transition-colors">
            Combustible
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 dark:text-gray-100 font-medium">Cerca de mí</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <LocateFixed className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Gasolineras Baratas Cerca de Mí
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Las {stations.length > 0 ? `${stations.length} ` : ""}gasolineras más cercanas a tu
            ubicación con precios de Gasóleo A y Gasolina 95 en tiempo real.
          </p>
        </div>

        {/* Location acquiring */}
        {isLocating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center mb-6">
            <Loader2 className="w-10 h-10 text-orange-600 dark:text-orange-400 animate-spin mx-auto mb-4" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Obteniendo tu ubicación...</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Permite el acceso a la ubicación para ver las gasolineras más cercanas.
            </p>
          </div>
        )}

        {/* Permission denied / error */}
        {locationError && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-red-800 mb-1">
                  Permite la ubicación para ver las gasolineras más cercanas
                </h2>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">{locationError}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                  <Link
                    href="/gasolineras/baratas"
                    className="px-4 py-2 bg-white dark:bg-gray-900 text-red-700 dark:text-red-400 border border-red-300 rounded-lg text-sm hover:bg-red-50 dark:bg-red-900/20 transition-colors"
                  >
                    Buscar por ciudad
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls — shown once location is known */}
        {location && !locationError && (
          <>
            {/* Location badge + map link */}
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Ubicación detectada</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <Link
                href={mapUrl}
                className="inline-flex items-center gap-1.5 text-sm text-orange-700 dark:text-orange-400 hover:text-orange-900 font-medium"
              >
                <Navigation className="w-4 h-4" />
                Ver en mapa
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Radius + sort controls */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-6 flex flex-wrap items-center gap-4">
              {/* Radius toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Radio:</span>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        radius === r
                          ? "bg-orange-600 text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950"
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-sm border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="distance">Distancia</option>
                  <option value="diesel">Gasóleo A más barato</option>
                  <option value="gas95">Gasolina 95 más barata</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Loading stations */}
        {location && isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Buscando gasolineras cercanas...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {location && !isLoading && stations.length > 0 && (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {stations.length} gasolinera{stations.length !== 1 ? "s" : ""} encontrada
              {stations.length !== 1 ? "s" : ""} en un radio de {radius} km
            </p>

            <div className="space-y-3">
              {stations.map((station, index) => (
                <Link
                  key={station.id}
                  href={`/gasolineras/terrestres/${station.id}`}
                  className="block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center text-sm font-bold text-orange-700 dark:text-orange-400 border border-orange-100">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Station name + distance */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                          {station.name}
                        </h2>
                        <span className="flex-shrink-0 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 px-2 py-0.5 rounded">
                          {formatDistance(station.distance)}
                        </span>
                      </div>

                      {/* Address */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
                        {[station.address, station.locality, station.provinceName]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      {/* Prices */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg p-2">
                          <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mb-0.5">Gasóleo A</div>
                          <div className="text-base font-bold text-tl-amber-700 dark:text-tl-amber-300">
                            {formatPrice(station.priceGasoleoA)}
                          </div>
                        </div>
                        <div className="bg-tl-50 dark:bg-tl-900/20 rounded-lg p-2">
                          <div className="text-xs text-tl-600 dark:text-tl-400 mb-0.5">Gasolina 95</div>
                          <div className="text-base font-bold text-tl-700 dark:text-tl-300">
                            {formatPrice(station.priceGasolina95E5)}
                          </div>
                        </div>
                      </div>

                      {/* Extra meta */}
                      <div className="flex items-center gap-3 mt-2">
                        {station.is24h && (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Clock className="w-3 h-3" />
                            Abierta 24 h
                          </span>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/${location.lat},${location.lng}/${station.latitude},${station.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:text-orange-400 transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                          Cómo llegar
                        </a>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* No results */}
        {location && !isLoading && stations.length === 0 && data && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No se encontraron gasolineras
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              No hay estaciones con precio registrado en un radio de {radius} km.
            </p>
            <button
              onClick={() => setRadius(radius === 5 ? 10 : 20)}
              className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors"
            >
              Ampliar a {radius === 5 ? 10 : 20} km
            </button>
          </div>
        )}

        {/* Related links */}
        <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Buscar combustible en España
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-orange-300 hover:shadow-sm transition-all group text-sm"
              >
                <Fuel className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-orange-700 dark:text-orange-400 transition-colors line-clamp-1">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
