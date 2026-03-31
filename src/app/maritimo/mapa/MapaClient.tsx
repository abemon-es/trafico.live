"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Anchor, Loader2, ArrowLeft } from "lucide-react";
import { UnifiedMap } from "@/components/map/UnifiedMap";

export function MapaClient() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Info bar */}
      <div className="bg-[var(--color-tl-sea-500)] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Anchor className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate">
              Mapa Marítimo — Estaciones de combustible náutico en el litoral español
            </span>
          </div>
          <Link
            href="/maritimo"
            className="flex items-center gap-1 text-sm text-[var(--color-tl-sea-100)] hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver
          </Link>
        </div>
      </div>

      {/* Map — fills remaining height */}
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="w-full h-full bg-[var(--color-tl-sea-50)] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--color-tl-sea-500)] animate-spin" />
            </div>
          }
        >
          <UnifiedMap
            initialLayers={{
              maritimeStations: true,
              weather: true,
            }}
            defaultHeight="100%"
            showStats={false}
            id="maritimo-mapa"
          />
        </Suspense>
      </div>
    </div>
  );
}
