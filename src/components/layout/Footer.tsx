"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";
import { Logo } from "@/components/brand/Logo";
import { footerColumns, footerCities } from "@/components/layout/nav/NavData";

const DATA_SOURCES = ["DGT NAP", "AEMET", "MITERD", "MINETUR", "Renfe", "AENA"];

// White-first footer accent mapping
const FOOTER_ACCENT = {
  tl: {
    iconBg: "bg-tl-50 dark:bg-tl-900/30",
    iconText: "text-tl-700 dark:text-tl-300",
    bar: "bg-tl-500",
  },
  "tl-amber": {
    iconBg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    iconText: "text-tl-amber-500 dark:text-tl-amber-300",
    bar: "bg-tl-amber-400",
  },
  "tl-sea": {
    iconBg: "bg-tl-sea-50 dark:bg-tl-sea-900/30",
    iconText: "text-tl-sea-700 dark:text-tl-sea-300",
    bar: "bg-tl-sea-400",
  },
} as const;

// Collapse 6 data columns → 5 visual columns by merging "Profesional" into "Explorar".
// Keeps all 8 Profesional links (incl. legal) under a single combined column header.
type DisplayColumn = (typeof footerColumns)[number] & { mergedLabel?: string };

function buildFiveCols(): DisplayColumn[] {
  const byTitle = Object.fromEntries(footerColumns.map((c) => [c.title, c]));
  const explorar = byTitle["Explorar"];
  const profesional = byTitle["Profesional"];
  const merged: DisplayColumn | null =
    explorar && profesional
      ? {
          ...explorar,
          title: "Explorar y más",
          links: [...explorar.links, ...profesional.links],
        }
      : explorar ?? profesional ?? null;

  return ["Tráfico", "Carreteras", "Combustible", "Marítimo"]
    .map((t) => byTitle[t])
    .filter((c): c is DisplayColumn => Boolean(c))
    .concat(merged ? [merged] : []);
}

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const columns = buildFiveCols();

  return (
    <footer className="bg-white border-t border-ink-200 text-ink-700 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300">
      {/* Brand accent bar */}
      <div
        className="h-[3px]"
        style={{
          background:
            "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Brand + Data Sources */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
          <div className="max-w-md">
            <div className="mb-3">
              <Logo variant="horizontal" size="sm" href={undefined} theme="light" />
            </div>
            <p className="text-sm text-ink-600 dark:text-gray-400 leading-relaxed">
              Inteligencia multimodal en tiempo real con datos oficiales de la DGT,
              AEMET, Renfe, AENA y MITECO: tráfico, trenes, vuelos, barcos, aire y
              combustible en toda España.
            </p>
          </div>
          {/* Data source badges */}
          <div className="flex flex-wrap gap-2 lg:pt-1">
            {DATA_SOURCES.map((src) => (
              <span
                key={src}
                className="px-2.5 py-1 rounded-md text-[11px] font-data font-medium bg-ink-50 text-ink-600 border border-ink-200 tracking-wider dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
              >
                {src}
              </span>
            ))}
          </div>
        </div>

        {/* Main Footer Columns — 5 columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 mb-12">
          {columns.map((column) => {
            const accent = FOOTER_ACCENT[column.accent];
            const Icon = column.icon;
            return (
              <div key={column.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-900 dark:text-gray-200 mb-4 flex items-center gap-2.5 font-heading">
                  <span className={`w-1 h-4 rounded-full ${accent.bar}`} />
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded ${accent.iconBg} ${accent.iconText}`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                  </span>
                  {column.title}
                </h3>
                <ul className="space-y-0.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-600 hover:text-tl-700 block py-1.5 transition-colors duration-150 dark:text-gray-400 dark:hover:text-tl-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 rounded"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* City Strip — pill badges */}
        <nav
          aria-label="Tráfico por ciudad"
          className="mb-8 pt-8 border-t border-ink-200 dark:border-gray-800"
        >
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-900 dark:text-gray-200 mb-4 flex items-center gap-2.5 font-heading">
            <span className="w-1 h-4 rounded-full bg-tl-500" />
            Tráfico por ciudad
          </h3>
          <div className="flex flex-wrap gap-2">
            {footerCities.map((city) => {
              const cityActive =
                pathname.startsWith(`/trafico/${city.slug}`) ||
                pathname.startsWith(`/ciudad/${city.slug}`);
              return (
                <Link
                  key={city.slug}
                  href={`/trafico/${city.slug}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 ${
                    cityActive
                      ? "bg-tl-600 border border-tl-600 text-white"
                      : "bg-ink-50 border border-ink-200 text-ink-700 hover:border-tl-400 hover:text-tl-700 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:border-tl-500 dark:hover:text-tl-300"
                  }`}
                >
                  {city.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-ink-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-green opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-green" />
              </span>
              <span className="text-xs text-ink-500 dark:text-gray-400">
                Actualizado cada 60 segundos
              </span>
            </div>

            {/* Credits and legal */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ink-500 dark:text-gray-400">
              <span>&copy; {currentYear} trafico.live</span>
              <span className="hidden sm:inline text-ink-300 dark:text-gray-700" aria-hidden="true">
                &middot;
              </span>
              <span>
                Desarrollado por{" "}
                <a
                  href="https://abemon.es"
                  className="font-semibold text-tl-700 hover:text-tl-600 hover:underline transition-colors dark:text-tl-300 dark:hover:text-tl-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abemon
                </a>
              </span>
              <span className="hidden sm:inline text-ink-300 dark:text-gray-700" aria-hidden="true">
                &middot;
              </span>
              <Link
                href="/aviso-legal"
                className="hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
              >
                Aviso legal
              </Link>
              <span className="hidden sm:inline text-ink-300 dark:text-gray-700" aria-hidden="true">
                &middot;
              </span>
              <Link
                href="/politica-privacidad"
                className="hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
              >
                Privacidad
              </Link>
              <span className="hidden sm:inline text-ink-300 dark:text-gray-700" aria-hidden="true">
                &middot;
              </span>
              <CookieSettingsButton />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
