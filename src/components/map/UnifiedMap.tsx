"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import dynamic from "next/dynamic";
import { Map as MapIcon, AlertTriangle, Loader2 } from "lucide-react";
import { MapControls, type ActiveLayers, type IncidentFilters, type LocationPreset } from "./MapControls";
import { MapStats } from "./MapStats";
import type { V16Beacon, Incident, Camera, PanelData, TrafficMapRef, IncidentViewMode } from "./TrafficMap";
import { useTrafficStream } from "@/hooks/useTrafficStream";
import { useVoiceAlerts } from "@/hooks/useVoiceAlerts";
import { useRouteAlerts } from "@/hooks/useRouteAlerts";
import { IncidentModal, type IncidentData } from "@/components/incidents/IncidentModal";
import {
  EFFECT_LABELS,
  CAUSE_LABELS,
  EFFECT_COLORS,
} from "./IncidentMarker";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import { TimeSlider } from "./TimeSlider";
import { useRadarProximity } from "@/hooks/useRadarProximity";
import { RadarHUD } from "./RadarHUD";
import { InfrastructureDetailPanel } from "./InfrastructureDetailPanel";
import { useDetailPanel } from "@/hooks/useDetailPanel";
import type { InfrastructureDetail } from "./InfrastructureDetailPanel";

// Dynamic imports for heavy map components (avoid bloating main bundle)
const CorridorView = dynamic(() => import("./CorridorView").then((m) => m.CorridorView), { ssr: false });
const ZoneInsights = dynamic(() => import("./ZoneInsights").then((m) => m.ZoneInsights), { ssr: false });
const MapComparator = dynamic(() => import("./MapComparator").then((m) => m.MapComparator), { ssr: false });

// Dynamic import for map to avoid SSR issues
const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-gray-400" />
    </div>
  ),
});

// Map location presets for quick navigation
const MAP_PRESETS: Record<LocationPreset, { center: [number, number]; zoom: number }> = {
  peninsula: { center: [-3.7038, 40.4168], zoom: 6 },
  canarias: { center: [-15.8, 28.3], zoom: 8 },
  ceuta: { center: [-5.32, 35.89], zoom: 12 },
  melilla: { center: [-2.94, 35.29], zoom: 12 },
};

interface V16Response {
  count: number;
  beacons: V16Beacon[];
}

interface IncidentsResponse {
  count: number;
  incidents: Incident[];
}

interface CamerasResponse {
  count: number;
  cameras: Camera[];
}

interface Charger {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  province: string;
  operator: string | null;
  totalPowerKw: number;
  connectorCount: number;
  connectorTypes: string[];
  is24h: boolean;
}

interface ChargersResponse {
  count: number;
  chargers: Charger[];
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  province: string;
  provinceName: string | null;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
}

interface WeatherResponse {
  count: number;
  alerts: WeatherAlert[];
  counts: { byType: Record<string, number>; byProvince: Record<string, number> };
}

export interface RadarData {
  id: string;
  radarId: string;
  lat: number;
  lng: number;
  road: string;
  kmPoint: number;
  direction: string | null;
  province: string;
  provinceName: string;
  type: string;
  speedLimit: number | null;
  avgSpeedPartner: string | null;
  lastUpdated: string;
}

interface RadarsResponse {
  count: number;
  radars: RadarData[];
  provinces: string[];
  roads: string[];
  types: string[];
}

export interface RiskZoneData {
  id: string;
  type: string;
  roadNumber: string;
  kmStart: number;
  kmEnd: number;
  geometry: unknown;
  severity: string;
  description: string | null;
  animalType: string | null;
  incidentCount: number | null;
  lastUpdated: string;
}

interface RiskZonesResponse {
  success: boolean;
  data: {
    zones: RiskZoneData[];
    summary: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      topRoads: { road: string; count: number }[];
    };
  };
}

export interface ZBEZone {
  id: string;
  name: string;
  cityName: string;
  polygon: unknown;
  centroid: { lat: number; lng: number } | null;
  restrictions: Record<string, string>;
  schedule: Record<string, string | null> | null;
  activeAllYear: boolean;
  fineAmount: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  sourceUrl: string | null;
  lastUpdated: string;
}

interface ZBEResponse {
  success: boolean;
  data?: {
    zones: ZBEZone[];
    summary: {
      totalZones: number;
      activeZones: number;
      cities: string[];
    };
  };
  error?: string;
}

export interface GasStationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  postalCode: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

interface GasStationsResponse {
  success: boolean;
  data: GasStationData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface MaritimeStationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  locality: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

interface MaritimeStationsResponse {
  success: boolean;
  data: MaritimeStationData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface PanelsResponse {
  count: number;
  withMessages: number;
  panels: PanelData[];
}

interface UnifiedMapProps {
  defaultHeight?: string;
  showStats?: boolean;
  id?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  initialLayers?: Partial<ActiveLayers>;
  filterProvince?: string;
  filterRoad?: string;
}

// Valid filter values for URL parsing
const VALID_EFFECTS: IncidentEffect[] = ["ROAD_CLOSED", "SLOW_TRAFFIC", "RESTRICTED", "DIVERSION", "OTHER_EFFECT"];
const VALID_CAUSES: IncidentCause[] = ["ROADWORK", "ACCIDENT", "WEATHER", "RESTRICTION", "OTHER_CAUSE"];
const VALID_LAYERS: (keyof ActiveLayers)[] = ["v16", "incidents", "cameras", "chargers", "zbe", "weather", "highways", "provinces", "radars", "riskZones", "gasStations", "maritimeStations", "panels", "liveSpeed", "dangerScore", "roadworks", "sensors", "citySensors", "portugalGas", "railwayStations", "railwayRoutes", "airports", "ports", "transitStops", "transitRoutes", "ferryStops", "ferryRoutes", "roadSegments", "aircraft", "vessels", "climateStations"];

export function UnifiedMap({
  defaultHeight = "500px",
  showStats = true,
  id = "mapa",
  initialCenter,
  initialZoom,
  initialLayers,
  filterProvince,
  filterRoad,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TrafficMapRef>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentViewMode, setIncidentViewMode] = useState<IncidentViewMode>("clusters");
  const [darkMode, setDarkMode] = useState(false);
  const [terrain3D, setTerrain3D] = useState(false);
  const [weatherRadar, setWeatherRadar] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const [windOverlay, setWindOverlay] = useState(false);
  const [cloudOverlay, setCloudOverlay] = useState(false);
  const [tempOverlay, setTempOverlay] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [corridorActive, setCorridorActive] = useState(false);
  const [flowActive, setFlowActive] = useState(false);
  const [comparatorActive, setComparatorActive] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(6);
  const [timelineActive, setTimelineActive] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);

  // Connect SSE for real-time push updates — when connected, disable SWR polling
  const { isConnected: sseConnected } = useTrafficStream();

  // Parse initial state from URL or props
  const getInitialLayers = (): ActiveLayers => {
    // If initialLayers prop is provided, use it as the base
    if (initialLayers) {
      return {
        v16: initialLayers.v16 ?? false,
        incidents: initialLayers.incidents ?? false,
        cameras: initialLayers.cameras ?? false,
        chargers: initialLayers.chargers ?? false,
        zbe: initialLayers.zbe ?? false,
        weather: initialLayers.weather ?? false,
        highways: initialLayers.highways ?? false,
        provinces: initialLayers.provinces ?? false,
        radars: initialLayers.radars ?? false,
        riskZones: initialLayers.riskZones ?? false,
        gasStations: initialLayers.gasStations ?? false,
        maritimeStations: initialLayers.maritimeStations ?? false,
        panels: initialLayers.panels ?? false,
        liveSpeed: initialLayers.liveSpeed ?? false,
        dangerScore: initialLayers.dangerScore ?? false,
        roadworks: initialLayers.roadworks ?? false,
        sensors: initialLayers.sensors ?? false,
        citySensors: initialLayers.citySensors ?? false,
        portugalGas: initialLayers.portugalGas ?? false,
        railwayStations: initialLayers.railwayStations ?? false,
        railwayRoutes: initialLayers.railwayRoutes ?? false,
        airports: initialLayers.airports ?? false,
        ports: initialLayers.ports ?? false,
        transitStops: initialLayers.transitStops ?? false,
        transitRoutes: initialLayers.transitRoutes ?? false,
        ferryStops: initialLayers.ferryStops ?? false,
        ferryRoutes: initialLayers.ferryRoutes ?? false,
        roadSegments: initialLayers.roadSegments ?? false,
        aircraft: initialLayers.aircraft ?? false,
        vessels: initialLayers.vessels ?? false,
        climateStations: initialLayers.climateStations ?? false,
      };
    }

    const layersParam = searchParams.get("layers");
    if (layersParam) {
      const urlLayers = layersParam.split(",").filter((l) => VALID_LAYERS.includes(l as keyof ActiveLayers));
      return {
        v16: urlLayers.includes("v16"),
        incidents: urlLayers.includes("incidents"),
        cameras: urlLayers.includes("cameras"),
        chargers: urlLayers.includes("chargers"),
        zbe: urlLayers.includes("zbe"),
        weather: urlLayers.includes("weather"),
        highways: urlLayers.includes("highways"),
        provinces: urlLayers.includes("provinces"),
        radars: urlLayers.includes("radars"),
        riskZones: urlLayers.includes("riskZones"),
        gasStations: urlLayers.includes("gasStations"),
        maritimeStations: urlLayers.includes("maritimeStations"),
        panels: urlLayers.includes("panels"),
        liveSpeed: urlLayers.includes("liveSpeed"),
        dangerScore: urlLayers.includes("dangerScore"),
        roadworks: urlLayers.includes("roadworks"),
        sensors: urlLayers.includes("sensors"),
        citySensors: urlLayers.includes("citySensors"),
        portugalGas: urlLayers.includes("portugalGas"),
        railwayStations: urlLayers.includes("railwayStations"),
        railwayRoutes: urlLayers.includes("railwayRoutes"),
        airports: urlLayers.includes("airports"),
        ports: urlLayers.includes("ports"),
        transitStops: urlLayers.includes("transitStops"),
        transitRoutes: urlLayers.includes("transitRoutes"),
        ferryStops: urlLayers.includes("ferryStops"),
        ferryRoutes: urlLayers.includes("ferryRoutes"),
        roadSegments: urlLayers.includes("roadSegments"),
        aircraft: urlLayers.includes("aircraft"),
        vessels: urlLayers.includes("vessels"),
        climateStations: urlLayers.includes("climateStations"),
      };
    }
    // Default layers
    return {
      v16: true,
      incidents: true,
      cameras: false,
      chargers: false,
      zbe: false,
      weather: true,
      highways: true,
      provinces: false,
      radars: false,
      riskZones: false,
      gasStations: false,
      maritimeStations: false,
      panels: false,
      liveSpeed: false,
      dangerScore: false,
      roadworks: false,
      sensors: false,
      citySensors: false,
      portugalGas: false,
      railwayStations: false,
      railwayRoutes: false,
      airports: false,
      ports: false,
      transitStops: false,
      transitRoutes: false,
      ferryStops: false,
      ferryRoutes: false,
      roadSegments: false,
      aircraft: false,
      vessels: false,
      climateStations: false,
    };
  };

  const getInitialFilters = (): IncidentFilters => {
    const effectsParam = searchParams.get("effect");
    const causesParam = searchParams.get("cause");

    const effects = effectsParam
      ? effectsParam.split(",").filter((e) => VALID_EFFECTS.includes(e as IncidentEffect)) as IncidentEffect[]
      : [];
    const causes = causesParam
      ? causesParam.split(",").filter((c) => VALID_CAUSES.includes(c as IncidentCause)) as IncidentCause[]
      : [];

    return { effects, causes };
  };

  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(getInitialLayers);
  const [incidentFilters, setIncidentFilters] = useState<IncidentFilters>(getInitialFilters);

  // Update URL when state changes
  const updateURL = useCallback((layers: ActiveLayers, filters: IncidentFilters) => {
    const params = new URLSearchParams();

    // Only add layers param if different from default
    const activeLs = Object.entries(layers)
      .filter(([, active]) => active)
      .map(([key]) => key);
    const defaultLayers = ["v16", "incidents", "weather", "highways"];
    const isDefaultLayers = activeLs.length === defaultLayers.length &&
      defaultLayers.every((l) => activeLs.includes(l));

    if (!isDefaultLayers) {
      params.set("layers", activeLs.join(","));
    }

    // Add filter params if any
    if (filters.effects.length > 0) {
      params.set("effect", filters.effects.join(","));
    }
    if (filters.causes.length > 0) {
      params.set("cause", filters.causes.join(","));
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replaceState to avoid adding to history
    window.history.replaceState(null, "", newUrl);
  }, [pathname]);

  // Sync URL when filters or layers change
  useEffect(() => {
    updateURL(activeLayers, incidentFilters);
  }, [activeLayers, incidentFilters, updateURL]);

  // Fetch data — only when layer is active.
  // When SSE is connected, disable polling (SSE pushes trigger SWR revalidation).
  // When SSE disconnects, fall back to 60s polling.
  const v16PollInterval = sseConnected ? 0 : 60000;
  const incidentPollInterval = sseConnected ? 0 : 60000;

  const {
    data: v16Data,
    mutate: mutateV16,
    isLoading: v16Loading,
  } = useSWR<V16Response>(activeLayers.v16 ? "/api/v16" : null, fetcher, {
    refreshInterval: v16PollInterval,
    revalidateOnFocus: false,
    onSuccess: () => setLastUpdated(new Date()),
  });

  const {
    data: incidentsData,
    mutate: mutateIncidents,
    isLoading: incidentsLoading,
  } = useSWR<IncidentsResponse>(activeLayers.incidents ? "/api/incidents" : null, fetcher, {
    refreshInterval: incidentPollInterval,
    revalidateOnFocus: false,
    onSuccess: () => setLastUpdated(new Date()),
  });

  const { data: camerasData } = useSWR<CamerasResponse>(
    activeLayers.cameras ? "/api/cameras" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 }
  );

  const { data: chargersData } = useSWR<ChargersResponse>(
    activeLayers.chargers ? "/api/chargers" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 }
  );

  const { data: weatherData } = useSWR<WeatherResponse>(
    activeLayers.weather ? "/api/weather" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 }
  );

  // Semi-static data — radars, risk zones, ZBE don't change frequently
  const { data: radarsData } = useSWR<RadarsResponse>(
    activeLayers.radars ? "/api/radars" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  const { data: riskZonesData } = useSWR<RiskZonesResponse>(
    activeLayers.riskZones ? "/api/risk-zones" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  const { data: zbeData } = useSWR<ZBEResponse>(
    activeLayers.zbe ? "/api/zbe" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  // Build gas stations URL with filters
  const gasStationsUrl = (() => {
    if (!activeLayers.gasStations) return null;
    const params = new URLSearchParams({ limit: "500" });
    if (filterProvince) params.set("province", filterProvince);
    if (filterRoad) params.set("road", filterRoad);
    return `/api/gas-stations?${params.toString()}`;
  })();

  const { data: gasStationsData } = useSWR<GasStationsResponse>(
    gasStationsUrl,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  // Build maritime stations URL with filters
  const maritimeStationsUrl = (() => {
    if (!activeLayers.maritimeStations) return null;
    const params = new URLSearchParams({ limit: "200" });
    if (filterProvince) params.set("province", filterProvince);
    return `/api/maritime-stations?${params.toString()}`;
  })();

  const { data: maritimeStationsData } = useSWR<MaritimeStationsResponse>(
    maritimeStationsUrl,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 0 }
  );

  const { data: panelsData } = useSWR<PanelsResponse>(
    activeLayers.panels ? "/api/panels" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600000 }
  );

  const { data: liveSpeedData } = useSWR<{ success: boolean; data: GeoJSON.FeatureCollection; count: number }>(
    activeLayers.liveSpeed ? "/api/roads/live-speed" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 120000 }
  );

  const { data: dangerScoreData } = useSWR<{ success: boolean; data: { scores: Array<{ id: string; name: string; score: number; level: string }> } }>(
    activeLayers.dangerScore ? "/api/roads/danger-score" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: timelineData, isLoading: timelineLoading } = useSWR<{
    success: boolean;
    data: { slots: { timestamp: string; incidents: Incident[]; count: number }[]; hours: number; totalIncidents: number };
  }>((timelineActive || comparatorActive) ? "/api/incidents/timeline?hours=24&slots=24" : null, fetcher, { revalidateOnFocus: false });

  const { data: flowData } = useSWR<{ success: boolean; data: GeoJSON.FeatureCollection }>(
    flowActive ? "/api/roads/traffic-flow" : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  const isLoading = v16Loading || incidentsLoading;

  // Voice alerts for new incidents
  useVoiceAlerts(incidentsData?.incidents || [], { enabled: voiceEnabled });

  // Route alert notifications
  const { watchedRoads, watchRoad, unwatchRoad, isWatching } = useRouteAlerts({
    incidents: incidentsData?.incidents || [],
  });

  // Radar proximity (driving mode)
  const radarProximity = useRadarProximity({
    enabled: drivingMode,
    voiceEnabled: drivingMode,
  });

  // Infrastructure detail panel
  const { detail: infraDetail, showDetail: showInfraDetail, hideDetail: hideInfraDetail } = useDetailPanel();

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Handle initial center/zoom when provided via props
  useEffect(() => {
    if (initialCenter && mapRef.current) {
      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        mapRef.current?.flyTo(initialCenter[0], initialCenter[1], initialZoom || 9);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialCenter, initialZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
      if (e.key === "Escape" && isFullscreen) {
        // Handled by browser
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, isFullscreen]);

  const handleLayerToggle = (layer: keyof ActiveLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    if (!timelinePlaying || !timelineData?.data?.slots) return;
    const interval = setInterval(() => {
      setTimelineIndex((prev) => {
        if (prev + 1 >= timelineData.data.slots.length) { setTimelinePlaying(false); return prev; }
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [timelinePlaying, timelineData]);

  // Track map center/zoom for zone insights
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const onMoveEnd = () => {
      const center = map.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
      setMapZoom(map.getZoom());
    };
    map.on("moveend", onMoveEnd);
    return () => { map.off("moveend", onMoveEnd); };
  }, []);

  const effectiveIncidents = timelineActive && timelineData?.data?.slots?.[timelineIndex]
    ? timelineData.data.slots[timelineIndex].incidents : incidentsData?.incidents;

  const handleRefresh = () => {
    mutateV16();
    mutateIncidents();
  };

  const handleLocationChange = (preset: LocationPreset) => {
    const location = MAP_PRESETS[preset];
    mapRef.current?.flyTo(location.center[0], location.center[1], location.zoom);
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleListItemClick = (incident: Incident) => {
    setSelectedIncident(incident);
    mapRef.current?.flyTo(incident.lng, incident.lat, 14);
  };

  // Filter incidents for display
  const filteredIncidents = (effectiveIncidents || []).filter((incident) => {
    if (incidentFilters.effects.length === 0 && incidentFilters.causes.length === 0) {
      return true;
    }
    const effectMatch =
      incidentFilters.effects.length === 0 || incidentFilters.effects.includes(incident.effect);
    const causeMatch =
      incidentFilters.causes.length === 0 || incidentFilters.causes.includes(incident.cause);
    return effectMatch && causeMatch;
  });

  // Calculate counts for display
  const counts = {
    v16: v16Data?.count || 0,
    incidents: filteredIncidents.length,
    cameras: camerasData?.count || 0,
    chargers: chargersData?.count || 0,
    weather: weatherData?.count || 0,
    radars: radarsData?.count || 0,
    riskZones: riskZonesData?.data?.zones?.length || 0,
    zbe: zbeData?.data?.zones?.length || 0,
    gasStations: gasStationsData?.pagination?.total || 0,
    maritimeStations: maritimeStationsData?.pagination?.total || 0,
    panels: panelsData?.count || 0,
  };

  // Height calculation
  const mapHeight = isFullscreen ? "100%" : defaultHeight;

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        bg-white dark:bg-gray-900 flex flex-col
        ${isFullscreen ? "fixed inset-0 z-50" : "h-full overflow-hidden"}
      `}
    >
      {/* Controls */}
      <MapControls
        activeLayers={activeLayers}
        onLayerToggle={handleLayerToggle}
        incidentFilters={incidentFilters}
        onIncidentFiltersChange={setIncidentFilters}
        incidentViewMode={incidentViewMode}
        onIncidentViewModeChange={setIncidentViewMode}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onLocationChange={handleLocationChange}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode((d) => !d)}
        terrain3D={terrain3D}
        onTerrain3DToggle={() => setTerrain3D((t) => !t)}
        timelineActive={timelineActive}
        onTimelineToggle={() => { setTimelineActive((a) => !a); setTimelineIndex(0); setTimelinePlaying(false); }}
        corridorActive={corridorActive}
        onCorridorToggle={() => setCorridorActive((c) => !c)}
        flowActive={flowActive}
        onFlowToggle={() => setFlowActive((f) => !f)}
        comparatorActive={comparatorActive}
        onComparatorToggle={() => setComparatorActive((c) => !c)}
        weatherRadar={weatherRadar}
        onWeatherRadarToggle={() => setWeatherRadar((w) => !w)}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled((v) => !v)}
        windOverlay={windOverlay}
        onWindOverlayToggle={() => setWindOverlay((w) => !w)}
        cloudOverlay={cloudOverlay}
        onCloudOverlayToggle={() => setCloudOverlay((c) => !c)}
        tempOverlay={tempOverlay}
        onTempOverlayToggle={() => setTempOverlay((t) => !t)}
        satellite={satellite}
        onSatelliteToggle={() => setSatellite((s) => !s)}
        drivingMode={drivingMode}
        onDrivingModeToggle={() => setDrivingMode((d) => !d)}
        counts={counts}
      />

      {/* Main content area */}
      <div className="flex-1 min-h-0 relative">
        {/* Comparator mode */}
        {viewMode === "map" && comparatorActive && (
          <div className="h-full">
            <MapComparator
              currentIncidents={filteredIncidents.map((i) => ({ lat: i.lat, lng: i.lng, effect: i.effect }))}
              historicalIncidents={
                timelineData?.data?.slots?.[0]?.incidents?.map((i: Incident) => ({ lat: i.lat, lng: i.lng, effect: i.effect })) || []
              }
              onClose={() => setComparatorActive(false)}
            />
          </div>
        )}

        {/* Map */}
        {viewMode === "map" && !comparatorActive && (
          <div className="h-full relative">
            <TrafficMap
              ref={mapRef}
              activeLayers={activeLayers}
              v16Data={activeLayers.v16 ? v16Data?.beacons : undefined}
              incidentData={activeLayers.incidents ? (effectiveIncidents || undefined) : undefined}
              cameraData={activeLayers.cameras ? camerasData?.cameras : undefined}
              chargerData={activeLayers.chargers ? chargersData?.chargers : undefined}
              weatherData={activeLayers.weather ? weatherData?.alerts : undefined}
              radarData={activeLayers.radars ? radarsData?.radars : undefined}
              riskZoneData={activeLayers.riskZones ? riskZonesData?.data?.zones : undefined}
              zbeData={activeLayers.zbe ? zbeData?.data?.zones : undefined}
              gasStationData={activeLayers.gasStations ? gasStationsData?.data : undefined}
              maritimeStationData={activeLayers.maritimeStations ? maritimeStationsData?.data : undefined}
              panelData={activeLayers.panels ? panelsData?.panels : undefined}
              liveSpeedData={activeLayers.liveSpeed ? liveSpeedData?.data : undefined}
              dangerScoreData={activeLayers.dangerScore ? dangerScoreData?.data?.scores : undefined}
              incidentFilters={incidentFilters}
              incidentViewMode={incidentViewMode}
              darkMode={darkMode}
              terrain3D={terrain3D}
              flowData={flowActive ? flowData?.data || null : null}
              weatherRadar={weatherRadar}
              satellite={satellite}
              windOverlay={windOverlay}
              cloudOverlay={cloudOverlay}
              tempOverlay={tempOverlay}
              height="100%"
              onIncidentClick={handleIncidentClick}
              onInfrastructureClick={showInfraDetail}
            />
            {/* Zone insights overlay */}
            <ZoneInsights
              center={mapCenter}
              zoom={mapZoom}
              visible={!corridorActive && !comparatorActive}
              onClose={() => {}}
            />
            {/* Infrastructure detail panel */}
            <InfrastructureDetailPanel detail={infraDetail} onClose={hideInfraDetail} />
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div className="overflow-y-auto h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-tl-600 dark:text-tl-400 animate-spin" />
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No hay incidencias</p>
                <p className="text-sm">
                  {incidentFilters.effects.length > 0 || incidentFilters.causes.length > 0
                    ? "Prueba ajustando los filtros"
                    : "No hay incidencias activas"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIncidents.map((incident) => (
                  <IncidentListItem
                    key={incident.id}
                    incident={incident}
                    onClick={() => handleListItemClick(incident)}
                    isSelected={selectedIncident?.id === incident.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corridor view */}
      {corridorActive && (
        <CorridorView
          incidents={filteredIncidents}
          cameras={camerasData?.cameras || []}
          radars={(radarsData?.radars || []) as any}
          gasStations={(gasStationsData?.data || []) as any}
          onFlyTo={(lng, lat, zoom) => mapRef.current?.flyTo(lng, lat, zoom || 14)}
          onClose={() => setCorridorActive(false)}
        />
      )}

      {/* Stats bar */}
      {timelineActive && timelineData?.data?.slots && (
        <TimeSlider
          slots={timelineData.data.slots.map((s) => ({ timestamp: s.timestamp, count: s.count }))}
          currentIndex={timelineIndex}
          onIndexChange={setTimelineIndex}
          isPlaying={timelinePlaying}
          onPlayToggle={() => setTimelinePlaying((p) => !p)}
          isLoading={timelineLoading}
        />
      )}

      {showStats && (
        <MapStats
          v16Count={activeLayers.v16 ? counts.v16 : 0}
          incidentCount={activeLayers.incidents ? counts.incidents : 0}
          cameraCount={activeLayers.cameras ? counts.cameras : 0}
          panelCount={activeLayers.panels ? counts.panels : 0}
          radarCount={activeLayers.radars ? counts.radars : 0}
          chargerCount={activeLayers.chargers ? counts.chargers : 0}
          gasStationCount={activeLayers.gasStations ? counts.gasStations : 0}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          isFullscreen={isFullscreen}
          isStreaming={true}
        />
      )}

      {/* Radar HUD (driving mode) */}
      <RadarHUD proximityState={radarProximity} enabled={drivingMode} />

      {/* Incident Modal */}
      {selectedIncident && (
        <IncidentModal
          incident={incidentToModalData(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

// Helper to convert Incident to IncidentData for the modal
function incidentToModalData(incident: Incident): IncidentData {
  return {
    situationId: incident.id,
    type: incident.type,
    effect: incident.effect,
    cause: incident.cause,
    startedAt: incident.startedAt || new Date().toISOString(),
    endedAt: null,
    roadNumber: incident.road || null,
    kmPoint: incident.km || null,
    direction: null,
    province: incident.province || null,
    community: null,
    severity: incident.severity,
    description: incident.description || null,
    laneInfo: incident.laneInfo || null,
    source: "DGT",
    coordinates: [incident.lng, incident.lat],
  };
}

// List item component
function IncidentListItem({
  incident,
  onClick,
  isSelected,
}: {
  incident: Incident;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left hover:bg-gray-50 dark:bg-gray-950 transition-colors
        ${isSelected ? "bg-tl-50 dark:bg-tl-900/20" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: EFFECT_COLORS[incident.effect] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {incident.road && (
              <span className="font-semibold text-gray-900 dark:text-gray-100">{incident.road}</span>
            )}
            {incident.km && <span className="text-gray-500 dark:text-gray-400">km {incident.km}</span>}
            <span className="text-sm text-gray-600 dark:text-gray-400">{EFFECT_LABELS[incident.effect]}</span>
          </div>
          {incident.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{incident.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${EFFECT_COLORS[incident.effect]}20`,
                color: EFFECT_COLORS[incident.effect],
              }}
            >
              {CAUSE_LABELS[incident.cause]}
            </span>
            {incident.province && <span>{incident.province}</span>}
            {incident.startedAt && (
              <span>
                {new Date(incident.startedAt).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
