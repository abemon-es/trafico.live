"use client";

import { TraficoMapEmbed } from "@/components/map/TraficoMapEmbed";

export default function IntensityMap({ height = 450 }: { height?: number | string }) {
  const px = typeof height === "string" ? parseInt(height, 10) || 450 : height;

  return (
    <TraficoMapEmbed
      height={px}
      initialView={{ center: [-3.7, 40.4], zoom: 6 }}
      initialLayers={["road-segments", "sensors", "stations"]}
      availableLayers={[
        "road-segments",
        "sensors",
        "city-sensors",
        "stations",
        "incidents",
        "roadworks",
        "cameras",
        "radars",
        "panels",
      ]}
      controls={{ layerPanel: true, legend: true, themeToggle: true }}
    />
  );
}
