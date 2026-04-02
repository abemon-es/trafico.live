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
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative"
    >
      <LocationMap
        center={center ? [center.lng, center.lat] : undefined}
        zoom={12}
        markers={markers}
        height="h-[480px]"
        label={`Mapa de trafico de ${entityName}`}
        entityName={entityName}
      />

      {/* Floating legend overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur rounded-xl px-3.5 py-2.5 shadow-lg border border-white/50 flex flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-red" />
          Incidencias
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-tl-500" />
          Camaras
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          Radares
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-tl-amber-500" />
          Gasolineras
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-signal-green" />
          Cargadores EV
        </span>
      </div>
    </section>
  );
}
