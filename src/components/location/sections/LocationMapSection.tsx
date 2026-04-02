"use client";

import { useEffect, useState } from "react";
import { LocationMap } from "@/components/location/LocationMap";
import type { FeatureCollection } from "geojson";

interface LocationMapSectionProps {
  center?: { lat: number; lng: number };
  entityName: string;
  provinceCode?: string;
}

export function LocationMapSection({
  center,
  entityName,
  provinceCode,
}: LocationMapSectionProps) {
  const [markers, setMarkers] = useState<FeatureCollection | undefined>();

  useEffect(() => {
    if (!provinceCode) return;

    let cancelled = false;

    async function loadMarkers() {
      try {
        const res = await fetch(
          `/api/incidents?province=${provinceCode}&limit=100`
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();

        if (cancelled) return;

        if (data?.geojson) {
          const fc: FeatureCollection = {
            type: "FeatureCollection",
            features: (data.geojson.features || []).map(
              (f: Record<string, unknown>) => ({
                ...f,
                properties: {
                  ...(f.properties as Record<string, unknown>),
                  category: "incident",
                },
              })
            ),
          };
          setMarkers(fc);
        }
      } catch {
        // Silently fail — map still renders without markers
      }
    }

    loadMarkers();

    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  return (
    <section
      id="mapa"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <LocationMap
        center={center ? [center.lng, center.lat] : undefined}
        zoom={12}
        markers={markers}
        height="h-[480px]"
        label={`Mapa de trafico de ${entityName}`}
        entityName={entityName}
      />

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-red" />
          Incidencias
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-tl-500" />
          Camaras
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          Radares
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-tl-amber-500" />
          Gasolineras
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-green" />
          Cargadores EV
        </span>
      </div>
    </section>
  );
}
