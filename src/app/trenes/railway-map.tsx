"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Station {
  id: string;
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  serviceTypes: string[];
  province?: string;
  provinceName?: string;
}

interface Route {
  routeId: string;
  shortName?: string;
  longName?: string;
  serviceType: string;
  color?: string;
  shapeGeoJSON?: GeoJSON.LineString;
}

interface Alert {
  alertId: string;
  routeIds: string[];
  description: string;
  effect: string;
  isActive: boolean;
}

interface RailwayMapProps {
  stationsGeoJSON: GeoJSON.FeatureCollection | null;
  routes: Route[];
  alerts: Alert[];
  selectedServiceType: string | null;
  onStationClick: (station: Station) => void;
}

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];
const INITIAL_ZOOM = 6;

const SERVICE_COLORS: Record<string, string> = {
  CERCANIAS: "#059669",    // tl-success green
  RODALIES: "#059669",
  AVE: "#dc2626",          // tl-danger red (high-speed)
  LARGA_DISTANCIA: "#d48139", // tl-warning amber
  MEDIA_DISTANCIA: "#366cf8", // tl-info blue
  FEVE: "#8b5cf6",         // purple
};

function getStationColor(): maplibregl.ExpressionSpecification {
  return [
    "case",
    ["in", "CERCANIAS", ["get", "serviceTypesStr"]], SERVICE_COLORS.CERCANIAS,
    ["in", "AVE", ["get", "serviceTypesStr"]], SERVICE_COLORS.AVE,
    ["in", "LARGA_DISTANCIA", ["get", "serviceTypesStr"]], SERVICE_COLORS.LARGA_DISTANCIA,
    ["in", "MEDIA_DISTANCIA", ["get", "serviceTypesStr"]], SERVICE_COLORS.MEDIA_DISTANCIA,
    ["in", "FEVE", ["get", "serviceTypesStr"]], SERVICE_COLORS.FEVE,
    "#94b6ff", // default
  ];
}

export default function RailwayMap({
  stationsGeoJSON,
  routes,
  alerts,
  selectedServiceType,
  onStationClick,
}: RailwayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Build set of affected route IDs for alert highlighting
  const alertRouteIds = new Set(
    alerts.filter((a) => a.isActive).flatMap((a) => a.routeIds)
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
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
      // Route lines source (will be populated when routes change)
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Alert routes (highlighted in red)
      map.addSource("alert-routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Station points source
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Route lines layer
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            5, 1.5,
            10, 3,
            14, 5,
          ],
          "line-opacity": 0.7,
        },
      });

      // Alert route highlight layer (on top)
      map.addLayer({
        id: "alert-routes-line",
        type: "line",
        source: "alert-routes",
        paint: {
          "line-color": "#dc2626",
          "line-width": [
            "interpolate", ["linear"], ["zoom"],
            5, 3,
            10, 5,
            14, 8,
          ],
          "line-opacity": 0.8,
          "line-dasharray": [2, 1],
        },
      });

      // Station circles
      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-color": getStationColor(),
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            5, 3,
            10, 6,
            14, 10,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      // Station labels at higher zoom
      map.addLayer({
        id: "stations-label",
        type: "symbol",
        source: "stations",
        minzoom: 10,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // Interactions
      map.on("mouseenter", "stations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      // Hover popup
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

        const types = (props?.serviceTypesStr || "").replace(/,/g, ", ");

        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui;font-size:13px;line-height:1.4">
              <strong>${props?.name || ""}</strong><br/>
              <span style="color:#666">${props?.provinceName || ""}</span><br/>
              <span style="font-size:11px;color:#888">${types}</span>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "stations-circle", () => {
        popup.remove();
      });

      // Click
      map.on("click", "stations-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties) return;
        const p = feature.properties;
        onStationClick({
          id: p.id,
          stopId: p.stopId,
          name: p.name,
          latitude: Number((feature.geometry as GeoJSON.Point).coordinates[1]),
          longitude: Number((feature.geometry as GeoJSON.Point).coordinates[0]),
          serviceTypes: (p.serviceTypesStr || "").split(","),
          province: p.province,
          provinceName: p.provinceName,
        });
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update stations
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stationsGeoJSON) return;

    const updateSource = () => {
      const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        // Add serviceTypesStr property for expression matching
        const enriched: GeoJSON.FeatureCollection = {
          ...stationsGeoJSON,
          features: stationsGeoJSON.features.map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              serviceTypesStr: Array.isArray(f.properties?.serviceTypes)
                ? f.properties.serviceTypes.join(",")
                : (f.properties?.serviceTypes || ""),
            },
          })),
        };
        source.setData(enriched);
      }
    };

    if (map.loaded()) updateSource();
    else map.on("load", updateSource);
  }, [stationsGeoJSON]);

  // Update route lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoutes = () => {
      const routeSource = map.getSource("routes") as maplibregl.GeoJSONSource | undefined;
      const alertSource = map.getSource("alert-routes") as maplibregl.GeoJSONSource | undefined;

      const routeFeatures: GeoJSON.Feature[] = [];
      const alertFeatures: GeoJSON.Feature[] = [];

      for (const route of routes) {
        if (!route.shapeGeoJSON) continue;
        if (selectedServiceType && route.serviceType !== selectedServiceType) continue;

        const color = route.color || SERVICE_COLORS[route.serviceType] || "#94b6ff";
        const feature: GeoJSON.Feature = {
          type: "Feature",
          geometry: route.shapeGeoJSON,
          properties: {
            routeId: route.routeId,
            shortName: route.shortName,
            serviceType: route.serviceType,
            color,
          },
        };

        if (alertRouteIds.has(route.routeId)) {
          alertFeatures.push(feature);
        } else {
          routeFeatures.push(feature);
        }
      }

      routeSource?.setData({ type: "FeatureCollection", features: routeFeatures });
      alertSource?.setData({ type: "FeatureCollection", features: alertFeatures });
    };

    if (map.loaded()) updateRoutes();
    else map.on("load", updateRoutes);
  }, [routes, alerts, selectedServiceType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="w-full h-[550px] rounded-lg overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}
