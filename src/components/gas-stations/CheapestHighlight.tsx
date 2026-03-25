"use client";

import { Fuel, TrendingDown, MapPin } from "lucide-react";
import Link from "next/link";
import type { GasStationData } from "./GasStationCard";

interface CheapestHighlightProps {
  dieselStation: GasStationData | null;
  gasolineStation: GasStationData | null;
  title?: string;
  showLinks?: boolean;
}

export function CheapestHighlight({
  dieselStation,
  gasolineStation,
  title = "Gasolineras más baratas",
  showLinks = true,
}: CheapestHighlightProps) {
  if (!dieselStation && !gasolineStation) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <TrendingDown className="w-4 h-4 text-green-600" />
        </div>
        <h3 className="font-semibold text-green-900">{title}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cheapest Diesel */}
        {dieselStation && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-tl-amber-100 flex items-center justify-center">
                <Fuel className="w-3 h-3 text-tl-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Gasóleo A más barato</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-green-700">
                {dieselStation.priceGasoleoA?.toFixed(3)}€
              </span>
            </div>
            <div className="text-sm text-gray-900 font-medium mb-1">
              {dieselStation.name}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {dieselStation.locality || dieselStation.municipality}
              {dieselStation.provinceName && `, ${dieselStation.provinceName}`}
            </div>
            {dieselStation.nearestRoad && (
              <div className="text-xs text-tl-600 mt-1">
                {dieselStation.nearestRoad}
                {dieselStation.roadKm && ` km ${dieselStation.roadKm}`}
              </div>
            )}
            {showLinks && (
              <Link
                href={`/gasolineras/terrestres/${dieselStation.id}`}
                className="inline-block mt-2 text-xs text-green-600 hover:underline"
              >
                Ver detalles →
              </Link>
            )}
          </div>
        )}

        {/* Cheapest Gasoline 95 */}
        {gasolineStation && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-tl-100 flex items-center justify-center">
                <Fuel className="w-3 h-3 text-tl-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Gasolina 95 más barata</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-green-700">
                {gasolineStation.priceGasolina95E5?.toFixed(3)}€
              </span>
            </div>
            <div className="text-sm text-gray-900 font-medium mb-1">
              {gasolineStation.name}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              {gasolineStation.locality || gasolineStation.municipality}
              {gasolineStation.provinceName && `, ${gasolineStation.provinceName}`}
            </div>
            {gasolineStation.nearestRoad && (
              <div className="text-xs text-tl-600 mt-1">
                {gasolineStation.nearestRoad}
                {gasolineStation.roadKm && ` km ${gasolineStation.roadKm}`}
              </div>
            )}
            {showLinks && (
              <Link
                href={`/gasolineras/terrestres/${gasolineStation.id}`}
                className="inline-block mt-2 text-xs text-green-600 hover:underline"
              >
                Ver detalles →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
