"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { Search, ArrowRight, X } from "lucide-react";
import type { MegaMenuPanel as PanelData } from "./NavData";
import { ACCENT_STYLES, megaMenuPanels } from "./NavData";
import { HUB_WIDGETS } from "./MegaMenuWidgets";
import { filterResults, groupResults, CATEGORY_META } from "./SearchData";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ─── Hub Column ───────────────────────────────────────────────────────────────

function HubColumn({ panel }: { panel: PanelData }) {
  const styles = ACCENT_STYLES[panel.hub.accent];
  const HubIcon = panel.hub.icon;
  const Widget = HUB_WIDGETS[panel.id];

  return (
    <div
      className={`w-52 shrink-0 rounded-2xl p-5 flex flex-col ${styles.hubBg}`}
    >
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${styles.iconBg} ${styles.iconText}`}
      >
        <HubIcon className="w-5.5 h-5.5" />
      </div>

      {/* Title & subtitle */}
      <h2
        className={`text-base font-bold font-heading leading-tight ${styles.title}`}
      >
        {panel.hub.title}
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
        {panel.hub.subtitle}
      </p>

      {/* Live stats widget */}
      {Widget && (
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/30">
          <Widget />
        </div>
      )}

      {/* CTA */}
      <Link
        href={panel.hub.href}
        prefetch={false}
        className={`mt-auto pt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${styles.cta}`}
      >
        Ver todo
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ─── Category Grid ────────────────────────────────────────────────────────────

function CategoryGrid({ panel }: { panel: PanelData }) {
  const pathname = usePathname();
  const styles = ACCENT_STYLES[panel.hub.accent];

  return (
    <div
      className="flex-1 grid gap-8"
      style={{
        gridTemplateColumns: `repeat(${panel.categories.length}, minmax(0, 1fr))`,
      }}
    >
      {panel.categories.map((category) => (
        <div key={category.title}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-1 h-4 rounded-full ${styles.bar}`} />
            <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em] font-heading">
              {category.title}
            </h3>
          </div>

          <ul className="space-y-0.5">
            {category.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(pathname, item.href);

              return (
                <li key={item.href + item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`
                      flex items-start gap-3 px-2.5 py-2 rounded-xl text-sm transition-all group
                      ${
                        active
                          ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 ring-1 ring-tl-200 dark:ring-tl-800"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      }
                    `}
                  >
                    <span
                      className={`
                        flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors duration-150
                        ${
                          active
                            ? "bg-tl-100 dark:bg-tl-800/30 text-tl-600 dark:text-tl-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-tl-100 dark:group-hover:bg-tl-800/40 group-hover:text-tl-600 dark:group-hover:text-tl-300"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="pt-1 min-w-0">
                      <span className="font-medium leading-tight text-[13px]">
                        {item.name}
                      </span>
                      {item.description && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── City Strip ───────────────────────────────────────────────────────────────

function CityStrip({
  cities,
}: {
  cities: { name: string; slug: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/50">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] shrink-0 mr-1">
          Tráfico en:
        </span>
        {cities.map((city) => {
          const cityActive =
            pathname.startsWith(`/trafico/${city.slug}`) ||
            pathname.startsWith(`/ciudad/${city.slug}`);
          return (
            <Link
              key={city.slug}
              href={`/trafico/${city.slug}`}
              prefetch={false}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                cityActive
                  ? "bg-tl-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-600 dark:hover:text-tl-400"
              }`}
            >
              {city.name}
            </Link>
          );
        })}
        <Link
          href="/ciudad"
          prefetch={false}
          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-tl-50 dark:bg-tl-900/20 text-tl-600 dark:text-tl-400 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
        >
          Todas &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── Panel Content ────────────────────────────────────────────────────────────

function PanelContent({ panel }: { panel: PanelData }) {
  const styles = ACCENT_STYLES[panel.hub.accent];

  return (
    <>
      {/* Accent gradient bar */}
      <div
        className="h-[3px] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-5"
        style={{ background: styles.gradient }}
      />

      {/* Hub + categories layout */}
      <div className="flex gap-6">
        <HubColumn panel={panel} />
        <CategoryGrid panel={panel} />
      </div>

      {/* City strip */}
      {panel.cityStrip && panel.cityStrip.length > 0 && (
        <CityStrip cities={panel.cityStrip} />
      )}
    </>
  );
}

// ─── Search Panel (full search with index, categories, keyboard nav) ──────────

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 50); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query), 200); return () => clearTimeout(t); }, [query]);
  useEffect(() => { setActiveIndex(0); }, [debouncedQuery]);

  const results = filterResults(debouncedQuery);
  const groups = groupResults(results);
  const flatResults = groups.flatMap((g) => g.items);
  const hasQuery = debouncedQuery.trim().length > 0;

  const navigate = useCallback((href: string) => { onNavigate(); router.push(href); }, [onNavigate, router]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-search-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); const s = flatResults[activeIndex]; if (s) navigate(s.href); }
    if (e.key === "Escape") { onNavigate(); }
  }

  let globalIdx = 0;

  return (
    <>
      {/* Gradient */}
      <div className="h-[3px] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-4" style={{ background: "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))" }} />

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef} type="text" value={query}
          onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Buscar carreteras, ciudades, gasolineras, herramientas..."
          className="w-full pl-12 pr-20 py-3.5 rounded-xl text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-tl-300 dark:focus:ring-tl-700 transition-colors"
          autoComplete="off" autoCorrect="off" spellCheck={false}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query && (
            <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" aria-label="Borrar búsqueda">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden md:inline-flex items-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 leading-none">ESC</kbd>
        </div>
      </div>

      {/* Default: section cards + popular */}
      {!hasQuery && (
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-3">Secciones</p>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {megaMenuPanels.map((panel) => {
                const s = ACCENT_STYLES[panel.hub.accent];
                const HubIcon = panel.hub.icon;
                return (
                  <Link key={panel.id} href={panel.hub.href} prefetch={false} onClick={onNavigate} className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm ${s.hubBg}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconBg} ${s.iconText}`}>
                      <HubIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`text-xs font-semibold text-center leading-tight ${s.title}`}>{panel.hub.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2.5">Populares</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
              {results.map((r) => {
                const Icon = r.icon;
                return (
                  <Link key={r.href} href={r.href} prefetch={false} onClick={onNavigate} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-tl-50 dark:group-hover:bg-tl-900/30 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate font-medium text-[13px]">{r.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grouped results */}
      {hasQuery && flatResults.length > 0 && (
        <>
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain -mx-2 px-2" role="listbox">
            {groups.map(({ category, items }) => {
              const meta = CATEGORY_META[category];
              return (
                <div key={category} className="mb-3">
                  <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-2 py-1.5 -mx-2">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">{meta.label}</span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-2">{items.length}</span>
                  </div>
                  {items.map((result) => {
                    const idx = globalIdx++;
                    const isActive = idx === activeIndex;
                    const Icon = result.icon;
                    return (
                      <Link
                        key={result.href + result.title} href={result.href} prefetch={false}
                        data-search-idx={idx} role="option" aria-selected={isActive}
                        onClick={(e) => { e.preventDefault(); navigate(result.href); }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50"}`}
                      >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isActive ? "bg-tl-100 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isActive ? "text-tl-700 dark:text-tl-300" : "text-gray-900 dark:text-gray-100"}`}>{result.title}</p>
                          {result.subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{result.subtitle}</p>}
                        </div>
                        <span className={`hidden sm:inline-flex shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.badgeClass}`}>{meta.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Keyboard hints */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50 flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-0.5 font-mono text-[9px]">&uarr;&darr;</kbd>navegar</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-0.5 font-mono text-[9px]">&crarr;</kbd>abrir</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-0.5 font-mono text-[9px]">Esc</kbd>cerrar</span>
            <span className="ml-auto font-medium text-gray-300 dark:text-gray-700">trafico.live</span>
          </div>
        </>
      )}

      {/* Empty state */}
      {hasQuery && flatResults.length === 0 && (
        <div className="text-center py-10">
          <Search className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sin resultados para &ldquo;{debouncedQuery}&rdquo;</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Prueba con otro término o navega las secciones</p>
        </div>
      )}
    </>
  );
}

// ─── Persistent mega menu shell ───────────────────────────────────────────────

export function MegaMenuShell({
  activePanel,
  panels,
  onPointerEnter,
  onPointerLeave,
  onClose,
}: {
  activePanel: string | null;
  panels: PanelData[];
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const isSearch = activePanel === "search";
  const currentPanel = isSearch ? null : panels.find((p) => p.id === activePanel);
  const isVisible = activePanel !== null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="mega-menu-shell"
          style={{ willChange: "transform" }}
          initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="fixed left-0 right-0 top-16 z-40 overflow-hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ minHeight: 200 }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activePanel}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.01 }
                    : { duration: 0.15, ease: "easeOut" }
                }
              >
                {isSearch ? (
                  <SearchPanel onNavigate={onClose} />
                ) : currentPanel ? (
                  <PanelContent panel={currentPanel} />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
