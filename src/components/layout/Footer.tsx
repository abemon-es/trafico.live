import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Tráfico España</h3>
            <p className="text-sm text-gray-600">
              Monitorización en tiempo real del tráfico español con datos oficiales de la DGT.
            </p>
          </div>

          {/* Carreteras */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Carreteras</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/carreteras" className="text-gray-600 hover:text-gray-900">
                  Todas las carreteras
                </Link>
              </li>
              <li>
                <Link href="/carreteras/autopistas" className="text-gray-600 hover:text-gray-900">
                  Autopistas (AP)
                </Link>
              </li>
              <li>
                <Link href="/carreteras/autovias" className="text-gray-600 hover:text-gray-900">
                  Autovías (A)
                </Link>
              </li>
              <li>
                <Link href="/carreteras/nacionales" className="text-gray-600 hover:text-gray-900">
                  Nacionales (N)
                </Link>
              </li>
            </ul>
          </div>

          {/* Herramientas */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Herramientas</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/mapa" className="text-gray-600 hover:text-gray-900">
                  Mapa en tiempo real
                </Link>
              </li>
              <li>
                <Link href="/incidencias" className="text-gray-600 hover:text-gray-900">
                  Incidencias activas
                </Link>
              </li>
              <li>
                <Link href="/camaras" className="text-gray-600 hover:text-gray-900">
                  Cámaras de tráfico
                </Link>
              </li>
              <li>
                <Link href="/historico" className="text-gray-600 hover:text-gray-900">
                  Datos históricos
                </Link>
              </li>
            </ul>
          </div>

          {/* Gasolineras */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Gasolineras</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/gasolineras" className="text-gray-600 hover:text-gray-900">
                  Precios de hoy
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/terrestres" className="text-gray-600 hover:text-gray-900">
                  Terrestres
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/maritimas" className="text-gray-600 hover:text-gray-900">
                  Marítimas
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/precios" className="text-gray-600 hover:text-gray-900">
                  Por provincia
                </Link>
              </li>
              <li>
                <Link href="/gasolineras/mapa" className="text-gray-600 hover:text-gray-900">
                  Mapa
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Información</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/sobre" className="text-gray-600 hover:text-gray-900">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/estadisticas" className="text-gray-600 hover:text-gray-900">
                  Estadísticas
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-gray-600 hover:text-gray-900">
                  Mapa del sitio
                </Link>
              </li>
              <li>
                <a
                  href="https://www.logisticsexpress.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logistics Express
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              <p>Datos: DGT NAP, AEMET, MITERD, MINETUR | Actualizado cada 60 segundos</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                Engineered by{" "}
                <a
                  href="https://abemon.es"
                  className="font-semibold text-[#006633] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abemonFLOW
                </a>
              </span>
              <span className="hidden md:inline">|</span>
              <span>
                Operado por{" "}
                <a
                  href="https://www.logisticsexpress.es"
                  className="font-semibold text-[#006633] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Logistics Express
                </a>
              </span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            © {currentYear} Tráfico España. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
