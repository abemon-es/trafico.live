"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance } from "maplibre-gl";
import { setupPMTilesProtocol, TILE_SOURCES, LAYER_STYLES, addTileSource } from "@/lib/map-tiles";
import { InteractiveBaseMap } from "@/components/map/InteractiveBaseMap";

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
  onStationClick: (station: Station) => void;
  selectedStation: Station | null;
}

export default function StationMap({
  onStationClick,
  selectedStation,
}: StationMapProps) {
  const mapRef = useRef<MapInstance | null>(null);

  const handleMapLoad = useCallback((map: MapInstance) => {
    mapRef.current = map;

    // PMTiles protocol is already initialized by InteractiveBaseMap
    // Register again here as a no-op (safe — idempotent)
    setupPMTilesProtocol();

    // Vector tile source — data fetched directly by MapLibre
    addTileSource(map, "stations", TILE_SOURCES.stations);

    map.addLayer({
      ...LAYER_STYLES.stationsCircle,
    } as maplibregl.AddLayerObject);

    // Hover cursor
    map.on("mouseenter", "stations-circle", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "stations-circle", () => {
      map.getCanvas().style.cursor = "";
    });

    // Click handler — build Station-like object from tile properties
    map.on("click", "stations-circle", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties;
      onStationClick({
        id: props?.stationCode || "",
        stationCode: props?.stationCode || "",
        roadNumber: props?.roadNumber || "",
        kmPoint: Number(props?.kmPoint || 0),
        province: props?.province || null,
        provinceName: props?.provinceName || null,
        roadType: null,
        stationType: props?.stationType || null,
        population: props?.population || null,
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
        year: Number(props?.year || 0),
        imd: props?.imd ? Number(props.imd) : null,
        imdLigeros: props?.imdLigeros ? Number(props.imdLigeros) : null,
        imdPesados: props?.imdPesados ? Number(props.imdPesados) : null,
        percentPesados: props?.percentPesados ? Number(props.percentPesados) : null,
      });
    });

    // Popup on hover
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    map.on("mouseenter", "stations-circle", (e) => {
      const feature = e.features?.[0];
      if (!feature || !feature.geometry || feature.geometry.type !== "Point") return;
      const props = feature.properties;
      const coords = feature.geometry.coordinates as [number, number];

      const imd = props?.imd;
      const imdStr = imd ? Number(imd).toLocaleString("es-ES") : "Sin datos";

      popup
        .setLngLat(coords)
        .setHTML(
          `<div style="font-family:system-ui;font-size:13px;line-height:1.4">
            <strong>${props?.roadNumber || ""}</strong> km ${Number(props?.kmPoint || 0).toFixed(1)}<br/>
            <span style="color:#666">${props?.provinceName || ""}</span><br/>
            IMD: <strong>${imdStr}</strong> veh/día
          </div>`
        )
        .addTo(map);
    });

    map.on("mouseleave", "stations-circle", () => {
      popup.remove();
    });
  }, [onStationClick]);

  // Fly to selected station when it changes
  useEffect(() => {
    if (!selectedStation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedStation.longitude, selectedStation.latitude],
      zoom: 12,
      duration: 1200,
    });
  }, [selectedStation]);

  return (
    <InteractiveBaseMap
      height="500px"
      center={[-3.7, 40.4]}
      zoom={6}
      onMapLoad={handleMapLoad}
      showSidebar={false}
      showProvinces={true}
      showCities={true}
      showQuickAccess={true}
      className="min-h-[400px]"
    />
  );
}
