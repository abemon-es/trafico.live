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
  Clock,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { formatDistance, formatDuration, getManeuverText } from "@/lib/routing";
import type { RouteResponse, OSRMRoute, OSRMStep } from "@/lib/routing";
import { matchTollsFromRoute, totalToll } from "@/lib/tolls";

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

  return (
    <div
      className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:top-16 md:w-[400px] z-20 flex flex-col rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none shadow-2xl"
      style={{
        background: "rgba(15,23,42,0.97)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "none",
        backdropFilter: "blur(12px)",
        color: "#e2e8f0",
        maxHeight: "75vh",
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
        <button onClick={onToggleVisible} className="p-1.5 rounded hover:bg-white/10" style={{ color: visible ? "#94b6ff" : "#64748b" }} title={visible ? "Ocultar ruta en mapa" : "Mostrar ruta en mapa"}>
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10" style={{ color: "#64748b" }} title="Cerrar">
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
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
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
        <ZBESection bbox={bbox} route={route} />
        <TraficoTipicoSection bbox={bbox} route={route} />
        <CombustibleSection bbox={bbox} route={route} />
        <CargadoresEVSection bbox={bbox} route={route} />
        <AreasServicioSection bbox={bbox} route={route} />
        <TrabajosSection bbox={bbox} route={route} />
        <RadaresSection bbox={bbox} route={route} />
        <CamarasSection bbox={bbox} route={route} />
        <PanelesSection bbox={bbox} route={route} />
        <IncidenciasSection bbox={bbox} route={route} />
        <PuntosNegrosSection bbox={bbox} route={route} />
        <TrenesAltSection route={route} />
        <MeteoSection bbox={bbox} />
        <CalidadAireSection bbox={bbox} />
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
  empty,
  children,
  accent = "#7da4f0",
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  loading?: boolean;
  empty?: string;
  children?: React.ReactNode;
  accent?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = !loading && !empty && !!children;

  return (
    <div className="px-3 py-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 mb-1.5"
      >
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
        <span className="text-[12px] font-semibold flex-1 text-left" style={{ color: "#e2e8f0" }}>
          {title}
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#64748b" }} />}
        {!loading && count != null && (
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
        <div>
          {hasContent ? (
            children
          ) : empty ? (
            <div className="text-[11px] py-1.5 px-2 rounded" style={{ color: "#64748b", background: "rgba(255,255,255,0.02)" }}>
              {empty}
            </div>
          ) : loading ? (
            <div className="text-[11px] py-1.5 px-2" style={{ color: "#64748b" }}>Cargando…</div>
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
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        try {
          const raw = pick(data);
          setItems(raw.filter(filter));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error parsing data");
        }
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
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

interface ZbeItem { id: string; name?: string; city?: string; province?: string; geom?: unknown; latitude?: number; longitude?: number; }
function ZBESection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<ZbeItem>({
    url: `/api/zbe?limit=500`,
    pick: (d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = d as any;
      return (data.zones ?? data.data ?? data.results ?? []) as ZbeItem[];
    },
    filter: (z) => {
      if (typeof z.latitude !== "number" || typeof z.longitude !== "number") return false;
      if (!inBbox(z.latitude, z.longitude, bbox)) return false;
      return distanceToRouteKm(z.latitude, z.longitude, route) <= 3;
    },
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Ban} title="ZBE cruzadas" count={items?.length} loading={loading} accent="#ef4444"
      empty={!loading && items?.length === 0 ? "No cruzas ninguna Zona de Bajas Emisiones" : undefined}>
      {items?.slice(0, 10).map((z) => (
        <Row key={z.id} icon={Ban} iconColor="#ef4444" title={z.name ?? z.city ?? "ZBE"} subtitle={[z.city, z.province].filter(Boolean).join(" · ")} />
      ))}
    </Section>
  );
}

// Tráfico típico ahora — best-effort summary
function TraficoTipicoSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const hourNow = new Date().getHours();
  const dayNow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1-7 Mon-Sun
  // Spec: HourlyTrafficProfile averages by sensor/dow/hour. Here we just
  // surface a qualitative read from the bbox-bounded current sensors.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<{ avg: number | null; samples: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/trafico/intensidad?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=200`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const readings = (data.intensity ?? data.readings ?? data.data ?? []) as any[];
        const filtered = readings.filter((r) =>
          typeof r.latitude === "number" && inBbox(r.latitude, r.longitude, bbox) &&
          distanceToRouteKm(r.latitude, r.longitude, route) <= 2,
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
      .catch(() => !cancelled && setStats({ avg: null, samples: 0, tier: "Error" }))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route]);

  const color =
    stats?.tier === "Fluido" ? "#86efac" :
    stats?.tier === "Denso" ? "#fbbf24" :
    stats?.tier === "Congestionado" ? "#fb923c" :
    stats?.tier === "Atasco" ? "#ef4444" : "#94a3b8";

  return (
    <Section icon={Activity} title="Tráfico típico ahora" loading={loading} accent="#7da4f0"
      empty={!loading && (!stats || stats.samples === 0) ? "Sin sensores en este corredor" : undefined}>
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

interface GasItem { id: string | number; name: string; address?: string | null; city?: string | null; priceGasolina95?: number | null; priceDiesel?: number | null; latitude: number; longitude: number; }
function CombustibleSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<GasItem>({
    url: `/api/gas-stations?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&sort=priceGasolina95&order=asc&limit=200`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.stations ?? d.results ?? d.data ?? []) as GasItem[],
    filter: (g) => typeof g.latitude === "number" && distanceToRouteKm(g.latitude, g.longitude, route) <= 2,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Fuel} title="Gasolineras más baratas ≤ 2 km" count={items?.length} loading={loading} accent="#86efac"
      empty={!loading && items?.length === 0 ? "Sin gasolineras en el corredor" : undefined}>
      {items?.slice(0, 12).map((g) => (
        <Row key={g.id} title={g.name} subtitle={g.city ?? g.address ?? ""} value={typeof g.priceGasolina95 === "number" ? `${g.priceGasolina95.toFixed(3)}€` : "—"} />
      ))}
    </Section>
  );
}

interface ChargerItem { id: string | number; name?: string; operator?: string | null; city?: string | null; powerKw?: number | null; connectorTypes?: string[]; latitude: number; longitude: number; }
function CargadoresEVSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<ChargerItem>({
    url: `/api/chargers?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=300`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.chargers ?? d.results ?? d.data ?? []) as ChargerItem[],
    filter: (c) => typeof c.latitude === "number" && distanceToRouteKm(c.latitude, c.longitude, route) <= 5,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Zap} title="Cargadores eléctricos ≤ 5 km" count={items?.length} loading={loading} accent="#a78bfa"
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

interface ServiceStation extends GasItem { hasShop?: boolean; hasCafeteria?: boolean; hasRestaurant?: boolean; }
function AreasServicioSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<ServiceStation>({
    url: `/api/gas-stations?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&hasRestaurant=true&limit=100`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.stations ?? d.results ?? d.data ?? []) as ServiceStation[],
    filter: (g) => typeof g.latitude === "number" && distanceToRouteKm(g.latitude, g.longitude, route) <= 2,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Coffee} title="Áreas de servicio" count={items?.length} loading={loading} accent="#fbbf24" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin áreas de servicio detectadas" : undefined}>
      {items?.slice(0, 10).map((g) => (
        <Row key={g.id} icon={Coffee} iconColor="#fbbf24" title={g.name} subtitle={g.city ?? g.address ?? ""} />
      ))}
    </Section>
  );
}

interface WorkItem { id: string | number; description?: string | null; road?: string | null; km?: number | null; severity?: string | null; province?: string | null; latitude?: number | null; longitude?: number | null; }
function TrabajosSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<WorkItem>({
    url: `/api/roadworks?limit=500`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.roadworks ?? d.zones ?? d.data ?? []) as WorkItem[],
    filter: (w) => typeof w.latitude === "number" && typeof w.longitude === "number"
      && inBbox(w.latitude, w.longitude, bbox)
      && distanceToRouteKm(w.latitude, w.longitude, route) <= 1.5,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Construction} title="Trabajos y cortes" count={items?.length} loading={loading} accent="#fb923c"
      empty={!loading && items?.length === 0 ? "Sin trabajos en el corredor" : undefined}>
      {items?.slice(0, 10).map((w) => (
        <Row key={w.id} icon={Construction} iconColor="#fb923c"
          title={w.description ?? "Obras"}
          subtitle={`${w.road ?? ""} ${w.km != null ? "km " + w.km : ""} ${w.province ? "· " + w.province : ""}`.trim()} />
      ))}
    </Section>
  );
}

interface RadarItem { id: string | number; type?: string | null; road?: string | null; km?: number | null; province?: string | null; speedLimit?: number | null; latitude: number; longitude: number; }
function RadaresSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<RadarItem>({
    url: `/api/radars?limit=5000`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => ((d.radars ?? d.data ?? d) as RadarItem[]).filter((r) => typeof r.latitude === "number"),
    filter: (r) => inBbox(r.latitude, r.longitude, bbox) && distanceToRouteKm(r.latitude, r.longitude, route) <= 0.5,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Gauge} title="Radares ≤ 500 m" count={items?.length} loading={loading} accent="#ef4444"
      empty={!loading && items?.length === 0 ? "Sin radares en el corredor" : undefined}>
      {items?.slice(0, 15).map((r) => (
        <Row key={r.id} icon={ChevronRight} iconColor="#ef4444"
          title={`${r.road ?? "?"} ${r.km != null ? "km " + r.km : ""}`.trim()}
          subtitle={`${r.type ?? "Radar"} · ${r.province ?? ""} ${r.speedLimit ? "· " + r.speedLimit + " km/h" : ""}`} />
      ))}
    </Section>
  );
}

interface CameraItem { id: string | number; name?: string | null; road?: string | null; km?: number | null; province?: string | null; latitude: number; longitude: number; streamUrl?: string | null; }
function CamarasSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<CameraItem>({
    url: `/api/cameras?limit=3000`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => ((d.cameras ?? d.data ?? d) as CameraItem[]).filter((c) => typeof c.latitude === "number"),
    filter: (c) => inBbox(c.latitude, c.longitude, bbox) && distanceToRouteKm(c.latitude, c.longitude, route) <= 1,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Video} title="Cámaras DGT ≤ 1 km" count={items?.length} loading={loading} accent="#7da4f0" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin cámaras en el corredor" : undefined}>
      {items?.slice(0, 12).map((c) => (
        <Row key={c.id} icon={Video} iconColor="#7da4f0"
          title={c.name ?? `${c.road ?? "?"} ${c.km != null ? "km " + c.km : ""}`.trim()}
          subtitle={[c.road, c.province].filter(Boolean).join(" · ")} />
      ))}
    </Section>
  );
}

interface PanelItem { id: string | number; message?: string | null; road?: string | null; km?: number | null; province?: string | null; latitude: number; longitude: number; }
function PanelesSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<PanelItem>({
    url: `/api/panels?limit=1500`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => ((d.panels ?? d.data ?? d) as PanelItem[]).filter((p) => typeof p.latitude === "number" && p.message),
    filter: (p) => inBbox(p.latitude, p.longitude, bbox) && distanceToRouteKm(p.latitude, p.longitude, route) <= 1,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={MessageSquare} title="Paneles DGT activos" count={items?.length} loading={loading} accent="#fbbf24"
      empty={!loading && items?.length === 0 ? "Sin paneles con mensaje activo" : undefined}>
      {items?.slice(0, 10).map((p) => (
        <Row key={p.id} icon={MessageSquare} iconColor="#fbbf24"
          title={p.message ?? "Panel"}
          subtitle={`${p.road ?? ""} ${p.km != null ? "km " + p.km : ""} ${p.province ? "· " + p.province : ""}`.trim()} />
      ))}
    </Section>
  );
}

interface IncidentItem { id: string | number; description?: string | null; type?: string | null; severity?: string | null; road?: string | null; km?: number | null; province?: string | null; latitude?: number | null; longitude?: number | null; }
function IncidenciasSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<IncidentItem>({
    url: `/api/incidents?status=active&limit=1000`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => ((d.incidents ?? d.data ?? []) as IncidentItem[]).filter((i) => typeof i.latitude === "number"),
    filter: (i) => inBbox(i.latitude as number, i.longitude as number, bbox)
      && distanceToRouteKm(i.latitude as number, i.longitude as number, route) <= 1,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={AlertTriangle} title="Incidencias activas ≤ 1 km" count={items?.length} loading={loading} accent="#fb923c"
      empty={!loading && items?.length === 0 ? "Sin incidencias activas en el corredor" : undefined}>
      {items?.slice(0, 12).map((i) => (
        <Row key={i.id} icon={AlertTriangle}
          iconColor={i.severity === "HIGH" ? "#ef4444" : i.severity === "MEDIUM" ? "#f59e0b" : "#94b6ff"}
          title={i.description ?? i.type ?? "Incidencia"}
          subtitle={`${i.road ?? ""} ${i.km != null ? "km " + i.km : ""} ${i.province ? "· " + i.province : ""}`.trim()} />
      ))}
    </Section>
  );
}

interface HotspotItem { id: string | number; road?: string | null; km?: number | null; province?: string | null; accidentCount?: number; latitude?: number; longitude?: number; }
function PuntosNegrosSection({ bbox, route }: { bbox: BBox; route: OSRMRoute }) {
  const { items, loading } = useCorridorData<HotspotItem>({
    url: `/api/accidentes/hotspots?limit=2000`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => ((d.hotspots ?? d.data ?? d.results ?? []) as HotspotItem[]).filter((h) => typeof h.latitude === "number"),
    filter: (h) => inBbox(h.latitude as number, h.longitude as number, bbox)
      && distanceToRouteKm(h.latitude as number, h.longitude as number, route) <= 1,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, route],
  });
  return (
    <Section icon={Skull} title="Puntos negros (accidentes históricos)" count={items?.length} loading={loading} accent="#dc2626" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin puntos negros conocidos" : undefined}>
      {items?.slice(0, 10).map((h) => (
        <Row key={h.id} icon={Skull} iconColor="#dc2626"
          title={`${h.road ?? "?"} ${h.km != null ? "km " + h.km : ""}`.trim()}
          subtitle={h.province ?? ""}
          value={h.accidentCount ? `${h.accidentCount} ev.` : undefined} />
      ))}
    </Section>
  );
}

interface TrainRouteItem { id: string | number; shortName?: string; longName?: string; brand?: string; origin?: string; destination?: string; durationMin?: number | null; }
function TrenesAltSection({ route }: { route: OSRMRoute }) {
  // Use origin + destination of OSRM polyline (first + last coord) to guess city pair
  const coords = route.geometry.coordinates as [number, number][];
  const origin = coords[0];
  const dest = coords[coords.length - 1];
  const { items, loading } = useCorridorData<TrainRouteItem>({
    url: `/api/trenes/rutas?originLat=${origin[1].toFixed(3)}&originLng=${origin[0].toFixed(3)}&destLat=${dest[1].toFixed(3)}&destLng=${dest[0].toFixed(3)}&limit=20`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.routes ?? d.results ?? d.data ?? []) as TrainRouteItem[],
    filter: () => true,
    deps: [origin[0], origin[1], dest[0], dest[1]],
  });
  return (
    <Section icon={Train} title="Trenes alternativos" count={items?.length} loading={loading} accent="#22c55e" defaultOpen={false}
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

interface WeatherAlertItem { id: string | number; title?: string | null; level?: string | null; province?: string | null; area?: string | null; startsAt?: string; endsAt?: string; }
function MeteoSection({ bbox }: { bbox: BBox }) {
  const { items, loading } = useCorridorData<WeatherAlertItem>({
    url: `/api/weather-alerts?active=true&limit=500`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.alerts ?? d.data ?? []) as WeatherAlertItem[],
    filter: () => true, // alerts are province-level; we keep all active and show
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
  });
  return (
    <Section icon={Cloud} title="Alertas meteo AEMET" count={items?.length} loading={loading} accent="#fbbf24" defaultOpen={false}
      empty={!loading && items?.length === 0 ? "Sin alertas activas" : undefined}>
      {items?.slice(0, 10).map((a) => (
        <Row key={a.id} icon={Cloud}
          iconColor={a.level === "red" ? "#dc2626" : a.level === "orange" ? "#fb923c" : a.level === "yellow" ? "#fbbf24" : "#94b6ff"}
          title={a.title ?? "Alerta"} subtitle={[a.province, a.area].filter(Boolean).join(" · ")} />
      ))}
    </Section>
  );
}

interface AirReading { id: string | number; stationName?: string; city?: string; province?: string; ica?: number | null; icaLabel?: string | null; latitude?: number; longitude?: number; }
function CalidadAireSection({ bbox }: { bbox: BBox }) {
  const { items, loading } = useCorridorData<AirReading>({
    url: `/api/calidad-aire?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&limit=50`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pick: (d: any) => (d.stations ?? d.readings ?? d.data ?? []) as AirReading[],
    filter: () => true,
    deps: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
  });
  return (
    <Section icon={Wind} title="Calidad del aire" count={items?.length} loading={loading} accent="#7da4f0" defaultOpen={false}
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
