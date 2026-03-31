import Link from "next/link";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";
import { Logo } from "@/components/brand/Logo";
import { footerColumns, footerCities } from "@/components/layout/nav/NavData";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Brand Section */}
        <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="mb-2">
            <Logo variant="horizontal" size="sm" href={undefined} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Inteligencia vial en tiempo real con datos oficiales de la DGT.
            Incidencias, cámaras, radares, precios de combustible, cargadores
            eléctricos y zonas de bajas emisiones en toda España.
          </p>
        </div>

        {/* Main Footer Content — 6 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider font-heading">
                {column.title}
              </h3>
              <ul className="space-y-0.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 block py-1.5 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* City Strip — SEO internal linking */}
        <nav
          aria-label="Tráfico por ciudad"
          className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800"
        >
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-heading">
            Tráfico por ciudad
          </h3>
          <ul className="flex flex-wrap gap-x-1.5 gap-y-1">
            {footerCities.map((city, i) => (
              <li key={city.slug} className="flex items-center gap-1.5">
                <Link
                  href={`/ciudad/${city.slug}`}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors py-1"
                >
                  {city.name}
                </Link>
                {i < footerCities.length - 1 && (
                  <span
                    className="text-gray-300 dark:text-gray-700"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Bar */}
        <div className="pt-2">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>
                Datos: DGT NAP, AEMET, MITERD, MINETUR | Actualizado cada 60
                segundos
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Desarrollado por{" "}
                <a
                  href="https://abemon.es"
                  className="font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abemon
                </a>
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              &copy; {currentYear} trafico.live. Todos los derechos reservados.
            </p>
            <span
              className="hidden sm:inline text-gray-300 dark:text-gray-700"
              aria-hidden="true"
            >
              ·
            </span>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
