"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";
import { Logo } from "@/components/brand/Logo";
import { footerColumns, footerCities } from "@/components/layout/nav/NavData";

const DATA_SOURCES = ["DGT NAP", "AEMET", "MITERD", "MINETUR"];

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="dark bg-tl-950">
      {/* Gradient top accent */}
      <div
        className="h-px"
        style={{
          background:
            "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Brand + Data Sources */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-12">
          <div className="max-w-md">
            <div className="mb-3">
              <Logo variant="horizontal" size="sm" href={undefined} />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Inteligencia vial en tiempo real con datos oficiales de la DGT.
              Incidencias, cámaras, radares, precios de combustible, cargadores
              eléctricos y zonas de bajas emisiones en toda España.
            </p>
          </div>
          {/* Data source badges */}
          <div className="flex flex-wrap gap-2 lg:pt-1">
            {DATA_SOURCES.map((src) => (
              <span
                key={src}
                className="px-2.5 py-1 rounded-md text-[11px] font-data font-medium bg-tl-900 text-gray-500 border border-tl-800 tracking-wider"
              >
                {src}
              </span>
            ))}
          </div>
        </div>

        {/* Main Footer Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-10 mb-12">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-tl-400 mb-4 flex items-center gap-2 font-heading">
                <span className="w-4 h-px bg-tl-700" />
                {column.title}
              </h3>
              <ul className="space-y-0.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-gray-100 hover:translate-x-0.5 block py-1.5 transition-all duration-150"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* City Strip — pill badges */}
        <nav
          aria-label="Tráfico por ciudad"
          className="mb-8 pt-8 border-t border-tl-800/50"
        >
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-tl-400 mb-4 flex items-center gap-2 font-heading">
            <span className="w-4 h-px bg-tl-700" />
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
                    cityActive
                      ? "bg-tl-600 border border-tl-500 text-white"
                      : "bg-tl-900 border border-tl-800 text-gray-400 hover:border-tl-600 hover:text-tl-300"
                  }`}
                >
                  {city.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-tl-800/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-green opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-green" />
              </span>
              <span className="text-xs text-gray-500">
                Actualizado cada 60 segundos
              </span>
            </div>

            {/* Credits and legal */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span>&copy; {currentYear} trafico.live</span>
              <span
                className="hidden sm:inline text-tl-800"
                aria-hidden="true"
              >
                ·
              </span>
              <span>
                Desarrollado por{" "}
                <a
                  href="https://abemon.es"
                  className="font-semibold text-tl-400 hover:text-tl-300 hover:underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abemon
                </a>
              </span>
              <span
                className="hidden sm:inline text-tl-800"
                aria-hidden="true"
              >
                ·
              </span>
              <CookieSettingsButton />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
