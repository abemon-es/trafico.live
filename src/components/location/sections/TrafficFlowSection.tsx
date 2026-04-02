import { Activity } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationTrafficFlow } from "@/lib/data/location-data";

interface TrafficFlowSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

export async function TrafficFlowSection({
  entity,
  limit = 10,
  spokeHref,
}: TrafficFlowSectionProps) {
  const { items, total } = await getLocationTrafficFlow(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="intensidad"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            Intensidad de tráfico en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Datos estáticos"></span>
        </div>
        <span className="text-xs text-gray-400 font-data">
          IMD (veh/día)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-2 pr-3 font-medium">Vía</th>
              <th className="pb-2 pr-3 font-medium font-data">Tramo km</th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                IMD
              </th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                % Pesados
              </th>
              <th className="pb-2 font-medium font-data text-right">Año</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((flow) => (
              <tr key={flow.id} className="text-gray-700">
                <td className="py-2 pr-3 font-data font-semibold text-tl-700">
                  {flow.roadNumber}
                </td>
                <td className="py-2 pr-3 font-data text-gray-600 text-sm">
                  {Number(flow.kmStart).toFixed(0)}–
                  {Number(flow.kmEnd).toFixed(0)}
                </td>
                <td className="py-2 pr-3 font-data font-bold text-right text-gray-900">
                  {flow.imd.toLocaleString("es-ES")}
                </td>
                <td className="py-2 pr-3 font-data text-right text-gray-500">
                  {flow.percentPesados != null
                    ? `${Number(flow.percentPesados).toFixed(1)}%`
                    : "—"}
                </td>
                <td className="py-2 font-data text-right text-gray-400">
                  {flow.year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver los {total} segmentos →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">
        Fuente: Ministerio de Transportes
      </p>
    </section>
  );
}
