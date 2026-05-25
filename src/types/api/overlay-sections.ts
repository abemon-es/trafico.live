/**
 * Response types for the 14 endpoints the /mapa route overlay queries.
 *
 * Half of these endpoints follow the `{ success, data: {...} }` envelope
 * convention; the other half return data fields at the top level. The
 * client previously coalesced over 3-4 possible paths per section, which
 * silently masked five sections where the path drifted (data.zones was
 * being matched as data.data, returning the wrapper object, then
 * Array.filter threw and got swallowed). These types make the path
 * explicit and put the failure at compile time instead of runtime.
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface Envelope<T> {
  success?: boolean;
  data?: T;
}

// ─── /api/zbe — Low-emission zones ───────────────────────────────────────────
export interface ZbeItem {
  id: string;
  name?: string;
  city?: string;
  province?: string;
  geom?: unknown;
  latitude?: number;
  longitude?: number;
}
export interface ZbeResponse extends Envelope<{ zones?: ZbeItem[]; summary?: unknown }> {}

// ─── /api/gas-stations ───────────────────────────────────────────────────────
export interface GasStationItem {
  id: string | number;
  name: string;
  address?: string | null;
  city?: string | null;
  priceGasolina95?: number | null;
  priceDiesel?: number | null;
  latitude: number;
  longitude: number;
  hasShop?: boolean;
  hasCafeteria?: boolean;
  hasRestaurant?: boolean;
}
// Top-level `data` is the array (legacy unwrapped shape from the gas-stations route)
export interface GasStationsResponse {
  success?: boolean;
  data?: GasStationItem[];
  stations?: GasStationItem[];
  pagination?: unknown;
}

// ─── /api/chargers — EV chargers ─────────────────────────────────────────────
export interface ChargerItem {
  id: string | number;
  name?: string;
  operator?: string | null;
  city?: string | null;
  powerKw?: number | null;
  connectorTypes?: string[];
  latitude: number;
  longitude: number;
}
export interface ChargersResponse {
  count?: number;
  chargers?: ChargerItem[];
  pagination?: unknown;
}

// ─── /api/trafico/obras — Roadworks ──────────────────────────────────────────
export interface RoadworksItem {
  id: string | number;
  description?: string | null;
  roadNumber?: string | null;
  road?: string | null;
  km?: number | null;
  kmStart?: number | null;
  kmEnd?: number | null;
  severity?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
export interface RoadworksResponse extends Envelope<{
  zones?: RoadworksItem[];
  total?: number;
  active?: number;
}> {}

// ─── /api/radars ─────────────────────────────────────────────────────────────
export interface RadarItem {
  id: string | number;
  type?: string | null;
  road?: string | null;
  km?: number | null;
  kmPoint?: number | null;
  province?: string | null;
  speedLimit?: number | null;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
}
export interface RadarsResponse {
  count?: number;
  radars?: RadarItem[];
}

// ─── /api/cameras ────────────────────────────────────────────────────────────
export interface CameraItem {
  id: string | number;
  name?: string | null;
  road?: string | null;
  km?: number | null;
  kmPoint?: number | null;
  province?: string | null;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  streamUrl?: string | null;
  imageUrl?: string | null;
}
export interface CamerasResponse {
  count?: number;
  cameras?: CameraItem[];
}

// ─── /api/panels — Variable message signs ────────────────────────────────────
export interface PanelItem {
  id: string | number;
  message?: string | null;
  road?: string | null;
  km?: number | null;
  province?: string | null;
  latitude: number;
  longitude: number;
}
export interface PanelsResponse {
  count?: number;
  panels?: PanelItem[];
}

// ─── /api/incidents ──────────────────────────────────────────────────────────
export interface IncidentItem {
  id: string | number;
  situationId?: string;
  description?: string | null;
  type?: string | null;
  severity?: string | null;
  road?: string | null;
  roadNumber?: string | null;
  km?: number | null;
  kmPoint?: number | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
export interface IncidentsResponse {
  count?: number;
  incidents?: IncidentItem[];
}

// ─── /api/accidentes/hotspots ────────────────────────────────────────────────
export interface HotspotItem {
  id?: string | number;
  road?: string | null;
  km?: number | null;
  province?: string | null;
  count?: number;
  accidentCount?: number;
  latitude?: number;
  longitude?: number;
}
export interface HotspotsResponse {
  hotspots?: HotspotItem[];
  total?: number;
}

// ─── /api/trenes/rutas — Alternative train routes ────────────────────────────
export interface TrainRouteItem {
  id: string | number;
  shortName?: string;
  longName?: string;
  brand?: string;
  origin?: string;
  destination?: string;
  durationMin?: number | null;
}
export interface TrainRoutesResponse extends Envelope<{
  routes?: TrainRouteItem[];
  pagination?: unknown;
  stats?: unknown;
}> {}

// ─── /api/weather-alerts ─────────────────────────────────────────────────────
export interface WeatherAlertItem {
  id: string | number;
  title?: string | null;
  level?: string | null;
  province?: string | null;
  area?: string | null;
  startsAt?: string;
  endsAt?: string;
}
export interface WeatherAlertsResponse {
  totalActive?: number;
  count?: number;
  alerts?: WeatherAlertItem[];
}

// ─── /api/calidad-aire ───────────────────────────────────────────────────────
export interface AirReading {
  id: string | number;
  stationName?: string;
  city?: string;
  province?: string;
  ica?: number | null;
  icaLabel?: string | null;
  latitude?: number;
  longitude?: number;
}
export interface AirQualityResponse extends Envelope<{
  stations?: AirReading[];
  pagination?: unknown;
  stats?: unknown;
}> {}

// ─── /api/trafico/intensidad — Real-time sensor intensity ────────────────────
export interface IntensityReading {
  sensorId: string;
  description?: string;
  intensity?: number | null;
  occupancy?: number | null;
  load?: number | null;
  serviceLevel?: number;
  saturation?: number | null;
  latitude: number;
  longitude: number;
}
export interface IntensityResponse extends Envelope<{
  source?: string;
  recordedAt?: string | null;
  sensorCount?: number;
  sensors?: IntensityReading[];
  avgIntensity?: number;
  congested?: number;
}> {}
