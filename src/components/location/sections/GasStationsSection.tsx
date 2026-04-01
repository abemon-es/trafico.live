import { Fuel } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationGasStations } from "@/lib/data/location-data";

interface GasStationsSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

function formatRelativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function formatPrice(price: unknown): string {
  if (price == null) return "—";
  return Number(price).toFixed(3);
}

export async function GasStationsSection({
  entity,
  limit = 10,
  spokeHref,
}: GasStationsSectionProps) {
  const { items, total, lastUpdated } = await getLocationGasStations(
    entity,
    limit
  );

  if (items.length === 0) return null;

  // Find cheapest diesel and gasolina 95 from the returned items
  const withDiesel = items.filter((s) => s.priceGasoleoA != null);
  const withGasolina = items.filter((s) => s.priceGasolina95E5 != null);
  const cheapestDiesel = withDiesel.sort(
    (a, b) => Number(a.priceGasoleoA) - Number(b.priceGasoleoA)
  )[0];
  const cheapestGasolina = withGasolina.sort(
    (a, b) => Number(a.priceGasolina95E5) - Number(b.priceGasolina95E5)
  )[0];

  return (
    <section
      id="combustible"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} gasolinera{total !== 1 ? "s" : ""} en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {cheapestDiesel && cheapestDiesel.priceGasoleoA != null && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-700 mb-1">
              Gasoil más barato
            </p>
            <p className="font-heading text-2xl font-bold text-amber-800 font-data">
              {formatPrice(cheapestDiesel.priceGasoleoA)}{" "}
              <span className="text-sm font-normal">€/L</span>
            </p>
            <p className="text-xs text-amber-600 mt-1 truncate">
              {cheapestDiesel.name}
              {cheapestDiesel.locality ? ` · ${cheapestDiesel.locality}` : ""}
            </p>
          </div>
        )}
        {cheapestGasolina && cheapestGasolina.priceGasolina95E5 != null && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-700 mb-1">
              Gasolina 95 más barata
            </p>
            <p className="font-heading text-2xl font-bold text-blue-800 font-data">
              {formatPrice(cheapestGasolina.priceGasolina95E5)}{" "}
              <span className="text-sm font-normal">€/L</span>
            </p>
            <p className="text-xs text-blue-600 mt-1 truncate">
              {cheapestGasolina.name}
              {cheapestGasolina.locality
                ? ` · ${cheapestGasolina.locality}`
                : ""}
            </p>
          </div>
        )}
      </div>

      {/* Compact price table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-2 pr-3 font-medium">Estación</th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                Gasoil
              </th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                G-95
              </th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                G-98
              </th>
              <th className="pb-2 font-medium font-data text-right">GLP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((station) => (
              <tr key={station.id} className="text-gray-700">
                <td className="py-2 pr-3">
                  <p className="font-medium truncate max-w-[160px]">
                    {station.name}
                  </p>
                  {station.locality && (
                    <p className="text-[10px] text-gray-400 truncate">
                      {station.locality}
                    </p>
                  )}
                </td>
                <td className="py-2 pr-3 font-data text-right text-amber-700">
                  {station.priceGasoleoA != null
                    ? formatPrice(station.priceGasoleoA)
                    : "—"}
                </td>
                <td className="py-2 pr-3 font-data text-right text-blue-700">
                  {station.priceGasolina95E5 != null
                    ? formatPrice(station.priceGasolina95E5)
                    : "—"}
                </td>
                <td className="py-2 pr-3 font-data text-right text-gray-600">
                  {station.priceGasolina98E5 != null
                    ? formatPrice(station.priceGasolina98E5)
                    : "—"}
                </td>
                <td className="py-2 font-data text-right text-gray-600">
                  {station.priceGLP != null
                    ? formatPrice(station.priceGLP)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alternative fuels note */}
      {items.some(
        (s) =>
          s.priceGNC != null || s.priceGNL != null || s.priceHidrogeno != null
      ) && (
        <p className="mt-3 text-[11px] text-gray-500">
          Algunas estaciones ofrecen GNC, GNL o Hidrógeno.{" "}
          {spokeHref && (
            <a href={spokeHref} className="text-tl-600 hover:underline">
              Ver detalles completos
            </a>
          )}
        </p>
      )}

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} gasolineras →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: MINETUR</p>
    </section>
  );
}
