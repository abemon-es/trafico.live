"use client";

/**
 * RouteOverlay — full results panel after a route is calculated.
 *
 * Bottom sheet on mobile / right-side drawer on desktop. Layout:
 *
 *   ┌───────────────────────────────────────┐
 *   │ Header: ETA + dist + 👁 + ✕           │  ← sticky
 *   │ Alternatives strip (chips)            │  ← sticky
 *   ├───────────────────────────────────────┤
 *   │ Scrollable column of sections:        │
 *   │   • Indicaciones (turn-by-turn)       │
 *   │   • Peajes (€)                        │
 *   │   • ZBE cruzadas                      │
 *   │   • Tráfico típico ahora              │
 *   │   • Combustible (cheap stations ≤2km) │
 *   │   • Cargadores EV ≤5km                │
 *   │   • Áreas servicio                    │
 *   │   • Trabajos / cortes                 │
 *   │   • Radares ≤500m                     │
 *   │   • Cámaras DGT ≤1km                  │
 *   │   • Paneles DGT activos               │
 *   │   • Incidencias activas               │
 *   │   • Puntos negros (accidentes)        │
 *   │   • Trenes alternativos               │
 *   │   • Meteo alertas (AEMET)             │
 *   │   • Calidad del aire                  │
 *   └───────────────────────────────────────┘
 *
 * Each section fetches its own data scoped to the route bbox + haversine
 * filter to the polyline. Empty sections show a short "Sin X en esta ruta"
 * message rather than disappearing, so the user knows we checked.
 */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Navigation,
  Fuel,
  Gauge,
  AlertTriangle,
  CircleDollarSign,
  Ban,
  Activity,
  Zap,
  Coffee,
  Construction,
  Video,
  MessageSquare,
  Train,
  Cloud,
  Wind,
  Skull,
  ChevronRight,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { formatDistance, formatDuration, getManeuverText } from "@/lib/routing";
import type { RouteResponse, OSRMRoute, OSRMStep } from "@/lib/routing";
import { matchTollsFromRoute, totalToll } from "@/lib/tolls";
import { CORRIDOR_DISTANCES_KM } from "./section-config";
import type {
  ZbeItem,
  ZbeResponse,
  GasStationItem,
  GasStationsResponse,
  ChargerItem,
  ChargersResponse,
  RoadworksItem,
  RoadworksResponse,
  RadarItem,
  RadarsResponse,
  CameraItem,
  CamerasResponse,
  PanelItem,
  PanelsResponse,
  IncidentItem,
  IncidentsResponse,
  HotspotItem,
  HotspotsResponse,
  TrainRouteItem,
  TrainRoutesResponse,
  WeatherAlertItem,
  WeatherAlertsResponse,
  AirReading,
  AirQualityResponse,
  IntensityReading,
  IntensityResponse,
} from "@/types/api/overlay-sections";

interface Props {
  result: RouteResponse;
  selectedRouteIdx: number;
  onSelectAlternative: (i: number) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onClose: () => void;
}

interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

function computeBBox(route: OSRMRoute, paddingDeg = 0.02): BBox {
  const coords = route.geometry.coordinates as [number, number][];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return {
    minLng: minLng - paddingDeg,
    minLat: minLat - paddingDeg,
    maxLng: maxLng + paddingDeg,
    maxLat: maxLat + paddingDeg,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceToRouteKm(lat: number, lon: number, route: OSRMRoute, step = 5): number {
  const coords = route.geometry.coordinates as [number, number][];
  let min = Infinity;
  for (let i = 0; i < coords.length; i += step) {
    const [lng2, lat2] = coords[i];
    const d = haversineKm(lat, lon, lat2, lng2);
    if (d < min) min = d;
  }
  return min;
}

function inBbox(lat: number, lon: number, b: BBox): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLng && lon <= b.maxLng;
}

// ─── Main overlay ────────────────────────────────────────────────────────────

export function RouteOverlay({
  result,
  selectedRouteIdx,
  onSelectAlternative,
  visible,
  onToggleVisible,
  onClose,
}: Props) {
  const route = result.routes[selectedRouteIdx] ?? result.routes[0];
  const bbox = useMemo(() => computeBBox(route), [route]);

  // Stable identity keys: passed as the only deps to section data hooks so
  // they refetch only when the corridor actually moves. The object refs
  // change every render (parent does result.routes[idx]); these strings
  // change only when the underlying values do.
  //
  // bboxKey is rounded to 3dp (~110m) so two alternatives that overlap
  // closely don't trigger spurious refetches.
  // routeKey uses length + first + last coords as a cheap polyline hash.
  const bboxKey = useMemo(
    () =>
      `${bbox.minLng.toFixed(3)},${bbox.minLat.toFixed(3)},${bbox.maxLng.toFixed(3)},${bbox.maxLat.toFixed(3)}`,
    [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
  );
  const routeKey = useMemo(() => {
    const coords = route.geometry.coordinates as [number, number][];
    const a = coords[0] ?? [0, 0];
    const b = coords[coords.length - 1] ?? [0, 0];
    return `${coords.length}:${a[0].toFixed(3)},${a[1].toFixed(3)}>${b[0].toFixed(3)},${b[1].toFixed(3)}`;
  }, [route]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:top-16 md:w-[400px] z-20 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none shadow-2xl"
      style={{
        background: "rgba(15,23,42,0.97)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "none",
        backdropFilter: "blur(12px)",
        color: "#e2e8f0",
        // 75dvh (dynamic viewport height) so the overlay shrinks correctly
        // when the iOS Safari keyboard opens — vh stays at the no-keyboard
        // size and the bottom of the panel would otherwise be unreachable.
        maxHeight: "75dvh",
      }}
    >
      {/* Sticky header — eta + dist + toggle + close */}
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
          aria-label={visible ? "Ocultar ruta en mapa" : "Mostrar ruta en mapa"}
          className="p-2.5 rounded hover:bg-white/10 min-h-[36px] min-w-[36px] flex items-center justify-center"
          style={{ color: visible ? "#94b6ff" : "#64748b" }}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar panel de ruta"
          className="p-2.5 rounded hover:bg-white/10 min-h-[36px] min-w-[36px] flex items-center justify-center"
          style={{ color: "#64748b" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sticky alternatives strip */}
      {result.routes.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {result.routes.map((r, i) => {
            const isSel = i === selectedRouteIdx;
            return (
              <button
                key={i}
                onClick={() => onSelectAlternative(i)}
                aria-pressed={isSel}
                aria-label={`Alternativa ${i + 1}: ${formatDuration(r.duration)}, ${formatDistance(r.distance)}`}
                className="shrink-0 px-3 py-2 rounded-full text-[11px] font-semibold transition-colors min-h-[36px]"
                style={{
                  background: isSel ? "rgba(27,75,213,0.32)" : "rgba(255,255,255,0.06)",
                  color: isSel ? "#94b6ff" : "#cbd5e1",
                  border: isSel ? "1px solid rgba(27,75,213,0.55)" : "1px solid transparent",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {i === 0 ? "★ " : ""}
                {formatDuration(r.duration)} · {formatDistance(r.distance)}
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable body — all sections stacked */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5">
        <PeajesSection route={route} />
        <ZBESection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <TraficoTipicoSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <CombustibleSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <CargadoresEVSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <AreasServicioSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <TrabajosSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <RadaresSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <CamarasSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <PanelesSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <IncidenciasSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <PuntosNegrosSection bbox={bbox} route={route} bboxKey={bboxKey} routeKey={routeKey} />
        <TrenesAltSection route={route} routeKey={routeKey} />
        <MeteoSection bboxKey={bboxKey} />
        <CalidadAireSection bbox={bbox} bboxKey={bboxKey} />
        <IndicacionesSection route={route} />
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  count,
  loading,
  error,
  empty,
  children,
  accent = "#7da4f0",
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  loading?: boolean;
  error?: string | null;
  empty?: string;
  children?: React.ReactNode;
  accent?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = !loading && !error && !empty && !!children;
  const sectionId = `route-section-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <div className="px-3 py-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={sectionId}
        className="w-full flex items-center gap-2 mb-1.5 min-h-[32px]"
      >
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
        <span className="text-[12px] font-semibold flex-1 text-left" style={{ color: "#e2e8f0" }}>
          {title}
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#64748b" }} aria-label="Cargando" />}
        {!loading && error && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "rgba(220,38,38,0.18)", color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}
            title={error}
          >
            error
          </span>
        )}
        {!loading && !error && count != null && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: count > 0 ? "rgba(27,75,213,0.18)" : "rgba(255,255,255,0.04)",
              color: count > 0 ? "#94b6ff" : "#64748b",
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: 22,
              textAlign: "center",
            }}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <div id={sectionId} role="region">
          {hasContent ? (
            children
          ) : error ? (
            <div
              className="text-[11px] py-1.5 px-2 rounded"
              role="status"
              style={{ color: "#fca5a5", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              No se pudo cargar — {error}
            </div>
          ) : empty ? (
            <div className="text-[11px] py-1.5 px-2 rounded" style={{ color: "#64748b", background: "rgba(255,255,255,0.02)" }}>
              {empty}
            </div>
          ) : loading ? (
            <div className="text-[11px] py-1.5 px-2" role="status" aria-live="polite" style={{ color: "#64748b" }}>Cargando…</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, iconColor = "#94b6ff", title, subtitle, value }: {
  icon?: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded mb-1" style={{ background: "rgba(255,255,255,0.04)" }}>
      {Icon && <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: iconColor }} />}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate" style={{ color: "#e2e8f0" }}>{title}</div>
        {subtitle && <div className="text-[10px] truncate" style={{ color: "#94a3b8" }}>{subtitle}</div>}
      </div>
      {value !== undefined && (
        <div className="text-[11px] font-bold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#86efac" }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ─── Generic data hook ──────────────────────────────────────────────────────

function useCorridorData<T>({
  url,
  pick,
  filter,
  deps,
}: {
  url: string;
  pick: (data: unknown) => T[];
  filter: (item: T) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[];
}): { items: T[] | null; loading: boolean; error: string | null } {
  const [items, setItems] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        try {
          const raw = pick(data);
          setItems(raw.filter(filter));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error parsing data");
        }
      })
      .catch((e) => {
        if (controller.signal.aborted || e?.name === "AbortError") return;
        setError(e?.message ?? "Error de red");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { items, loading, error };
}

// ─── Sections ────────────────────────────────────────────────────────────────

// Peajes — synchronous calc from lib/tolls.ts
function PeajesSection({ route }: { route: OSRMRoute }) {
  const matches = useMemo(() => matchTollsFromRoute(route), [route]);
  const total = useMemo(() => totalToll(matches), [matches]);
  return (
    <Section icon={CircleDollarSign} title="Peajes" count={matches.length} accent="#fbbf24"
      empty={matches.length === 0 ? "Sin peajes en esta ruta" : undefined}>
      {matches.length > 0 && (
        <>
          <div className="px-2 py-1.5 rounded mb-1.5 flex items-center justify-between" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <span className="text-[11px]" style={{ color: "#fde68a" }}>Total estimado</span>
            <span className="text-sm font-bold" style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}>
              {total.ligeros.toFixed(2)}€
            </span>
          </div>
          {matches.slice(0, 8).map((m) => (
            <Row key={m.tollRoadId} title={m.name} subtitle={m.operator} value={`${m.priceLigeros.toFixed(2)}€`} />
          ))}
        </>
      )}
    </Section>
  );
}

function ZBESection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<ZbeItem>({
    url: `/api/zbe?limit=500`,
    pick: (d) => (d as ZbeResponse).data?.zones ?? [],
    filter: (z) => {
      if (typeof z.latitude !== "number" || typeof z.longitude !== "number") return false;
      if (!inBbox(z.latitude, z.longitude, bbox)) return false;
      return distanceToRouteKm(z.latitude, z.longitude, route) <= CORRIDOR_DISTANCES_KM.zbe;
    },
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Ban} title="ZBE cruzadas" count={items?.length} loading={loading} error={error} accent="#ef4444"
      empty={!loading && items?.length === 0 ? "No cruzas ninguna Zona de Bajas Emisiones" : undefined}>
      {items?.slice(0, 10).map((z) => (
        <Row key={z.id} icon={Ban} iconColor="#ef4444" title={z.name ?? z.city ?? "ZBE"} subtitle={[z.city, z.province].filter(Boolean).join(" · ")} />
      ))}
    </Section>
  );
}

// Tráfico típico ahora — best-effort summary
function TraficoTipicoSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const hourNow = new Date().getHours();
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1-7 Mon-Sun
  // Spec: HourlyTrafficProfile averages by sensor/dow/hour. Here we just
  // surface a qualitative read from the bbox-bounded current sensors.
  const [stats, setStats] = useState<{ avg: number | null; samples: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/trafico/intensidad?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const readings: IntensityReading[] = (data as IntensityResponse).data?.sensors ?? [];
        const filtered = readings.filter((r) =>
          typeof r.latitude === "number" && inBbox(r.latitude, r.longitude, bbox) &&
          distanceToRouteKm(r.latitude, r.longitude, route) <= CORRIDOR_DISTANCES_KM.traffic,
        );
        if (filtered.length === 0) {
          setStats({ avg: null, samples: 0, tier: "Sin sensores" });
          return;
        }
        const avgLoad = filtered.reduce((s, r) => s + (r.load ?? 0), 0) / filtered.length;
        const tier =
          avgLoad < 30 ? "Fluido" :
          avgLoad < 60 ? "Denso" :
          avgLoad < 85 ? "Congestionado" : "Atasco";
        setStats({ avg: avgLoad, samples: filtered.length, tier });
      })
      .catch((e) => {
        if (controller.signal.aborted || e?.name === "AbortError") return;
        console.warn("[TraficoTipico] intensidad fetch failed:", e);
        setError(e?.message ?? "Error de red");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey, routeKey]);

  const color =
    stats?.tier === "Fluido" ? "#86efac" :
    stats?.tier === "Denso" ? "#fbbf24" :
    stats?.tier === "Congestionado" ? "#fb923c" :
    stats?.tier === "Atasco" ? "#ef4444" : "#94a3b8";

  return (
    <Section icon={Activity} title="Tráfico típico ahora" loading={loading} error={error} accent="#7da4f0"
      empty={!loading && !error && (!stats || stats.samples === 0) ? "Sin sensores en este corredor" : undefined}>
      {stats && stats.samples > 0 && (
        <div className="px-2 py-2 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold" style={{ color }}>{stats.tier}</span>
            {stats.avg != null && (
              <span className="text-[11px]" style={{ color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>
                carga {stats.avg.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>
            {stats.samples} sensores · {["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][dayNow]} {String(hourNow).padStart(2, "0")}:00
          </div>
        </div>
      )}
    </Section>
  );
}

function CombustibleSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<GasStationItem>({
    url: `/api/gas-stations?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&sort=priceGasolina95&order=asc&limit=200`,
    pick: (d) => {
      const r = d as GasStationsResponse;
      return r.stations ?? r.data ?? [];
    },
    filter: (g) => typeof g.latitude === "number" && distanceToRouteKm(g.latitude, g.longitude, route) <= CORRIDOR_DISTANCES_KM.gasStation,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Fuel} title="Gasolineras más baratas ≤ 2 km" count={items?.length} loading={loading} error={error} accent="#86efac"
      empty={!loading && items?.length === 0 ? "Sin gasolineras en el corredor" : undefined}>
      {items?.slice(0, 12).map((g) => (
        <Row key={g.id} title={g.name} subtitle={g.city ?? g.address ?? ""} value={typeof g.priceGasolina95 === "number" ? `${g.priceGasolina95.toFixed(3)}€` : "—"} />
      ))}
    </Section>
  );
}

function CargadoresEVSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<ChargerItem>({
    url: `/api/chargers?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=300`,
    pick: (d) => (d as ChargersResponse).chargers ?? [],
    filter: (c) => typeof c.latitude === "number" && distanceToRouteKm(c.latitude, c.longitude, route) <= CORRIDOR_DISTANCES_KM.evCharger,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Zap} title="Cargadores eléctricos ≤ 5 km" count={items?.length} loading={loading} error={error} accent="#a78bfa"
      empty={!loading && items?.length === 0 ? "Sin cargadores en el corredor" : undefined}>
      {items?.slice(0, 10).map((c) => (
        <Row
          key={c.id}
          icon={Zap}
          iconColor="#a78bfa"
          title={c.name ?? c.operator ?? "Cargador"}
          subtitle={[c.operator, c.city].filter(Boolean).join(" · ")}
          value={c.powerKw ? `${c.powerKw}kW` : undefined}
        />
      ))}
    </Section>
  );
}

function AreasServicioSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<GasStationItem>({
    url: `/api/gas-stations?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&hasRestaurant=true&limit=100`,
    pick: (d) => {
      const r = d as GasStationsResponse;
      return r.stations ?? r.data ?? [];
    },
    filter: (g) => typeof g.latitude === "number" && distanceToRouteKm(g.latitude, g.longitude, route) <= CORRIDOR_DISTANCES_KM.serviceArea,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Coffee} title="Áreas de servicio" count={items?.length} loading={loading} error={error} accent="#fbbf24" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin áreas de servicio detectadas" : undefined}>
      {items?.slice(0, 10).map((g) => (
        <Row key={g.id} icon={Coffee} iconColor="#fbbf24" title={g.name} subtitle={g.city ?? g.address ?? ""} />
      ))}
    </Section>
  );
}

function TrabajosSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<RoadworksItem>({
    url: `/api/trafico/obras?active=true&bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`,
    pick: (d) => (d as RoadworksResponse).data?.zones ?? [],
    filter: (w) => typeof w.latitude === "number" && typeof w.longitude === "number"
      && inBbox(w.latitude, w.longitude, bbox)
      && distanceToRouteKm(w.latitude, w.longitude, route) <= CORRIDOR_DISTANCES_KM.roadwork,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Construction} title="Trabajos y cortes" count={items?.length} loading={loading} error={error} accent="#fb923c"
      empty={!loading && items?.length === 0 ? "Sin trabajos en el corredor" : undefined}>
      {items?.slice(0, 10).map((w) => (
        <Row key={w.id} icon={Construction} iconColor="#fb923c"
          title={w.description ?? "Obras"}
          subtitle={`${w.road ?? ""} ${w.km != null ? "km " + w.km : ""} ${w.province ? "· " + w.province : ""}`.trim()} />
      ))}
    </Section>
  );
}

function RadaresSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<RadarItem>({
    url: `/api/radars?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=300`,
    pick: (d) => ((d as RadarsResponse).radars ?? []).filter(
      (r) => typeof r.lat === "number" || typeof r.latitude === "number",
    ),
    filter: (r) => {
      // /api/radars returns `lat`/`lng`, not `latitude`/`longitude`
      const lat = r.lat ?? r.latitude;
      const lon = r.lng ?? r.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return false;
      return inBbox(lat, lon, bbox) && distanceToRouteKm(lat, lon, route) <= CORRIDOR_DISTANCES_KM.radar;
    },
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Gauge} title="Radares ≤ 500 m" count={items?.length} loading={loading} error={error} accent="#ef4444"
      empty={!loading && items?.length === 0 ? "Sin radares en el corredor" : undefined}>
      {items?.slice(0, 15).map((r) => {
        const km = r.kmPoint ?? r.km;
        return (
          <Row key={r.id} icon={ChevronRight} iconColor="#ef4444"
            title={`${r.road ?? "?"} ${km != null ? "km " + km : ""}`.trim()}
            subtitle={`${r.type ?? "Radar"} · ${r.province ?? ""} ${r.speedLimit ? "· " + r.speedLimit + " km/h" : ""}`} />
        );
      })}
    </Section>
  );
}

function CamarasSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<CameraItem>({
    url: `/api/cameras?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=300`,
    pick: (d) => (d as CamerasResponse).cameras ?? [],
    filter: (c) => {
      // /api/cameras returns `lat`/`lng`, not `latitude`/`longitude`
      const lat = c.lat ?? c.latitude;
      const lon = c.lng ?? c.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") return false;
      return inBbox(lat, lon, bbox) && distanceToRouteKm(lat, lon, route) <= CORRIDOR_DISTANCES_KM.camera;
    },
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Video} title="Cámaras DGT ≤ 1 km" count={items?.length} loading={loading} error={error} accent="#7da4f0" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin cámaras en el corredor" : undefined}>
      {items?.slice(0, 12).map((c) => {
        const km = c.kmPoint ?? c.km;
        return (
          <Row key={c.id} icon={Video} iconColor="#7da4f0"
            title={c.name ?? `${c.road ?? "?"} ${km != null ? "km " + km : ""}`.trim()}
            subtitle={[c.road, c.province].filter(Boolean).join(" · ")} />
        );
      })}
    </Section>
  );
}

function PanelesSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<PanelItem>({
    url: `/api/panels?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`,
    pick: (d) => ((d as PanelsResponse).panels ?? []).filter(
      (p) => typeof p.latitude === "number" && !!p.message,
    ),
    filter: (p) => inBbox(p.latitude, p.longitude, bbox) && distanceToRouteKm(p.latitude, p.longitude, route) <= CORRIDOR_DISTANCES_KM.panel,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={MessageSquare} title="Paneles DGT activos" count={items?.length} loading={loading} error={error} accent="#fbbf24"
      empty={!loading && items?.length === 0 ? "Sin paneles con mensaje activo" : undefined}>
      {items?.slice(0, 10).map((p) => (
        <Row key={p.id} icon={MessageSquare} iconColor="#fbbf24"
          title={p.message ?? "Panel"}
          subtitle={`${p.road ?? ""} ${p.km != null ? "km " + p.km : ""} ${p.province ? "· " + p.province : ""}`.trim()} />
      ))}
    </Section>
  );
}

function IncidenciasSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<IncidentItem>({
    url: `/api/incidents?status=active&bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`,
    pick: (d) => ((d as IncidentsResponse).incidents ?? []).filter(
      (i) => typeof i.latitude === "number",
    ),
    filter: (i) => inBbox(i.latitude as number, i.longitude as number, bbox)
      && distanceToRouteKm(i.latitude as number, i.longitude as number, route) <= CORRIDOR_DISTANCES_KM.incident,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={AlertTriangle} title="Incidencias activas ≤ 1 km" count={items?.length} loading={loading} error={error} accent="#fb923c"
      empty={!loading && items?.length === 0 ? "Sin incidencias activas en el corredor" : undefined}>
      {items?.slice(0, 12).map((i) => {
        const km = i.kmPoint ?? i.km;
        const road = i.roadNumber ?? i.road;
        return (
          <Row key={i.id} icon={AlertTriangle}
            iconColor={i.severity === "HIGH" || i.severity === "VERY_HIGH" ? "#ef4444" : i.severity === "MEDIUM" ? "#f59e0b" : "#94b6ff"}
            title={i.description ?? i.type ?? "Incidencia"}
            subtitle={`${road ?? ""} ${km != null ? "km " + km : ""} ${i.province ? "· " + i.province : ""}`.trim()} />
        );
      })}
    </Section>
  );
}

function PuntosNegrosSection({ bbox, route, bboxKey, routeKey }: { bbox: BBox; route: OSRMRoute; bboxKey: string; routeKey: string }) {
  const { items, loading, error } = useCorridorData<HotspotItem>({
    url: `/api/accidentes/hotspots?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`,
    pick: (d) => ((d as HotspotsResponse).hotspots ?? []).filter(
      (h) => typeof h.latitude === "number",
    ),
    filter: (h) => inBbox(h.latitude as number, h.longitude as number, bbox)
      && distanceToRouteKm(h.latitude as number, h.longitude as number, route) <= CORRIDOR_DISTANCES_KM.hotspot,
    deps: [bboxKey, routeKey],
  });
  return (
    <Section icon={Skull} title="Puntos negros (accidentes históricos)" count={items?.length} loading={loading} error={error} accent="#dc2626" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin puntos negros conocidos" : undefined}>
      {items?.slice(0, 10).map((h, idx) => {
        const count = h.count ?? h.accidentCount;
        return (
          <Row key={h.id ?? `${h.road}-${h.km}-${idx}`} icon={Skull} iconColor="#dc2626"
            title={`${h.road ?? "?"} ${h.km != null ? "km " + h.km : ""}`.trim()}
            subtitle={h.province ?? ""}
            value={count ? `${count} ev.` : undefined} />
        );
      })}
    </Section>
  );
}

function TrenesAltSection({ route, routeKey }: { route: OSRMRoute; routeKey: string }) {
  // Use origin + destination of OSRM polyline (first + last coord) to guess city pair
  const coords = route.geometry.coordinates as [number, number][];
  const origin = coords[0];
  const dest = coords[coords.length - 1];
  const { items, loading, error } = useCorridorData<TrainRouteItem>({
    url: `/api/trenes/rutas?originLat=${origin[1].toFixed(3)}&originLng=${origin[0].toFixed(3)}&destLat=${dest[1].toFixed(3)}&destLng=${dest[0].toFixed(3)}&limit=20`,
    pick: (d) => (d as TrainRoutesResponse).data?.routes ?? [],
    filter: () => true,
    deps: [routeKey],
  });
  return (
    <Section icon={Train} title="Trenes alternativos" count={items?.length} loading={loading} error={error} accent="#22c55e" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin trenes Renfe para este origen-destino" : undefined}>
      {items?.slice(0, 8).map((t) => (
        <Row key={t.id} icon={Train} iconColor="#22c55e"
          title={t.longName ?? t.shortName ?? "Ruta tren"}
          subtitle={[t.brand, t.origin, t.destination].filter(Boolean).join(" → ")}
          value={t.durationMin ? `${Math.round(t.durationMin)}min` : undefined} />
      ))}
    </Section>
  );
}

function MeteoSection({ bboxKey }: { bboxKey: string }) {
  const { items, loading, error } = useCorridorData<WeatherAlertItem>({
    url: `/api/weather-alerts?active=true&limit=500`,
    pick: (d) => (d as WeatherAlertsResponse).alerts ?? [],
    filter: () => true, // alerts are province-level; we keep all active and show
    deps: [bboxKey],
  });
  return (
    <Section icon={Cloud} title="Alertas meteo AEMET" count={items?.length} loading={loading} error={error} accent="#fbbf24" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin alertas activas" : undefined}>
      {items?.slice(0, 10).map((a) => (
        <Row key={a.id} icon={Cloud}
          iconColor={a.level === "red" ? "#dc2626" : a.level === "orange" ? "#fb923c" : a.level === "yellow" ? "#fbbf24" : "#94b6ff"}
          title={a.title ?? "Alerta"} subtitle={[a.province, a.area].filter(Boolean).join(" · ")} />
      ))}
    </Section>
  );
}

function CalidadAireSection({ bbox, bboxKey }: { bbox: BBox; bboxKey: string }) {
  const { items, loading, error } = useCorridorData<AirReading>({
    url: `/api/calidad-aire?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=50`,
    pick: (d) => (d as AirQualityResponse).data?.stations ?? [],
    filter: () => true,
    deps: [bboxKey],
  });
  return (
    <Section icon={Wind} title="Calidad del aire" count={items?.length} loading={loading} error={error} accent="#7da4f0" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin estaciones de medición" : undefined}>
      {items?.slice(0, 8).map((s) => (
        <Row key={s.id} icon={Wind}
          iconColor={s.ica === 1 ? "#22c55e" : s.ica === 2 ? "#86efac" : s.ica === 3 ? "#fbbf24" : s.ica === 4 ? "#fb923c" : s.ica === 5 ? "#ef4444" : "#94a3b8"}
          title={s.stationName ?? s.city ?? "Estación"} subtitle={[s.city, s.province].filter(Boolean).join(" · ")}
          value={s.icaLabel ?? (s.ica != null ? `ICA ${s.ica}` : undefined)} />
      ))}
    </Section>
  );
}

// Step-by-step at the bottom — collapsed by default
function IndicacionesSection({ route }: { route: OSRMRoute }) {
  const steps = route.legs[0]?.steps ?? [];
  return (
    <Section icon={ListOrdered} title="Indicaciones" count={steps.length} accent="#94a3b8" defaultOpen={false}>
      <div className="space-y-0.5">
        {steps.slice(0, 100).map((s, i) => (
          <StepRow key={i} step={s} index={i} />
        ))}
        {steps.length > 100 && (
          <div className="text-[10px] py-1 text-center" style={{ color: "#64748b" }}>+{steps.length - 100} pasos</div>
        )}
      </div>
    </Section>
  );
}

function StepRow({ step, index }: { step: OSRMStep; index: number }) {
  const text = getManeuverText(step);
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-[10px] mt-0.5 shrink-0" style={{ color: "#475569", fontFamily: "'JetBrains Mono', monospace", minWidth: 22 }}>{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] leading-snug" style={{ color: "#cbd5e1" }}>
          {text}{step.name ? <span style={{ color: "#94a3b8" }}> · {step.name}</span> : null}
        </div>
        {step.distance > 50 && (
          <div className="text-[10px]" style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{formatDistance(step.distance)}</div>
        )}
      </div>
    </div>
  );
}
