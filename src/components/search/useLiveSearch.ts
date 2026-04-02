"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { trackSearch } from "@/lib/analytics";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  subtitle?: string;
  href: string;
  category: string;
  icon: string;
  highlightedTitle?: string;
  price?: number;
  distance?: number;
}

interface SearchFilters {
  applied: Record<string, unknown>;
  labels: string[];
  needsLocationResolution?: boolean;
  locationHint?: string;
}

interface SearchAPIResponse {
  results: SearchResult[];
  query: string;
  total: number;
  filters?: SearchFilters;
}

export type SearchCategory =
  | "paginas"
  | "provincia"
  | "ciudad"
  | "combustible"
  | "carretera"
  | "transporte"
  | "seguridad"
  | "infraestructura"
  | "maritimo"
  | "herramienta";

export interface CategoryMeta {
  label: string;
  badgeClass: string;
}

export const CATEGORY_META: Record<SearchCategory, CategoryMeta> = {
  paginas: {
    label: "Páginas",
    badgeClass: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  },
  provincia: {
    label: "Provincias",
    badgeClass: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  },
  ciudad: {
    label: "Ciudades",
    badgeClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  combustible: {
    label: "Combustible",
    badgeClass: "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300",
  },
  carretera: {
    label: "Carreteras",
    badgeClass: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  },
  transporte: {
    label: "Transporte",
    badgeClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  seguridad: {
    label: "Seguridad",
    badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
  infraestructura: {
    label: "Infraestructura",
    badgeClass: "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400",
  },
  maritimo: {
    label: "Marítimo",
    badgeClass: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
  },
  herramienta: {
    label: "Herramientas",
    badgeClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  },
};

const CATEGORY_ORDER: SearchCategory[] = [
  "paginas",
  "provincia",
  "ciudad",
  "combustible",
  "carretera",
  "transporte",
  "seguridad",
  "infraestructura",
  "maritimo",
  "herramienta",
];

// ── Category mapping (API category string → local SearchCategory) ───────────

const API_CATEGORY_MAP: Record<string, SearchCategory> = {
  "Páginas": "paginas",
  Combustible: "combustible",
  "Marítimo": "maritimo",
  Herramientas: "herramienta",
  Provincias: "provincia",
  Ciudades: "ciudad",
  Gasolineras: "combustible",
  "Gasolineras Portugal": "combustible",
  "Gasolineras maritimas": "maritimo",
  Carreteras: "carretera",
  Camaras: "infraestructura",
  "Cargadores EV": "combustible",
  Radares: "seguridad",
  "Estaciones de tren": "transporte",
  "Zonas ZBE": "seguridad",
  "Zonas de riesgo": "seguridad",
  Paneles: "infraestructura",
  "Estaciones de aforo": "infraestructura",
  Noticias: "herramienta",
};

function mapCategory(apiCategory: string): SearchCategory {
  return API_CATEGORY_MAP[apiCategory] ?? "herramienta";
}

// ── Recent searches ─────────────────────────────────────────────────────────

const RECENT_KEY = "tl-recent-searches";
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const existing = getRecentSearches().filter((q) => q !== query.trim());
    existing.unshift(query.trim());
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch { /* quota exceeded */ }
}

// ── Grouping ────────────────────────────────────────────────────────────────

export function groupResults(
  results: SearchResult[]
): { category: SearchCategory; meta: CategoryMeta; items: SearchResult[] }[] {
  const acc: Partial<Record<SearchCategory, SearchResult[]>> = {};
  for (const r of results) {
    const cat = mapCategory(r.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(r);
  }
  return CATEGORY_ORDER
    .filter((c) => Boolean(acc[c]))
    .map((c) => ({ category: c, meta: CATEGORY_META[c], items: acc[c]! }));
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseLiveSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  results: SearchResult[];
  groups: ReturnType<typeof groupResults>;
  flatResults: SearchResult[];
  isLoading: boolean;
  hasQuery: boolean;
  /** Smart filter labels detected from query keywords */
  filterLabels: string[];
  /** True when resolving a location name to coordinates */
  isResolvingLocation: boolean;
  /** Call when user navigates to a result — saves to recent searches */
  onNavigate: (query: string) => void;
}

export function useLiveSearch(): UseLiveSearchReturn {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);

  // 150ms debounce
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  // Passive geolocation — only reads position if permission already granted (no prompt)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        navigator.geolocation.getCurrentPosition(
          (pos) => setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}, // silently fail
          { maximumAge: 300000, timeout: 3000 }
        );
      }
    }).catch(() => {}); // permissions API not available
  }, []);

  const geoParam = geoCoords ? `&lat=${geoCoords.lat.toFixed(4)}&lng=${geoCoords.lng.toFixed(4)}` : "";
  const swrKey = debouncedQuery.trim()
    ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=25${geoParam}`
    : null;

  const { data, isLoading } = useSWR<SearchAPIResponse>(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  // Location resolution — when API says it needs coordinates for proximity search
  const needsResolution = !!(data?.filters?.needsLocationResolution && data?.filters?.locationHint);
  const locationHint = data?.filters?.locationHint;

  const { data: locationData } = useSWR<{ resolved: boolean; location?: { lat: number; lng: number; name: string } }>(
    needsResolution ? `/api/search/resolve-location?q=${encodeURIComponent(locationHint!)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Re-fetch with resolved coordinates
  const resolvedGeoParam = locationData?.resolved && locationData.location
    ? `&lat=${locationData.location.lat}&lng=${locationData.location.lng}`
    : null;
  const enhancedSwrKey = resolvedGeoParam && debouncedQuery.trim()
    ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=25${resolvedGeoParam}`
    : null;

  const { data: enhancedData } = useSWR<SearchAPIResponse>(enhancedSwrKey, fetcher, {
    revalidateOnFocus: false,
  });

  const activeData = enhancedData || data;
  const results: SearchResult[] = useMemo(() => activeData?.results ?? [], [activeData]);
  const filterLabels: string[] = useMemo(() => activeData?.filters?.labels ?? [], [activeData]);
  const groups = useMemo(() => groupResults(results), [results]);
  const flatResults = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const isResolvingLocation = needsResolution && !locationData?.resolved;
  const hasQuery = debouncedQuery.trim().length > 0;

  // GA4 tracking
  useEffect(() => {
    if (debouncedQuery.trim() && activeData) {
      trackSearch(debouncedQuery.trim(), results.length);
    }
  }, [debouncedQuery, data, results.length]);

  const onNavigate = useCallback((q: string) => {
    if (q.trim()) addRecentSearch(q.trim());
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    groups,
    flatResults,
    isLoading,
    hasQuery,
    filterLabels,
    isResolvingLocation,
    onNavigate,
  };
}
