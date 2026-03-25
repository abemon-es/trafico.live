"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Fuel } from "lucide-react";
import Link from "next/link";
import type { GasStationData } from "./GasStationCard";

type SortField = "name" | "priceGasoleoA" | "priceGasolina95E5" | "priceGasolina98E5" | "locality";
type SortDirection = "asc" | "desc";

interface FuelPriceTableProps {
  stations: GasStationData[];
  showRoad?: boolean;
  highlightCheapest?: boolean;
}

export function FuelPriceTable({
  stations,
  showRoad = false,
  highlightCheapest = true,
}: FuelPriceTableProps) {
  const [sortField, setSortField] = useState<SortField>("priceGasoleoA");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Find cheapest for each fuel type
  const cheapestDieselId = stations.reduce(
    (cheapest, station) => {
      if (!station.priceGasoleoA) return cheapest;
      if (!cheapest || station.priceGasoleoA < (cheapest.price ?? Infinity)) {
        return { id: station.id, price: station.priceGasoleoA };
      }
      return cheapest;
    },
    null as { id: string; price: number } | null
  )?.id;

  const cheapestGas95Id = stations.reduce(
    (cheapest, station) => {
      if (!station.priceGasolina95E5) return cheapest;
      if (!cheapest || station.priceGasolina95E5 < (cheapest.price ?? Infinity)) {
        return { id: station.id, price: station.priceGasolina95E5 };
      }
      return cheapest;
    },
    null as { id: string; price: number } | null
  )?.id;

  // Sort stations
  const sortedStations = [...stations].sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    switch (sortField) {
      case "name":
        aVal = a.name;
        bVal = b.name;
        break;
      case "priceGasoleoA":
        aVal = a.priceGasoleoA;
        bVal = b.priceGasoleoA;
        break;
      case "priceGasolina95E5":
        aVal = a.priceGasolina95E5;
        bVal = b.priceGasolina95E5;
        break;
      case "priceGasolina98E5":
        aVal = a.priceGasolina98E5;
        bVal = b.priceGasolina98E5;
        break;
      case "locality":
        aVal = a.locality || a.municipality;
        bVal = b.locality || b.municipality;
        break;
    }

    // Handle nulls
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return sortDirection === "asc" ? 1 : -1;
    if (bVal === null) return sortDirection === "asc" ? -1 : 1;

    // Compare
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal, "es")
        : bVal.localeCompare(aVal, "es");
    }

    return sortDirection === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
            <th
              className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:bg-gray-900"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center gap-1">
                Gasolinera
                <SortIcon field="name" />
              </div>
            </th>
            {showRoad && (
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Carretera</th>
            )}
            <th
              className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:bg-gray-900"
              onClick={() => handleSort("locality")}
            >
              <div className="flex items-center gap-1">
                Localidad
                <SortIcon field="locality" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:bg-gray-900"
              onClick={() => handleSort("priceGasoleoA")}
            >
              <div className="flex items-center justify-end gap-1">
                Gasóleo A
                <SortIcon field="priceGasoleoA" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:bg-gray-900"
              onClick={() => handleSort("priceGasolina95E5")}
            >
              <div className="flex items-center justify-end gap-1">
                Gasolina 95
                <SortIcon field="priceGasolina95E5" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:bg-gray-900"
              onClick={() => handleSort("priceGasolina98E5")}
            >
              <div className="flex items-center justify-end gap-1">
                Gasolina 98
                <SortIcon field="priceGasolina98E5" />
              </div>
            </th>
            <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">24h</th>
          </tr>
        </thead>
        <tbody>
          {sortedStations.map((station) => {
            const isCheapestDiesel = highlightCheapest && station.id === cheapestDieselId;
            const isCheapestGas95 = highlightCheapest && station.id === cheapestGas95Id;
            const isHighlighted = isCheapestDiesel || isCheapestGas95;

            return (
              <tr
                key={station.id}
                className={`
                  border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950
                  ${isHighlighted ? "bg-green-50 dark:bg-green-900/20" : ""}
                `}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/gasolineras/terrestres/${station.id}`}
                    className="flex items-center gap-2 hover:text-tl-600 dark:text-tl-400"
                  >
                    <Fuel className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span className="font-medium">{station.name}</span>
                  </Link>
                </td>
                {showRoad && (
                  <td className="px-4 py-3 text-tl-600 dark:text-tl-400">
                    {station.nearestRoad}
                    {station.roadKm && (
                      <span className="text-gray-400 ml-1 font-data">km {station.roadKm}</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {station.locality || station.municipality}
                </td>
                <td className="px-4 py-3 text-right">
                  {station.priceGasoleoA ? (
                    <span
                      className={`font-data ${isCheapestDiesel ? "font-bold text-green-700 dark:text-green-400" : ""}`}
                    >
                      {station.priceGasoleoA.toFixed(3)}€
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {station.priceGasolina95E5 ? (
                    <span
                      className={`font-data ${isCheapestGas95 ? "font-bold text-green-700 dark:text-green-400" : ""}`}
                    >
                      {station.priceGasolina95E5.toFixed(3)}€
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {station.priceGasolina98E5 ? (
                    <span className="font-data">{station.priceGasolina98E5.toFixed(3)}€</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {station.is24h ? (
                    <span className="inline-block w-5 h-5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs leading-5">
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedStations.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No hay gasolineras disponibles
        </div>
      )}
    </div>
  );
}
