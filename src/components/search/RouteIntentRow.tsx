"use client";

/**
 * <RouteIntentRow> — shown above search results when the user types a query
 * that looks like a routing request:
 *
 *   "Madrid a Sevilla"        → Madrid → Sevilla
 *   "Sol → Barcelona"         → Sol → Barcelona
 *   "ruta a Valencia"         → fromMe → Valencia
 *   "cómo llegar a Cádiz"     → fromMe → Cádiz
 *
 * Geocodes both ends (or just the destination) in parallel via /api/geocode
 * and renders a single Link to /mapa with the right URL params. Clicking it
 * deep-links into the routing flow without the user touching the map.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation, MapPin, Loader2 } from "lucide-react";

interface Props {
  query: string;
  onNavigate?: () => void;
}

interface GeocodeResult {
  name: string;
  fullName: string;
  lat: number;
  lon: number;
}

type Intent =
  | { kind: "oneway"; from: string; to: string }
  | { kind: "fromMe"; to: string };

const RE_X_TO_Y = /^\s*(.{2,40})\s+(?:a|→|->|hacia|hasta)\s+(.{2,60})\s*$/i;
const RE_GO_TO = /^\s*(?:ruta|c[oó]mo\s+llegar|c[oó]mo\s+ir|ir)\s+(?:a|hacia|hasta)\s+(.{2,60})\s*$/i;

export function detectRouteIntent(q: string): Intent | null {
  const trimmed = q.trim();
  if (trimmed.length < 4) return null;

  // "ruta a X" / "como llegar a X" / "ir a X" — wins over X-a-Y when both match
  const m2 = trimmed.match(RE_GO_TO);
  if (m2) return { kind: "fromMe", to: m2[1].trim() };

  const m1 = trimmed.match(RE_X_TO_Y);
  if (m1) return { kind: "oneway", from: m1[1].trim(), to: m1[2].trim() };

  return null;
}

async function geocodeOne(q: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data: { results?: GeocodeResult[] } = await res.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

export function RouteIntentRow({ query, onNavigate }: Props) {
  const intent = detectRouteIntent(query);
  const [from, setFrom] = useState<GeocodeResult | null>(null);
  const [to, setTo] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!intent) {
      setFrom(null);
      setTo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFrom(null);
    setTo(null);

    const t = setTimeout(async () => {
      if (intent.kind === "oneway") {
        const [a, b] = await Promise.all([geocodeOne(intent.from), geocodeOne(intent.to)]);
        if (cancelled) return;
        setFrom(a);
        setTo(b);
      } else {
        const b = await geocodeOne(intent.to);
        if (cancelled) return;
        setTo(b);
      }
      setLoading(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [intent?.kind, intent?.kind === "oneway" ? intent.from : null, intent?.to]);

  if (!intent) return null;

  // Build /mapa URL once we have geocoded ends
  let href: string | null = null;
  let label = "";

  if (intent.kind === "oneway" && from && to) {
    href = `/mapa?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}&via=auto`;
    label = `${from.name} → ${to.name}`;
  } else if (intent.kind === "fromMe" && to) {
    href = `/mapa?to=${to.lat},${to.lon}&via=auto&fromMe=1`;
    label = `Cómo llegar a ${to.name}`;
  } else if (intent.kind === "fromMe") {
    label = `Cómo llegar a ${intent.to}`;
  } else {
    label = `${intent.from} → ${intent.to}`;
  }

  const Inner = (
    <>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(27,75,213,0.18)" }}
      >
        <Navigation className="w-4 h-4" style={{ color: "#7da4f0" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-tl-500">
            Ruta
          </span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-tl-400" />}
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {label}
        </div>
        {to && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {to.fullName}
          </div>
        )}
      </div>
    </>
  );

  if (!href) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
        style={{
          background: "rgba(27,75,213,0.06)",
          border: "1px solid rgba(27,75,213,0.18)",
          opacity: 0.7,
        }}
      >
        {Inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => onNavigate?.()}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
      style={{
        background: "rgba(27,75,213,0.10)",
        border: "1px solid rgba(27,75,213,0.30)",
      }}
    >
      {Inner}
    </Link>
  );
}
