import Link from "next/link";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";
import { Logo } from "@/components/brand/Logo";

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
            Inteligencia vial en tiempo real con datos oficiales de la DGT. Incidencias, cámaras,
            radares, precios de combustible, cargadores eléctricos y zonas de bajas emisiones.
          </p>
        </div>

        {/* Main Footer Content - 6 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
          {/* Carreteras */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Carreteras</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/carreteras/autopistas" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Autopistas
                </Link>
              </li>
              <li>
                <Link href="/carreteras/autovias" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Autovías
                </Link>
              </li>
              <li>
                <Link href="/carreteras/nacionales" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Nacionales
                </Link>
              </li>
              <li>
                <Link href="/carreteras/regionales" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Regionales
                </Link>
              </li>
            </ul>
          </div>

          {/* Combustible */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Combustible</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/gasolineras" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Precios hoy
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/precios" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Por provincia
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/mapa" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Mapa
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/maritimas" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Marítimas
                </Link>
              </li>
            </ul>
          </div>

          {/* Infraestructura */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Infraestr.</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/camaras" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Cámaras
                </Link>
              </li>
              <li>
                <Link href="/radares" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Radares
                </Link>
              </li>
              <li>
                <Link href="/carga-ev" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Cargadores EV
                </Link>
              </li>
              <li>
                <Link href="/etiqueta-ambiental" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Zonas ZBE
                </Link>
              </li>
            </ul>
          </div>

          {/* Por Zona */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Por Zona</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/comunidad-autonoma" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Comunidades
                </Link>
              </li>
              <li>
                <Link href="/espana" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Provincias
                </Link>
              </li>
              <li>
                <Link href="/ciudad/madrid" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Madrid
                </Link>
              </li>
              <li>
                <Link href="/ciudad/barcelona" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Barcelona
                </Link>
              </li>
            </ul>
          </div>

          {/* Herramientas */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Herramientas</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Mapa en vivo
                </Link>
              </li>
              <li>
                <Link href="/incidencias" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Alertas
                </Link>
              </li>
              <li>
                <Link href="/camaras" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Cámaras DGT
                </Link>
              </li>
              <li>
                <Link href="/estadisticas" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Estadísticas
                </Link>
              </li>
            </ul>
          </div>

          {/* Información */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm uppercase tracking-wider">Info</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/profesional" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Profesional
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/aviso-legal" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Aviso legal
                </Link>
              </li>
              <li>
                <Link href="/politica-privacidad" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/politica-cookies" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Mapa del sitio
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Datos: DGT NAP, AEMET, MITERD, MINETUR | Actualizado cada 60 segundos</p>
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
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">
              &copy; {currentYear} trafico.live. Todos los derechos reservados.
            </p>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-700 dark:text-gray-300">·</span>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
