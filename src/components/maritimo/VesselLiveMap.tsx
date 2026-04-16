"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import useSWR from "swr";
import { Crosshair, AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  mmsi: number;
  name: string | null;
  initialPosition?: {
    lat: number;
    lng: number;
    sog: number | null;
    cog: number | null;
    heading: number | null;
  };
}

interface TrackPoint {
  sog: number | null;
  cog: number | null;
  heading: number | null;
  navStatus: number | null;
  timestamp: string;
}

interface TrackGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: [number, number][] } | { type: "Point"; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

function projectHeadingVector(
  lng: number,
  lat: number,
  cogDeg: number
): [number, number] {
  // ~1 nautical mile projection
  const NM_DEG = 1 / 60;
  const rad = (cogDeg * Math.PI) / 180;
  return [
    lng + NM_DEG * Math.sin(rad) / Math.cos((lat * Math.PI) / 180),
    lat + NM_DEG * Math.cos(rad),
  ];
}

export function VesselLiveMap({ mmsi, name, initialPosition }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const mountedRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const {
    data: track,
    error: trackError,
    isLoading,
    mutate,
  } = useSWR<TrackGeoJSON>(`/api/maritimo/buques/${mmsi}/track?hours=24`, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  // Derive latest position point properties
  const latestPoint = track?.features.find(
    (f) => f.geometry.type === "Point"
  );
  const latestProps = latestPoint?.properties as unknown as TrackPoint | undefined;
  const latestCoords = latestPoint?.geometry.type === "Point"
    ? latestPoint.geometry.coordinates as [number, number]
    : null;

  const isStale =
    latestProps?.timestamp &&
    Date.now() - new Date(latestProps.timestamp).getTime() > 15 * 60 * 1000;

  // Center to use on init
  const initCenter: [number, number] = initialPosition
    ? [initialPosition.lng, initialPosition.lat]
    : latestCoords ?? [-3.7, 40.4];

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mountedRef.current || !mapRef.current) return;
    mountedRef.current = true;

    let map: typeof mapInstanceRef.current = null;

    (async () => {
      try {
        const [maplibregl, { initPMTilesProtocolAsync }, { getProtomapsDarkStyle }] =
          await Promise.all([
            import("maplibre-gl"),
            import("@/lib/pmtiles-protocol"),
            import("@/lib/map-tiles"),
          ]);

        await import("maplibre-gl/dist/maplibre-gl.css");
        await initPMTilesProtocolAsync();

        if (!mapRef.current) return;

        map = new maplibregl.default.Map({
          container: mapRef.current,
          style: getProtomapsDarkStyle(),
          center: initCenter,
          zoom: 10,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.default.NavigationControl({ showCompass: true }),
          "top-right"
        );

        map.on("load", () => {
          mapInstanceRef.current = map;
          setMapReady(true);
        });

        map.on("error", () => setMapError(true));
      } catch {
        setMapError(true);
      }
    })();

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update sources when track data changes ──────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !track) return;

    const trackFeature = track.features.find((f) => f.geometry.type === "LineString");
    const pointFeature = track.features.find((f) => f.geometry.type === "Point");
    if (!trackFeature || !pointFeature) return;

    const pointCoords = pointFeature.geometry.coordinates as [number, number];
    const props = pointFeature.properties as unknown as TrackPoint;
    const sog = props.sog ?? 0;
    const rotAngle =
      props.heading != null ? props.heading : props.cog != null ? props.cog : 0;
    const isMoving = sog > 0.5;

    // Build heading vector line
    const headingFeature =
      isMoving && (props.cog != null || props.heading != null)
        ? {
            type: "Feature" as const,
            geometry: {
              type: "LineString" as const,
              coordinates: [
                pointCoords,
                projectHeadingVector(
                  pointCoords[0],
                  pointCoords[1],
                  props.cog ?? props.heading ?? 0
                ),
              ],
            },
            properties: {},
          }
        : null;

    // ── Track line source ──
    const trackGeoJSON = { type: "FeatureCollection" as const, features: [trackFeature] };
    if (map.getSource("vessel-track")) {
      (map.getSource("vessel-track") as { setData: (d: unknown) => void }).setData(trackGeoJSON);
    } else {
      map.addSource("vessel-track", { type: "geojson", data: trackGeoJSON });
      map.addLayer({
        id: "vessel-track-line",
        type: "line",
        source: "vessel-track",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#d97706",
          "line-width": 2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });
    }

    // ── Position marker source ──
    const posGeoJSON = {
      type: "FeatureCollection" as const,
      features: [
        {
          ...pointFeature,
          properties: { ...props, rotate: rotAngle, isMoving },
        },
      ],
    };

    if (map.getSource("vessel-position")) {
      (map.getSource("vessel-position") as { setData: (d: unknown) => void }).setData(posGeoJSON);
    } else {
      // Create canvas icon: arrow (moving) or circle (stopped)
      function makeMarkerIcon(moving: boolean): HTMLCanvasElement {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, size, size);

        if (moving) {
          // Arrow pointing up (rotation handled by MapLibre)
          ctx.beginPath();
          ctx.moveTo(size / 2, 2);
          ctx.lineTo(size - 6, size - 4);
          ctx.lineTo(size / 2, size - 10);
          ctx.lineTo(6, size - 4);
          ctx.closePath();
          // White halo
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = "#eab308";
          ctx.fill();
        } else {
          // Circle
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = "#eab308";
          ctx.fill();
        }
        return canvas;
      }

      const arrowCanvas = makeMarkerIcon(true);
      const circleCanvas = makeMarkerIcon(false);

      if (!map.hasImage("vessel-arrow")) map.addImage("vessel-arrow", arrowCanvas, { pixelRatio: 1 });
      if (!map.hasImage("vessel-circle")) map.addImage("vessel-circle", circleCanvas, { pixelRatio: 1 });

      map.addSource("vessel-position", { type: "geojson", data: posGeoJSON });
      map.addLayer({
        id: "vessel-position-symbol",
        type: "symbol",
        source: "vessel-position",
        layout: {
          "icon-image": ["case", ["==", ["get", "isMoving"], true], "vessel-arrow", "vessel-circle"],
          "icon-size": 1,
          "icon-rotation-alignment": "map",
          "icon-rotate": ["get", "rotate"],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    // ── Heading vector source ──
    const headingGeoJSON = {
      type: "FeatureCollection" as const,
      features: headingFeature ? [headingFeature] : [],
    };

    if (map.getSource("vessel-heading")) {
      (map.getSource("vessel-heading") as { setData: (d: unknown) => void }).setData(headingGeoJSON);
    } else {
      map.addSource("vessel-heading", { type: "geojson", data: headingGeoJSON });
      map.addLayer({
        id: "vessel-heading-line",
        type: "line",
        source: "vessel-heading",
        layout: { "line-cap": "butt" },
        paint: {
          "line-color": "#f59e0b",
          "line-width": 3,
          "line-dasharray": [2, 3],
          "line-opacity": 0.9,
        },
      });
    }
  }, [track, mapReady]);

  // ── Center on vessel ────────────────────────────────────────────────────────
  const centerOnVessel = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const coords = latestCoords ?? (initialPosition ? [initialPosition.lng, initialPosition.lat] as [number, number] : null);
    if (coords) map.flyTo({ center: coords, zoom: 10, duration: 800 });
  }, [latestCoords, initialPosition]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const noData = !isLoading && !trackError && track && track.features.length === 0;
  const hasError = trackError || mapError;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-white/10">
      {/* Map canvas */}
      <div
        ref={mapRef}
        className="w-full"
        style={{ height: "clamp(320px, 42vw, 420px)" }}
        aria-label={`Mapa de posición del buque ${name ?? mmsi}`}
      />

      {/* Loading skeleton */}
      {(isLoading && !mapReady) && (
        <div className="absolute inset-0 bg-gradient-to-br from-tl-500/10 to-tl-900/20 animate-pulse flex items-center justify-center">
          <span className="text-sm text-white/50 font-sans">Cargando mapa...</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-tl-950/80 flex flex-col items-center justify-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-sm text-white/70 font-sans">No se pudo cargar la ruta</p>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-400/30 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      )}

      {/* No data state */}
      {noData && (
        <div className="absolute inset-0 bg-tl-950/70 flex items-center justify-center">
          <p className="text-sm text-white/50 font-sans">No hay datos recientes de posición</p>
        </div>
      )}

      {/* Center button */}
      {mapReady && (
        <button
          onClick={centerOnVessel}
          title="Centrar en buque"
          className="absolute top-3 right-14 z-10 bg-tl-900/90 hover:bg-tl-800/90 border border-white/10 rounded-lg p-1.5 text-white/80 hover:text-white transition-colors"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      )}

      {/* Stats badge top-left */}
      {latestProps && (
        <div className="absolute top-3 left-3 z-10 bg-tl-950/85 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-amber-400" style={{ fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              {latestProps.sog != null ? `${latestProps.sog.toFixed(1)} kn` : "— kn"}
            </span>
            {latestProps.cog != null && (
              <span className="text-xs text-white/60 font-sans">{Math.round(latestProps.cog)}°</span>
            )}
          </div>
          <span className="text-[10px] text-white/40 font-sans">
            {latestProps.timestamp ? formatRelativeTime(latestProps.timestamp) : ""}
          </span>
        </div>
      )}

      {/* Stale signal overlay */}
      {isStale && latestProps && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-950/80 border border-amber-500/30 rounded-full px-3 py-1">
          <span className="text-[11px] text-amber-300 font-sans">
            Señal perdida {formatRelativeTime(latestProps.timestamp)}
          </span>
        </div>
      )}

      {/* Legend bottom-right */}
      <div className="absolute bottom-3 right-3 z-10 bg-tl-950/85 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-white/60"
          style={{ background: "#eab308" }}
        />
        <span className="text-[10px] text-white/50 font-sans">Última posición AIS</span>
      </div>
    </div>
  );
}

export default VesselLiveMap;
