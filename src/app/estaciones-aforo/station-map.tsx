"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";
import { setupPMTilesProtocol, TILE_SOURCES, LAYER_STYLES, addTileSource } from "@/lib/map-tiles";

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

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];
const INITIAL_ZOOM = 6;

export default function StationMap({
  onStationClick,
  selectedStation,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setupPMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DEFAULT,
      center: SPAIN_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 4,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      forceSpanishLabels(map);

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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to selected station
  useEffect(() => {
    if (!selectedStation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedStation.longitude, selectedStation.latitude],
      zoom: 12,
      duration: 1200,
    });
  }, [selectedStation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px]"
      style={{ minHeight: 400 }}
    />
  );
}
