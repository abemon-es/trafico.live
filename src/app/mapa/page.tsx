"use client";

import { UnifiedMap } from "@/components/map/UnifiedMap";

export default function MapaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4">
        <UnifiedMap defaultHeight="calc(100vh - 120px)" showStats={true} />
      </main>
    </div>
  );
}
