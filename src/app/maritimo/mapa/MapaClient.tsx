"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Anchor, ArrowLeft, Loader2 } from "lucide-react";

const MaritimeMap = dynamic(() => import("./MaritimeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-tl-sea-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Anchor className="w-12 h-12 text-tl-sea-300 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-tl-sea-500">Cargando mapa marítimo...</p>
      </div>
    </div>
  ),
});

export function MapaClient() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Header */}
      <div className="bg-tl-sea-500 text-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Anchor className="w-4 h-4 shrink-0" />
            <span className="text-sm font-heading font-medium truncate">
              Mapa Marítimo
            </span>
          </div>
          <Link
            href="/maritimo"
            className="flex items-center gap-1 text-sm text-tl-sea-100 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver
          </Link>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        <MaritimeMap />
      </div>
    </div>
  );
}
