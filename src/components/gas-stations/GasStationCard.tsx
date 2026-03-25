"use client";

import { Fuel, Clock, MapPin, ExternalLink } from "lucide-react";

export interface GasStationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  schedule: string | null;
  is24h: boolean;
  nearestRoad: string | null;
  roadKm: number | null;
  isCheapestDiesel?: boolean;
  isCheapestGas95?: boolean;
}

interface GasStationCardProps {
  station: GasStationData;
  highlightCheapest?: boolean;
  showRoad?: boolean;
}

export function GasStationCard({
  station,
  highlightCheapest = true,
  showRoad = false,
}: GasStationCardProps) {
  const isCheapest = station.isCheapestDiesel || station.isCheapestGas95;
  const googleMapsUrl = `https://www.google.com/maps?q=${station.latitude},${station.longitude}`;

  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border overflow-hidden
        ${highlightCheapest && isCheapest
          ? "border-green-300 ring-2 ring-green-100"
          : "border-gray-200"
        }
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isCheapest ? "bg-green-100" : "bg-orange-100"}
              `}
            >
              <Fuel className={`w-4 h-4 ${isCheapest ? "text-green-600" : "text-orange-600"}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{station.name}</h3>
              {showRoad && station.nearestRoad && (
                <span className="text-xs text-tl-600 font-medium">
                  {station.nearestRoad}
                  {station.roadKm && ` km ${station.roadKm}`}
                </span>
              )}
            </div>
          </div>
          {station.is24h && (
            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              24h
            </span>
          )}
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {station.priceGasoleoA && (
            <div
              className={`
                p-2 rounded-lg text-center
                ${station.isCheapestDiesel ? "bg-green-50 border border-green-200" : "bg-gray-50"}
              `}
            >
              <div className="text-xs text-gray-500 mb-0.5">Gasóleo A</div>
              <div
                className={`text-lg font-bold ${station.isCheapestDiesel ? "text-green-700" : "text-gray-900"}`}
              >
                {station.priceGasoleoA.toFixed(3)}€
              </div>
            </div>
          )}
          {station.priceGasolina95E5 && (
            <div
              className={`
                p-2 rounded-lg text-center
                ${station.isCheapestGas95 ? "bg-green-50 border border-green-200" : "bg-gray-50"}
              `}
            >
              <div className="text-xs text-gray-500 mb-0.5">Gasolina 95</div>
              <div
                className={`text-lg font-bold ${station.isCheapestGas95 ? "text-green-700" : "text-gray-900"}`}
              >
                {station.priceGasolina95E5.toFixed(3)}€
              </div>
            </div>
          )}
          {station.priceGasolina98E5 && (
            <div className="p-2 rounded-lg bg-gray-50 text-center">
              <div className="text-xs text-gray-500 mb-0.5">Gasolina 98</div>
              <div className="text-lg font-bold text-gray-900">
                {station.priceGasolina98E5.toFixed(3)}€
              </div>
            </div>
          )}
          {station.priceGLP && (
            <div className="p-2 rounded-lg bg-gray-50 text-center">
              <div className="text-xs text-gray-500 mb-0.5">GLP</div>
              <div className="text-lg font-bold text-gray-900">
                {station.priceGLP.toFixed(3)}€
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="text-sm text-gray-600 space-y-1">
          {station.address && <p className="truncate">{station.address}</p>}
          <p className="text-gray-500">
            {station.locality || station.municipality}
            {station.provinceName && `, ${station.provinceName}`}
          </p>
          {station.schedule && !station.is24h && (
            <p className="text-xs text-gray-400">{station.schedule}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <a
            href={`/gasolineras/terrestres/${station.id}`}
            className="text-sm text-tl-600 hover:underline"
          >
            Ver detalles
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <MapPin className="w-3 h-3" />
            Cómo llegar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
