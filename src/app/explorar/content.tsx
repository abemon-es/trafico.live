"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, ArrowLeft } from "lucide-react";
import { useLiveSearch, getRecentSearches } from "@/components/search/useLiveSearch";
import { SearchIcon } from "@/components/search/SearchIcon";

export function ExplorarContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const { query, setQuery, debouncedQuery, groups, flatResults, isLoading, hasQuery, onNavigate } = useLiveSearch();
  const recentSearches = typeof window !== "undefined" ? getRecentSearches() : [];

  // Pre-fill from URL param on mount
  useEffect(() => {
    if (initialQuery && !query) {
      setQuery(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-tl-600 to-tl-400 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Inicio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-4">
            Explorar trafico.live
          </h1>

          {/* Search input */}
          <div className="relative">
            {isLoading ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tl-300 animate-spin" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar carreteras, ciudades, gasolineras..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-base sm:text-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Not searching yet */}
        {!hasQuery && (
          <div className="space-y-6">
            {recentSearches.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Búsquedas recientes
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="text-center py-16 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
              <p className="text-lg">Busca entre 40.000+ puntos de datos</p>
              <p className="text-sm mt-1">
                Gasolineras, carreteras, cámaras, radares, estaciones de tren y más
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {hasQuery && isLoading && flatResults.length === 0 && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-tl-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Buscando...</p>
          </div>
        )}

        {/* Results */}
        {hasQuery && flatResults.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">
                {flatResults.length}
              </span>{" "}
              resultado{flatResults.length !== 1 ? "s" : ""} para &ldquo;{debouncedQuery}&rdquo;
            </p>
            {groups.map(({ category, meta, items }) => (
              <div key={category} className="mb-6">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {meta.label}
                </h2>
                <div className="space-y-1">
                  {items.map((result) => (
                    <Link
                      key={result.href + result.title}
                      href={result.href}
                      prefetch={false}
                      onClick={() => onNavigate(debouncedQuery)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                    >
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-tl-50 dark:group-hover:bg-tl-900/30 group-hover:text-tl-600 transition-colors">
                        <SearchIcon name={result.icon} className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        {result.highlightedTitle ? (
                          <p
                            className="font-medium text-gray-900 dark:text-gray-100 truncate [&_mark]:bg-tl-amber-200/50 [&_mark]:dark:bg-tl-amber-900/40 [&_mark]:text-inherit [&_mark]:rounded-sm"
                            dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
                          />
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {result.title}
                          </p>
                        )}
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <span
                        className={`hidden sm:inline-flex shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {hasQuery && !isLoading && flatResults.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-200 dark:text-gray-700" />
            <p className="text-lg font-medium text-gray-500">
              Sin resultados para &ldquo;{debouncedQuery}&rdquo;
            </p>
            <p className="text-sm text-gray-400 mt-1">Prueba con otro término</p>
          </div>
        )}
      </div>
    </div>
  );
}
