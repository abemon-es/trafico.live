"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Loader2 } from "lucide-react";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";
import { initPMTilesProtocol } from "@/lib/pmtiles-protocol";

export interface ProvinceDataPoint {
  province: string; // INE 2-digit code or province name
  value: number;
  label?: string; // optional formatted label (e.g. "1.245 accidentes")
}

interface ProvinceHeatmapProps {
  data: ProvinceDataPoint[];
  metric: string; // legend label, e.g. "Accidentes" or "Víctimas mortales"
  colorScale?: [string, string]; // [light, dark] hex — defaults to yellow→red
  height?: string;
  isLoading?: boolean;
}

// Spain center
const SPAIN_CENTER: [number, number] = [-3.7, 40.4];
const GEOJSON_URL = "/geo/spain-provinces.geojson";

// Default sequential color scale: light yellow → orange → dark red
const DEFAULT_COLOR_SCALE: [string, string] = ["#fef9c3", "#7f1d1d"];

// Interpolation stops (5 steps between light and dark)
function buildColorStops(
  min: number,
  max: number,
  light: string,
  dark: string
): (string | number)[] {
  const range = max - min || 1;
  // 6-stop interpolation
  return [
    min, light,
    min + range * 0.2, "#fde68a",
    min + range * 0.4, "#fb923c",
    min + range * 0.6, "#ef4444",
    min + range * 0.8, "#b91c1c",
    max, dark,
  ];
}

// Convert a hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function ProvinceHeatmap({
  data,
  metric,
  colorScale = DEFAULT_COLOR_SCALE,
  height = "480px",
  isLoading = false,
}: ProvinceHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Compute value range from data
  const values = data.map((d) => d.value).filter((v) => v > 0);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 1;

  // Build lookup: province code/name → data point
  const dataMap = new Map<string, ProvinceDataPoint>();
  for (const point of data) {
    dataMap.set(point.province.toLowerCase(), point);
    // also index without leading zero for codes like "01" → "1"
    if (/^\d+$/.test(point.province)) {
      dataMap.set(String(parseInt(point.province, 10)), point);
    }
  }

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Register PMTiles protocol before creating the map
    initPMTilesProtocol();

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_DEFAULT,
      center: SPAIN_CENTER,
      zoom: 5.5,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
    });

    map.current.on("load", () => {
      forceSpanishLabels(map.current!);
      setIsMapLoaded(true);
    });

    return () => {
      popup.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update choropleth when data or map is ready
  useEffect(() => {
    if (!map.current || !isMapLoaded || data.length === 0) return;

    const m = map.current;

    // Remove previous layers/sources if they exist
    if (m.getLayer("provinces-fill")) m.removeLayer("provinces-fill");
    if (m.getLayer("provinces-border")) m.removeLayer("provinces-border");
    if (m.getSource("provinces")) m.removeSource("provinces");

    // Fetch GeoJSON and enrich features with value property
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((geojson) => {
        if (!map.current) return;

        // Enrich each feature with its numeric value
        const enriched = {
          ...geojson,
          features: geojson.features.map((feature: GeoJSON.Feature) => {
            const props = feature.properties as Record<string, unknown>;

            // Try to match by INE code or name stored in GeoJSON properties
            const code = String(props.cod_prov ?? props.code ?? props.COD_PROV ?? "").toLowerCase();
            const name = String(props.name ?? props.NAME ?? props.nombre ?? props.NOMBRE ?? "").toLowerCase();

            let matched: ProvinceDataPoint | undefined =
              dataMap.get(code) ??
              dataMap.get(String(parseInt(code, 10) || 0)) ??
              dataMap.get(name);

            // Fallback: fuzzy name match
            if (!matched) {
              for (const [key, val] of dataMap.entries()) {
                if (name.includes(key) || key.includes(name)) {
                  matched = val;
                  break;
                }
              }
            }

            return {
              ...feature,
              properties: {
                ...props,
                _value: matched?.value ?? null,
                _label: matched?.label ?? (matched ? matched.value.toLocaleString("es-ES") : null),
                _province: matched?.province ?? props.name ?? code,
              },
            };
          }),
        };

        m.addSource("provinces", {
          type: "geojson",
          data: enriched,
        });

        const colorStops = buildColorStops(minVal, maxVal, colorScale[0], colorScale[1]);

        m.addLayer({
          id: "provinces-fill",
          type: "fill",
          source: "provinces",
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "_value"], null],
              "#e5e7eb", // no-data grey
              [
                "interpolate",
                ["linear"],
                ["get", "_value"],
                ...colorStops,
              ],
            ],
            "fill-opacity": 0.82,
          },
        });

        m.addLayer({
          id: "provinces-border",
          type: "line",
          source: "provinces",
          paint: {
            "line-color": "#ffffff",
            "line-width": 1.2,
            "line-opacity": 0.9,
          },
        });

        // Hover interactions
        m.on("mousemove", "provinces-fill", (e) => {
          if (!e.features || e.features.length === 0) return;
          m.getCanvas().style.cursor = "pointer";

          const props = e.features[0].properties as Record<string, unknown>;
          const provinceName = String(props._province ?? props.name ?? "Provincia");
          const val = props._value;
          const label = props._label;

          const html = `
            <div style="padding:8px 12px; min-width:140px; font-family: system-ui, sans-serif;">
              <p style="font-weight:700; font-size:13px; margin:0 0 4px 0; color:#111827;">${provinceName}</p>
              ${val !== null
                ? `<p style="font-size:12px; margin:0; color:#374151;">${metric}: <strong>${label ?? String(val)}</strong></p>`
                : `<p style="font-size:12px; margin:0; color:#9ca3af;">Sin datos</p>`
              }
            </div>
          `;

          popup.current
            ?.setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(m);
        });

        m.on("mouseleave", "provinces-fill", () => {
          m.getCanvas().style.cursor = "";
          popup.current?.remove();
        });
      })
      .catch((err) => {
        console.error("[ProvinceHeatmap] Failed to load GeoJSON:", err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isMapLoaded, minVal, maxVal, colorScale[0], colorScale[1], metric]);

  // Legend percentile positions
  const legendStops = [
    { pct: 0,   label: minVal.toLocaleString("es-ES"), color: colorScale[0] },
    { pct: 50,  label: Math.round((minVal + maxVal) / 2).toLocaleString("es-ES"), color: "#fb923c" },
    { pct: 100, label: maxVal.toLocaleString("es-ES"), color: colorScale[1] },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Map */}
      <div className="relative" style={{ height }}>
        {(isLoading || (!isMapLoaded && data.length > 0)) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-tl-600 dark:text-tl-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Cargando mapa...</span>
            </div>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Sin datos disponibles</p>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Color legend bar */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{metric}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-data text-gray-500 dark:text-gray-400 shrink-0">
            {minVal.toLocaleString("es-ES")}
          </span>
          {/* Gradient bar */}
          <div
            className="flex-1 h-3 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colorScale[0]}, #fde68a, #fb923c, #ef4444, #b91c1c, ${colorScale[1]})`,
            }}
          />
          <span className="text-xs font-data text-gray-500 dark:text-gray-400 shrink-0">
            {maxVal.toLocaleString("es-ES")}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700 inline-block" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Sin datos</span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            Fuente: DGT
          </span>
        </div>
      </div>

      <style jsx global>{`
        .maplibregl-popup-content {
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
          border: 1px solid #e5e7eb;
        }
        .maplibregl-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
}
