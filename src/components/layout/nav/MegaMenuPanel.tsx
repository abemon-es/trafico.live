"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { Search, ArrowRight, MapPin } from "lucide-react";
import type { MegaMenuPanel as PanelData } from "./NavData";
import { ACCENT_STYLES, megaMenuPanels } from "./NavData";
import { HUB_WIDGETS } from "./MegaMenuWidgets";

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
      className={`w-56 shrink-0 rounded-2xl p-5 flex flex-col ${styles.hubBg}`}
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
                        flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors duration-150
                        ${
                          active
                            ? "bg-tl-100 dark:bg-tl-800/30 text-tl-600 dark:text-tl-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-tl-100 dark:group-hover:bg-tl-800/40 group-hover:text-tl-600 dark:group-hover:text-tl-300"
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="pt-0.5 min-w-0">
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
        className="h-0.5 -mx-4 sm:-mx-6 lg:-mx-8 -mt-7 mb-6"
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

// ─── Search Panel ─────────────────────────────────────────────────────────────

const SEARCH_CITIES = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Murcia", slug: "murcia" },
  { name: "Palma de Mallorca", slug: "palma" },
  { name: "Alicante", slug: "alicante" },
  { name: "Córdoba", slug: "cordoba" },
  { name: "Valladolid", slug: "valladolid" },
  { name: "Vigo", slug: "vigo" },
  { name: "Granada", slug: "granada" },
  { name: "A Coruña", slug: "a-coruna" },
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Flatten all nav items for search
const allSearchableItems = megaMenuPanels.flatMap((panel) =>
  panel.categories.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      panelId: panel.id,
      panelLabel: panel.label,
      categoryTitle: cat.title,
    }))
  )
);

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Auto-focus when search panel mounts
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const normalizedQuery = normalize(query);

  // Search nav items
  const matchedItems =
    query.length > 1
      ? allSearchableItems.filter(
          (item) =>
            normalize(item.name).includes(normalizedQuery) ||
            (item.description && normalize(item.description).includes(normalizedQuery))
        ).slice(0, 8)
      : [];

  // Search cities
  const matchedCities =
    query.length > 1
      ? SEARCH_CITIES.filter((c) => normalize(c.name).includes(normalizedQuery)).slice(0, 5)
      : [];

  const hasResults = matchedItems.length > 0 || matchedCities.length > 0;
  const showDefault = query.length < 2;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onNavigate();
    }
  }

  return (
    <>
      {/* Gradient bar */}
      <div
        className="h-0.5 -mx-4 sm:-mx-6 lg:-mx-8 -mt-7 mb-5"
        style={{
          background:
            "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
        }}
      />

      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar ciudad, carretera, gasolinera..."
          className="w-full pl-12 pr-4 py-3.5 rounded-xl text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-tl-300 dark:focus:ring-tl-700 transition-colors"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 leading-none">
          ESC
        </kbd>
      </div>

      {/* Default: quick section cards */}
      {showDefault && (
        <div className="space-y-5">
          {/* Section cards */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {megaMenuPanels.map((panel) => {
              const styles = ACCENT_STYLES[panel.hub.accent];
              const HubIcon = panel.hub.icon;
              return (
                <Link
                  key={panel.id}
                  href={panel.hub.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-[1.02] ${styles.hubBg}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${styles.iconBg} ${styles.iconText}`}>
                    <HubIcon className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-xs font-semibold text-center ${styles.title}`}>
                    {panel.hub.title}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Quick city links */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2.5">
              Ciudades populares
            </p>
            <div className="flex flex-wrap gap-2">
              {SEARCH_CITIES.slice(0, 10).map((city) => (
                <Link
                  key={city.slug}
                  href={`/trafico/${city.slug}`}
                  prefetch={false}
                  onClick={onNavigate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search results */}
      {!showDefault && hasResults && (
        <div className="space-y-4">
          {/* City results */}
          {matchedCities.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2">
                Ciudades
              </p>
              <div className="space-y-0.5">
                {matchedCities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/trafico/${city.slug}`}
                    prefetch={false}
                    onClick={onNavigate}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">{city.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Ciudad</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Nav item results */}
          {matchedItems.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2">
                Páginas
              </p>
              <div className="space-y-0.5">
                {matchedItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.name}
                      href={item.href}
                      prefetch={false}
                      onClick={onNavigate}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        {item.panelLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {!showDefault && !hasResults && (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin resultados para &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Prueba con otro término
          </p>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7" style={{ minHeight: 220 }}>
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
