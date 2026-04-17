"use client";

import { TraficoMapEmbed } from "@/components/map/TraficoMapEmbed";

interface Station {
  id: string;
  stationCode: string;
  province: string | null;
  provinceName: string | null;
  roadNumber: string;
  roadType: string | null;
  kmPoint: number;
  stationType: string | null;
  population: string | null;
  latitude: number;
  longitude: number;
  year: number;
  imd: number | null;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: number | null;
}

interface StationMapProps {
  // Retained for API compatibility with content.tsx — interactive click-to-select
  // and flyTo on selection are phase-2 features of the unified TraficoMap
  // (see docs/TRAFICOMAP-API.md entity-focus roadmap). Until then, users select
  // stations from the list/search; the map remains purely informational.
  onStationClick?: (station: Station) => void;
  selectedStation?: Station | null;
}

export default function StationMap(_props: StationMapProps) {
  return (
    <TraficoMapEmbed
      height={500}
      initialView={{ center: [-3.7, 40.4], zoom: 6 }}
      initialLayers={["stations"]}
      availableLayers={["stations", "road-segments", "sensors"]}
      controls={{ layerPanel: true, legend: true, themeToggle: true }}
      wrapperClassName="min-h-[400px]"
    />
  );
}
