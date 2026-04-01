import { Camera } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationCameras } from "@/lib/data/location-data";

interface CamerasSectionProps {
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

export async function CamerasSection({
  entity,
  limit = 12,
  spokeHref,
}: CamerasSectionProps) {
  const { items, total, lastUpdated } = await getLocationCameras(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="camaras"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} cámara{total !== 1 ? "s" : ""} en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Camera grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((cam) => (
          <div
            key={cam.id}
            className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200 overflow-hidden">
              {cam.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cam.thumbnailUrl}
                  alt={cam.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Camera className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="text-xs font-medium text-gray-800 truncate">
                {cam.name}
              </p>
              {cam.roadNumber && (
                <p className="text-[10px] text-gray-500 font-data">
                  {cam.roadNumber}
                  {cam.kmPoint != null &&
                    ` · km ${Number(cam.kmPoint).toFixed(0)}`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} cámaras →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
