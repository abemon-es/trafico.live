"use client";

/**
 * RouteVehicleMap — shows live vehicle positions on a route on a MapLibre map.
 *
 * Pulls from /api/transporte/[operator]/vehiculos?route=X via SWR (15s refresh).
 * Renders route geometry (GeoJSON LineString from TransitRoute.geometry) plus
 * animated vehicle markers.
 *
 * Empty state: if no vehicles are returned, shows the route shape only with
 * a "Sin datos en tiempo real" badge. This is the expected state until
 * Agent B's collector populates TransitVehiclePosition.
 */

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Bus, RefreshCw } from "lucide-react";

export interface RouteVehicle {
  vehicleId: string;
  latitude: number;
  longitude: number;
  bearing: number | null;
  speed: number | null;
  reportedAt: string;
}

interface RouteVehicleMapProps {
  operatorSlug: string;
  routeId: string;
  /** GeoJSON LineString or MultiLineString for the route shape */
  routeGeometry: object | null;
  routeColor: string;
  /** Centre point if no geometry available */
  fallbackLat?: number;
  fallbackLon?: number;
}

interface VehicleApiResponse {
  vehicles: RouteVehicle[];
  count: number;
  updatedAt: string;
}

export default function RouteVehicleMap({
  operatorSlug,
  routeId,
  routeGeometry,
  routeColor,
  fallbackLat = 40.4,
  fallbackLon = -3.7,
}: RouteVehicleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<{ marker: any; vehicleId: string }>
  >([]);
  const [mapReady, setMapReady] = useState(false);
  const [initError, setInitError] = useState(false);

  const { data, error: swrError } = useSWR<VehicleApiResponse>(
    `/api/transporte/${encodeURIComponent(operatorSlug)}/vehiculos?route=${encodeURIComponent(routeId)}`,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true, dedupingInterval: 10000 }
  );

  // Initialise map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    let cancelled = false;

    async function init() {
      try {
        const [pmtilesLib, mapTilesLib] = await Promise.all([
          import("@/lib/pmtiles-protocol"),
          import("@/lib/map-tiles"),
        ]);
        const { getProtomapsStyle } = mapTilesLib;
        const maplibregl = (await import("maplibre-gl")).default;
        if (cancelled || !mapRef.current) return;
        await pmtilesLib.initPMTilesProtocolAsync();

        // Compute bounds from geometry or fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bounds: any = null;
        if (routeGeometry) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const geom = routeGeometry as any;
          const coords: [number, number][] =
            geom.type === "LineString"
              ? geom.coordinates
              : geom.type === "MultiLineString"
              ? geom.coordinates.flat()
              : [];
          if (coords.length > 0) {
            const lons = coords.map(([lon]) => lon);
            const lats = coords.map(([, lat]) => lat);
            bounds = [
              [Math.min(...lons) - 0.02, Math.min(...lats) - 0.02],
              [Math.max(...lons) + 0.02, Math.max(...lats) + 0.02],
            ];
          }
        }

        const map = new maplibregl.Map({
          container: mapRef.current!,
          style: getProtomapsStyle(),
          ...(bounds
            ? { bounds, fitBoundsOptions: { padding: 32 } }
            : { center: [fallbackLon, fallbackLat], zoom: 11 }),
          attributionControl: false,
        });

        mapInstance.current = map;

        map.on("load", () => {
          if (cancelled) return;

          // Route geometry layer
          if (routeGeometry) {
            map.addSource("route-shape", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: routeGeometry as never,
                properties: {},
              },
            });
            map.addLayer({
              id: "route-shape-shadow",
              type: "line",
              source: "route-shape",
              paint: {
                "line-color": "#000",
                "line-width": 6,
                "line-opacity": 0.1,
                "line-blur": 2,
              },
            });
            map.addLayer({
              id: "route-shape-line",
              type: "line",
              source: "route-shape",
              paint: {
                "line-color": routeColor,
                "line-width": 4,
                "line-opacity": 0.9,
              },
            });
          }

          map.addControl(
            new maplibregl.AttributionControl({ compact: true }),
            "bottom-right"
          );

          setMapReady(true);
        });
      } catch (e) {
        console.error("[RouteVehicleMap] init error:", e);
        setInitError(true);
      }
    }

    init();
    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update vehicle markers whenever SWR data changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let maplibregl: any;
    import("maplibre-gl").then((m) => {
      maplibregl = m.default;

      const vehicles = data?.vehicles ?? [];
      const newIds = new Set(vehicles.map((v) => v.vehicleId));

      // Remove stale markers
      markersRef.current = markersRef.current.filter(({ marker, vehicleId }) => {
        if (!newIds.has(vehicleId)) {
          marker.remove();
          return false;
        }
        return true;
      });

      // Update or add markers
      for (const v of vehicles) {
        const existing = markersRef.current.find(
          (m) => m.vehicleId === v.vehicleId
        );
        if (existing) {
          existing.marker.setLngLat([v.longitude, v.latitude]);
        } else {
          const el = document.createElement("div");
          el.style.cssText = `
            width:22px;height:22px;border-radius:50%;
            background:${routeColor};
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
          `;
          el.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 18h18M5 18v-6l7-7 7 7v6"/></svg>`;
          if (v.bearing !== null) {
            el.style.transform = `rotate(${v.bearing}deg)`;
          }
          const popup = new maplibregl.Popup({ offset: 14 }).setHTML(
            `<p style="font-size:12px;font-weight:600;margin:0">Vehículo ${v.vehicleId}</p>
             <p style="font-size:11px;color:#6b7280;margin:2px 0 0">${
               v.speed !== null ? `${Math.round(v.speed)} km/h` : "Sin velocidad"
             }</p>`
          );
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([v.longitude, v.latitude])
            .setPopup(popup)
            .addTo(mapInstance.current);
          markersRef.current.push({ marker, vehicleId: v.vehicleId });
        }
      }
    });
  }, [data, mapReady, routeColor]);

  const vehicleCount = data?.vehicles?.length ?? 0;
  const hasData = !swrError && data !== undefined;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ height: 320 }}
          aria-label="Mapa de vehículos en ruta"
          role="img"
        />

        {/* Live badge */}
        {mapReady && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-gray-200 dark:border-gray-700 text-xs font-semibold">
            {vehicleCount > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 dark:text-green-400">
                  {vehicleCount} {vehicleCount === 1 ? "vehículo" : "vehículos"}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">
                  Sin datos en tiempo real
                </span>
              </>
            )}
          </div>
        )}

        {initError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mapa no disponible
            </p>
          </div>
        )}
      </div>

      {/* Empty-state note when no RT data */}
      {hasData && vehicleCount === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-sm">
          <Bus className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">
              Datos en tiempo real próximamente
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-xs">
              El operador aún no dispone de feed GTFS-RT con posiciones de
              vehículos. La ruta y paradas están disponibles gracias al feed
              estático.
            </p>
          </div>
        </div>
      )}

      {/* Update time */}
      {data?.updatedAt && vehicleCount > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <RefreshCw className="w-3 h-3" />
          Actualizado:{" "}
          {new Date(data.updatedAt).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
