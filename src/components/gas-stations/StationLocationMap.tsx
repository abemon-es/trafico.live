"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { MapPin, ExternalLink, Navigation } from "lucide-react";

interface StationLocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
  stationType: "terrestrial" | "maritime";
  stationId: string;
  height?: number;
}

export function StationLocationMap({
  latitude,
  longitude,
  name,
  stationType,
  stationId,
  height = 250,
}: StationLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: false,
    });

    // Add zoom controls
    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    // Add attribution
    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    // Create marker element
    const el = document.createElement("div");
    el.className = "station-marker";
    el.innerHTML = `
      <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
        stationType === "maritime"
          ? "bg-blue-500"
          : "bg-orange-500"
      }">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${stationType === "maritime"
            ? '<circle cx="12" cy="5" r="3"/><line x1="12" x2="12" y1="22" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>'
            : '<path d="M3 22v-2c0-.6.4-1 1-1h16c.6 0 1 .4 1 1v2"/><path d="M12 15V2"/><path d="m8 5 4-3 4 3"/><path d="M3 15h18"/>'
          }
        </svg>
      </div>
    `;

    // Add marker
    marker.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([longitude, latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <p class="font-semibold text-sm">${name}</p>
            <p class="text-xs text-gray-500">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
          </div>
        `)
      )
      .addTo(map.current);

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude, name, stationType]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const mapPageUrl = stationType === "maritime"
    ? `/gasolineras/mapa?lat=${latitude}&lng=${longitude}&zoom=15&layer=maritime`
    : `/gasolineras/mapa?lat=${latitude}&lng=${longitude}&zoom=15`;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        ref={mapContainer}
        style={{ height: `${height}px` }}
        className="w-full"
      />
      <div className="p-3 flex items-center justify-between gap-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span className="font-mono">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
          >
            <Navigation className="w-3 h-3" />
            Llegar
          </a>
          <Link
            href={mapPageUrl}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Ver mapa
          </Link>
        </div>
      </div>
    </div>
  );
}
