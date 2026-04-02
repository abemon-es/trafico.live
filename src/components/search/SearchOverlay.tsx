"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { trackSearch } from "@/lib/analytics";
import {
  Search,
  X,
  Fuel,
  Radar,
  Camera,
  Calendar,
  Ban,
  AlertTriangle,
  Calculator,
  MapPin,
  Zap,
  BookOpen,
  Code,
  Building2,
  Route,
  AlertCircle,
  Map,
  Newspaper,
  Loader2,
  TrainFront,
  ShieldAlert,
  MonitorDot,
  Anchor,
  Activity,
  Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type SearchCategory =
  | "carretera"
  | "ciudad"
  | "provincia"
  | "herramienta"
  | "combustible"
  | "transporte"
  | "seguridad"
  | "infraestructura";

export interface SearchResult {
  title: string;
  subtitle?: string;
  href: string;
  category: SearchCategory;
  icon: string;
  highlightedTitle?: string;
}

// ── API response shape ───────────────────────────────────────────────────────

interface SearchAPIResponse {
  results: Array<{
    title: string;
    subtitle?: string | null;
    href: string;
    category: string;
    icon: string;
    highlightedTitle?: string;
  }>;
  query: string;
  total: number;
}

// ── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // kebab-case keys (legacy / internal)
  fuel: Fuel,
  radar: Radar,
  camera: Camera,
  calendar: Calendar,
  ban: Ban,
  alert: AlertCircle,
  calculator: Calculator,
  "map-pin": MapPin,
  zap: Zap,
  "alert-triangle": AlertTriangle,
  "book-open": BookOpen,
  code: Code,
  building: Building2,
  route: Route,
  map: Map,
  newspaper: Newspaper,
  // PascalCase keys (from Typesense API)
  Fuel: Fuel,
  Radar: Radar,
  Camera: Camera,
  MapPin: MapPin,
  Building2: Building2,
  Route: Route,
  Newspaper: Newspaper,
  Zap: Zap,
  TrainFront: TrainFront,
  ShieldAlert: ShieldAlert,
  AlertTriangle: AlertTriangle,
  MonitorDot: MonitorDot,
  Anchor: Anchor,
  Activity: Activity,
};

function ResultIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Search;
  return <Icon className={className} />;
}

// ── Category labels & colours ────────────────────────────────────────────────

const CATEGORY_META: Record<
  SearchCategory,
  { label: string; badgeClass: string }
> = {
  provincia: {
    label: "Provincias",
    badgeClass:
      "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  },
  ciudad: {
    label: "Ciudades",
    badgeClass:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  combustible: {
    label: "Combustible",
    badgeClass: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300",
  },
  carretera: {
    label: "Carreteras",
    badgeClass:
      "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
  },
  transporte: {
    label: "Transporte",
    badgeClass:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  seguridad: {
    label: "Seguridad",
    badgeClass:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
  infraestructura: {
    label: "Infraestructura",
    badgeClass:
      "bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400",
  },
  herramienta: {
    label: "Herramientas",
    badgeClass:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  },
};

// ── Map API categories to SearchCategory ─────────────────────────────────────

const API_CATEGORY_MAP: Record<string, SearchCategory> = {
  Provincias: "provincia",
  Ciudades: "ciudad",
  Gasolineras: "combustible",
  "Gasolineras Portugal": "combustible",
  "Gasolineras maritimas": "combustible",
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

function mapApiCategory(apiCategory: string): SearchCategory {
  return API_CATEGORY_MAP[apiCategory] ?? "herramienta";
}

// ── Transform API results ────────────────────────────────────────────────────

function transformResults(data: SearchAPIResponse | undefined): SearchResult[] {
  if (!data?.results) return [];
  return data.results.map((r) => ({
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    href: r.href,
    category: mapApiCategory(r.category),
    icon: r.icon,
    highlightedTitle: r.highlightedTitle,
  }));
}

// ── Category order for grouping ──────────────────────────────────────────────

const CATEGORY_ORDER: SearchCategory[] = [
  "provincia",
  "ciudad",
  "combustible",
  "carretera",
  "transporte",
  "seguridad",
  "infraestructura",
  "herramienta",
];

function groupResults(
  results: SearchResult[]
): { category: SearchCategory; items: SearchResult[] }[] {
  const acc: Partial<Record<SearchCategory, SearchResult[]>> = {};
  for (const r of results) {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category]!.push(r);
  }
  return CATEGORY_ORDER.filter((c) => Boolean(acc[c])).map((c) => ({
    category: c,
    items: acc[c]!,
  }));
}

// ── Recent searches (localStorage) ──────────────────────────────────────────

const RECENT_KEY = "tl-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
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
  } catch { /* quota exceeded or private browsing */ }
}

// ── Component ────────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce query (150ms — Typesense is fast enough)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(id);
  }, [query]);

  // SWR fetch — only when overlay is open and there's a query
  const swrKey =
    isOpen && debouncedQuery.trim()
      ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=20`
      : null;

  const { data, isLoading } = useSWR<SearchAPIResponse>(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const results = useMemo(() => transformResults(data), [data]);
  const groups = useMemo(() => groupResults(results), [results]);

  // Track search queries to GA4
  useEffect(() => {
    if (debouncedQuery.trim() && data) {
      trackSearch(debouncedQuery.trim(), results.length);
    }
  }, [debouncedQuery, data, results.length]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
      setMounted(false);
      setRecentSearches(getRecentSearches());
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setMounted(true));
      // Focus input after the DOM paints
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navigate = useCallback(
    (href: string) => {
      if (debouncedQuery.trim()) addRecentSearch(debouncedQuery.trim());
      onClose();
      router.push(href);
    },
    [onClose, router, debouncedQuery]
  );

  // Keyboard handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatResults[activeIndex];
        if (selected) navigate(selected.href);
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, flatResults, activeIndex, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const hasQuery = debouncedQuery.trim().length > 0;
  let globalIdx = 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[10vh] transition-opacity duration-200 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Busqueda global"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-tl-500 shrink-0 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en trafico.live..."
            className="flex-1 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-transparent outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-900 transition-colors"
              aria-label="Borrar busqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain"
          role="listbox"
        >
          {!hasQuery ? (
            /* Empty state — show recent searches or hint */
            <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {recentSearches.length > 0 ? (
                <div className="text-left px-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Busquedas recientes
                  </p>
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuery(q); setDebouncedQuery(q); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate text-sm">{q}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p>Buscar carreteras, ciudades, gasolineras...</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Escribe para buscar
                  </p>
                </>
              )}
            </div>
          ) : isLoading && flatResults.length === 0 ? (
            /* Loading state (only when no cached results) */
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-tl-400 animate-spin" />
              <p>Cargando...</p>
            </div>
          ) : flatResults.length === 0 ? (
            /* No results */
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p>Sin resultados para &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          ) : (
            /* Grouped results */
            <>
              {groups.map(({ category, items }) => {
                const meta = CATEGORY_META[category];
                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {meta.label}
                      </span>
                    </div>

                    {/* Items */}
                    {items.map((result) => {
                      const idx = globalIdx++;
                      const isActive = idx === activeIndex;

                      return (
                        <Link
                          key={result.href}
                          href={result.href}
                          prefetch={false}
                          data-index={idx}
                          role="option"
                          aria-selected={isActive}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(result.href);
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isActive
                              ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950"
                          }`}
                        >
                          {/* Icon */}
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                              isActive
                                ? "bg-tl-100 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400"
                                : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            <ResultIcon
                              name={result.icon}
                              className="w-4 h-4"
                            />
                          </span>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            {result.highlightedTitle ? (
                              <p
                                className={`text-sm font-medium truncate ${
                                  isActive
                                    ? "text-tl-700 dark:text-tl-300"
                                    : "text-gray-900 dark:text-gray-100"
                                } [&_mark]:bg-tl-amber-200/50 [&_mark]:dark:bg-tl-amber-900/40 [&_mark]:text-inherit [&_mark]:rounded-sm`}
                                dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                              />
                            ) : (
                              <p
                                className={`text-sm font-medium truncate ${
                                  isActive
                                    ? "text-tl-700 dark:text-tl-300"
                                    : "text-gray-900 dark:text-gray-100"
                                }`}
                              >
                                {result.title}
                              </p>
                            )}
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Category badge */}
                          <span
                            className={`hidden sm:inline-flex shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-1 py-0.5 font-mono text-[10px]">
              {"\u2191\u2193"}
            </kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-1 py-0.5 font-mono text-[10px]">
              {"\u21B5"}
            </kbd>
            abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-1 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            cerrar
          </span>
          <span className="ml-auto font-medium text-gray-300">
            trafico.live
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Keyboard shortcut hook (for external use) ────────────────────────────────

export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}
