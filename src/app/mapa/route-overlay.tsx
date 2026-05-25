"use client";

/**
 * RouteOverlay — full results panel after a route is calculated.
 *
 * Replaces the small inline RouteResultCard with a full overlay (bottom
 * sheet on mobile, side drawer on desktop). Tabs surface trafico.live's
 * indexed data applied to the route bbox:
 *
 *   - Resumen        — distance/time, alternatives, step-by-step
 *   - Combustible    — cheapest gas stations within the route bbox
 *   - Radares        — speed cameras in the route corridor
 *   - Incidencias    — active DGT incidents intersecting the route
 *
 * Each tab queries an existing API with a bbox computed from the route
 * polyline (no new server endpoints needed for v1).
 */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Route as RouteIcon,
  Fuel,
  Gauge,
  AlertTriangle,
  Clock,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { formatDistance, formatDuration, getManeuverText } from "@/lib/routing";
import type { RouteResponse, OSRMRoute, OSRMStep } from "@/lib/routing";

interface Props {
  result: RouteResponse;
  selectedRouteIdx: number;
  onSelectAlternative: (i: number) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onClose: () => void;
}

type TabId = "resumen" | "combustible" | "radares" | "incidencias";

interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface GasItem {
  id: string | number;
  name: string;
  address?: string | null;
  city?: string | null;
  priceGasolina95?: number | null;
  priceDiesel?: number | null;
  latitude: number;
  longitude: number;
  brand?: string | null;
}

interface RadarItem {
  id: string | number;
  type?: string | null;
  road?: string | null;
  km?: number | null;
  province?: string | null;
  speedLimit?: number | null;
  latitude: number;
  longitude: number;
}

interface IncidentItem {
  id: string | number;
  description?: string | null;
  type?: string | null;
  severity?: string | null;
  road?: string | null;
  km?: number | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

function computeBBox(route: OSRMRoute, paddingDeg = 0.02): BBox {
  const coords = route.geometry.coordinates as [number, number][];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  // Pad ~2km in each direction so we catch things just off the corridor
  return {
    minLng: minLng - paddingDeg,
    minLat: minLat - paddingDeg,
    maxLng: maxLng + paddingDeg,
    maxLat: maxLat + paddingDeg,
  };
}

// Haversine distance in km between two coords
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Minimum distance from a point to any vertex of the route polyline
// (fast enough for ~1k-point polylines; not as accurate as point-to-segment
// but good enough for "is this within X km of my route")
function distanceToRouteKm(lat: number, lon: number, route: OSRMRoute): number {
  const coords = route.geometry.coordinates as [number, number][];
  let min = Infinity;
  // Sample every 5th coord for perf — polylines have many redundant points
  for (let i = 0; i < coords.length; i += 5) {
    const [lng2, lat2] = coords[i];
    const d = haversineKm(lat, lon, lat2, lng2);
    if (d < min) min = d;
  }
  return min;
}

export function RouteOverlay({
  result,
  selectedRouteIdx,
  onSelectAlternative,
  visible,
  onToggleVisible,
  onClose,
}: Props) {
  const [tab, setTab] = useState<TabId>("resumen");
  const route = result.routes[selectedRouteIdx] ?? result.routes[0];
  const bbox = useMemo(() => computeBBox(route), [route]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:top-16 md:w-[380px] z-20 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none shadow-2xl"
      style={{
        background: "rgba(15,23,42,0.97)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "none",
        backdropFilter: "blur(12px)",
        color: "#e2e8f0",
        maxHeight: "70vh",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Navigation className="w-4 h-4" style={{ color: "#7da4f0" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">Ruta calculada</div>
          <div className="text-[11px]" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
            {formatDuration(route.duration)} · {formatDistance(route.distance)}
          </div>
        </div>
        <button
          onClick={onToggleVisible}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: visible ? "#94b6ff" : "#64748b" }}
          title={visible ? "Ocultar ruta en mapa" : "Mostrar ruta en mapa"}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          style={{ color: "#64748b" }}
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Tab id="resumen" current={tab} onClick={setTab} icon={RouteIcon} label="Resumen" />
        <Tab id="combustible" current={tab} onClick={setTab} icon={Fuel} label="Gasolina" />
        <Tab id="radares" current={tab} onClick={setTab} icon={Gauge} label="Radares" />
        <Tab id="incidencias" current={tab} onClick={setTab} icon={AlertTriangle} label="Tráfico" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {tab === "resumen" && (
          <ResumenTab
            result={result}
            selectedRouteIdx={selectedRouteIdx}
            onSelectAlternative={onSelectAlternative}
          />
        )}
        {tab === "combustible" && <CombustibleTab bbox={bbox} route={route} />}
        {tab === "radares" && <RadaresTab bbox={bbox} route={route} />}
        {tab === "incidencias" && <IncidenciasTab bbox={bbox} route={route} />}
      </div>
    </div>
  );
}

function Tab({
  id,
  current,
  onClick,
  icon: Icon,
  label,
}: {
  id: TabId;
  current: TabId;
  onClick: (t: TabId) => void;
  icon: React.ElementType;
  label: string;
}) {
  const active = id === current;
  return (
    <button
      onClick={() => onClick(id)}
      className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors text-[10px] font-medium"
      style={{
        color: active ? "#e2e8f0" : "#64748b",
        background: active ? "rgba(27,75,213,0.18)" : "transparent",
        borderBottom: active ? "2px solid #1b4bd5" : "2px solid transparent",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ResumenTab({
  result,
  selectedRouteIdx,
  onSelectAlternative,
}: {
  result: RouteResponse;
  selectedRouteIdx: number;
  onSelectAlternative: (i: number) => void;
}) {
  const route = result.routes[selectedRouteIdx];
  const steps = route.legs[0]?.steps ?? [];
  return (
    <div className="p-3 space-y-3">
      {/* Alternatives */}
      {result.routes.length > 1 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>
            Alternativas
          </div>
          <div className="flex flex-col gap-1">
            {result.routes.map((r, i) => {
              const isSel = i === selectedRouteIdx;
              return (
                <button
                  key={i}
                  onClick={() => onSelectAlternative(i)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors"
                  style={{
                    background: isSel ? "rgba(27,75,213,0.25)" : "rgba(255,255,255,0.04)",
                    border: isSel ? "1px solid rgba(27,75,213,0.55)" : "1px solid transparent",
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isSel ? "#94b6ff" : "#e2e8f0",
                      minWidth: 70,
                    }}
                  >
                    {formatDuration(r.duration)}
                  </span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>
                    {formatDistance(r.distance)}
                  </span>
                  {i === 0 && (
                    <span
                      className="ml-auto text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(34,197,94,0.18)", color: "#86efac" }}
                    >
                      Recomendada
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step-by-step */}
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>
          Indicaciones ({steps.length})
        </div>
        <div className="space-y-1">
          {steps.slice(0, 80).map((s, i) => (
            <StepRow key={i} step={s} index={i} />
          ))}
          {steps.length > 80 && (
            <div className="text-[10px] py-1 text-center" style={{ color: "#64748b" }}>
              +{steps.length - 80} pasos más
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, index }: { step: OSRMStep; index: number }) {
  const text = getManeuverText(step);
  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className="text-[10px] mt-0.5 shrink-0"
        style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace", minWidth: 24 }}
      >
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] leading-snug" style={{ color: "#cbd5e1" }}>
          {text}
          {step.name ? <span style={{ color: "#94a3b8" }}> · {step.name}</span> : null}
        </div>
        {step.distance > 50 && (
          <div className="text-[10px]" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
            {formatDistance(step.distance)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Data tabs ────────────────────────────────────────────────────────────────

function CombustibleTab({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const [items, setItems] = useState<GasItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/gas-stations?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&sort=priceGasolina95&order=asc&limit=200`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = (data.stations ?? data.results ?? data.data ?? []) as GasItem[];
        // Keep only stations within 2km of the route polyline
        const onRoute = raw.filter((g) => {
          const d = distanceToRouteKm(g.latitude, g.longitude, route);
          return d <= 2;
        });
        setItems(onRoute.slice(0, 30));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route]);

  return (
    <div className="p-3">
      <SectionHeader label="Gasolineras más baratas en la ruta (≤ 2 km)" loading={loading} count={items?.length} />
      {error && <EmptyState text={`Error: ${error}`} />}
      {!loading && items && items.length === 0 && <EmptyState text="No hay gasolineras en el corredor." />}
      <div className="space-y-1">
        {items?.map((g) => (
          <div
            key={g.id}
            className="px-2 py-1.5 rounded"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-baseline gap-2">
              <div className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>
                {g.name}
              </div>
              {typeof g.priceGasolina95 === "number" && (
                <div
                  className="ml-auto text-xs font-bold shrink-0"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: "#86efac" }}
                >
                  {g.priceGasolina95.toFixed(3)}€
                </div>
              )}
            </div>
            <div className="text-[10px] truncate" style={{ color: "#94a3b8" }}>
              {g.city ?? g.address ?? g.brand ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadaresTab({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const [items, setItems] = useState<RadarItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/radars?limit=5000`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = ((data.radars ?? data.data ?? data) as RadarItem[]).filter(
          (r) => typeof r.latitude === "number" && typeof r.longitude === "number",
        );
        const onRoute = raw.filter((r) => {
          const insideBbox =
            r.latitude >= bbox.minLat && r.latitude <= bbox.maxLat &&
            r.longitude >= bbox.minLng && r.longitude <= bbox.maxLng;
          if (!insideBbox) return false;
          return distanceToRouteKm(r.latitude, r.longitude, route) <= 0.5;
        });
        setItems(onRoute.slice(0, 50));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route]);

  return (
    <div className="p-3">
      <SectionHeader label="Radares en la ruta (≤ 500 m)" loading={loading} count={items?.length} />
      {error && <EmptyState text={`Error: ${error}`} />}
      {!loading && items && items.length === 0 && <EmptyState text="No hay radares en el corredor." />}
      <div className="space-y-1">
        {items?.map((r) => (
          <div key={r.id} className="px-2 py-1.5 rounded flex items-baseline gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#ef4444" }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>
                {r.road ?? "Sin carretera"} {r.km != null ? `km ${r.km}` : ""}
              </div>
              <div className="text-[10px]" style={{ color: "#94a3b8" }}>
                {r.type ?? "Radar"} · {r.province ?? ""} {r.speedLimit ? `· ${r.speedLimit} km/h` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncidenciasTab({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const [items, setItems] = useState<IncidentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/incidents?status=active&limit=1000`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = (data.incidents ?? data.data ?? []) as IncidentItem[];
        const withCoords = raw.filter((i) => typeof i.latitude === "number" && typeof i.longitude === "number");
        const onRoute = withCoords.filter((i) => {
          const lat = i.latitude as number;
          const lon = i.longitude as number;
          const insideBbox =
            lat >= bbox.minLat && lat <= bbox.maxLat &&
            lon >= bbox.minLng && lon <= bbox.maxLng;
          if (!insideBbox) return false;
          return distanceToRouteKm(lat, lon, route) <= 1;
        });
        setItems(onRoute.slice(0, 30));
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route]);

  return (
    <div className="p-3">
      <SectionHeader label="Incidencias en la ruta (≤ 1 km)" loading={loading} count={items?.length} />
      {error && <EmptyState text={`Error: ${error}`} />}
      {!loading && items && items.length === 0 && <EmptyState text="Sin incidencias activas en el corredor." />}
      <div className="space-y-1">
        {items?.map((i) => (
          <div key={i.id} className="px-2 py-1.5 rounded flex items-start gap-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <AlertTriangle
              className="w-3 h-3 mt-0.5 shrink-0"
              style={{ color: i.severity === "HIGH" ? "#ef4444" : i.severity === "MEDIUM" ? "#f59e0b" : "#94b6ff" }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>
                {i.description ?? i.type ?? "Incidencia"}
              </div>
              <div className="text-[10px] truncate" style={{ color: "#94a3b8" }}>
                {i.road ?? ""} {i.km != null ? `km ${i.km}` : ""} {i.province ? `· ${i.province}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  loading,
  count,
}: {
  label: string;
  loading: boolean;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>
      <span className="flex-1">{label}</span>
      {loading ? <Clock className="w-3 h-3 animate-pulse" /> : count != null ? <span>{count}</span> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="text-[11px] px-2 py-3 rounded text-center"
      style={{ color: "#64748b", background: "rgba(255,255,255,0.02)" }}
    >
      {text}
    </div>
  );
}
